import { Router } from "express";
import { eventsController } from "../controllers/events.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { eventsParams, pollEventsQuery } from "../validations";

const router = Router({ mergeParams: true });

// ─── SSE Stream ─────────────────────────────────────────────────────
// GET /restaurants/:restaurantId/events/stream
// Requires authenticated restaurant member with view_orders permission.
router.get(
  "/stream",
  validate({ params: eventsParams }),
  requirePermission("view_orders"),
  eventsController.stream.bind(eventsController),
);

// ─── REST Polling Fallback ──────────────────────────────────────────
// GET /restaurants/:restaurantId/events/poll?since=<ISO-8601>
router.get(
  "/poll",
  validate({ params: eventsParams, query: pollEventsQuery }),
  requirePermission("view_orders"),
  eventsController.poll.bind(eventsController),
);

export default router;
