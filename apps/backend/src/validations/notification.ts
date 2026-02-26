import { z } from "zod";
import { restaurantIdParams } from "./common";

// ─── Params ─────────────────────────────────────────────────────────

export const notificationParams = restaurantIdParams;

// ─── Bodies ─────────────────────────────────────────────────────────

export const registerTokenBody = z.object({
  token: z.string().min(1, "Token is required"),
  deviceType: z.enum(["ios", "android", "web"], {
    message: "deviceType must be ios, android, or web",
  }),
  deviceName: z.string().max(255).optional(),
});

export const unregisterTokenBody = z.object({
  token: z.string().min(1, "Token is required"),
});

export const updateSettingsBody = z.object({
  settings: z.array(
    z.object({
      triggerEvent: z.string().min(1),
      roleId: z.number().int().positive(),
      enabled: z.boolean(),
    }),
  ),
});
