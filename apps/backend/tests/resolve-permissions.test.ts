/**
 * Unit tests for resolvePermissions (Part 8.1 — deferred 1.6)
 *
 * Tests every logical branch of the two-query permission resolver
 * without touching a real database.
 *
 * Coverage:
 *   1. Unknown user row          → fully-denied result (safe fallback)
 *   2. Super-admin               → isSuperAdmin:true, skips role query
 *   3. Owner via memberIsOwner   → isOwner:true, isMember:true
 *   4. Owner via role named "owner" (backward compat) → isOwner:true
 *   5. Non-member (no member record, no role assignments) → isMember:false
 *   6. Member with no permissions → isMember:true, permissions:{}
 *   7. Multi-role permission merge → union of all `true` values, no false leakage
 */

// ─── Module mocks (hoisted before all imports) ───────────────────────────────

// Provide a stub db.select that we can configure per-test.
jest.mock("@menugo/data", () => ({
  db: { select: jest.fn() },
}));

// Provide stub column symbols — the mock query builder ignores them at runtime
// but TypeScript needs them to compile and they must not be `undefined` so that
// calling eq(col, value) doesn't throw.
jest.mock("@menugo/data/schemas", () => ({
  user: { id: "user.id", isSuperAdmin: "user.isSuperAdmin" },
  restaurantMembers: {
    userId: "rm.userId",
    restaurantId: "rm.restaurantId",
    isOwner: "rm.isOwner",
    isActive: "rm.isActive",
  },
  userRoles: {
    userId: "ur.userId",
    restaurantId: "ur.restaurantId",
    roleId: "ur.roleId",
  },
  roles: {
    id: "r.id",
    name: "r.name",
    permissions: "r.permissions",
    isActive: "r.isActive",
  },
}));

