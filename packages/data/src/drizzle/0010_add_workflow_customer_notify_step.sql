-- Add is_customer_notify_step column to restaurant_workflows table.
-- When true, this transition's toState is the step at which the customer
-- should be notified (e.g. order ready for pickup).
-- The NotificationOrchestrator uses this flag instead of hardcoding "_to_ready".
-- Defaults to false for existing rows; set to true for any → ready transitions
-- via the UPDATE below so the default behaviour is preserved.
ALTER TABLE "restaurant_workflows" ADD COLUMN "is_customer_notify_step" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Back-fill: any transition that arrives at "ready" is the customer-notify step.
UPDATE "restaurant_workflows" SET "is_customer_notify_step" = true WHERE "to_state" = 'ready';
