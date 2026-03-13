import { availabilityRepository } from "../repositories/availability.repository";
import { shiftLogRepository } from "../repositories/shift-log.repository";
import { AppError } from "../types";
import { logger } from "../utils/logger";

class AvailabilityService {
  async clockIn(userId: string, restaurantId: number) {
    const existing = await availabilityRepository.findByUserAndRestaurant(
      userId,
      restaurantId,
    );

    if (existing?.status === "clocked_in") {
      throw new AppError(400, "Already clocked in");
    }

    const result = await availabilityRepository.clockIn(userId, restaurantId);

    // Record shift log entry
    shiftLogRepository
      .createEntry(userId, restaurantId)
      .catch((err) => logger.error("Failed to create shift log", err));

    logger.info(
      `Staff ${userId} clocked in at restaurant ${restaurantId}`,
    );
    return result;
  }

  async clockOut(userId: string, restaurantId: number) {
    const existing = await availabilityRepository.findByUserAndRestaurant(
      userId,
      restaurantId,
    );

    if (!existing || existing.status === "clocked_out") {
      throw new AppError(400, "Not currently clocked in");
    }

    const result = await availabilityRepository.clockOut(userId, restaurantId);

    // Close the shift log entry (records clockedOutAt + duration)
    shiftLogRepository
      .closeEntry(userId, restaurantId)
      .catch((err) => logger.error("Failed to close shift log", err));

    logger.info(
      `Staff ${userId} clocked out from restaurant ${restaurantId}`,
    );
    return result;
  }

  async getMyStatus(userId: string, restaurantId: number) {
    const entry = await availabilityRepository.findByUserAndRestaurant(
      userId,
      restaurantId,
    );
    return {
      isClockedIn: entry?.status === "clocked_in",
      clockedInAt: entry?.clockedInAt ?? null,
      clockedOutAt: entry?.clockedOutAt ?? null,
    };
  }

  async getAvailability(restaurantId: number) {
    const all = await availabilityRepository.findByRestaurant(restaurantId);

    const available = all.filter(
      (s) => s.status === "clocked_in" && s.activeOrderCount === 0,
    );
    const unavailable = all.filter(
      (s) => s.status !== "clocked_in" || s.activeOrderCount > 0,
    );

    return {
      available,
      unavailable,
      total: all.length,
    };
  }

  async getAvailableWaiters(restaurantId: number) {
    return availabilityRepository.findAvailableStaff(restaurantId);
  }

  async getClockedInStaff(restaurantId: number) {
    return availabilityRepository.findClockedIn(restaurantId);
  }

  async incrementActiveOrders(userId: string, restaurantId: number) {
    return availabilityRepository.incrementActiveOrders(userId, restaurantId);
  }

  async decrementActiveOrders(userId: string, restaurantId: number) {
    return availabilityRepository.decrementActiveOrders(userId, restaurantId);
  }
}

export const availabilityService = new AvailabilityService();
