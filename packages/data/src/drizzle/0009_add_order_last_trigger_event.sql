-- Add last_trigger_event column to orders table.
-- Stores the most recent notification trigger event dispatched for the order
-- (e.g. "order_placed", "status_preparing_to_ready").
-- Used by resendNotification to replay the correct event without reverse-
-- engineering the workflow transition graph.
-- NULL for existing orders is safe — resendNotification falls back to
-- deriving the event from the current status when the column is NULL.
ALTER TABLE "orders" ADD COLUMN "last_trigger_event" text;
