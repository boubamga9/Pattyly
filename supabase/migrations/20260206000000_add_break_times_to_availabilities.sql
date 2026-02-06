-- Add optional break (pause) times to daily availability.
-- Example: open 09:00-18:00 with break 12:00-14:00 → slots 09:00-12:00 and 14:00-18:00.

ALTER TABLE "public"."availabilities"
  ADD COLUMN IF NOT EXISTS "break_start_time" time without time zone,
  ADD COLUMN IF NOT EXISTS "break_end_time" time without time zone;

-- Both break times must be set together (all or nothing).
ALTER TABLE "public"."availabilities"
  ADD CONSTRAINT "availabilities_break_both_or_neither"
  CHECK (
    ("break_start_time" IS NULL AND "break_end_time" IS NULL)
    OR ("break_start_time" IS NOT NULL AND "break_end_time" IS NOT NULL)
  );

-- If set: break start must be before break end.
ALTER TABLE "public"."availabilities"
  ADD CONSTRAINT "availabilities_break_order"
  CHECK (
    "break_start_time" IS NULL
    OR "break_start_time" < "break_end_time"
  );

-- If set: break must lie within opening hours (when opening hours are set).
ALTER TABLE "public"."availabilities"
  ADD CONSTRAINT "availabilities_break_within_hours"
  CHECK (
    "break_start_time" IS NULL
    OR (
      "start_time" IS NOT NULL
      AND "end_time" IS NOT NULL
      AND "start_time" <= "break_start_time"
      AND "break_end_time" <= "end_time"
    )
  );

COMMENT ON COLUMN "public"."availabilities"."break_start_time" IS 'Début de la pause (optionnel). Doit être avec break_end_time et dans [start_time, end_time].';
COMMENT ON COLUMN "public"."availabilities"."break_end_time" IS 'Fin de la pause (optionnel). Doit être avec break_start_time et dans [start_time, end_time].';
