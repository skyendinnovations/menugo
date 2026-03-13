/**
 * Unit tests for the three permission middleware factories (Part 8.2)
 *
 *   requirePermission(…perms)     — ALL permissions must be held
 *   requireAnyPermission(…perms)  — ANY one permission is sufficient
 *   requireMembership             — active membership, no specific perm needed
 *
 * The DB is kept at arm's length: `resolvePermissions` is fully mocked so
 * every test is deterministic and runs without a database connection.
 *
 * Coverage (12 cases):
 *   01. No req.user                         → 401 Not authenticated
 *   02. Invalid (NaN) restaurantId           → 400 Invalid restaurant ID
 *   03. Super-admin flag                     → bypasses all checks, passes
 *   04. Owner flag                           → bypasses all checks, passes
 *   05. Non-member                           → 403 not a member
 *   06. Member WITH all required permissions → passes
 *   07. Member MISSING one required perm     → 403 Insufficient permissions
 *   08. requireAnyPermission: has ≥1 perm    → passes
 *   09. requireAnyPermission: has none       → 403 Insufficient permissions
 *   10. requireMembership: member            → passes
 *   11. requireMembership: non-member        → 403 not a member
 *   12. Cache: resolvePermissions called ≤1× per request chain
 */

// ─── Module mocks (hoisted before all imports) ───────────────────────────────

