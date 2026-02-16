import { db } from "@menugo/data";
import { orders } from "@menugo/data/schemas";
import { eq, count } from "drizzle-orm";

export async function generateOrderNumber(
  restaurantId: number,
): Promise<string> {
  const [result] = await db
    .select({ total: count() })
    .from(orders)
    .where(eq(orders.restaurantId, restaurantId));

  const next = (result?.total ?? 0) + 1;
  return `ORD-${String(next).padStart(3, "0")}`;
}
