import crypto from "crypto";
import { db } from "@menugo/data";
import { subscriptionPlans } from "@menugo/data/schemas";
import { eq } from "drizzle-orm";
import { AppError } from "../types";
import { SKYEND_URL, SKYEND_API_KEY, SKYEND_CALLBACK_URL } from "../envs";

interface SubscriptionStatus {
  active: boolean;
  planSlug: string | null;
  interval: string | null;
  expiresAt: string | null;
  subscriptionId: string | null;
}

// Simple in-memory cache with 5 min TTL, keyed by restaurantId
const statusCache = new Map<
  number,
  { data: SubscriptionStatus; expiresAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class SubscriptionService {
  async getPlans() {
    const plans = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true));
    return plans;
  }

  async getSubscriptionStatus(
    restaurantId: number,
  ): Promise<SubscriptionStatus> {
    // Check cache first
    const cached = statusCache.get(restaurantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    if (!SKYEND_URL || !SKYEND_API_KEY) {
      // If Skyend is not configured, return inactive (free tier)
      return {
        active: false,
        planSlug: null,
        interval: null,
        expiresAt: null,
        subscriptionId: null,
      };
    }

    try {
      const response = await fetch(
        `${SKYEND_URL}/api/v1/subscriptions/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": SKYEND_API_KEY,
          },
          body: JSON.stringify({ restaurantId: String(restaurantId) }),
        },
      );

      if (!response.ok) {
        const status: SubscriptionStatus = {
          active: false,
          planSlug: null,
          interval: null,
          expiresAt: null,
          subscriptionId: null,
        };
        statusCache.set(restaurantId, {
          data: status,
          expiresAt: Date.now() + CACHE_TTL,
        });
        return status;
      }

      const data = await response.json();
      const status: SubscriptionStatus = {
        active: data.active ?? false,
        planSlug: data.planSlug ?? null,
        interval: data.interval ?? null,
        expiresAt: data.expiresAt ?? null,
        subscriptionId: data.subscriptionId ?? null,
      };

      statusCache.set(restaurantId, {
        data: status,
        expiresAt: Date.now() + CACHE_TTL,
      });

      return status;
    } catch {
      return {
        active: false,
        planSlug: null,
        interval: null,
        expiresAt: null,
        subscriptionId: null,
      };
    }
  }

  async generateCheckoutUrl(
    restaurantId: number,
    planSlug: string,
    interval: "monthly" | "yearly",
  ): Promise<string> {
    if (!SKYEND_URL || !SKYEND_API_KEY) {
      throw new AppError(503, "Payment service is not configured");
    }

    // Verify the plan exists
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug))
      .limit(1);

    if (!plan) {
      throw new AppError(404, "Plan not found");
    }

    if (plan.slug === "starter") {
      throw new AppError(
        400,
        "Starter plan is free and does not require payment",
      );
    }

    const amount =
      interval === "yearly" ? plan.yearlyAmount : plan.monthlyAmount;

    // Build checkout params matching Skyend's expected schema
    const params: Record<string, string> = {
      product: "menugo",
      plan: plan.name,
      amount: String(amount),
      currency: plan.currency,
      interval,
      callback_url:
        SKYEND_CALLBACK_URL ||
        "http://localhost:5000/api/subscription/callback",
    };

    // Generate HMAC signature
    const sorted = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");

    const signature = crypto
      .createHmac("sha256", SKYEND_API_KEY)
      .update(sorted)
      .digest("hex");

    const queryString = new URLSearchParams({
      ...params,
      signature,
    }).toString();

    return `${SKYEND_URL}/checkout?${queryString}`;
  }

  async handleCallback(subscriptionId: string, status: string) {
    // Invalidate entire cache since we don't know which restaurant this is for
    statusCache.clear();

    return {
      subscriptionId,
      status,
      processed: true,
    };
  }
}

export const subscriptionService = new SubscriptionService();
