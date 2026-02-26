import type { Request, Response, NextFunction } from "express";
import { eventBus } from "../services/event-bus.service";
import { logger } from "../utils/logger";
import type { RealTimeEvent } from "@menugo/dto";

class EventsController {
  /**
   * SSE endpoint: streams real-time events for a restaurant.
   * - Content-Type: text/event-stream
   * - Sends a `:keep-alive` comment every 15 seconds to keep the connection alive.
   * - Subscribes to EventBus; unsubscribes on client disconnect.
   */
  stream(req: Request, res: Response, _next: NextFunction) {
    const restaurantId = Number(req.params.restaurantId);

    // SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    });

    // Flush initial response
    res.write(":ok\n\n");

    // Keep-alive ping every 15 seconds
    const keepAlive = setInterval(() => {
      res.write(":keep-alive\n\n");
    }, 15_000);

    // Subscribe to restaurant events
    const handler = (event: RealTimeEvent) => {
      res.write(`id: ${event.id}\n`);
      res.write(`event: ${event.event}\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = eventBus.subscribe(restaurantId, handler);

    logger.info(
      `SSE: client connected for restaurant ${restaurantId} (user=${req.user?.id})`,
    );

    // Cleanup on disconnect
    req.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
      logger.info(
        `SSE: client disconnected from restaurant ${restaurantId} (user=${req.user?.id})`,
      );
    });
  }

  /**
   * Polling fallback: returns events since a given timestamp.
   * Query params:
   *   - since  (ISO-8601 string, required)
   */
  poll(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const since = req.query.since as string | undefined;

      if (!since) {
        return res.status(400).json({
          success: false,
          message: "Query parameter 'since' (ISO-8601) is required",
        });
      }

      // Validate ISO-8601 format
      const sinceDate = new Date(since);
      if (isNaN(sinceDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "'since' must be a valid ISO-8601 timestamp",
        });
      }

      const events = eventBus.getEventsSince(restaurantId, since);

      return res.json({
        success: true,
        data: {
          events,
          cursor: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const eventsController = new EventsController();
