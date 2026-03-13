import { logger } from "./logger";
import { deviceTokenRepository } from "../repositories/device-token.repository";

interface ExpoPushMessage {
    to: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    sound?: "default";
    priority?: "default" | "normal" | "high";
    channelId?: string;
}

interface ExpoPushTicket {
    status: "ok" | "error";
    id?: string;
    message?: string;
    details?: { error?: string };
}

/**
 * Send push notifications via Expo Push API.
 * Used for native (iOS / Android) Expo push tokens.
 * Web tokens should continue to use Firebase Admin SDK.
 */
export async function sendExpoPush(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string>,
): Promise<{ successCount: number; failureCount: number }> {
    if (tokens.length === 0) return { successCount: 0, failureCount: 0 };

    const messages: ExpoPushMessage[] = tokens.map((token) => ({
        to: token,
        title,
        body,
        data,
        sound: "default" as const,
        priority: "high" as const,
        channelId: "orders",
    }));

    try {
        // Expo Push API accepts batches of up to 100 messages
        const chunks: ExpoPushMessage[][] = [];
        for (let i = 0; i < messages.length; i += 100) {
            chunks.push(messages.slice(i, i + 100));
        }

        let totalSuccess = 0;
        let totalFailure = 0;
        const staleTokens: string[] = [];

        for (const chunk of chunks) {
            const response = await fetch(
                "https://exp.host/--/api/v2/push/send",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(chunk),
                },
            );

            if (!response.ok) {
                logger.error(
                    `Expo Push API error: ${response.status} ${response.statusText}`,
                );
                totalFailure += chunk.length;
                continue;
            }

            const result = (await response.json()) as {
                data?: ExpoPushTicket[];
            };
            const tickets: ExpoPushTicket[] = result.data ?? [];

            tickets.forEach((ticket, idx) => {
                if (ticket.status === "ok") {
                    totalSuccess++;
                } else {
                    totalFailure++;
                    if (ticket.details?.error === "DeviceNotRegistered") {
                        const t = chunk[idx];
                        if (t) staleTokens.push(t.to);
                    } else {
                        logger.warn(
                            `Expo Push failed for token: ${ticket.details?.error || ticket.message}`,
                        );
                    }
                }
            });
        }

        if (staleTokens.length > 0) {
            logger.info(
                `Removing ${staleTokens.length} stale Expo push tokens`,
            );
            await deviceTokenRepository.deactivateTokens(staleTokens);
        }

        return { successCount: totalSuccess, failureCount: totalFailure };
    } catch (error) {
        logger.error("Expo Push API request failed", error);
        return { successCount: 0, failureCount: tokens.length };
    }
}
