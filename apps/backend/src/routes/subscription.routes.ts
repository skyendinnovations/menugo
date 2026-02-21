import { Router } from "express";
import { subscriptionController } from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// Public — list available plans
router.get(
  "/plans",
  subscriptionController.getPlans.bind(subscriptionController),
);

// Authenticated — get current user's subscription status
router.get(
  "/status",
  authenticate,
  subscriptionController.getStatus.bind(subscriptionController),
);

// Authenticated — generate a checkout URL for a plan
router.post(
  "/checkout-url",
  authenticate,
  subscriptionController.getCheckoutUrl.bind(subscriptionController),
);

// Public — callback from Skyend after payment
router.get(
  "/callback",
  subscriptionController.handleCallback.bind(subscriptionController),
);

export default router;
