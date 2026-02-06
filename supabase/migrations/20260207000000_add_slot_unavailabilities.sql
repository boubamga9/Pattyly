-- Indisponibilités de créneaux pour des jours précis (ex. le 15 février 14h-16h).
-- Complète unavailabilities (plages de dates, jours entiers).
CREATE TABLE IF NOT EXISTS "public"."slot_unavailabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "unavailable_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "slot_unavailabilities_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slot_unavailabilities_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE,
    CONSTRAINT "slot_unavailabilities_time_check" CHECK ("start_time" < "end_time")
);

ALTER TABLE "public"."slot_unavailabilities" OWNER TO "postgres";
COMMENT ON TABLE "public"."slot_unavailabilities" IS 'Créneaux horaires bloqués pour des dates précises (un jour donné, plage heure début–fin).';

CREATE INDEX IF NOT EXISTS "idx_slot_unavailabilities_shop_date"
    ON "public"."slot_unavailabilities" USING "btree" ("shop_id", "unavailable_date");

CREATE OR REPLACE TRIGGER "update_slot_unavailabilities_updated_at"
    BEFORE UPDATE ON "public"."slot_unavailabilities"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

ALTER TABLE "public"."slot_unavailabilities" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete own slot_unavailabilities" ON "public"."slot_unavailabilities"
    FOR DELETE USING (("shop_id" IN ( SELECT "shops"."id" FROM "public"."shops" WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));

CREATE POLICY "Users can insert own slot_unavailabilities" ON "public"."slot_unavailabilities"
    FOR INSERT WITH CHECK (("shop_id" IN ( SELECT "shops"."id" FROM "public"."shops" WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));

CREATE POLICY "Users can update own slot_unavailabilities" ON "public"."slot_unavailabilities"
    FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id" FROM "public"."shops" WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));

CREATE POLICY "Users can view own slot_unavailabilities" ON "public"."slot_unavailabilities"
    FOR SELECT USING ((("shop_id" IN ( SELECT "shops"."id" FROM "public"."shops" WHERE ("shops"."is_active" = true))) OR ("shop_id" IN ( SELECT "shops"."id" FROM "public"."shops" WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));

GRANT ALL ON TABLE "public"."slot_unavailabilities" TO "anon";
GRANT ALL ON TABLE "public"."slot_unavailabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."slot_unavailabilities" TO "service_role";
