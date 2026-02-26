import { Router } from "express";
import { subscriptionController } from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  getStatusQuery,
  checkoutUrlBody,
  callbackQuery,
} from "../validations";

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
  validate({ query: getStatusQuery }),
  subscriptionController.getStatus.bind(subscriptionController),
);

// Authenticated — generate a checkout URL for a plan
router.post(
  "/checkout-url",
  authenticate,
  validate({ body: checkoutUrlBody }),
  subscriptionController.getCheckoutUrl.bind(subscriptionController),
);

// Public — callback from Skyend after payment
router.get(
  "/callback",
  validate({ query: callbackQuery }),
  subscriptionController.handleCallback.bind(subscriptionController),
);

export default router;
