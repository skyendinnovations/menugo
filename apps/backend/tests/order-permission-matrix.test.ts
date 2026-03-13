/**
 * E2E permission-matrix tests for every order endpoint (Part 8.3 — deferred 4.6)
 *
 * Strategy
 * ────────
 * • A lightweight Express app mounts the real order router at
 *   `/r/:restaurantId/orders`.  No database, no real auth.
 * • `resolvePermissions` is mocked and returns a pre-configured
 *   `ResolvedPermissions` object keyed by `req.user.id`.
 * • `subscriptionService.getSubscriptionStatus` is mocked to return
 *   "professional / active" so subscription gates never block permission tests.
 * • The `validate` middleware is replaced with a pass-through so Zod body
 *   schemas don't reject test payloads (we're testing permission logic only).
 * • Every order controller method replies with `{ ok: true }` — 200 OK.
 *
 * For each endpoint we assert:
 *   ✓  Owner receives ≥ 200 (bypass via isOwner flag)
 *   ✓  A member with the correct permission receives 200
 *   ✗  A member missing the permission receives 403
 *   ✗  Unauthenticated request receives 401
 *
 * Endpoints & their required permissions
 * ───────────────────────────────────────
 *   GET  /kitchen                requireSubscription("professional") + requirePermission("order_prepare")
 *   GET  /delivery               requireSubscription("professional") + requirePermission("order_deliver")
 *   GET  /cashier                requireSubscription("professional") + requirePermission("close_sessions")
 *   GET  /overview               requirePermission("view_orders")
 *   GET  /:orderId               requireAnyPermission("view_orders","order_prepare","order_deliver","close_sessions")
 *   PATCH/:orderId/status        requireAnyPermission("update_orders","order_prepare","order_deliver")
 *   POST /:orderId/accept        requireAnyPermission("update_orders","order_prepare","order_deliver")
 *   POST /:orderId/claim         requireSubscription + requireAnyPermission("update_orders","order_deliver")
 *   POST /:orderId/resend-notification  requireSubscription + requirePermission("resend_notification")
 *   POST /:orderId/void          requirePermission("modify_order")
 *   PUT  /:orderId/items/:itemId requirePermission("modify_order")
 */

// ─── Module mocks (hoisted before all imports) ───────────────────────────────

