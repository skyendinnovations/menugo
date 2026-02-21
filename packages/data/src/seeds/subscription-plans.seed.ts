import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { subscriptionPlans } from "../schemas/subscription-plan.schema";

const db = drizzle(neon(process.env.DATABASE_URL!));

const plans = [
  {
    name: "Starter",
    slug: "starter",
    monthlyAmount: 0,
    yearlyAmount: 0,
    currency: "INR",
    features: [
      "Up to 5 tables",
      "Basic menu management",
      "QR code ordering",
    ],
    limits: {
      maxTables: 5,
      maxRestaurants: 1,
      hasVariants: false,
      hasStaffManagement: false,
      hasKitchenView: false,
      hasWaiterView: false,
      hasNotifications: false,
      hasAnalytics: false,
      hasPrioritySupport: false,
    },
    isActive: true,
  },
  {
    name: "Professional",
    slug: "professional",
    monthlyAmount: 99900,
    yearlyAmount: 999900,
    currency: "INR",
    features: [
      "Up to 20 tables",
      "Menu variants & modifiers",
      "Staff management",
      "Kitchen & waiter views",
      "Push notifications",
    ],
    limits: {
      maxTables: 20,
      maxRestaurants: 1,
      hasVariants: true,
      hasStaffManagement: true,
      hasKitchenView: true,
      hasWaiterView: true,
      hasNotifications: true,
      hasAnalytics: false,
      hasPrioritySupport: false,
    },
    isActive: true,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    monthlyAmount: 299900,
    yearlyAmount: 2999900,
    currency: "INR",
    features: [
      "Unlimited tables",
      "Multi-restaurant support",
      "Priority support",
      "Advanced analytics",
      "All Professional features",
    ],
    limits: {
      maxTables: null,
      maxRestaurants: 10,
      hasVariants: true,
      hasStaffManagement: true,
      hasKitchenView: true,
      hasWaiterView: true,
      hasNotifications: true,
      hasAnalytics: true,
      hasPrioritySupport: true,
    },
    isActive: true,
  },
];

async function seed() {
  console.log("Seeding subscription plans...\n");

  for (const plan of plans) {
    await db
      .insert(subscriptionPlans)
      .values(plan)
      .onConflictDoNothing();

    const price =
      plan.monthlyAmount === 0
        ? "Free"
        : `\u20B9${plan.monthlyAmount / 100}/mo or \u20B9${plan.yearlyAmount / 100}/yr`;

    console.log(`  ${plan.slug} — ${price} — ${plan.features[0]}`);
  }

  console.log("\nSeeded 3 subscription plans.");
}

seed().catch(console.error);
