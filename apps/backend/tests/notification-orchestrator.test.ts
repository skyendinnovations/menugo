/**
 * Integration tests for NotificationOrchestrator.dispatch() — Part 9 (deferred 3.8)
 *
 * Strategy
 * ────────
 * Every external dependency of the orchestrator is mocked so tests run without
 * a database or network.  We assert _behaviour_ — which repositories were
 * queried and what routingStrategy ended up in the notification_log — rather
 * than internal implementation details.
 *
 * Routing matrix under test
 * ─────────────────────────
 *   isDemoMode = true                                  → push suppressed, SSE still emitted
 *   self_service  + isCustomerNotifyStep = true        → sendToCustomerDevice
 *   full_service  + isCustomerNotifyStep = true
 *     - available staff exist                          → sendToAvailableWaiters
 *     - no available staff                             → sendToAllClockedIn (fallback)
 *   fast_service  + triggerEvent === "order_placed"    → sendToAllClockedIn (broadcast)
 *   fast_service  + other event                        → sendByRoleSettings (falls through)
 *   any mode      + isCustomerNotifyStep = false        → sendByRoleSettings (default)
 *
 * Coverage: 28 test cases.
 */

// ─── Module mocks (hoisted before all imports) ───────────────────────────────

jest.mock("../src/repositories/restaurant.repository", () => ({
  restaurantRepository: { findById: jest.fn() },
}));

jest.mock("../src/repositories/workflow.repository", () => ({
  workflowRepository: { findCustomerNotifyToStates: jest.fn() },
}));

jest.mock("../src/repositories/availability.repository", () => ({
  availabilityRepository: {
    findAvailableStaff: jest.fn(),
    findClockedIn: jest.fn(),
  },
}));

jest.mock("../src/repositories/device-token.repository", () => ({
  deviceTokenRepository: { findByUsers: jest.fn(), deactivateTokens: jest.fn() },
}));

jest.mock("../src/repositories/customer-device-token.repository", () => ({
  customerDeviceTokenRepository: { findByDeviceId: jest.fn() },
}));

jest.mock("../src/repositories/order.repository", () => ({
  orderRepository: { findById: jest.fn() },
}));

jest.mock("../src/repositories/notification-log.repository", () => ({
  notificationLogRepository: { create: jest.fn() },
}));

jest.mock("../src/repositories/notification-settings.repository", () => ({
  notificationSettingsRepository: { findRecipientsForEvent: jest.fn() },
}));

jest.mock("../src/services/event-bus.service", () => ({
  eventBus: { emit: jest.fn() },
}));

jest.mock("../src/utils/expo-push", () => ({
  sendExpoPush: jest.fn(),
}));

// Return null so the FCM sendEachForMulticast path is always skipped in tests.
jest.mock("../src/config/firebase", () => ({
  getMessaging: jest.fn().mockReturnValue(null),
}));