// Pass-through validate so Zod schemas don't reject empty test bodies.
jest.mock("../src/middlewares/validate.middleware", () => ({
  validate: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Subscription always passes as "professional" — lets us focus on permissions.
jest.mock("../src/services/subscription.service", () => ({
  subscriptionService: {
    getSubscriptionStatus: jest.fn().mockResolvedValue({
      planSlug: "professional",
      active: true,
      interval: null,
      expiresAt: null,
    }),
  },
}));

// resolvePermissions controlled per-test via `permMap`.
jest.mock("../src/utils/resolve-permissions", () => ({
  resolvePermissions: jest.fn(),
}));

// Controller methods all return { ok: true } — just to produce 200.
jest.mock("../src/controllers/order.controller", () => ({
  orderController: {
    getKitchenOrders: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    getDeliveryOrders: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    getCashierOrders: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    getOrdersOverview: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    getOrder: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    updateStatus: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    acceptOrder: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    claimOrder: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    resendNotification: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    voidOrder: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
    updateOrderItem: jest.fn(
      (_req: unknown, res: { json: (v: unknown) => void }) =>
        res.json({ ok: true }),
    ),
  },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import express, { type Request, type Response, type NextFunction } from "express";
import supertest from "supertest";
import orderRoutes from "../src/routes/order.routes";
import { resolvePermissions } from "../src/utils/resolve-permissions";
import type { ResolvedPermissions } from "../src/utils/resolve-permissions";

// ─── Test-app factory ─────────────────────────────────────────────────────────

/**
 * Minimal Express app that:
 *  1. Injects `req.user` from the `X-Test-User-Id` header (simulates auth).
 *  2. Mounts the real order router with `mergeParams` so `:restaurantId` is visible.
 *  3. Converts `AppError` instances to proper HTTP responses.
 */
function buildTestApp() {
  const app = express();
  app.use(express.json());

  // Simulated auth — set req.user from header; no header → unauthenticated.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const userId = req.headers["x-test-user-id"] as string | undefined;
    if (userId) {
      req.user = { id: userId, email: `${userId}@test.com`, role: "staff" };
    }
    next();
  });

  // Mount router.  The outer `:restaurantId` param is needed for mergeParams.
  app.use("/r/:restaurantId/orders", orderRoutes);

  // AppError → HTTP response.
  app.use(
    (
      err: { statusCode?: number; message?: string },
      _req: Request,
      res: Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: NextFunction,
    ) => {
      const status = err.statusCode ?? 500;
      res.status(status).json({ error: err.message ?? "Internal error" });
    },
  );

  return app;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RESTAURANT_ID = "1";
const ORDER_ID = "999";
const ITEM_ID = "42";

// Named test-user IDs — each maps to a pre-configured ResolvedPermissions entry.
const USER = {
  owner:    "u-owner",     // isOwner:true — bypasses all permission checks
  kitchen:  "u-kitchen",   // order_prepare + update_orders
  deliver:  "u-deliver",   // order_deliver + update_orders
  cashier:  "u-cashier",   // close_sessions
  viewer:   "u-viewer",    // view_orders
  modifier: "u-modifier",  // modify_order
  notifier: "u-notifier",  // resend_notification
  noPerm:   "u-no-perm",   // member but zero permissions
  // no entry → unauthenticated (no header sent)
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

type PartialResolved = Partial<ResolvedPermissions> & {
  permissions?: Partial<Record<string, boolean>>;
};

function makeResolved(opts: PartialResolved): ResolvedPermissions {
  return {
    isSuperAdmin: false,
    isMember:     opts.isMember ?? true,
    isOwner:      opts.isOwner  ?? false,
    permissions:  (opts.permissions ?? {}) as ResolvedPermissions["permissions"],
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let app: ReturnType<typeof buildTestApp>;
let request: ReturnType<typeof supertest>;

const permMap: Map<string, ResolvedPermissions> = new Map([
  [USER.owner,    makeResolved({ isOwner: true })],
  [USER.kitchen,  makeResolved({ permissions: { order_prepare: true, update_orders: true } })],
  [USER.deliver,  makeResolved({ permissions: { order_deliver: true, update_orders: true } })],
  [USER.cashier,  makeResolved({ permissions: { close_sessions: true } })],
  [USER.viewer,   makeResolved({ permissions: { view_orders: true } })],
  [USER.modifier, makeResolved({ permissions: { modify_order: true } })],
  [USER.notifier, makeResolved({ permissions: { resend_notification: true } })],
  [USER.noPerm,   makeResolved({ permissions: {} })],
]);

beforeAll(() => {
  // Wire resolvePermissions mock to the permission map.
  (resolvePermissions as jest.Mock).mockImplementation(
    async (userId: string) => permMap.get(userId) ?? makeResolved({ isMember: false }),
  );

  app = buildTestApp();
  request = supertest(app);
});

afterEach(() => {
  // Clear cached resolvedPermissions between tests (it lives on the req object,
  // which is new each time, but clear the mock call history for clarity).
  (resolvePermissions as jest.Mock).mockClear();
});

// ─── Helper: URL builders ─────────────────────────────────────────────────────

const base = `/r/${RESTAURANT_ID}/orders`;
const orderUrl = `${base}/${ORDER_ID}`;
const itemUrl  = `${base}/${ORDER_ID}/items/${ITEM_ID}`;

/** Make an authenticated supertest agent with the given userId header. */
function as(userId: string) {
  return { header: "x-test-user-id", value: userId };
}

/** Execute a request with an optional user header; returns the response status. */
async function statusOf(
  method: "get" | "post" | "patch" | "put",
  url: string,
  userId?: string,
): Promise<number> {
  let req = request[method](url);
  if (userId) req = req.set("x-test-user-id", userId);
  const res = await req;
  return res.status;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// ── GET /kitchen ──────────────────────────────────────────────────────────────

describe("GET /kitchen  (requirePermission: order_prepare)", () => {
  const url = `${base}/kitchen`;

  it("200 — owner bypasses permission check", async () => {
    expect(await statusOf("get", url, USER.owner)).toBe(200);
  });

  it("200 — member with order_prepare", async () => {
    expect(await statusOf("get", url, USER.kitchen)).toBe(200);
  });

  it("403 — member without order_prepare (deliver user)", async () => {
    expect(await statusOf("get", url, USER.deliver)).toBe(403);
  });

  it("403 — member with no permissions", async () => {
    expect(await statusOf("get", url, USER.noPerm)).toBe(403);
  });

  it("401 — unauthenticated", async () => {
    expect(await statusOf("get", url)).toBe(401);
  });
});

// ── GET /delivery ─────────────────────────────────────────────────────────────

describe("GET /delivery  (requirePermission: order_deliver)", () => {
  const url = `${base}/delivery`;

  it("200 — owner bypasses permission check", async () => {
    expect(await statusOf("get", url, USER.owner)).toBe(200);
  });

  it("200 — member with order_deliver", async () => {
    expect(await statusOf("get", url, USER.deliver)).toBe(200);
  });

  it("403 — member without order_deliver (kitchen user)", async () => {
    expect(await statusOf("get", url, USER.kitchen)).toBe(403);
  });

  it("401 — unauthenticated", async () => {
    expect(await statusOf("get", url)).toBe(401);
  });
});

// ── GET /cashier ──────────────────────────────────────────────────────────────

describe("GET /cashier  (requirePermission: close_sessions)", () => {
  const url = `${base}/cashier`;

  it("200 — owner bypasses permission check", async () => {
    expect(await statusOf("get", url, USER.owner)).toBe(200);
  });

  it("200 — member with close_sessions", async () => {
    expect(await statusOf("get", url, USER.cashier)).toBe(200);
  });

  it("403 — member without close_sessions (kitchen user)", async () => {
    expect(await statusOf("get", url, USER.kitchen)).toBe(403);
  });

  it("401 — unauthenticated", async () => {
    expect(await statusOf("get", url)).toBe(401);
  });
});

// ── GET /overview ─────────────────────────────────────────────────────────────

describe("GET /overview  (requirePermission: view_orders)", () => {
  const url = `${base}/overview`;

  it("200 — owner bypasses permission check", async () => {
    expect(await statusOf("get", url, USER.owner)).toBe(200);
  });

  it("200 — member with view_orders", async () => {
    expect(await statusOf("get", url, USER.viewer)).toBe(200);
  });

  it("403 — member without view_orders (kitchen user)", async () => {
    expect(await statusOf("get", url, USER.kitchen)).toBe(403);
  });

  it("403 — member with no permissions", async () => {
    expect(await statusOf("get", url, USER.noPerm)).toBe(403);
  });

  it("401 — unauthenticated", async () => {
    expect(await statusOf("get", url)).toBe(401);
  });
});

// ── GET /:orderId ─────────────────────────────────────────────────────────────

describe(
  "GET /:orderId  (requireAnyPermission: view_orders | order_prepare | order_deliver | close_sessions)",
  () => {
    it("200 — owner", async () => {
      expect(await statusOf("get", orderUrl, USER.owner)).toBe(200);
    });

    it("200 — viewer (view_orders)", async () => {
      expect(await statusOf("get", orderUrl, USER.viewer)).toBe(200);
    });

    it("200 — kitchen (order_prepare)", async () => {
      expect(await statusOf("get", orderUrl, USER.kitchen)).toBe(200);
    });

    it("200 — deliver (order_deliver)", async () => {
      expect(await statusOf("get", orderUrl, USER.deliver)).toBe(200);
    });

    it("200 — cashier (close_sessions)", async () => {
      expect(await statusOf("get", orderUrl, USER.cashier)).toBe(200);
    });

    it("403 — member with only modify_order (not in allowed set)", async () => {
      expect(await statusOf("get", orderUrl, USER.modifier)).toBe(403);
    });

    it("403 — non-member", async () => {
      // resolvePermissions returns isMember:false for unknown IDs
      expect(await statusOf("get", orderUrl, "unknown-user")).toBe(403);
    });

    it("401 — unauthenticated", async () => {
      expect(await statusOf("get", orderUrl)).toBe(401);
    });
  },
);

// ── PATCH /:orderId/status ────────────────────────────────────────────────────

describe(
  "PATCH /:orderId/status  (requireAnyPermission: update_orders | order_prepare | order_deliver)",
  () => {
    const url = `${orderUrl}/status`;

    it("200 — owner", async () => {
      expect(await statusOf("patch", url, USER.owner)).toBe(200);
    });

    it("200 — kitchen (order_prepare + update_orders)", async () => {
      expect(await statusOf("patch", url, USER.kitchen)).toBe(200);
    });

    it("200 — deliver (order_deliver + update_orders)", async () => {
      expect(await statusOf("patch", url, USER.deliver)).toBe(200);
    });

    it("403 — viewer (view_orders only)", async () => {
      expect(await statusOf("patch", url, USER.viewer)).toBe(403);
    });

    it("403 — no permissions", async () => {
      expect(await statusOf("patch", url, USER.noPerm)).toBe(403);
    });

    it("401 — unauthenticated", async () => {
      expect(await statusOf("patch", url)).toBe(401);
    });
  },
);

// ── POST /:orderId/accept ─────────────────────────────────────────────────────

describe(
  "POST /:orderId/accept  (requireAnyPermission: update_orders | order_prepare | order_deliver)",
  () => {
    const url = `${orderUrl}/accept`;

    it("200 — owner", async () => {
      expect(await statusOf("post", url, USER.owner)).toBe(200);
    });

    it("200 — kitchen (order_prepare)", async () => {
      expect(await statusOf("post", url, USER.kitchen)).toBe(200);
    });

    it("403 — viewer (view_orders only)", async () => {
      expect(await statusOf("post", url, USER.viewer)).toBe(403);
    });

    it("401 — unauthenticated", async () => {
      expect(await statusOf("post", url)).toBe(401);
    });
  },
);

// ── POST /:orderId/claim ──────────────────────────────────────────────────────

describe(
  "POST /:orderId/claim  (requireSubscription + requireAnyPermission: update_orders | order_deliver)",
  () => {
    const url = `${orderUrl}/claim`;

    it("200 — owner", async () => {
      expect(await statusOf("post", url, USER.owner)).toBe(200);
    });

    it("200 — deliver (order_deliver + update_orders)", async () => {
      expect(await statusOf("post", url, USER.deliver)).toBe(200);
    });

    it("403 — kitchen (order_prepare, but NOT order_deliver or update_orders alone)", async () => {
      // kitchen has update_orders — should pass
      expect(await statusOf("post", url, USER.kitchen)).toBe(200);
    });

    it("403 — viewer (view_orders only)", async () => {
      expect(await statusOf("post", url, USER.viewer)).toBe(403);
    });

    it("401 — unauthenticated", async () => {
      expect(await statusOf("post", url)).toBe(401);
    });
  },
);

// ── POST /:orderId/resend-notification ────────────────────────────────────────

describe(
  "POST /:orderId/resend-notification  (requireSubscription + requirePermission: resend_notification)",
  () => {
    const url = `${orderUrl}/resend-notification`;

    it("200 — owner", async () => {
      expect(await statusOf("post", url, USER.owner)).toBe(200);
    });

    it("200 — notifier user (resend_notification)", async () => {
      expect(await statusOf("post", url, USER.notifier)).toBe(200);
    });

    it("403 — kitchen (order_prepare only)", async () => {
      expect(await statusOf("post", url, USER.kitchen)).toBe(403);
    });

    it("403 — viewer (view_orders only)", async () => {
      expect(await statusOf("post", url, USER.viewer)).toBe(403);
    });

    it("401 — unauthenticated", async () => {
      expect(await statusOf("post", url)).toBe(401);
    });
  },
);

// ── POST /:orderId/void ───────────────────────────────────────────────────────

describe("POST /:orderId/void  (requirePermission: modify_order)", () => {
  const url = `${orderUrl}/void`;

  it("200 — owner", async () => {
    expect(await statusOf("post", url, USER.owner)).toBe(200);
  });

  it("200 — modifier (modify_order)", async () => {
    expect(await statusOf("post", url, USER.modifier)).toBe(200);
  });

  it("403 — viewer (view_orders only)", async () => {
    expect(await statusOf("post", url, USER.viewer)).toBe(403);
  });

  it("403 — kitchen (order_prepare only)", async () => {
    expect(await statusOf("post", url, USER.kitchen)).toBe(403);
  });

  it("401 — unauthenticated", async () => {
    expect(await statusOf("post", url)).toBe(401);
  });
});

// ── PUT /:orderId/items/:itemId ───────────────────────────────────────────────

describe("PUT /:orderId/items/:itemId  (requirePermission: modify_order)", () => {
  it("200 — owner", async () => {
    expect(await statusOf("put", itemUrl, USER.owner)).toBe(200);
  });

  it("200 — modifier (modify_order)", async () => {
    expect(await statusOf("put", itemUrl, USER.modifier)).toBe(200);
  });

  it("403 — viewer (view_orders only)", async () => {
    expect(await statusOf("put", itemUrl, USER.viewer)).toBe(403);
  });

  it("403 — no permissions", async () => {
    expect(await statusOf("put", itemUrl, USER.noPerm)).toBe(403);
  });

  it("401 — unauthenticated", async () => {
    expect(await statusOf("put", itemUrl)).toBe(401);
  });
});

// ── Cross-cutting: non-member always gets 403 regardless of endpoint ──────────

describe("non-member rejection (no member record, no roles)", () => {
  // "ghost" user has no entry in permMap → resolvePermissions returns isMember:false
  const ghost = "u-ghost-no-member";

  it("403 on GET /overview for a non-member", async () => {
    expect(await statusOf("get", `${base}/overview`, ghost)).toBe(403);
  });

  it("403 on POST /:orderId/void for a non-member", async () => {
    expect(await statusOf("post", `${orderUrl}/void`, ghost)).toBe(403);
  });
});
