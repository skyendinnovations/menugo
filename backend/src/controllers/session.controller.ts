import type { Request, Response, NextFunction } from "express";
import { sessionService } from "../services/session.service";

class SessionController {
  async getSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const restaurantId = Number(req.params.restaurantId);
      const { active } = req.query;

      const sessions =
        active === "true"
          ? await sessionService.getActiveSessions(restaurantId)
          : await sessionService.getAllSessions(restaurantId);

      return res.json({ success: true, data: sessions });
    } catch (error) {
      next(error);
    }
  }

  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.sessionId);
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid session ID" });
      }
      const session = await sessionService.getSessionById(id);
      return res.json({ success: true, data: session });
    } catch (error) {
      next(error);
    }
  }

  async closeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.sessionId);
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: "Invalid session ID" });
      }
      const userId = req.user!.id;
      const session = await sessionService.closeSession(id, userId);
      return res.json({ success: true, data: session, message: "Session closed" });
    } catch (error) {
      next(error);
    }
  }
}

export const sessionController = new SessionController();