// drizzle-orm condition builders are called inside resolvePermissions but their
// return values are only ever passed to the mocked query chain — we never
// inspect them.  Return opaque tokens so nothing throws.
jest.mock("drizzle-orm", () => ({
  eq: (..._args: unknown[]) => "_eq_",
  and: (..._args: unknown[]) => "_and_",
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { db } from "@menugo/data";
import { resolvePermissions } from "../src/utils/resolve-permissions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a chainable Drizzle-like query object that:
 *   - Returns `this` from every builder method (.from, .leftJoin, etc.)
 *   - Resolves `result` when:
 *       • `.limit()` is called  (Query 1 pattern: ...where().limit(n))
 *       • the chain itself is `await`ed (Query 2 pattern: ...where())
 */
function makeChain(result: unknown[]) {
  const chain: Record<string, unknown> = {
    from:      jest.fn().mockReturnThis(),
    leftJoin:  jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where:     jest.fn().mockReturnThis(),
    limit:     jest.fn(() => Promise.resolve(result)),
    // Make the chain itself a thenable so `await chain` returns `result`.
    then: (
      resolve: (v: unknown) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
    catch:   (h: (e: unknown) => unknown) => Promise.resolve(result).catch(h),
    finally: (h: () => void) => Promise.resolve(result).finally(h),
  };
  return chain;
}

/** Seed both DB calls for a single test. */
function seedQueries(query1Rows: unknown[], query2Rows: unknown[]) {
  (db.select as jest.Mock)
    .mockReturnValueOnce(makeChain(query1Rows))
    .mockReturnValueOnce(makeChain(query2Rows));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("resolvePermissions", () => {
  const USER_ID = "user-abc";
  const RESTAURANT_ID = 1;

  beforeEach(() => {
    // resetAllMocks clears both call history AND any unconsumed
    // mockReturnValueOnce values — essential here because the super-admin
    // test short-circuits after Query 1, leaving the seeded Query-2 chain in
    // the queue.  clearAllMocks() would leave that stale value for the next test.
    jest.resetAllMocks();
  });

  // ── 1. Unknown user ─────────────────────────────────────────────────────────

  it("returns fully-denied when the user row does not exist", async () => {
    // Query 1 returns empty → userWithMembership is undefined.
    (db.select as jest.Mock).mockReturnValueOnce(makeChain([]));

    const result = await resolvePermissions(USER_ID, RESTAURANT_ID);

    expect(result).toEqual<typeof result>({
      isSuperAdmin: false,
      isMember: false,
      isOwner: false,
      permissions: {},
    });
    // Query 2 must NOT have been executed.
    expect((db.select as jest.Mock).mock.calls).toHaveLength(1);
  });

  // ── 2. Super-admin short-circuit ────────────────────────────────────────────

  it("returns super-admin access and skips the role query", async () => {
    seedQueries(
      [{ isSuperAdmin: true, memberIsOwner: null, memberIsActive: null }],
      [], // should never be used
    );

    const result = await resolvePermissions(USER_ID, RESTAURANT_ID);

    expect(result.isSuperAdmin).toBe(true);
    expect(result.isOwner).toBe(true);
    expect(result.isMember).toBe(true);
    // Super-admin skips Query 2.
    expect((db.select as jest.Mock).mock.calls).toHaveLength(1);
  });

  // ── 3. Owner via memberIsOwner flag ─────────────────────────────────────────

  it("marks isOwner:true when memberIsOwner is set on the membership record", async () => {
    seedQueries(
      [{ isSuperAdmin: false, memberIsOwner: true, memberIsActive: true }],
      [],
    );

    const result = await resolvePermissions(USER_ID, RESTAURANT_ID);

    expect(result.isOwner).toBe(true);
    expect(result.isMember).toBe(true);
    expect(result.isSuperAdmin).toBe(false);
  });

  // ── 4. Owner via role name (backward compatibility) ─────────────────────────

  it('marks isOwner:true when the user has a role named "owner"', async () => {
    seedQueries(
      [{ isSuperAdmin: false, memberIsOwner: false, memberIsActive: true }],
      [{ roleName: "owner", permissions: {} }],
    );

    const result = await resolvePermissions(USER_ID, RESTAURANT_ID);

    expect(result.isOwner).toBe(true);
    expect(result.isMember).toBe(true);
  });

  // ── 5. Non-member ────────────────────────────────────────────────────────────

  it("returns isMember:false when the user has no membership record and no roles", async () => {
    // memberIsActive is null (no restaurant_members row), no role assignments.
    seedQueries(
      [{ isSuperAdmin: false, memberIsOwner: null, memberIsActive: null }],
      [],
    );

    const result = await resolvePermissions(USER_ID, RESTAURANT_ID);

    expect(result.isMember).toBe(false);
    expect(result.isOwner).toBe(false);
    expect(result.permissions).toEqual({});
  });

  // ── 6. Member with no permissions ────────────────────────────────────────────

  it("returns isMember:true with empty permissions when the role has no permissions set", async () => {
    seedQueries(
      [{ isSuperAdmin: false, memberIsOwner: false, memberIsActive: true }],
      [{ roleName: "staff", permissions: {} }],
    );

    const result = await resolvePermissions(USER_ID, RESTAURANT_ID);

    expect(result.isMember).toBe(true);
    expect(result.permissions).toEqual({});
  });

  // ── 7. Multi-role permission merge ───────────────────────────────────────────

  it("merges permissions from all assigned roles (union of true values, no false leakage)", async () => {
    seedQueries(
      [{ isSuperAdmin: false, memberIsOwner: false, memberIsActive: true }],
      [
        // Role A: can prepare and view orders.
        {
          roleName: "kitchen",
          permissions: {
            order_prepare: true,
            view_orders: true,
            order_deliver: false, // explicit false must NOT bleed through
          },
        },
        // Role B: can deliver — adds to the merged set.
        {
          roleName: "delivery",
          permissions: {
            order_deliver: true,
            close_sessions: true,
          },
        },
      ],
    );

    const result = await resolvePermissions(USER_ID, RESTAURANT_ID);

    expect(result.isMember).toBe(true);
    expect(result.isOwner).toBe(false);

    // All true values from both roles are present.
    expect(result.permissions.order_prepare).toBe(true);
    expect(result.permissions.view_orders).toBe(true);
    expect(result.permissions.order_deliver).toBe(true);
    expect(result.permissions.close_sessions).toBe(true);

    // false values from one role must NOT set the key to false — they're
    // simply absent (the merge only records `true` entries).
    // We verify this by checking the explicit false from Role A.
    // After Role B sets order_deliver:true, the key is true (not false).
    // If only Role A was present without Role B, order_deliver should be absent:
    expect(
      Object.prototype.hasOwnProperty.call(result.permissions, "order_deliver"),
    ).toBe(true); // present because Role B adds it as true
    // But if it had only been false in Role A, it must NOT be present:
    // (We can't test that in a single call; it's covered by the "no false bleed"
    // expectation above — order_deliver:false in Role A is overridden by true
    // from Role B, not set to false.)
  });

  it("excludes keys that are only set to false across all roles", async () => {
    seedQueries(
      [{ isSuperAdmin: false, memberIsOwner: false, memberIsActive: true }],
      [{ roleName: "viewer", permissions: { order_prepare: false, view_orders: false } }],
    );

    const result = await resolvePermissions(USER_ID, RESTAURANT_ID);

    // Both permissions are explicitly false in the role — they must NOT appear
    // in the merged result.
    expect(
      Object.prototype.hasOwnProperty.call(result.permissions, "order_prepare"),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(result.permissions, "view_orders"),
    ).toBe(false);
  });
});