jest.mock("../src/utils/resolve-permissions", () => ({
  resolvePermissions: jest.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import {
  requirePermission,
  requireAnyPermission,
  requireMembership,
} from "../src/middlewares/permission.middleware";
import { resolvePermissions } from "../src/utils/resolve-permissions";
import type { ResolvedPermissions } from "../src/utils/resolve-permissions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Partial permission object cast helper — avoids having to enumerate every key. */
type PartialPermissions = Partial<Record<string, boolean>>;

interface MakeReqOptions {
  userId?: string | null;
  restaurantId?: string;
  resolvedPermissions?: ResolvedPermissions;
}

function makeReq(opts: MakeReqOptions = {}): Request {
  const req: Partial<Request> & { resolvedPermissions?: ResolvedPermissions } =
    {
      params: { restaurantId: opts.restaurantId ?? "1" },
      resolvedPermissions: opts.resolvedPermissions,
    };
  if (opts.userId !== null) {
    req.user = {
      id: opts.userId ?? "user-1",
      email: "test@example.com",
      role: "staff",
    };
  }
  return req as Request;
}

function makeRes(): Response {
  return {} as Response;
}

function makeNext(): jest.Mock<void, [unknown?]> {
  return jest.fn();
}

/** Shorthand: build a ResolvedPermissions object from partial permissions. */
function resolved(
  overrides: Partial<ResolvedPermissions> & { permissions?: PartialPermissions },
): ResolvedPermissions {
  return {
    isSuperAdmin: overrides.isSuperAdmin ?? false,
    isMember:     overrides.isMember     ?? false,
    isOwner:      overrides.isOwner      ?? false,
    permissions:  (overrides.permissions ?? {}) as ResolvedPermissions["permissions"],
  };
}

/** Runs a single middleware and waits for it to call next(). */
async function runMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request,
): Promise<{ next: jest.Mock; calledWithError: unknown | undefined }> {
  const next = makeNext();
  await middleware(req, makeRes(), next);
  return {
    next,
    calledWithError: next.mock.calls[0]?.[0],
  };
}

// ─── requirePermission ────────────────────────────────────────────────────────

describe("requirePermission", () => {
  const mockResolve = resolvePermissions as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 01. No req.user → 401 ─────────────────────────────────────────────────

  it("calls next(AppError 401) when req.user is absent", async () => {
    const req = makeReq({ userId: null });
    const { calledWithError } = await runMiddleware(
      requirePermission("view_orders"),
      req,
    );

    expect(calledWithError).toMatchObject({ statusCode: 401 });
    expect(mockResolve).not.toHaveBeenCalled();
  });

  // ── 02. Invalid restaurantId → 400 ────────────────────────────────────────

  it("calls next(AppError 400) when restaurantId is not numeric", async () => {
    const req = makeReq({ restaurantId: "abc" });
    const { calledWithError } = await runMiddleware(
      requirePermission("view_orders"),
      req,
    );

    expect(calledWithError).toMatchObject({ statusCode: 400 });
    expect(mockResolve).not.toHaveBeenCalled();
  });

  // ── 03. Super-admin bypass ────────────────────────────────────────────────

  it("calls next() with no error when the user is a super-admin", async () => {
    mockResolve.mockResolvedValue(
      resolved({ isSuperAdmin: true, isOwner: true, isMember: true }),
    );

    const req = makeReq();
    const { calledWithError } = await runMiddleware(
      requirePermission("view_orders"),
      req,
    );

    expect(calledWithError).toBeUndefined();
  });

  // ── 04. Owner bypass ──────────────────────────────────────────────────────

  it("calls next() with no error when the user is an owner", async () => {
    mockResolve.mockResolvedValue(
      resolved({ isOwner: true, isMember: true }),
    );

    const req = makeReq();
    const { calledWithError } = await runMiddleware(
      requirePermission("modify_order"),
      req,
    );

    expect(calledWithError).toBeUndefined();
  });

  // ── 05. Non-member → 403 ──────────────────────────────────────────────────

  it("calls next(AppError 403 'not a member') when user has no membership", async () => {
    mockResolve.mockResolvedValue(resolved({ isMember: false }));

    const req = makeReq();
    const { calledWithError } = await runMiddleware(
      requirePermission("view_orders"),
      req,
    );

    expect(calledWithError).toMatchObject({
      statusCode: 403,
      message: expect.stringContaining("not a member"),
    });
  });

  // ── 06. Member WITH all required permissions → passes ─────────────────────

  it("calls next() when the member holds all required permissions", async () => {
    mockResolve.mockResolvedValue(
      resolved({
        isMember: true,
        permissions: { view_orders: true, order_prepare: true },
      }),
    );

    const req = makeReq();
    const { calledWithError } = await runMiddleware(
      requirePermission("view_orders", "order_prepare"),
      req,
    );

    expect(calledWithError).toBeUndefined();
  });

  // ── 07. Member MISSING one required perm → 403 ────────────────────────────

  it("calls next(AppError 403 'Insufficient') when the member is missing a required perm", async () => {
    mockResolve.mockResolvedValue(
      resolved({
        isMember: true,
        permissions: { view_orders: true }, // order_prepare NOT present
      }),
    );

    const req = makeReq();
    const { calledWithError } = await runMiddleware(
      requirePermission("view_orders", "order_prepare"),
      req,
    );

    expect(calledWithError).toMatchObject({
      statusCode: 403,
      message: expect.stringContaining("Insufficient"),
    });
  });

  // ── 12. Caching — resolvePermissions called at most once per req chain ─────

  it("does not call resolvePermissions a second time when resolvedPermissions is already cached on req", async () => {
    // Pre-populate the cache (as if a previous middleware already ran).
    const cached = resolved({ isMember: true, permissions: { view_orders: true } });
    const req = makeReq({ resolvedPermissions: cached });

    const { calledWithError } = await runMiddleware(
      requirePermission("view_orders"),
      req,
    );

    expect(calledWithError).toBeUndefined();
    // resolvePermissions must NOT have been called — we read from the cache.
    expect(mockResolve).not.toHaveBeenCalled();
  });
});

// ─── requireAnyPermission ─────────────────────────────────────────────────────

describe("requireAnyPermission", () => {
  const mockResolve = resolvePermissions as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 08. Has at least one matching perm → passes ───────────────────────────

  it("calls next() when the member holds at least one of the required permissions", async () => {
    mockResolve.mockResolvedValue(
      resolved({
        isMember: true,
        // has order_prepare but not update_orders or order_deliver
        permissions: { order_prepare: true },
      }),
    );

    const req = makeReq();
    const { calledWithError } = await runMiddleware(
      requireAnyPermission("update_orders", "order_prepare", "order_deliver"),
      req,
    );

    expect(calledWithError).toBeUndefined();
  });

  // ── 09. Has none of the required perms → 403 ─────────────────────────────

  it("calls next(AppError 403 'Insufficient') when the member holds none of the required permissions", async () => {
    mockResolve.mockResolvedValue(
      resolved({
        isMember: true,
        permissions: { view_orders: true }, // none of update_orders / prepare / deliver
      }),
    );

    const req = makeReq();
    const { calledWithError } = await runMiddleware(
      requireAnyPermission("update_orders", "order_prepare", "order_deliver"),
      req,
    );

    expect(calledWithError).toMatchObject({
      statusCode: 403,
      message: expect.stringContaining("Insufficient"),
    });
  });

  // Inherits 401 / 400 / owner-bypass behaviour from the same factory logic.
  // Those paths are fully covered by requirePermission tests above.
});

// ─── requireMembership ────────────────────────────────────────────────────────

describe("requireMembership", () => {
  const mockResolve = resolvePermissions as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 10. Active member → passes ────────────────────────────────────────────

  it("calls next() for any active member regardless of permissions", async () => {
    mockResolve.mockResolvedValue(
      resolved({ isMember: true, permissions: {} }),
    );

    const req = makeReq();
    const { calledWithError } = await runMiddleware(requireMembership, req);

    expect(calledWithError).toBeUndefined();
  });

  // ── 11. Non-member → 403 ─────────────────────────────────────────────────

  it("calls next(AppError 403 'not a member') for a non-member", async () => {
    mockResolve.mockResolvedValue(resolved({ isMember: false }));

    const req = makeReq();
    const { calledWithError } = await runMiddleware(requireMembership, req);

    expect(calledWithError).toMatchObject({
      statusCode: 403,
      message: expect.stringContaining("not a member"),
    });
  });

  // Super-admin bypasses membership check (isSuperAdmin || isMember path).
  it("calls next() for a super-admin even without a restaurant membership", async () => {
    mockResolve.mockResolvedValue(
      resolved({ isSuperAdmin: true, isMember: false }),
    );

    const req = makeReq();
    const { calledWithError } = await runMiddleware(requireMembership, req);

    expect(calledWithError).toBeUndefined();
  });
});