jest.mock("../src/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { notificationOrchestrator } from "../src/services/notification-orchestrator.service";
import { restaurantRepository } from "../src/repositories/restaurant.repository";
import { workflowRepository } from "../src/repositories/workflow.repository";
import { availabilityRepository } from "../src/repositories/availability.repository";
import { deviceTokenRepository } from "../src/repositories/device-token.repository";
import { customerDeviceTokenRepository } from "../src/repositories/customer-device-token.repository";
import { orderRepository } from "../src/repositories/order.repository";
import { notificationLogRepository } from "../src/repositories/notification-log.repository";
import { notificationSettingsRepository } from "../src/repositories/notification-settings.repository";
import { eventBus } from "../src/services/event-bus.service";
import { sendExpoPush } from "../src/utils/expo-push";
import type { OrderNotificationPayload } from "@menugo/dto";

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const RESTAURANT_ID = 5;

/** A status-change event whose toState is "ready" (the default customer-notify state). */
const STATUS_PAYLOAD: OrderNotificationPayload = {
  type: "order_status_changed",
  orderId: 42,
  orderNumber: "R-007",
  restaurantId: RESTAURANT_ID,
  tableNumber: 2,
  fromStatus: "preparing",
  toStatus: "ready",
};

/** An order_placed event. */
const PLACED_PAYLOAD: OrderNotificationPayload = {
  type: "order_placed",
  orderId: 43,
  orderNumber: "R-008",
  restaurantId: RESTAURANT_ID,
  tableNumber: 3,
};

/** A device-token stub (native, not web — bypasses FCM, goes through Expo). */
function makeToken(userId: string, token = "ExponentPushToken[abc]") {
  return { token, deviceType: "ios", userId, isActive: true };
}

/** Stub restaurant row. */
function makeRestaurant(
  overrides: Partial<{
    workflowMode: string;
    isDemoMode: boolean;
  }> = {},
) {
  return {
    id: RESTAURANT_ID,
    name: "Test Restaurant",
    isDemoMode: false,
    workflowMode: "full_service",
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetAllMocks();

  // Safe defaults — every test overrides what it needs.
  (restaurantRepository.findById as jest.Mock).mockResolvedValue(
    makeRestaurant(),
  );
  (workflowRepository.findCustomerNotifyToStates as jest.Mock).mockResolvedValue(
    [],
  );
  (availabilityRepository.findAvailableStaff as jest.Mock).mockResolvedValue(
    [],
  );
  (availabilityRepository.findClockedIn as jest.Mock).mockResolvedValue([]);
  (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([]);
  (customerDeviceTokenRepository.findByDeviceId as jest.Mock).mockResolvedValue(
    [],
  );
  (orderRepository.findById as jest.Mock).mockResolvedValue(null);
  (notificationLogRepository.create as jest.Mock).mockResolvedValue({ id: 1 });
  (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
    [],
  );
  (sendExpoPush as jest.Mock).mockResolvedValue({
    successCount: 1,
    failureCount: 0,
  });
});

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Run dispatch and flush any fire-and-forget promises. */
async function dispatch(
  triggerEvent: string,
  payload: OrderNotificationPayload = STATUS_PAYLOAD,
  ctx = {},
) {
  await notificationOrchestrator.dispatch(
    RESTAURANT_ID,
    triggerEvent,
    payload,
    ctx,
  );
  // Flush microtasks so fire-and-forget log.create promises settle.
  await new Promise<void>((r) => setImmediate(r));
}

/** Extract the routingStrategy from the first notificationLogRepository.create call. */
function loggedStrategy(): string | undefined {
  const calls = (notificationLogRepository.create as jest.Mock).mock.calls;
  if (calls.length === 0) return undefined;
  return (calls[0]![0] as { payload: Record<string, string> }).payload
    .routingStrategy;
}

// ─── SSE Emission ─────────────────────────────────────────────────────────────

describe("SSE emission", () => {
  it("emits order_placed event for the order_placed trigger", async () => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ isDemoMode: true }), // demo mode — push suppressed but SSE must still fire
    );

    await dispatch("order_placed", PLACED_PAYLOAD);

    expect(eventBus.emit).toHaveBeenCalledWith(
      RESTAURANT_ID,
      "order_placed",
      expect.objectContaining({ orderId: PLACED_PAYLOAD.orderId }),
    );
  });

  it("emits order_status_changed for a status transition trigger", async () => {
    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(eventBus.emit).toHaveBeenCalledWith(
      RESTAURANT_ID,
      "order_status_changed",
      expect.objectContaining({
        fromStatus: STATUS_PAYLOAD.fromStatus,
        toStatus: STATUS_PAYLOAD.toStatus,
      }),
    );
  });

  it("emits order_accepted for the order_accepted trigger", async () => {
    const payload: OrderNotificationPayload = {
      ...STATUS_PAYLOAD,
      type: "order_accepted",
    };
    await dispatch("order_accepted", payload, { acceptedBy: "alice" });

    expect(eventBus.emit).toHaveBeenCalledWith(
      RESTAURANT_ID,
      "order_accepted",
      expect.objectContaining({ acceptedBy: "alice" }),
    );
  });

  it("emits order_cancelled for the order_cancelled trigger", async () => {
    await dispatch("order_cancelled", STATUS_PAYLOAD);

    expect(eventBus.emit).toHaveBeenCalledWith(
      RESTAURANT_ID,
      "order_cancelled",
      expect.objectContaining({ orderId: STATUS_PAYLOAD.orderId }),
    );
  });

  it("emits SSE even when the restaurant is in demo mode (push is suppressed but SSE is not)", async () => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ isDemoMode: true }),
    );

    await dispatch("order_placed", PLACED_PAYLOAD);

    expect(eventBus.emit).toHaveBeenCalledTimes(1);
  });
});

// ─── Demo Mode ────────────────────────────────────────────────────────────────

describe("Demo mode", () => {
  beforeEach(() => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ isDemoMode: true }),
    );
  });

  it("suppresses all push notifications — no device tokens are queried", async () => {
    await dispatch("order_placed", PLACED_PAYLOAD);

    expect(deviceTokenRepository.findByUsers).not.toHaveBeenCalled();
    expect(customerDeviceTokenRepository.findByDeviceId).not.toHaveBeenCalled();
    expect(sendExpoPush).not.toHaveBeenCalled();
  });

  it("does NOT create a notification_log entry", async () => {
    await dispatch("order_placed", PLACED_PAYLOAD);

    expect(notificationLogRepository.create).not.toHaveBeenCalled();
  });
});

// ─── self_service + customer-notify step ─────────────────────────────────────

describe("self_service + isCustomerNotifyStep = true", () => {
  beforeEach(() => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ workflowMode: "self_service" }),
    );
    // "ready" is the customer-notify state
    (workflowRepository.findCustomerNotifyToStates as jest.Mock).mockResolvedValue(
      ["ready"],
    );
    // Order has a device ID
    (orderRepository.findById as jest.Mock).mockResolvedValue({
      id: STATUS_PAYLOAD.orderId,
      createdByDeviceId: "device-xyz",
    });
    // Customer has a token
    (customerDeviceTokenRepository.findByDeviceId as jest.Mock).mockResolvedValue(
      [{ token: "ExponentPushToken[customer]", deviceType: "ios" }],
    );
  });

  it("routes to the self_service_customer strategy", async () => {
    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(customerDeviceTokenRepository.findByDeviceId).toHaveBeenCalledWith(
      "device-xyz",
    );
    expect(sendExpoPush).toHaveBeenCalledTimes(1);
  });

  it("logs the notification with routingStrategy: self_service_customer", async () => {
    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(notificationLogRepository.create).toHaveBeenCalledTimes(1);
    expect(loggedStrategy()).toBe("self_service_customer");
  });

  it("does NOT query staff device tokens (customer path only)", async () => {
    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(deviceTokenRepository.findByUsers).not.toHaveBeenCalled();
  });

  it("skips push when the order has no createdByDeviceId", async () => {
    (orderRepository.findById as jest.Mock).mockResolvedValue({
      id: STATUS_PAYLOAD.orderId,
      createdByDeviceId: null,
    });

    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(sendExpoPush).not.toHaveBeenCalled();
    expect(notificationLogRepository.create).not.toHaveBeenCalled();
  });

  it("skips push when no customer tokens exist for the device", async () => {
    (customerDeviceTokenRepository.findByDeviceId as jest.Mock).mockResolvedValue(
      [],
    );

    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(sendExpoPush).not.toHaveBeenCalled();
    expect(notificationLogRepository.create).not.toHaveBeenCalled();
  });

  it("does NOT trigger when the event is NOT a customer-notify step", async () => {
    // "preparing" is NOT in customerNotifyStates → falls through to default
    (workflowRepository.findCustomerNotifyToStates as jest.Mock).mockResolvedValue(
      ["ready"], // only "ready" triggers customer notify
    );
    (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
      [],
    );

    // Transition to "preparing" — not a customer-notify step
    const payload: OrderNotificationPayload = {
      ...STATUS_PAYLOAD,
      fromStatus: "received",
      toStatus: "preparing",
    };
    await dispatch("status_received_to_preparing", payload);

    expect(customerDeviceTokenRepository.findByDeviceId).not.toHaveBeenCalled();
    // Should have fallen through to sendByRoleSettings
    expect(notificationSettingsRepository.findRecipientsForEvent).toHaveBeenCalled();
  });
});

// ─── full_service + customer-notify step ─────────────────────────────────────

describe("full_service + isCustomerNotifyStep = true", () => {
  beforeEach(() => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ workflowMode: "full_service" }),
    );
    (workflowRepository.findCustomerNotifyToStates as jest.Mock).mockResolvedValue(
      ["ready"],
    );
  });

  describe("when available waiters exist", () => {
    beforeEach(() => {
      (availabilityRepository.findAvailableStaff as jest.Mock).mockResolvedValue(
        [{ userId: "waiter-1" }, { userId: "waiter-2" }],
      );
      (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([
        makeToken("waiter-1", "ExponentPushToken[w1]"),
        makeToken("waiter-2", "ExponentPushToken[w2]"),
      ]);
    });

    it("queries available staff and sends to their tokens", async () => {
      await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

      expect(availabilityRepository.findAvailableStaff).toHaveBeenCalledWith(
        RESTAURANT_ID,
      );
      expect(deviceTokenRepository.findByUsers).toHaveBeenCalledWith([
        "waiter-1",
        "waiter-2",
      ]);
      expect(sendExpoPush).toHaveBeenCalledTimes(1);
    });

    it("logs with routingStrategy: full_service_available_waiters", async () => {
      await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

      expect(loggedStrategy()).toBe("full_service_available_waiters");
    });

    it("does NOT query clocked-in staff (no fallback needed)", async () => {
      await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

      expect(availabilityRepository.findClockedIn).not.toHaveBeenCalled();
    });
  });

  describe("when no available waiters — fallback to all clocked-in", () => {
    beforeEach(() => {
      (availabilityRepository.findAvailableStaff as jest.Mock).mockResolvedValue(
        [],
      ); // nobody available
      (availabilityRepository.findClockedIn as jest.Mock).mockResolvedValue([
        { userId: "staff-1" },
      ]);
      (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([
        makeToken("staff-1"),
      ]);
    });

    it("falls back to sendToAllClockedIn", async () => {
      await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

      expect(availabilityRepository.findClockedIn).toHaveBeenCalledWith(
        RESTAURANT_ID,
      );
      expect(deviceTokenRepository.findByUsers).toHaveBeenCalledWith([
        "staff-1",
      ]);
    });

    it("logs with routingStrategy: full_service_available_waiters_fallback", async () => {
      await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

      expect(loggedStrategy()).toBe("full_service_available_waiters_fallback");
    });
  });

  describe("when no clocked-in staff tokens exist (fallback, no log)", () => {
    beforeEach(() => {
      (availabilityRepository.findAvailableStaff as jest.Mock).mockResolvedValue(
        [],
      );
      (availabilityRepository.findClockedIn as jest.Mock).mockResolvedValue([
        { userId: "staff-2" },
      ]);
      // No tokens registered
      (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([]);
    });

    it("does not create a log entry when the fallback pool has no device tokens", async () => {
      await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

      expect(notificationLogRepository.create).not.toHaveBeenCalled();
    });
  });
});

// ─── fast_service ─────────────────────────────────────────────────────────────

describe("fast_service + order_placed", () => {
  beforeEach(() => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ workflowMode: "fast_service" }),
    );
    // isCustomerNotifyStep is irrelevant for this path — return empty to be safe
    (workflowRepository.findCustomerNotifyToStates as jest.Mock).mockResolvedValue(
      [],
    );
    (availabilityRepository.findClockedIn as jest.Mock).mockResolvedValue([
      { userId: "cook-1" },
      { userId: "cook-2" },
    ]);
    (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([
      makeToken("cook-1"),
      makeToken("cook-2"),
    ]);
  });

  it("broadcasts to all clocked-in staff when the trigger is order_placed", async () => {
    await dispatch("order_placed", PLACED_PAYLOAD);

    expect(availabilityRepository.findClockedIn).toHaveBeenCalledWith(
      RESTAURANT_ID,
    );
    expect(availabilityRepository.findAvailableStaff).not.toHaveBeenCalled();
    expect(sendExpoPush).toHaveBeenCalledTimes(1);
  });

  it("logs with routingStrategy: fast_service_broadcast", async () => {
    await dispatch("order_placed", PLACED_PAYLOAD);

    expect(loggedStrategy()).toBe("fast_service_broadcast");
  });

  it("does NOT broadcast for non-order_placed events (falls through to sendByRoleSettings)", async () => {
    (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
      [],
    );

    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    // findClockedIn must NOT have been called for the broadcast path
    expect(availabilityRepository.findClockedIn).not.toHaveBeenCalled();
    // sendByRoleSettings was called instead
    expect(
      notificationSettingsRepository.findRecipientsForEvent,
    ).toHaveBeenCalledWith(RESTAURANT_ID, "status_preparing_to_ready");
  });

  it("does not create a log when no clocked-in staff have tokens", async () => {
    (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([]);

    await dispatch("order_placed", PLACED_PAYLOAD);

    expect(notificationLogRepository.create).not.toHaveBeenCalled();
  });
});

// ─── Default: sendByRoleSettings ─────────────────────────────────────────────

describe("sendByRoleSettings (default path)", () => {
  it("queries notificationSettingsRepository for the trigger event", async () => {
    (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
      ["staff-a"],
    );
    (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([
      makeToken("staff-a"),
    ]);

    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(
      notificationSettingsRepository.findRecipientsForEvent,
    ).toHaveBeenCalledWith(RESTAURANT_ID, "status_preparing_to_ready");
  });

  it("logs with routingStrategy: role_settings when recipients have tokens", async () => {
    (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
      ["staff-b"],
    );
    (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([
      makeToken("staff-b"),
    ]);

    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(loggedStrategy()).toBe("role_settings");
  });

  it("does NOT create a log when no users match the trigger event", async () => {
    // findRecipientsForEvent returns [] → no users, no tokens, no log
    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(notificationLogRepository.create).not.toHaveBeenCalled();
  });

  it("does NOT create a log when recipients have no device tokens", async () => {
    (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
      ["staff-c"],
    );
    (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([]); // no tokens

    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(notificationLogRepository.create).not.toHaveBeenCalled();
  });

  it("sends push via Expo for native token recipients", async () => {
    (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
      ["staff-d"],
    );
    (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([
      makeToken("staff-d", "ExponentPushToken[native]"),
    ]);

    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    expect(sendExpoPush).toHaveBeenCalledWith(
      ["ExponentPushToken[native]"],
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
  });
});

// ─── Custom workflow — non-standard customer-notify state ─────────────────────

describe("Custom workflow — non-standard customer-notify state", () => {
  /**
   * A restaurant has customised its workflow so that "served" (not "ready")
   * is the customer-notify step.  The orchestrator must honour this via
   * `findCustomerNotifyToStates`, NOT by hardcoded string matching.
   */
  it("selects self_service_customer strategy for a custom served-notify step", async () => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ workflowMode: "self_service" }),
    );
    // Custom: customer is notified on "served", not "ready"
    (workflowRepository.findCustomerNotifyToStates as jest.Mock).mockResolvedValue(
      ["served"],
    );
    (orderRepository.findById as jest.Mock).mockResolvedValue({
      id: STATUS_PAYLOAD.orderId,
      createdByDeviceId: "device-custom",
    });
    (customerDeviceTokenRepository.findByDeviceId as jest.Mock).mockResolvedValue(
      [{ token: "ExponentPushToken[cust]", deviceType: "ios" }],
    );

    const payload: OrderNotificationPayload = {
      ...STATUS_PAYLOAD,
      fromStatus: "ready",
      toStatus: "served",
    };

    await dispatch("status_ready_to_served", payload);

    expect(customerDeviceTokenRepository.findByDeviceId).toHaveBeenCalledWith(
      "device-custom",
    );
    expect(loggedStrategy()).toBe("self_service_customer");
  });

  it("does NOT select customer strategy when toState is not in the custom notify list", async () => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ workflowMode: "self_service" }),
    );
    // Only "served" triggers customer notify — not "preparing"
    (workflowRepository.findCustomerNotifyToStates as jest.Mock).mockResolvedValue(
      ["served"],
    );
    (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
      [],
    );

    const payload: OrderNotificationPayload = {
      ...STATUS_PAYLOAD,
      fromStatus: "received",
      toStatus: "preparing",
    };

    await dispatch("status_received_to_preparing", payload);

    // Must NOT have touched the customer device path
    expect(customerDeviceTokenRepository.findByDeviceId).not.toHaveBeenCalled();
    // Must have fallen through to sendByRoleSettings
    expect(
      notificationSettingsRepository.findRecipientsForEvent,
    ).toHaveBeenCalled();
  });

  it("uses full_service_available_waiters for a custom notify state in full_service mode", async () => {
    (restaurantRepository.findById as jest.Mock).mockResolvedValue(
      makeRestaurant({ workflowMode: "full_service" }),
    );
    // Custom: customer-notify step is "served"
    (workflowRepository.findCustomerNotifyToStates as jest.Mock).mockResolvedValue(
      ["served"],
    );
    (availabilityRepository.findAvailableStaff as jest.Mock).mockResolvedValue(
      [{ userId: "waiter-x" }],
    );
    (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([
      makeToken("waiter-x"),
    ]);

    const payload: OrderNotificationPayload = {
      ...STATUS_PAYLOAD,
      fromStatus: "ready",
      toStatus: "served",
    };

    await dispatch("status_ready_to_served", payload);

    expect(loggedStrategy()).toBe("full_service_available_waiters");
  });
});

// ─── Log payload shape ─────────────────────────────────────────────────────────

describe("notification_log payload shape", () => {
  it("includes orderId and eventType in the log entry", async () => {
    (notificationSettingsRepository.findRecipientsForEvent as jest.Mock).mockResolvedValue(
      ["staff-e"],
    );
    (deviceTokenRepository.findByUsers as jest.Mock).mockResolvedValue([
      makeToken("staff-e"),
    ]);

    await dispatch("status_preparing_to_ready", STATUS_PAYLOAD);

    const createArgs = (notificationLogRepository.create as jest.Mock).mock
      .calls[0]![0] as {
      restaurantId: number;
      orderId: number;
      eventType: string;
      recipientUserIds: string[];
    };
    expect(createArgs.restaurantId).toBe(RESTAURANT_ID);
    expect(createArgs.orderId).toBe(STATUS_PAYLOAD.orderId);
    expect(createArgs.eventType).toBe("status_preparing_to_ready");
    expect(createArgs.recipientUserIds).toContain("staff-e");
  });
});
