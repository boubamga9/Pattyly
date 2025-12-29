-- MIGRATION INITIALE (PRODUCTION)
-- Projet: mxlknaajiwtcnyhjpkiz
-- Générée le: 2025-12-29T17:32:52.935Z
-- Source de vérité: base de production Supabase
-- ⚠️ Ne jamais modifier cette migration après application

-- ⚠️ ATTENTION: Cette migration supprime et recrée le schéma public
-- Toutes les données existantes seront perdues !

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Supprimer le schéma public existant et tout son contenu
DROP SCHEMA IF EXISTS "public" CASCADE;

-- Recréer le schéma public
CREATE SCHEMA "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'Partner system tables removed - now using PayPal for payments instead of partner referrals';



CREATE TYPE "public"."form_field_type" AS ENUM (
    'short-text',
    'long-text',
    'number',
    'single-select',
    'multi-select'
);


ALTER TYPE "public"."form_field_type" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'quoted',
    'confirmed',
    'ready',
    'refused',
    'completed',
    'to_verify'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."refused_by" AS ENUM (
    'pastry_chef',
    'client'
);


ALTER TYPE "public"."refused_by" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'inactive'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'pastry_chef',
    'admin',
    'partner'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_distance_km"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    R NUMERIC := 6371; -- Earth radius in km
    dLat NUMERIC;
    dLon NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    -- Convert degrees to radians
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    
    -- Haversine formula
    a := SIN(dLat / 2) * SIN(dLat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLon / 2) * SIN(dLon / 2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    
    RETURN R * c;
END;
$$;


ALTER FUNCTION "public"."calculate_distance_km"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_early_adopter_eligibility"("p_profile_id" "uuid") RETURNS TABLE("is_eligible" boolean, "already_early_adopter" boolean, "offer_already_shown" boolean, "spots_remaining" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_early_adopter_count INTEGER;
    v_max_early_adopters INTEGER := 30;
    v_is_early_adopter BOOLEAN;
    v_offer_shown_at TIMESTAMP WITH TIME ZONE;
    v_spots_remaining INTEGER;
    v_is_eligible BOOLEAN;
BEGIN
    -- Récupérer les infos de l'utilisateur
    SELECT 
        COALESCE(p.is_early_adopter, FALSE),
        p.early_adopter_offer_shown_at
    INTO 
        v_is_early_adopter,
        v_offer_shown_at
    FROM profiles p
    WHERE p.id = p_profile_id;

    -- Compter le nombre d'early adopters actuels
    SELECT COUNT(*)
    INTO v_early_adopter_count
    FROM profiles
    WHERE is_early_adopter = TRUE;

    -- Calculer les places restantes
    v_spots_remaining := v_max_early_adopters - v_early_adopter_count;
    v_spots_remaining := GREATEST(v_spots_remaining, 0); -- Minimum 0

    -- Déterminer l'éligibilité
    v_is_eligible := 
        v_offer_shown_at IS NULL AND  -- Offre jamais vue
        NOT v_is_early_adopter AND    -- Pas déjà early adopter
        v_spots_remaining > 0;        -- Il reste des places

    -- Retourner le résultat
    RETURN QUERY SELECT 
        v_is_eligible,
        v_is_early_adopter,
        v_offer_shown_at IS NOT NULL,
        v_spots_remaining;
END;
$$;


ALTER FUNCTION "public"."check_early_adopter_eligibility"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_max_product_images"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  image_count INTEGER;
BEGIN
  -- Count existing images for this product
  SELECT COUNT(*) INTO image_count
  FROM product_images
  WHERE product_id = NEW.product_id;

  -- If this is an INSERT and we already have 3 images, prevent it
  IF TG_OP = 'INSERT' AND image_count >= 3 THEN
    RAISE EXCEPTION 'Un produit ne peut pas avoir plus de 3 images';
  END IF;

  -- If this is an UPDATE and we would have more than 3 images, prevent it
  IF TG_OP = 'UPDATE' AND NEW.product_id != OLD.product_id THEN
    SELECT COUNT(*) INTO image_count
    FROM product_images
    WHERE product_id = NEW.product_id AND id != NEW.id;
    
    IF image_count >= 3 THEN
      RAISE EXCEPTION 'Un produit ne peut pas avoir plus de 3 images';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_max_product_images"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_order_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_plan TEXT;
    v_order_count INTEGER;
    v_order_limit INTEGER;
    v_remaining INTEGER;
    v_is_limit_reached BOOLEAN;
    v_result JSON;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT get_user_plan(p_profile_id, 'prod_Selcz36pAfV3vV', 'prod_Selbd3Ne2plHqG')
    INTO v_plan;
    
    -- Si pas de plan, utiliser 'free' par défaut
    IF v_plan IS NULL THEN
        v_plan := 'free';
    END IF;
    
    -- Obtenir la limite selon le plan
    v_order_limit := get_order_limit(v_plan);
    
    -- Compter les commandes du mois
    v_order_count := get_monthly_order_count(p_shop_id);
    
    -- Calculer les commandes restantes
    v_remaining := GREATEST(0, v_order_limit - v_order_count);
    
    -- Vérifier si la limite est atteinte
    v_is_limit_reached := v_order_count >= v_order_limit;
    
    -- Construire le résultat JSON
    SELECT json_build_object(
        'plan', v_plan,
        'orderCount', v_order_count,
        'orderLimit', v_order_limit,
        'remaining', v_remaining,
        'isLimitReached', v_is_limit_reached
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."check_order_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_order_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") IS 'Vérifie si la limite de commandes est atteinte pour un shop et retourne les statistiques';



CREATE OR REPLACE FUNCTION "public"."check_premium_profiles"("p_profile_ids" "uuid"[], "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text") RETURNS "uuid"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_premium_profile_ids UUID[];
BEGIN
    -- Récupérer les profile_ids qui ont un abonnement premium actif
    SELECT ARRAY_AGG(DISTINCT profile_id)
    INTO v_premium_profile_ids
    FROM user_products
    WHERE profile_id = ANY(p_profile_ids)
        AND subscription_status = 'active'
        AND stripe_product_id = p_premium_product_id;
    
    -- Retourner un array vide si aucun résultat
    RETURN COALESCE(v_premium_profile_ids, ARRAY[]::UUID[]);
END;
$$;


ALTER FUNCTION "public"."check_premium_profiles"("p_profile_ids" "uuid"[], "p_premium_product_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_premium_profiles"("p_profile_ids" "uuid"[], "p_premium_product_id" "text") IS 'Vérifie quels profiles ont un abonnement premium actif. Accessible aux utilisateurs anonymes pour afficher le badge "vérifié".';



CREATE OR REPLACE FUNCTION "public"."check_product_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$DECLARE
    v_plan TEXT;
    v_product_count INTEGER;
    v_product_limit INTEGER;
    v_remaining INTEGER;
    v_is_limit_reached BOOLEAN;
    v_result JSON;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT get_user_plan(p_profile_id, 'prod_Selcz36pAfV3vV', 'prod_Selbd3Ne2plHqG')
    INTO v_plan;
    
    -- Si pas de plan, utiliser 'free' par défaut
    IF v_plan IS NULL THEN
        v_plan := 'free';
    END IF;
    
    -- Obtenir la limite selon le plan
    v_product_limit := get_product_limit(v_plan);
    
    -- Compter les produits du shop
    SELECT COUNT(*)
    INTO v_product_count
    FROM products
    WHERE shop_id = p_shop_id;
    
    -- Calculer les produits restants
    v_remaining := GREATEST(0, v_product_limit - v_product_count);
    
    -- Vérifier si la limite est atteinte
    v_is_limit_reached := v_product_count >= v_product_limit;
    
    -- Construire le résultat JSON
    SELECT json_build_object(
        'plan', v_plan,
        'productCount', v_product_count,
        'productLimit', v_product_limit,
        'remaining', v_remaining,
        'isLimitReached', v_is_limit_reached
    ) INTO v_result;
    
    RETURN v_result;
END;$$;


ALTER FUNCTION "public"."check_product_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_product_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") IS 'Vérifie si la limite de produits est atteinte pour un shop et retourne les statistiques';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_admin_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    DELETE FROM admin_sessions
    WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_admin_sessions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_admin_sessions"() IS 'Deletes expired admin sessions';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_transfers"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  DELETE FROM shop_transfers 
  WHERE expires_at < NOW() AND used_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_transfers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_shop_customizations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    INSERT INTO shop_customizations (
        shop_id,
        button_color,
        button_text_color,
        text_color,
        icon_color,
        secondary_text_color,
        background_color
    )
    VALUES (
        NEW.id,
        '#ff6f61',
        '#ffffff',
        '#333333',
        '#6b7280',
        '#333333',
        '#fafafa'
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_shop_customizations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_shop_policies"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO shop_policies (shop_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_shop_policies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_shop_with_availabilities"("p_profile_id" "uuid", "p_name" "text", "p_bio" "text", "p_slug" "text", "p_logo_url" "text", "p_instagram" "text", "p_tiktok" "text", "p_website" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    shop_id UUID;
    result JSON;
    v_user_email TEXT;
BEGIN
    -- Vérifier si le profil existe, sinon le créer
    -- On récupère l'email depuis auth.users
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = p_profile_id;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users';
    END IF;
    
    -- Créer le profil s'il n'existe pas
    INSERT INTO profiles (id, email)
    VALUES (p_profile_id, v_user_email)
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert shop
    INSERT INTO shops (
        profile_id, name, bio, slug, logo_url, 
        instagram, tiktok, website
    ) VALUES (
        p_profile_id, p_name, p_bio, p_slug, p_logo_url,
        p_instagram, p_tiktok, p_website
    ) RETURNING id INTO shop_id;
    
    -- Insert default availabilities (all days) with time slots and daily limit
    INSERT INTO availabilities (
        shop_id, 
        day, 
        is_open, 
        daily_order_limit,
        start_time,
        end_time,
        interval_time
    )
    SELECT 
        shop_id, 
        day, 
        (day >= 1 AND day <= 5) AS is_open,
        2 AS daily_order_limit,
        '09:00'::TIME AS start_time,
        '18:00'::TIME AS end_time,
        '01:00:00'::INTERVAL AS interval_time
    FROM generate_series(0, 6) AS day;
    
    -- Return shop data
    SELECT json_build_object(
        'id', s.id,
        'name', s.name,
        'bio', s.bio,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'instagram', s.instagram,
        'tiktok', s.tiktok,
        'website', s.website
    ) INTO result
    FROM shops s
    WHERE s.id = shop_id;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."create_shop_with_availabilities"("p_profile_id" "uuid", "p_name" "text", "p_bio" "text", "p_slug" "text", "p_logo_url" "text", "p_instagram" "text", "p_tiktok" "text", "p_website" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."execute_shop_transfer"("p_transfer_id" "uuid", "p_new_user_id" "uuid", "p_new_user_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_transfer RECORD;
    v_shop RECORD;
    v_old_profile_id UUID;
    v_result JSON;
BEGIN
    -- 1. Récupérer les données du transfert
    SELECT id, shop_id, payment_identifier, provider_type
    INTO v_transfer
    FROM shop_transfers
    WHERE id = p_transfer_id
    AND used_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Transfer not found or already used');
    END IF;
    
    -- 2. Récupérer les données de la boutique
    SELECT slug, profile_id
    INTO v_shop
    FROM shops
    WHERE id = v_transfer.shop_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Shop not found');
    END IF;
    
    v_old_profile_id := v_shop.profile_id;
    
    -- 3. Mettre à jour profile_id de la boutique
    UPDATE shops
    SET profile_id = p_new_user_id
    WHERE id = v_transfer.shop_id;
    
    -- 4. Supprimer l'ancien payment_link et créer le nouveau
    DELETE FROM payment_links
    WHERE payment_identifier = v_shop.slug
      AND provider_type = 'paypal';
    
    INSERT INTO payment_links (profile_id, payment_identifier, provider_type)
    VALUES (p_new_user_id, v_transfer.payment_identifier, v_transfer.provider_type);
    
    -- 5. Note: anti_fraud table was removed in migration 130, no update needed
    
    -- 6. Marquer le transfert comme utilisé
    UPDATE shop_transfers
    SET used_at = NOW()
    WHERE id = p_transfer_id;
    
    -- 7. Créer ou mettre à jour le profil avec trial_ending (7 jours)
    INSERT INTO profiles (id, email, trial_ending)
    VALUES (p_new_user_id, p_new_user_email, NOW() + INTERVAL '7 days')
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        trial_ending = EXCLUDED.trial_ending;
    
    -- 8. Supprimer l'ancien profil (à la fin du processus)
    DELETE FROM profiles WHERE id = v_old_profile_id;
    
    -- Retourner le succès
    RETURN json_build_object(
        'success', true,
        'shop_id', v_transfer.shop_id,
        'old_profile_id', v_old_profile_id,
        'new_profile_id', p_new_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, retourner les détails
        -- Vérifier si les variables sont assignées avant de les utiliser
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'shop_id', CASE WHEN v_transfer IS NOT NULL THEN v_transfer.shop_id ELSE NULL END,
            'old_profile_id', v_old_profile_id
        );
END;
$$;


ALTER FUNCTION "public"."execute_shop_transfer"("p_transfer_id" "uuid", "p_new_user_id" "uuid", "p_new_user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_shop_transfer"("p_transfer_id" "uuid", "p_new_user_id" "uuid", "p_new_user_email" "text") IS 'Execute complete shop transfer process - transfers shop ownership and cleans up old user data';



CREATE OR REPLACE FUNCTION "public"."execute_shop_transfer_by_email"("p_target_email" "text", "p_new_user_id" "uuid", "p_new_user_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_transfer RECORD;
    v_shop RECORD;
    v_old_profile_id UUID;
    v_result JSON;
BEGIN
    -- 1. Récupérer les données du transfert par email
    -- Utiliser les nouvelles colonnes payment_identifier et provider_type
    SELECT id, shop_id, payment_identifier, provider_type
    INTO v_transfer
    FROM shop_transfers
    WHERE target_email = p_target_email
    AND used_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'No pending transfer found for this email');
    END IF;
    
    -- 2. Récupérer les données de la boutique
    SELECT slug, profile_id
    INTO v_shop
    FROM shops
    WHERE id = v_transfer.shop_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Shop not found');
    END IF;
    
    v_old_profile_id := v_shop.profile_id;
    
    -- 3. Mettre à jour profile_id de la boutique
    UPDATE shops
    SET profile_id = p_new_user_id
    WHERE id = v_transfer.shop_id;
    
    -- 4. Supprimer l'ancien payment_link et créer le nouveau
    -- Utiliser les nouvelles colonnes
    DELETE FROM payment_links
    WHERE payment_identifier = v_shop.slug
      AND provider_type = COALESCE(v_transfer.provider_type, 'paypal');
    
    INSERT INTO payment_links (profile_id, payment_identifier, provider_type)
    VALUES (p_new_user_id, v_transfer.payment_identifier, COALESCE(v_transfer.provider_type, 'paypal'));
    
    -- 5. Note: anti_fraud table was removed, no update needed
    
    -- 6. Marquer le transfert comme utilisé
    UPDATE shop_transfers
    SET used_at = NOW()
    WHERE id = v_transfer.id;
    
    -- 7. Créer ou mettre à jour le profil (sans trial_ending)
    INSERT INTO profiles (id, email)
    VALUES (p_new_user_id, p_new_user_email)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email;
    
    -- 8. Supprimer l'ancien profil (à la fin du processus)
    DELETE FROM profiles WHERE id = v_old_profile_id;
    
    -- Retourner le succès
    RETURN json_build_object(
        'success', true,
        'shop_id', v_transfer.shop_id,
        'transfer_id', v_transfer.id,
        'old_profile_id', v_old_profile_id,
        'new_profile_id', p_new_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, retourner les détails
        -- Vérifier si les variables sont assignées avant de les utiliser
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'shop_id', CASE WHEN v_transfer IS NOT NULL THEN v_transfer.shop_id ELSE NULL END,
            'old_profile_id', v_old_profile_id
        );
END;
$$;


ALTER FUNCTION "public"."execute_shop_transfer_by_email"("p_target_email" "text", "p_new_user_id" "uuid", "p_new_user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."execute_shop_transfer_by_email"("p_target_email" "text", "p_new_user_id" "uuid", "p_new_user_email" "text") IS 'Execute complete shop transfer process by email - finds transfer, transfers shop ownership and cleans up old user data';



CREATE OR REPLACE FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS TABLE("shop_id" "uuid", "distance_km" numeric, "name" "text", "slug" "text", "city" "text", "actual_city" "text", "postal_code" "text", "logo_url" "text", "is_premium" boolean)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id AS shop_id,
        calculate_distance_km(p_latitude, p_longitude, s.latitude, s.longitude) AS distance_km,
        s.name,
        s.slug,
        s.directory_city AS city,
        s.directory_actual_city AS actual_city,
        s.directory_postal_code AS postal_code,
        s.logo_url,
        FALSE AS is_premium -- Will be calculated in application code
    FROM shops s
    WHERE s.directory_enabled = TRUE
        AND s.is_active = TRUE
        AND s.latitude IS NOT NULL
        AND s.longitude IS NOT NULL
        AND calculate_distance_km(p_latitude, p_longitude, s.latitude, s.longitude) <= p_radius_km
    ORDER BY 
        distance_km ASC,
        s.name ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0, "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", "p_verified_only" boolean DEFAULT false) RETURNS TABLE("shop_id" "uuid", "distance_km" numeric, "name" "text", "slug" "text", "city" "text", "actual_city" "text", "postal_code" "text", "logo_url" "text", "is_premium" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH shops_with_premium AS (
        SELECT 
            s.id AS shop_id,
            calculate_distance_km(p_latitude, p_longitude, s.latitude, s.longitude) AS distance_km,
            s.name,
            s.slug,
            s.directory_city AS city,
            s.directory_actual_city AS actual_city,
            s.directory_postal_code AS postal_code,
            s.logo_url,
            COALESCE(
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.stripe_product_id = p_premium_product_id
                    AND up.subscription_status = 'active'
                ),
                FALSE
            ) AS is_premium
        FROM shops s
        WHERE s.directory_enabled = TRUE
            AND s.is_active = TRUE
            AND s.latitude IS NOT NULL
            AND s.longitude IS NOT NULL
            AND calculate_distance_km(p_latitude, p_longitude, s.latitude, s.longitude) <= p_radius_km
    )
    SELECT 
        swp.shop_id,
        swp.distance_km,
        swp.name,
        swp.slug,
        swp.city,
        swp.actual_city,
        swp.postal_code,
        swp.logo_url,
        swp.is_premium
    FROM shops_with_premium swp
    WHERE (NOT p_verified_only OR swp.is_premium = TRUE)
    ORDER BY 
        swp.is_premium DESC,  -- Premium en premier
        swp.distance_km ASC,  -- Puis par distance (plus proche d'abord)
        abs(hashtext(swp.shop_id::text || current_date::text)) % 1000 ASC,  -- Hash déterministe avec date pour shops à même distance
        swp.name ASC          -- Fallback pour cohérence
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer, "p_premium_product_id" "text", "p_verified_only" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer, "p_premium_product_id" "text", "p_verified_only" boolean) IS 'Returns shops within radius, sorted by premium status, distance, then hash-based random order (changes daily). Uses hashtext() for safe deterministic hashing.';



CREATE OR REPLACE FUNCTION "public"."generate_order_ref"() RETURNS character varying
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    chars CONSTANT VARCHAR := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    result VARCHAR(8);
BEGIN
    LOOP
        result := (
            SELECT string_agg(substr(chars, floor(random() * length(chars) + 1)::integer, 1), '')
            FROM generate_series(1, 8)
        );

        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM pending_orders WHERE order_ref = result
            UNION
            SELECT 1 FROM orders WHERE order_ref = result
        );
    END LOOP;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_order_ref"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_order_ref"() IS 'Génère une référence unique de 8 caractères pour les commandes';



CREATE OR REPLACE FUNCTION "public"."get_availability_data"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'availabilities', (
            SELECT json_agg(
                json_build_object(
                    'id', a.id,
                    'day', a.day,
                    'is_open', a.is_open,
                    'daily_order_limit', a.daily_order_limit,
                    'start_time', a.start_time,
                    'end_time', a.end_time,
                    'interval_time', a.interval_time
                )
            )
            FROM (
                SELECT a.id, a.day, a.is_open, a.daily_order_limit, a.start_time, a.end_time, a.interval_time
                FROM availabilities a
                JOIN shops s ON s.id = a.shop_id
                WHERE s.profile_id = p_profile_id
                ORDER BY a.day
            ) a
        ),
        'unavailabilities', (
            SELECT json_agg(
                json_build_object(
                    'id', u.id,
                    'start_date', u.start_date,
                    'end_date', u.end_date
                )
            )
            FROM (
                SELECT u.id, u.start_date, u.end_date
                FROM unavailabilities u
                JOIN shops s ON s.id = u.shop_id
                WHERE s.profile_id = p_profile_id
                AND u.end_date >= current_date
                ORDER BY u.start_date
            ) u
        ),
        'shopId', (
            SELECT s.id
            FROM shops s
            WHERE s.profile_id = p_profile_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_availability_data"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_custom_form_data"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  result json;
begin
  select json_build_object(
    'shop', (
      select json_build_object(
        'id', s.id,
        'slug', s.slug,
        'is_custom_accepted', s.is_custom_accepted
      )
      from shops s
      where s.profile_id = p_profile_id
    ),
    'customForm', (
      select json_build_object(
        'id', f.id,
        'is_custom_form', f.is_custom_form,
        'title', f.title,
        'description', f.description
      )
      from forms f
      join shops s on s.id = f.shop_id
      where s.profile_id = p_profile_id
      and f.is_custom_form = true
    ),
    'customFields', (
      select json_agg(
        json_build_object(
          'id', ff.id,
          'label', ff.label,
          'type', ff.type,
          'options', ff.options,
          'required', ff.required,
          'order', ff.order
        )
      )
      from form_fields ff
      join forms f on f.id = ff.form_id
      join shops s on s.id = f.shop_id
      where s.profile_id = p_profile_id
      and f.is_custom_form = true
      order by ff.order
    )
  ) into result;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_custom_form_data"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_data"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug,
                'logo_url', s.logo_url,
                'is_custom_accepted', s.is_custom_accepted,
                'is_active', s.is_active
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
        ),
        'permissions', get_user_permissions(p_profile_id),
        'subscription', (
            SELECT json_build_object(
                'status', up.subscription_status,
                'stripe_subscription_id', up.stripe_subscription_id,
                'created_at', up.created_at
            )
            FROM user_products up
            WHERE up.profile_id = p_profile_id
            ORDER BY up.created_at DESC
            LIMIT 1
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_data"("p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_dashboard_data"("p_profile_id" "uuid") IS 'Get dashboard data - updated for PayPal.me system';



CREATE OR REPLACE FUNCTION "public"."get_faq_data"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  result json;
begin
  select json_build_object(
    'faqs', (
      select json_agg(
        json_build_object(
          'id', f.id,
          'question', f.question,
          'answer', f.answer,
          'created_at', f.created_at,
          'updated_at', f.updated_at
        )
      )
      from (
        select f.id, f.question, f.answer, f.created_at, f.updated_at
        from faq f
        join shops s on s.id = f.shop_id
        where s.profile_id = p_profile_id
        order by f.created_at desc
      ) f
    )
  ) into result;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_faq_data"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_slot TIME;
    v_end_time TIME;
    v_all_slots TEXT[] := ARRAY[]::TEXT[];
    v_reserved_slots TEXT[] := ARRAY[]::TEXT[];
    v_free_slots TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Vérifier que les paramètres sont valides
    IF p_start_time IS NULL OR p_end_time IS NULL OR p_interval_time IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- Générer tous les créneaux possibles
    v_slot := p_start_time;
    v_end_time := p_end_time;
    
    WHILE v_slot < v_end_time LOOP
        v_all_slots := array_append(v_all_slots, v_slot::TEXT);
        v_slot := v_slot + p_interval_time;
    END LOOP;

    -- Récupérer les créneaux déjà réservés pour cette date depuis orders
    SELECT array_agg(o.pickup_time::TEXT) INTO v_reserved_slots
    FROM orders o
    WHERE o.shop_id = p_shop_id
    AND o.pickup_date = p_pickup_date
    AND o.pickup_time IS NOT NULL
    AND o.status IN ('pending', 'quoted', 'confirmed', 'to_verify');

    -- Ajouter aussi les pending_orders en utilisant pickup_time depuis order_data JSONB
    SELECT array_cat(
        COALESCE(v_reserved_slots, ARRAY[]::TEXT[]),
        array_agg((po.order_data->>'pickup_time')::TEXT)
    ) INTO v_reserved_slots
    FROM pending_orders po
    WHERE (po.order_data->>'shop_id')::UUID = p_shop_id
    AND (po.order_data->>'pickup_date')::DATE = p_pickup_date
    AND po.order_data->>'pickup_time' IS NOT NULL;

    -- Filtrer les créneaux libres
    SELECT array_agg(slot) INTO v_free_slots
    FROM unnest(v_all_slots) AS slot
    WHERE slot NOT IN (
        SELECT unnest(COALESCE(v_reserved_slots, ARRAY[]::TEXT[]))
    );

    RETURN COALESCE(v_free_slots, ARRAY[]::TEXT[]);
END;
$$;


ALTER FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_order_count"("p_shop_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_count INTEGER;
    v_first_day_of_month DATE;
    v_last_day_of_month DATE;
BEGIN
    -- Calculer le premier et dernier jour du mois en cours
    v_first_day_of_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_last_day_of_month := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    
    -- Compter toutes les commandes du mois calendaire en cours
    SELECT COUNT(*)
    INTO v_count
    FROM orders
    WHERE shop_id = p_shop_id
    AND created_at >= v_first_day_of_month
    AND created_at < v_last_day_of_month + INTERVAL '1 day';
    
    RETURN COALESCE(v_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_monthly_order_count"("p_shop_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_monthly_order_count"("p_shop_id" "uuid") IS 'Compte les commandes du mois calendaire en cours pour un shop';



CREATE OR REPLACE FUNCTION "public"."get_onboarding_data"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  result json;
begin
  select json_build_object(
    'shop', (
      select json_build_object(
        'id', s.id,
        'name', s.name,
        'bio', s.bio,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'instagram', s.instagram,
        'tiktok', s.tiktok,
        'website', s.website,
        'is_custom_accepted', s.is_custom_accepted,
        'is_active', s.is_active
      )
      from shops s
      where s.profile_id = p_profile_id
    ),
    -- Retourner le premier payment_link trouvé pour rétrocompatibilité
    'paypal_account', (
      select json_build_object(
        'id', pl.id,
        'payment_identifier', pl.payment_identifier,
        'provider_type', pl.provider_type,
        'is_active', pl.is_active,
        'created_at', pl.created_at
      )
      from payment_links pl
      where pl.profile_id = p_profile_id
      and (pl.is_active = true OR pl.is_active IS NULL)
      order by 
        case when pl.provider_type = 'paypal' then 1 else 2 end,
        pl.created_at
      limit 1
    ),
    'has_shop', (
      select count(*) > 0
      from shops s
      where s.profile_id = p_profile_id
    ),
    -- Vérifier qu'il y a au moins un payment_link (peu importe le provider)
    'has_paypal', (
      select count(*) > 0
      from payment_links pl
      where pl.profile_id = p_profile_id
      and (pl.is_active = true OR pl.is_active IS NULL)
    ),
    'has_subscription', (
      select count(*) > 0
      from user_products up
      where up.profile_id = p_profile_id
    )
    -- Note: is_anti_fraud removed - anti_fraud table was deleted in migration 130
  ) into result;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_onboarding_data"("p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_onboarding_data"("p_profile_id" "uuid") IS 'Get onboarding status - supports multiple payment providers (PayPal, Revolut, etc.)';



CREATE OR REPLACE FUNCTION "public"."get_order_data"("p_shop_id" "uuid") RETURNS TABLE("id" "uuid", "status" "public"."order_status", "customer_name" "text", "customer_email" "text", "customer_phone" "text", "pickup_date" "date", "chef_pickup_date" "date", "chef_message" "text", "customization_data" "jsonb", "product_name" "text", "product_base_price" numeric, "additional_information" "text", "total_amount" numeric, "paid_amount" numeric, "order_ref" character varying, "inspiration_photos" "text"[], "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.status,
        o.customer_name,
        o.customer_email,
        o.customer_phone,
        o.pickup_date,
        o.chef_pickup_date,
        o.chef_message,
        o.customization_data,
        o.product_name,
        o.product_base_price,
        o.additional_information,
        o.total_amount,
        o.paid_amount,
        o.order_ref,
        o.inspiration_photos,
        o.created_at
    FROM orders o
    WHERE o.shop_id = p_shop_id
    ORDER BY o.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_order_data"("p_shop_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_data"("p_slug" "text", "p_product_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result JSON;
    v_shop_id UUID;
    v_form_id UUID;
    v_dates_with_limit_reached TEXT[];
BEGIN
    -- Get shop ID
    SELECT id INTO v_shop_id
    FROM shops
    WHERE slug = p_slug AND is_active = true;
    
    IF v_shop_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- If product ID is provided → use its form_id, else use shop's custom form
    IF p_product_id IS NOT NULL THEN
        SELECT form_id INTO v_form_id
        FROM products
        WHERE id = p_product_id
        AND shop_id = v_shop_id
        AND is_active = true;
    ELSE
        SELECT id INTO v_form_id
        FROM forms
        WHERE shop_id = v_shop_id
        AND is_custom_form = true
        LIMIT 1;
    END IF;

    -- Calculate dates with limit reached (cast fix included)
    WITH future_dates AS (
        SELECT 
            (current_date + (gs * interval '1 day'))::date AS check_date,
            extract(dow FROM (current_date + (gs * interval '1 day'))) AS day_of_week
        FROM generate_series(0, 59) gs
    ),
    availability_days AS (
        SELECT day, daily_order_limit
        FROM availabilities
        WHERE shop_id = v_shop_id
        AND is_open = true
        AND daily_order_limit IS NOT NULL
    ),
    future_dates_with_limits AS (
        SELECT 
            fd.check_date,
            ad.daily_order_limit
        FROM future_dates fd
        JOIN availability_days ad ON fd.day_of_week = ad.day
    ),
    order_counts AS (
        SELECT 
            fdl.check_date::text AS pickup_date,
            count(o.id) AS order_count,
            fdl.daily_order_limit
        FROM future_dates_with_limits fdl
        LEFT JOIN orders o ON o.shop_id = v_shop_id 
            AND o.pickup_date = fdl.check_date::date
            AND o.status IN ('pending', 'quoted', 'confirmed', 'ready', 'completed')
        GROUP BY fdl.check_date, fdl.daily_order_limit
    )
    SELECT array_agg(pickup_date)
    INTO v_dates_with_limit_reached
    FROM order_counts
    WHERE order_count >= daily_order_limit;

    -- Build JSON result
    SELECT json_build_object(
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'bio', s.bio,
                'slug', s.slug,
                'logo_url', s.logo_url,
                'profile_id', s.profile_id,
                'instagram', s.instagram,
                'tiktok', s.tiktok,
                'website', s.website,
                'is_custom_accepted', s.is_custom_accepted,
                'is_active', s.is_active,
                'is_visible', s.is_active
            )
            FROM shops s
            WHERE s.id = v_shop_id
        ),
        'product', (
            CASE WHEN p_product_id IS NOT NULL THEN (
                SELECT json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'description', p.description,
                    'base_price', p.base_price,
                    'form_id', p.form_id,
                    'image_url', p.image_url,
                    'min_days_notice', p.min_days_notice,
                    'deposit_percentage', p.deposit_percentage,
                    'shop_id', p.shop_id,
                    'category', json_build_object(
                        'id', c.id,
                        'name', c.name
                    )
                )
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.id = p_product_id
                AND p.shop_id = v_shop_id
                AND p.is_active = true
            ) ELSE NULL END
        ),
        'customForm', (
            SELECT json_build_object(
                'id', f.id,
                'is_custom_form', f.is_custom_form,
                'title', f.title,
                'description', f.description
            )
            FROM forms f
            WHERE f.id = v_form_id
            AND f.shop_id = v_shop_id
        ),
        'customFields', (
            SELECT json_agg(
                json_build_object(
                    'id', ff.id,
                    'label', ff.label,
                    'type', ff.type,
                    'options', ff.options,
                    'required', ff.required,
                    'order', ff.order
                ) ORDER BY ff.order
            )
            FROM form_fields ff
            WHERE ff.form_id = v_form_id
        ),
        'availabilities', (
            SELECT json_agg(
                json_build_object(
                    'day', a.day,
                    'is_open', a.is_open,
                    'daily_order_limit', a.daily_order_limit,
                    'start_time', a.start_time,
                    'end_time', a.end_time,
                    'interval_time', a.interval_time
                ) ORDER BY a.day
            )
            FROM availabilities a
            WHERE a.shop_id = v_shop_id
        ),
        'unavailabilities', (
            SELECT json_agg(
                json_build_object(
                    'id', ua.id,
                    'start_date', ua.start_date,
                    'end_date', ua.end_date
                ) ORDER BY ua.start_date
            )
            FROM unavailabilities ua
            WHERE ua.shop_id = v_shop_id
            AND ua.end_date >= current_date
        ),
        'datesWithLimitReached', COALESCE(v_dates_with_limit_reached, ARRAY[]::TEXT[])
    ) INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_order_data"("p_slug" "text", "p_product_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_order_data"("p_slug" "text", "p_product_id" "uuid") IS 'Get order data including deposit_percentage for products';



CREATE OR REPLACE FUNCTION "public"."get_order_detail_data"("p_order_id" "uuid", "p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'order', (
            SELECT json_build_object(
                'id', o.id,
                'customer_name', o.customer_name,
                'customer_email', o.customer_email,
                'customer_phone', o.customer_phone,
                'customer_instagram', o.customer_instagram,
                'pickup_date', o.pickup_date,
                'pickup_time', o.pickup_time,
                'status', o.status,
                'total_amount', o.total_amount,
                'product_name', o.product_name,
                'additional_information', o.additional_information,
                'chef_message', o.chef_message,
                'created_at', o.created_at,
                'chef_pickup_date', o.chef_pickup_date,
                'chef_pickup_time', o.chef_pickup_time,
                'paid_amount', o.paid_amount,
                'order_ref', o.order_ref,
                'payment_provider', o.payment_provider,
                'customization_data', o.customization_data,
                'inspiration_photos', o.inspiration_photos,
                'product', json_build_object(
                    'name', p.name,
                    'description', p.description,
                    'image_url', p.image_url,
                    'base_price', p.base_price
                ),
                'shop', json_build_object(
                    'name', s.name,
                    'slug', s.slug
                )
            )
            FROM orders o
            LEFT JOIN products p ON p.id = o.product_id
            JOIN shops s ON s.id = o.shop_id
            WHERE o.id = p_order_id
            AND s.profile_id = p_profile_id
        ),
        'personalNote', (
            SELECT json_build_object(
                'note', pon.note,
                'updated_at', pon.updated_at
            )
            FROM personal_order_notes pon
            WHERE pon.order_id = p_order_id
            AND pon.shop_id = (
                SELECT s.id FROM shops s WHERE s.profile_id = p_profile_id
            )
        ),
        'shop', (
            SELECT json_build_object(
                'name', s.name,
                'slug', s.slug,
                'logo_url', s.logo_url
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_order_detail_data"("p_order_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_details"("p_order_id" "uuid", "p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'order', (
            SELECT json_build_object(
                'id', o.id,
                'customer_name', o.customer_name,
                'customer_email', o.customer_email,
                'pickup_date', o.pickup_date,
                'status', o.status,
                'total_amount', o.total_amount,
                'product_name', o.product_name,
                'additional_information', o.additional_information,
                'chef_message', o.chef_message,
                'created_at', o.created_at,
                'chef_pickup_date', o.chef_pickup_date,
                'paid_amount', o.paid_amount,
                'order_ref', o.order_ref,
                'customization_data', o.customization_data,
                'inspiration_photos', o.inspiration_photos,
                'product', json_build_object(
                    'name', p.name,
                    'description', p.description,
                    'image_url', p.image_url,
                    'base_price', p.base_price
                ),
                'shop', json_build_object(
                    'name', s.name,
                    'slug', s.slug
                )
            )
            FROM orders o
            LEFT JOIN products p ON p.id = o.product_id
            JOIN shops s ON s.id = o.shop_id
            WHERE o.id = p_order_id
            AND s.profile_id = p_profile_id
        ),
        'personalNote', (
            SELECT json_build_object(
                'note', pon.note,
                'updated_at', pon.updated_at
            )
            FROM personal_order_notes pon
            JOIN shops s ON s.id = pon.shop_id
            WHERE pon.order_id = p_order_id
            AND s.profile_id = p_profile_id
        ),
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_order_details"("p_order_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_order_details"("p_order_id" "uuid", "p_profile_id" "uuid") IS 'Get order details - updated to remove PayPal columns';



CREATE OR REPLACE FUNCTION "public"."get_order_limit"("p_plan" "text") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    CASE p_plan
        WHEN 'free' THEN
            RETURN 5;
        WHEN 'basic' THEN
            RETURN 20;
        WHEN 'premium' THEN
            RETURN 999999; -- Illimité
        WHEN 'exempt' THEN
            RETURN 999999; -- Illimité
        ELSE
            RETURN 5; -- Par défaut, plan gratuit
    END CASE;
END;
$$;


ALTER FUNCTION "public"."get_order_limit"("p_plan" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_order_limit"("p_plan" "text") IS 'Retourne la limite de commandes selon le plan (5 pour free, 20 pour basic, 999999 pour premium/exempt)';



CREATE OR REPLACE FUNCTION "public"."get_orders_data"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'orders', (
            SELECT json_agg(
                json_build_object(
                    'id', o.id,
                    'customer_name', o.customer_name,
                    'customer_email', o.customer_email,
                    'pickup_date', o.pickup_date,
                    'pickup_time', o.pickup_time,
                    'status', o.status,
                    'total_amount', o.total_amount,
                    'product_name', o.product_name,
                    'additional_information', o.additional_information,
                    'chef_message', o.chef_message,
                    'created_at', o.created_at,
                    'chef_pickup_date', o.chef_pickup_date,
                    'chef_pickup_time', o.chef_pickup_time,
                    'product', json_build_object(
                        'name', p.name,
                        'image_url', p.image_url
                    )
                )
            )
            FROM (
                SELECT o.id, o.customer_name, o.customer_email, o.pickup_date, o.pickup_time, o.status, o.total_amount, o.product_name, o.additional_information, o.chef_message, o.created_at, o.chef_pickup_date, o.chef_pickup_time, o.product_id
                FROM orders o
                JOIN shops s ON s.id = o.shop_id
                WHERE s.profile_id = p_profile_id
                ORDER BY o.pickup_date ASC
            ) o
            LEFT JOIN products p ON p.id = o.product_id
        ),
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_orders_data"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_orders_metrics"("p_shop_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  result json;
  one_week_ago timestamp;
  one_month_ago timestamp;
  three_months_ago timestamp;
  one_year_ago timestamp;
begin
  -- Calculate date ranges
  one_week_ago := current_timestamp - interval '7 days';
  one_month_ago := current_timestamp - interval '30 days';
  three_months_ago := current_timestamp - interval '90 days';
  one_year_ago := current_timestamp - interval '365 days';
  
  select json_build_object(
    'recent_orders', (
      select json_agg(
        json_build_object(
          'id', o.id,
          'created_at', o.created_at,
          'total_amount', o.total_amount,
          'status', o.status,
          'customer_name', o.customer_name,
          'customer_email', o.customer_email,
          'product_name', o.product_name
        )
      )
      from (
        select id, created_at, total_amount, status, customer_name, customer_email, product_name
        from orders o
        where o.shop_id = p_shop_id
        order by o.created_at desc
        limit 3
      ) o
    ),
    'weekly_count', (
      select count(*)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_week_ago
    ),
    'monthly_count', (
      select count(*)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_month_ago
    ),
    'three_months_count', (
      select count(*)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= three_months_ago
    ),
    'yearly_count', (
      select count(*)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_year_ago
    ),
    -- ✅ REVENUS : seulement les commandes confirmées, prêtes ou terminées
    'weekly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_week_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'monthly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_month_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'three_months_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= three_months_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'yearly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_year_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    -- ✅ DÉPÔTS : seulement les commandes confirmées, prêtes ou terminées
    'weekly_deposit', (
      select coalesce(sum(o.paid_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_week_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'monthly_deposit', (
      select coalesce(sum(o.paid_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_month_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'three_months_deposit', (
      select coalesce(sum(o.paid_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= three_months_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'yearly_deposit', (
      select coalesce(sum(o.paid_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_year_ago
      and o.status in ('confirmed', 'ready', 'completed')
    )
  ) into result;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_orders_metrics"("p_shop_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_count"("profile_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
  select count(*)
  from products p
  join shops s on s.id = p.shop_id
  where s.profile_id = $1
  and p.is_active = true;
$_$;


ALTER FUNCTION "public"."get_product_count"("profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_product_limit"("p_plan" "text") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    CASE p_plan
        WHEN 'free' THEN
            RETURN 3;
        WHEN 'basic' THEN
            RETURN 10;
        WHEN 'premium' THEN
            RETURN 999999; -- Illimité
        WHEN 'exempt' THEN
            RETURN 999999; -- Illimité
        ELSE
            RETURN 3; -- Par défaut, plan gratuit
    END CASE;
END;
$$;


ALTER FUNCTION "public"."get_product_limit"("p_plan" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_product_limit"("p_plan" "text") IS 'Retourne la limite de produits selon le plan (3 pour free, 10 pour basic, 999999 pour premium/exempt)';



CREATE OR REPLACE FUNCTION "public"."get_products_data"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  result json;
begin
  select json_build_object(
    'products', (
      select json_agg(
        json_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'base_price', p.base_price,
          'image_url', p.image_url,
          'is_active', p.is_active,
          'created_at', p.created_at,
          'category_id', p.category_id,
          'category', json_build_object(
            'id', c.id,
            'name', c.name
          )
        )
      )
      from (
        select p.id, p.name, p.description, p.base_price, p.image_url, p.is_active, p.created_at, p.category_id
        from products p
        join shops s on s.id = p.shop_id
        where s.profile_id = p_profile_id
        order by p.created_at desc
      ) p
      left join categories c on c.id = p.category_id
    ),
    'categories', (
      select json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name
        )
      )
      from (
        select c.id, c.name
        from categories c
        join shops s on s.id = c.shop_id
        where s.profile_id = p_profile_id
        order by c.name
      ) c
    ),
    'shop', (
      select json_build_object(
        'id', s.id,
        'slug', s.slug
      )
      from shops s
      where s.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_products_data"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_products_sorted_by_shop_premium"("p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", "p_limit" integer DEFAULT 12, "p_offset" integer DEFAULT 0, "p_cake_type" "text" DEFAULT NULL::"text", "p_shop_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_verified_only" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "image_url" "text", "base_price" numeric, "cake_type" "text", "shop_id" "uuid", "shop_name" "text", "shop_slug" "text", "shop_logo_url" "text", "shop_city" "text", "shop_actual_city" "text", "shop_postal_code" "text", "shop_profile_id" "uuid", "shop_latitude" numeric, "shop_longitude" numeric, "is_shop_premium" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH products_with_shop_premium AS (
        SELECT 
            p.id,
            p.name,
            p.description,
            p.image_url,
            p.base_price,
            p.cake_type,
            p.shop_id,
            s.name AS shop_name,
            s.slug AS shop_slug,
            s.logo_url AS shop_logo_url,
            s.directory_city AS shop_city,
            s.directory_actual_city AS shop_actual_city,
            s.directory_postal_code AS shop_postal_code,
            s.profile_id AS shop_profile_id,
            s.latitude AS shop_latitude,
            s.longitude AS shop_longitude,
            COALESCE(
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.stripe_product_id = p_premium_product_id
                    AND up.subscription_status = 'active'
                ),
                FALSE
            ) AS is_shop_premium
        FROM products p
        INNER JOIN shops s ON p.shop_id = s.id
        WHERE p.is_active = TRUE
        AND s.is_active = TRUE
        AND s.directory_enabled = TRUE
        AND (p_cake_type IS NULL OR p.cake_type = p_cake_type)
        AND (p_shop_ids IS NULL OR p.shop_id = ANY(p_shop_ids))
    )
    SELECT 
        pws.id,
        pws.name,
        pws.description,
        pws.image_url,
        pws.base_price,
        pws.cake_type,
        pws.shop_id,
        pws.shop_name,
        pws.shop_slug,
        pws.shop_logo_url,
        pws.shop_city,
        pws.shop_actual_city,
        pws.shop_postal_code,
        pws.shop_profile_id,
        pws.shop_latitude,
        pws.shop_longitude,
        pws.is_shop_premium
    FROM products_with_shop_premium pws
    WHERE (NOT p_verified_only OR pws.is_shop_premium = TRUE)
    ORDER BY 
        pws.is_shop_premium DESC,  -- Premium shop products en premier
        abs(hashtext(pws.id::text || current_date::text)) % 1000 ASC,  -- Hash déterministe avec date (change chaque jour) - basé sur product_id pour mélanger les produits
        pws.name ASC  -- Fallback pour cohérence
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_products_sorted_by_shop_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_cake_type" "text", "p_shop_ids" "uuid"[], "p_verified_only" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_products_sorted_by_shop_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_cake_type" "text", "p_shop_ids" "uuid"[], "p_verified_only" boolean) IS 'Returns products sorted by shop premium status (premium shop products first) then by hash-based random order (changes daily, based on product_id to mix products across shops) then name. Uses SECURITY DEFINER to read user_products for premium status check, bypassing RLS.';



CREATE OR REPLACE FUNCTION "public"."get_shop_owner_email"("shop_uuid" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN (
    SELECT p.email
    FROM profiles p
    JOIN shops s ON s.profile_id = p.id
    WHERE s.id = shop_uuid
      AND s.is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."get_shop_owner_email"("shop_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shop_with_customizations"("p_slug" "text") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug,
                'bio', s.bio,
                'logo_url', s.logo_url,
                'instagram', s.instagram,
                'tiktok', s.tiktok,
                'website', s.website,
                'is_custom_accepted', s.is_custom_accepted,
                'is_active', s.is_active,
                'created_at', s.created_at
            )
            FROM shops s
            WHERE s.slug = p_slug
        ),
        'customizations', (
            SELECT json_build_object(
                'button_color', sc.button_color,
                'button_text_color', sc.button_text_color,
                'text_color', sc.text_color,
                'icon_color', sc.icon_color,
                'secondary_text_color', sc.secondary_text_color,
                'background_color', sc.background_color
            )
            FROM shop_customizations sc
            JOIN shops s ON s.id = sc.shop_id
            WHERE s.slug = p_slug
        )
    ) INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_shop_with_customizations"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shops_sorted_by_premium"("p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", "p_limit" integer DEFAULT 12, "p_offset" integer DEFAULT 0, "p_city" "text" DEFAULT NULL::"text", "p_cake_type" "text" DEFAULT NULL::"text", "p_verified_only" boolean DEFAULT false) RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "logo_url" "text", "bio" "text", "directory_city" "text", "directory_actual_city" "text", "directory_postal_code" "text", "directory_cake_types" "text"[], "profile_id" "uuid", "latitude" numeric, "longitude" numeric, "is_premium" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH shops_with_premium AS (
        SELECT 
            s.id,
            s.name,
            s.slug,
            s.logo_url,
            s.bio,
            s.directory_city,
            s.directory_actual_city,
            s.directory_postal_code,
            s.directory_cake_types,
            s.profile_id,
            s.latitude,
            s.longitude,
            COALESCE(
                EXISTS(
                    SELECT 1 
                    FROM user_products up
                    WHERE up.profile_id = s.profile_id
                    AND up.stripe_product_id = p_premium_product_id
                    AND up.subscription_status = 'active'
                ),
                FALSE
            ) AS is_premium
        FROM shops s
        WHERE s.directory_enabled = TRUE
        AND s.is_active = TRUE
        AND (p_city IS NULL OR s.directory_city = p_city)
        AND (p_cake_type IS NULL OR s.directory_cake_types @> ARRAY[p_cake_type]::TEXT[])
    )
    SELECT 
        swp.id,
        swp.name,
        swp.slug,
        swp.logo_url,
        swp.bio,
        swp.directory_city,
        swp.directory_actual_city,
        swp.directory_postal_code,
        swp.directory_cake_types,
        swp.profile_id,
        swp.latitude,
        swp.longitude,
        swp.is_premium
    FROM shops_with_premium swp
    WHERE (NOT p_verified_only OR swp.is_premium = TRUE)
    ORDER BY 
        swp.is_premium DESC,  -- Premium en premier
        abs(hashtext(swp.id::text || current_date::text)) % 1000 ASC,  -- Hash déterministe avec date (change chaque jour)
        swp.name ASC  -- Fallback pour cohérence
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_shops_sorted_by_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_city" "text", "p_cake_type" "text", "p_verified_only" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_shops_sorted_by_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_city" "text", "p_cake_type" "text", "p_verified_only" boolean) IS 'Returns shops sorted by premium status (premium first) then by hash-based random order (changes daily) then name. Uses SECURITY DEFINER to read user_products for premium status check, bypassing RLS.';



CREATE OR REPLACE FUNCTION "public"."get_user_permissions"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  result json;
  v_plan text;
  v_product_count integer;
  v_product_limit integer;
  v_shop_id uuid;
  v_shop_slug text;
begin
  -- Get shop info
  select s.id, s.slug
  into v_shop_id, v_shop_slug
  from shops s
  where s.profile_id = p_profile_id;
  
  -- Get plan and product count
  v_plan := get_user_plan(p_profile_id, 'prod_Selcz36pAfV3vV', 'prod_Selbd3Ne2plHqG');
  v_product_count := get_product_count(p_profile_id);
  
  -- ✅ FIX : Utiliser get_product_limit au lieu de valeurs codées en dur
  -- Si pas de plan, utiliser 'free' par défaut
  IF v_plan IS NULL THEN
    v_plan := 'free';
  END IF;
  v_product_limit := get_product_limit(v_plan);
  
  select json_build_object(
    'shopId', v_shop_id,
    'shopSlug', v_shop_slug,
    'plan', v_plan,
    'productCount', v_product_count,
    'productLimit', v_product_limit, -- ✅ Utiliser la limite calculée
    'canHandleCustomRequests', v_plan in ('premium', 'exempt'),
    'canManageCustomForms', v_plan in ('premium', 'exempt'),
    'canAddMoreProducts', v_product_count < v_product_limit, -- ✅ Utiliser la limite calculée
    'needsSubscription', v_plan is null,
    'isExempt', v_plan = 'exempt',
    'canAccessDashboard', v_plan is not null,
    'has_paypal', (
      select count(*) > 0
      from payment_links pl
      where pl.profile_id = p_profile_id
      and pl.is_active = true
    )
  ) into result;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_user_permissions"("p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_permissions"("p_profile_id" "uuid") IS 'Get user permissions - uses get_product_limit for accurate limits';



CREATE OR REPLACE FUNCTION "public"."get_user_permissions_complete"("p_profile_id" "uuid", "p_premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", "p_basic_product_id" "text" DEFAULT 'prod_Selbd3Ne2plHqG'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    result JSON;
    v_shop_id UUID;
    v_shop_slug TEXT;
    v_shop_name TEXT;
    v_shop_bio TEXT;
    v_shop_logo_url TEXT;
    v_shop_instagram TEXT;
    v_shop_tiktok TEXT;
    v_shop_website TEXT;
    v_shop_is_active BOOLEAN;
    v_shop_is_custom_accepted BOOLEAN;
    v_plan TEXT;
    v_product_count INTEGER;
    v_is_stripe_free BOOLEAN;
    v_stripe_product_id TEXT;
    v_has_payment_method BOOLEAN;
    v_has_ever_had_subscription BOOLEAN;
    v_product_limit INTEGER;
BEGIN
    -- 1. Récupérer les infos du shop et du profil en une seule requête
    SELECT 
        s.id,
        s.slug,
        s.name,
        s.bio,
        s.logo_url,
        s.instagram,
        s.tiktok,
        s.website,
        s.is_active,
        s.is_custom_accepted,
        p.is_stripe_free
    INTO 
        v_shop_id,
        v_shop_slug,
        v_shop_name,
        v_shop_bio,
        v_shop_logo_url,
        v_shop_instagram,
        v_shop_tiktok,
        v_shop_website,
        v_shop_is_active,
        v_shop_is_custom_accepted,
        v_is_stripe_free
    FROM profiles p
    LEFT JOIN shops s ON s.profile_id = p.id
    WHERE p.id = p_profile_id
    LIMIT 1;
    
    -- 2. Déterminer le plan
    IF v_is_stripe_free THEN
        v_plan := 'exempt';
    ELSE
        -- Récupérer l'abonnement actif
        SELECT stripe_product_id
        INTO v_stripe_product_id
        FROM user_products
        WHERE profile_id = p_profile_id
        AND subscription_status = 'active'
        LIMIT 1;
        
        IF v_stripe_product_id IS NULL THEN
            -- Si pas d'abonnement actif, retourner 'free' (plan gratuit permanent)
            v_plan := 'free';
        ELSIF v_stripe_product_id = p_premium_product_id THEN
            v_plan := 'premium';
        ELSIF v_stripe_product_id = p_basic_product_id THEN
            v_plan := 'basic';
        ELSE
            -- Produit inconnu, retourner 'free'
            v_plan := 'free';
        END IF;
    END IF;
    
    -- ✅ CORRIGÉ : Compter TOUS les produits du shop (actifs ET désactivés)
    -- Cela permet d'afficher le bon comptage dans l'UI et empêche le bypass de la limite
    SELECT COUNT(*)
    INTO v_product_count
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE s.profile_id = p_profile_id;
    -- Suppression de la condition "AND p.is_active = true" pour compter tous les produits
    
    -- S'assurer que v_plan n'est pas NULL (fallback sur 'free')
    IF v_plan IS NULL THEN
        v_plan := 'free';
    END IF;
    
    -- 4. Obtenir la limite de produits selon le plan (utilise la fonction get_product_limit)
    SELECT get_product_limit(v_plan)
    INTO v_product_limit;
    
    -- 5. Vérifier si l'utilisateur a une méthode de paiement
    SELECT EXISTS(
        SELECT 1 
        FROM payment_links 
        WHERE profile_id = p_profile_id
    ) INTO v_has_payment_method;
    
    -- 6. Vérifier si l'utilisateur a déjà eu un abonnement
    SELECT EXISTS(
        SELECT 1 
        FROM user_products 
        WHERE profile_id = p_profile_id
    ) INTO v_has_ever_had_subscription;
    
    -- 7. Construire le résultat JSON avec toutes les données du shop
    SELECT json_build_object(
        'shopId', v_shop_id,
        'shopSlug', v_shop_slug,
        'shop', CASE 
            WHEN v_shop_id IS NOT NULL THEN json_build_object(
                'id', v_shop_id,
                'name', v_shop_name,
                'slug', v_shop_slug,
                'bio', v_shop_bio,
                'logo_url', v_shop_logo_url,
                'instagram', v_shop_instagram,
                'tiktok', v_shop_tiktok,
                'website', v_shop_website,
                'is_active', v_shop_is_active,
                'is_custom_accepted', v_shop_is_custom_accepted
            )
            ELSE NULL
        END,
        'plan', COALESCE(v_plan, 'free'),
        'productCount', COALESCE(v_product_count, 0),
        'productLimit', v_product_limit,
        'canHandleCustomRequests', v_plan IN ('premium', 'exempt'),
        'canManageCustomForms', v_plan IN ('premium', 'exempt'),
        'canAddMoreProducts', COALESCE(v_product_count, 0) < v_product_limit,
        'needsSubscription', v_plan = 'free',
        'isExempt', v_plan = 'exempt',
        'canAccessDashboard', true, -- Tous les utilisateurs avec un shop peuvent accéder au dashboard
        'has_payment_method', v_has_payment_method,
        'has_ever_had_subscription', v_has_ever_had_subscription,
        'has_shop', v_shop_id IS NOT NULL
    ) INTO result;
    
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_user_permissions_complete"("p_profile_id" "uuid", "p_premium_product_id" "text", "p_basic_product_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_permissions_complete"("p_profile_id" "uuid", "p_premium_product_id" "text", "p_basic_product_id" "text") IS 'Get all user permissions in a single optimized query. Returns shop info, plan, product count (all products including inactive), and all permission flags. Reduces from 4 queries to 1.';



CREATE OR REPLACE FUNCTION "public"."get_user_plan"("p_profile_id" "uuid", "premium_product_id" "text" DEFAULT 'prod_Selcz36pAfV3vV'::"text", "basic_product_id" "text" DEFAULT 'prod_Selbd3Ne2plHqG'::"text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_is_free BOOLEAN;
  v_product_id TEXT;
BEGIN
  -- Vérifie si l'utilisateur est exempt
  SELECT is_stripe_free
  INTO v_is_free
  FROM profiles
  WHERE id = p_profile_id;

  IF v_is_free THEN
    RETURN 'exempt';
  END IF;

  -- Récupère SEULEMENT l'abonnement ACTIF (pas inactive)
  SELECT stripe_product_id
  INTO v_product_id
  FROM user_products
  WHERE profile_id = p_profile_id
  AND subscription_status = 'active'  -- ✅ Seulement les abonnements actifs
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Comparaison avec les paramètres
  IF v_product_id = premium_product_id THEN
    RETURN 'premium';
  ELSIF v_product_id = basic_product_id THEN
    RETURN 'basic';
  ELSE
    RETURN NULL;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_user_plan"("p_profile_id" "uuid", "premium_product_id" "text", "basic_product_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_plan_and_product_count"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  result json;
begin
  select json_build_object(
    'plan', (
      select up.subscription_status
      from user_products up
      where up.profile_id = p_profile_id
    ),
    'product_count', (
      select count(*)
      from products p
      where p.profile_id = p_profile_id
      and p.is_active = true
    ),
    'is_anti_fraud', (
      select count(*) > 0
      from paypal_accounts pa
      join anti_fraud af on af.merchant_id = pa.paypal_merchant_id
      where pa.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;


ALTER FUNCTION "public"."get_user_plan_and_product_count"("p_profile_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_plan_and_product_count"("p_profile_id" "uuid") IS 'Get user plan and product count - updated to use merchant_id for anti-fraud check';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_stripe_free)
  VALUES (new.id, new.email, 'pastry_chef', false);
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_shop_visible"("p_profile_id" "uuid", "p_is_active" boolean) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_trial_ending TIMESTAMP WITH TIME ZONE;
    v_has_active_subscription BOOLEAN;
    v_has_ever_had_subscription BOOLEAN;
    v_is_stripe_free BOOLEAN;
BEGIN
    -- 1. Si la boutique est manuellement désactivée par l'admin
    IF NOT p_is_active THEN
        RETURN FALSE;
    END IF;

    -- 2. ✅ PRIORITÉ ABSOLUE : Vérifier si l'utilisateur est exempt
    SELECT is_stripe_free
    INTO v_is_stripe_free
    FROM profiles
    WHERE id = p_profile_id;

    IF v_is_stripe_free THEN
        RETURN TRUE; -- Utilisateur exempt = boutique toujours visible
    END IF;

    -- 3. Vérifier si l'utilisateur a déjà eu un abonnement (actif ou inactif)
    SELECT EXISTS(
        SELECT 1 FROM user_products
        WHERE profile_id = p_profile_id
    ) INTO v_has_ever_had_subscription;

    -- 4. Vérifier l'abonnement Stripe actif
    SELECT EXISTS(
        SELECT 1 FROM user_products
        WHERE profile_id = p_profile_id
        AND subscription_status = 'active'
    ) INTO v_has_active_subscription;

    IF v_has_active_subscription THEN
        RETURN TRUE; -- Abonnement actif = boutique visible
    END IF;

    -- 5. Si l'utilisateur a déjà eu un abonnement, il ne peut plus utiliser l'essai gratuit
    IF v_has_ever_had_subscription THEN
        RETURN FALSE; -- A déjà payé → pas d'essai gratuit
    END IF;

    -- 6. Si jamais eu d'abonnement, vérifier l'essai gratuit (fallback)
    SELECT trial_ending INTO v_trial_ending
    FROM profiles
    WHERE id = p_profile_id;

    IF v_trial_ending IS NOT NULL AND v_trial_ending > NOW() THEN
        RETURN TRUE; -- Essai actif = boutique visible
    END IF;

    -- 7. Aucun plan actif
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_shop_visible"("p_profile_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_shop_visible"("p_profile_id" "uuid", "p_is_active" boolean) IS 'Check if shop is visible - FINAL VERSION with is_stripe_free support for exempt users';



CREATE OR REPLACE FUNCTION "public"."update_partners_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_partners_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_payment_links_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_payment_links_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_images_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_product_images_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_shop_coordinates"("p_shop_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    UPDATE shops
    SET latitude = p_latitude,
        longitude = p_longitude
    WHERE id = p_shop_id;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."update_shop_coordinates"("p_shop_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_password_set"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'auth'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND length(auth.users.encrypted_password) > 0
  );
END;
$$;


ALTER FUNCTION "public"."user_password_set"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_shop_ownership"("p_profile_id" "uuid", "p_shop_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM shops 
        WHERE id = p_shop_id 
        AND profile_id = p_profile_id
    );
END;
$$;


ALTER FUNCTION "public"."verify_shop_ownership"("p_profile_id" "uuid", "p_shop_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_shop_ownership"("p_profile_id" "uuid", "p_shop_id" "uuid") IS 'Verify if a shop belongs to a specific profile. Returns true if the shop exists and belongs to the profile, false otherwise. Optimized for security checks in actions.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_otp_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "used" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."admin_otp_codes" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_otp_codes" IS 'One-time password codes for admin dashboard authentication';



COMMENT ON COLUMN "public"."admin_otp_codes"."used" IS 'Whether this OTP code has been used for authentication';



CREATE TABLE IF NOT EXISTS "public"."admin_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_sessions" IS 'Secure admin session tokens stored in database to prevent cookie tampering';



CREATE TABLE IF NOT EXISTS "public"."availabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "day" integer NOT NULL,
    "is_open" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "daily_order_limit" integer,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "interval_time" interval,
    CONSTRAINT "availabilities_day_check" CHECK ((("day" >= 0) AND ("day" <= 6))),
    CONSTRAINT "check_daily_order_limit_positive" CHECK ((("daily_order_limit" IS NULL) OR ("daily_order_limit" > 0)))
);


ALTER TABLE "public"."availabilities" OWNER TO "postgres";


COMMENT ON TABLE "public"."availabilities" IS 'Shop availability by day of week';



COMMENT ON COLUMN "public"."availabilities"."daily_order_limit" IS 'Limite quotidienne de commandes (NULL = pas de limite)';



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "shop_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "categories_name_check" CHECK (("char_length"("name") <= 100))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Product categories per shop';



CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contact_messages_body_check" CHECK (("char_length"("body") <= 2000)),
    CONSTRAINT "contact_messages_email_check" CHECK (("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "contact_messages_name_check" CHECK (("char_length"("name") <= 100)),
    CONSTRAINT "contact_messages_subject_check" CHECK (("char_length"("subject") <= 200))
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."contact_messages" IS 'Contact form submissions';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_name" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON TABLE "public"."events" IS 'Analytics events table for tracking user actions and page views';



CREATE TABLE IF NOT EXISTS "public"."faq" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."faq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "type" "public"."form_field_type" NOT NULL,
    "options" "jsonb",
    "required" boolean DEFAULT false,
    "order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "form_fields_label_check" CHECK (("char_length"("label") <= 100))
);


ALTER TABLE "public"."form_fields" OWNER TO "postgres";


COMMENT ON TABLE "public"."form_fields" IS 'Fields within customization forms';



CREATE TABLE IF NOT EXISTS "public"."forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "is_custom_form" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "title" "text",
    "description" "text"
);


ALTER TABLE "public"."forms" OWNER TO "postgres";


COMMENT ON TABLE "public"."forms" IS 'Customization forms for products';



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "customer_name" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "pickup_date" "date" NOT NULL,
    "additional_information" "text",
    "customization_data" "jsonb",
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status",
    "refused_by" "public"."refused_by",
    "total_amount" numeric(10,2),
    "chef_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "customer_phone" "text",
    "customer_instagram" "text",
    "product_name" "text",
    "chef_pickup_date" "date",
    "product_base_price" numeric(10,2),
    "paid_amount" numeric(10,2),
    "inspiration_photos" "text"[] DEFAULT '{}'::"text"[],
    "order_ref" character varying(8),
    "pickup_time" time without time zone,
    "chef_pickup_time" time without time zone,
    "payment_provider" "text",
    CONSTRAINT "orders_chef_message_check" CHECK (("char_length"("chef_message") <= 500)),
    CONSTRAINT "orders_customer_email_check" CHECK (("customer_email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "orders_customer_name_check" CHECK ((("char_length"("customer_name") >= 2) AND ("char_length"("customer_name") <= 50))),
    CONSTRAINT "orders_message_check" CHECK (("char_length"("additional_information") <= 500)),
    CONSTRAINT "orders_price_check" CHECK (("total_amount" >= (0)::numeric)),
    CONSTRAINT "orders_payment_provider_check" CHECK (("payment_provider" = ANY (ARRAY['paypal'::"text", 'revolut'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders" IS 'Customer orders';



COMMENT ON COLUMN "public"."orders"."customer_phone" IS 'Client phone number (optional)';



COMMENT ON COLUMN "public"."orders"."customer_instagram" IS 'Client Instagram handle (optional)';



COMMENT ON COLUMN "public"."orders"."product_name" IS 'Name of the cake at the time of order (preserved when product is deleted)';



COMMENT ON COLUMN "public"."orders"."inspiration_photos" IS 'Array of URLs to inspiration photos uploaded by clients for custom orders';



COMMENT ON COLUMN "public"."orders"."order_ref" IS 'Référence unique de 8 caractères pour la commande';



COMMENT ON COLUMN "public"."orders"."payment_provider" IS 'Méthode de paiement utilisée par le client (paypal, revolut, etc.)';



CREATE TABLE IF NOT EXISTS "public"."payment_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "provider_type" "text" DEFAULT 'paypal'::"text",
    "payment_identifier" "text" NOT NULL,
    CONSTRAINT "payment_links_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['paypal'::"text", 'revolut'::"text"])))
);


ALTER TABLE "public"."payment_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_links" IS 'Table pour stocker les liens PayPal.me des pâtissiers';



COMMENT ON COLUMN "public"."payment_links"."provider_type" IS 'Type de provider de paiement: paypal, revolut, etc.';



COMMENT ON COLUMN "public"."payment_links"."payment_identifier" IS 'Identifiant du provider (ex: nom PayPal.me, identifiant Revolut)';



CREATE TABLE IF NOT EXISTS "public"."pending_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_data" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "order_ref" character varying(8)
);


ALTER TABLE "public"."pending_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."pending_orders" IS 'Commandes en attente de paiement - données temporaires';



COMMENT ON COLUMN "public"."pending_orders"."order_data" IS 'Données complètes de la commande (JSON)';



COMMENT ON COLUMN "public"."pending_orders"."created_at" IS 'Date de création de la commande en attente';



COMMENT ON COLUMN "public"."pending_orders"."order_ref" IS 'Référence unique de 8 caractères pour la commande';



CREATE TABLE IF NOT EXISTS "public"."personal_order_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."personal_order_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "public_id" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_images" IS 'Stores multiple images per product (max 3 images)';



COMMENT ON COLUMN "public"."product_images"."public_id" IS 'Cloudinary public_id for image deletion';



COMMENT ON COLUMN "public"."product_images"."display_order" IS 'Order of display (0, 1, 2)';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "base_price" numeric(10,2) NOT NULL,
    "category_id" "uuid",
    "form_id" "uuid",
    "min_days_notice" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "cake_type" "text",
    "deposit_percentage" integer DEFAULT 50 NOT NULL,
    CONSTRAINT "products_base_price_check" CHECK (("base_price" >= (0)::numeric)),
    CONSTRAINT "products_cake_type_check" CHECK (("char_length"("cake_type") <= 50)),
    CONSTRAINT "products_deposit_percentage_check" CHECK ((("deposit_percentage" >= 0) AND ("deposit_percentage" <= 100))),
    CONSTRAINT "products_description_check" CHECK (("char_length"("description") <= 1000)),
    CONSTRAINT "products_min_days_notice_check" CHECK (("min_days_notice" >= 0)),
    CONSTRAINT "products_name_check" CHECK (("char_length"("name") <= 50))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Products offered by shops';



COMMENT ON COLUMN "public"."products"."cake_type" IS 'Type de gâteau (ex: Gâteau d''anniversaire, Gâteau de mariage, Cupcakes, Macarons, Gâteau personnalisé, etc.)';



COMMENT ON COLUMN "public"."products"."deposit_percentage" IS 'Pourcentage d''acompte demandé pour ce produit (0-100), par défaut 50%';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'pastry_chef'::"public"."user_role",
    "is_stripe_free" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profiles extending auth.users';



CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."push_subscriptions" IS 'Push notification subscriptions for pastry chefs. Only authenticated users can subscribe.';



CREATE TABLE IF NOT EXISTS "public"."shop_customizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "button_color" "text" DEFAULT '#ff6f61'::"text",
    "button_text_color" "text" DEFAULT '#ffffff'::"text",
    "text_color" "text" DEFAULT '#333333'::"text",
    "icon_color" "text" DEFAULT '#6b7280'::"text",
    "secondary_text_color" "text" DEFAULT '#333333'::"text",
    "background_color" "text" DEFAULT '#fafafa'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "background_image_url" "text"
);


ALTER TABLE "public"."shop_customizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."shop_customizations"."background_image_url" IS 'URL of the background image for the shop slug page';



CREATE TABLE IF NOT EXISTS "public"."shop_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "terms_and_conditions" "text",
    "return_policy" "text",
    "delivery_policy" "text",
    "payment_terms" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "shop_policies_delivery_policy_check" CHECK ((("delivery_policy" IS NULL) OR ("char_length"("delivery_policy") <= 5000))),
    CONSTRAINT "shop_policies_payment_terms_check" CHECK ((("payment_terms" IS NULL) OR ("char_length"("payment_terms") <= 5000))),
    CONSTRAINT "shop_policies_return_policy_check" CHECK ((("return_policy" IS NULL) OR ("char_length"("return_policy") <= 5000))),
    CONSTRAINT "shop_policies_terms_and_conditions_check" CHECK ((("terms_and_conditions" IS NULL) OR ("char_length"("terms_and_conditions") <= 5000)))
);


ALTER TABLE "public"."shop_policies" OWNER TO "postgres";


COMMENT ON TABLE "public"."shop_policies" IS 'Politiques de ventes des boutiques';



COMMENT ON COLUMN "public"."shop_policies"."terms_and_conditions" IS 'Conditions générales de vente de la boutique';



COMMENT ON COLUMN "public"."shop_policies"."return_policy" IS 'Politique de retour et remboursement';



COMMENT ON COLUMN "public"."shop_policies"."delivery_policy" IS 'Politique de livraison et retrait';



COMMENT ON COLUMN "public"."shop_policies"."payment_terms" IS 'Conditions de paiement';



CREATE TABLE IF NOT EXISTS "public"."shop_transfers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid",
    "target_email" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "expires_at" timestamp without time zone DEFAULT ("now"() + '30 days'::interval),
    "used_at" timestamp without time zone,
    "payment_identifier" "text" NOT NULL,
    "provider_type" "text" DEFAULT 'paypal'::"text",
    CONSTRAINT "shop_transfers_provider_type_check" CHECK (("provider_type" = ANY (ARRAY['paypal'::"text", 'revolut'::"text"])))
);


ALTER TABLE "public"."shop_transfers" OWNER TO "postgres";


COMMENT ON TABLE "public"."shop_transfers" IS 'Shop transfers - created_by column removed for simplification';



CREATE TABLE IF NOT EXISTS "public"."shops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "bio" "text",
    "logo_url" "text",
    "is_custom_accepted" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "instagram" "text",
    "tiktok" "text",
    "website" "text",
    "directory_city" "text",
    "directory_actual_city" "text",
    "directory_postal_code" "text",
    "directory_cake_types" "text"[] DEFAULT ARRAY[]::"text"[],
    "directory_enabled" boolean DEFAULT false,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    CONSTRAINT "shops_bio_check" CHECK (("char_length"("bio") <= 1000)),
    CONSTRAINT "shops_directory_actual_city_check" CHECK ((("directory_actual_city" IS NULL) OR ("char_length"("directory_actual_city") <= 100))),
    CONSTRAINT "shops_directory_city_check" CHECK ((("directory_city" IS NULL) OR ("char_length"("directory_city") <= 100))),
    CONSTRAINT "shops_directory_postal_code_check" CHECK ((("directory_postal_code" IS NULL) OR ("directory_postal_code" ~ '^[0-9]{5}$'::"text"))),
    CONSTRAINT "shops_latitude_check" CHECK ((("latitude" IS NULL) OR (("latitude" >= ('-90'::integer)::numeric) AND ("latitude" <= (90)::numeric)))),
    CONSTRAINT "shops_longitude_check" CHECK ((("longitude" IS NULL) OR (("longitude" >= ('-180'::integer)::numeric) AND ("longitude" <= (180)::numeric)))),
    CONSTRAINT "shops_name_check" CHECK (("char_length"("name") <= 50)),
    CONSTRAINT "shops_slug_check" CHECK (("slug" ~ '^[a-z0-9-]{3,20}$'::"text"))
);


ALTER TABLE "public"."shops" OWNER TO "postgres";


COMMENT ON TABLE "public"."shops" IS 'Pastry chef shops';



COMMENT ON COLUMN "public"."shops"."instagram" IS 'Shop Instagram handle (optional)';



COMMENT ON COLUMN "public"."shops"."tiktok" IS 'Shop TikTok handle (optional)';



COMMENT ON COLUMN "public"."shops"."website" IS 'Shop website URL (optional)';



COMMENT ON COLUMN "public"."shops"."directory_city" IS 'Grande ville la plus proche pour l''annuaire (ex: Paris, Lyon)';



COMMENT ON COLUMN "public"."shops"."directory_actual_city" IS 'Vraie ville avec autocomplétion (ex: Montreuil, Villeurbanne)';



COMMENT ON COLUMN "public"."shops"."directory_postal_code" IS 'Code postal (5 chiffres)';



COMMENT ON COLUMN "public"."shops"."directory_cake_types" IS 'Types de gâteaux proposés pour l''annuaire (array)';



COMMENT ON COLUMN "public"."shops"."directory_enabled" IS 'Si true, la boutique apparaît dans l''annuaire';



COMMENT ON COLUMN "public"."shops"."latitude" IS 'Latitude GPS (WGS84) pour le filtrage géographique';



COMMENT ON COLUMN "public"."shops"."longitude" IS 'Longitude GPS (WGS84) pour le filtrage géographique';



CREATE TABLE IF NOT EXISTS "public"."stripe_customers" (
    "profile_id" "uuid" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stripe_customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_customers" IS 'Stripe customer accounts for users';



CREATE TABLE IF NOT EXISTS "public"."stripe_events" (
    "id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stripe_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."stripe_events" IS 'Stores processed Stripe webhook event IDs to prevent duplicate processing';



CREATE TABLE IF NOT EXISTS "public"."unavailabilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shop_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "unavailabilities_check" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "public"."unavailabilities" OWNER TO "postgres";


COMMENT ON TABLE "public"."unavailabilities" IS 'Shop unavailability periods';



CREATE TABLE IF NOT EXISTS "public"."user_products" (
    "profile_id" "uuid" NOT NULL,
    "stripe_product_id" "text" NOT NULL,
    "stripe_subscription_id" "text",
    "subscription_status" "public"."subscription_status" DEFAULT 'inactive'::"public"."subscription_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_products" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_products" IS 'User subscriptions to platform plans';



ALTER TABLE ONLY "public"."admin_otp_codes"
    ADD CONSTRAINT "admin_otp_codes_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."admin_otp_codes"
    ADD CONSTRAINT "admin_otp_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_sessions"
    ADD CONSTRAINT "admin_sessions_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."availabilities"
    ADD CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."availabilities"
    ADD CONSTRAINT "availabilities_shop_id_day_key" UNIQUE ("shop_id", "day");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faq"
    ADD CONSTRAINT "faq_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_fields"
    ADD CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_profile_provider_unique" UNIQUE ("profile_id", "provider_type");



ALTER TABLE ONLY "public"."pending_orders"
    ADD CONSTRAINT "pending_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_order_notes"
    ADD CONSTRAINT "personal_order_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_customizations"
    ADD CONSTRAINT "shop_customizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_customizations"
    ADD CONSTRAINT "shop_customizations_shop_id_key" UNIQUE ("shop_id");



ALTER TABLE ONLY "public"."shop_policies"
    ADD CONSTRAINT "shop_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shop_policies"
    ADD CONSTRAINT "shop_policies_shop_id_key" UNIQUE ("shop_id");



ALTER TABLE ONLY "public"."shop_transfers"
    ADD CONSTRAINT "shop_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shops"
    ADD CONSTRAINT "shops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shops"
    ADD CONSTRAINT "shops_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."stripe_customers"
    ADD CONSTRAINT "stripe_customers_pkey" PRIMARY KEY ("profile_id");



ALTER TABLE ONLY "public"."stripe_customers"
    ADD CONSTRAINT "stripe_customers_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."stripe_events"
    ADD CONSTRAINT "stripe_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unavailabilities"
    ADD CONSTRAINT "unavailabilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_order_notes"
    ADD CONSTRAINT "unique_order_shop_note" UNIQUE ("order_id", "shop_id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "unique_user_endpoint" UNIQUE ("profile_id", "endpoint");



ALTER TABLE ONLY "public"."user_products"
    ADD CONSTRAINT "user_products_pkey" PRIMARY KEY ("profile_id", "stripe_product_id");



ALTER TABLE ONLY "public"."user_products"
    ADD CONSTRAINT "user_products_profile_id_unique" UNIQUE ("profile_id");



CREATE INDEX "idx_admin_otp_codes_email" ON "public"."admin_otp_codes" USING "btree" ("email");



CREATE INDEX "idx_admin_otp_codes_expires_at" ON "public"."admin_otp_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_admin_otp_codes_used" ON "public"."admin_otp_codes" USING "btree" ("used") WHERE ("used" = false);



CREATE INDEX "idx_admin_sessions_expires_at" ON "public"."admin_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_admin_sessions_token" ON "public"."admin_sessions" USING "btree" ("token");



CREATE INDEX "idx_availabilities_shop_id" ON "public"."availabilities" USING "btree" ("shop_id");



CREATE INDEX "idx_events_created_at" ON "public"."events" USING "btree" ("created_at");



CREATE INDEX "idx_events_event_name" ON "public"."events" USING "btree" ("event_name");



CREATE INDEX "idx_events_user_id" ON "public"."events" USING "btree" ("user_id");



CREATE INDEX "idx_faq_shop_id" ON "public"."faq" USING "btree" ("shop_id");



CREATE INDEX "idx_form_fields_form_id" ON "public"."form_fields" USING "btree" ("form_id");



CREATE INDEX "idx_form_fields_order" ON "public"."form_fields" USING "btree" ("form_id", "order");



CREATE INDEX "idx_orders_chef_pickup_date" ON "public"."orders" USING "btree" ("chef_pickup_date") WHERE ("chef_pickup_date" IS NOT NULL);



CREATE INDEX "idx_orders_inspiration_photos" ON "public"."orders" USING "gin" ("inspiration_photos") WHERE (("inspiration_photos" IS NOT NULL) AND ("array_length"("inspiration_photos", 1) > 0));



CREATE INDEX "idx_orders_order_ref" ON "public"."orders" USING "btree" ("order_ref");



CREATE INDEX "idx_orders_pickup_date" ON "public"."orders" USING "btree" ("pickup_date");



CREATE INDEX "idx_orders_product_base_price" ON "public"."orders" USING "btree" ("product_base_price") WHERE ("product_base_price" IS NOT NULL);



CREATE INDEX "idx_orders_shop_id" ON "public"."orders" USING "btree" ("shop_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_payment_provider" ON "public"."orders" USING "btree" ("payment_provider") WHERE ("payment_provider" IS NOT NULL);



CREATE INDEX "idx_payment_links_payment_identifier" ON "public"."payment_links" USING "btree" ("payment_identifier");



CREATE INDEX "idx_payment_links_profile_id" ON "public"."payment_links" USING "btree" ("profile_id");



CREATE INDEX "idx_payment_links_profile_provider" ON "public"."payment_links" USING "btree" ("profile_id", "provider_type");



CREATE INDEX "idx_payment_links_provider_type" ON "public"."payment_links" USING "btree" ("provider_type");



CREATE INDEX "idx_pending_orders_created_at" ON "public"."pending_orders" USING "btree" ("created_at");



CREATE INDEX "idx_pending_orders_order_ref" ON "public"."pending_orders" USING "btree" ("order_ref");



CREATE INDEX "idx_personal_order_notes_order_id" ON "public"."personal_order_notes" USING "btree" ("order_id");



CREATE INDEX "idx_personal_order_notes_shop_id" ON "public"."personal_order_notes" USING "btree" ("shop_id");



CREATE INDEX "idx_product_images_display_order" ON "public"."product_images" USING "btree" ("product_id", "display_order");



CREATE INDEX "idx_product_images_product_id" ON "public"."product_images" USING "btree" ("product_id");



CREATE INDEX "idx_products_cake_type" ON "public"."products" USING "btree" ("cake_type") WHERE ("cake_type" IS NOT NULL);



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_is_active" ON "public"."products" USING "btree" ("is_active");



CREATE INDEX "idx_products_shop_id" ON "public"."products" USING "btree" ("shop_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_push_subscriptions_endpoint" ON "public"."push_subscriptions" USING "btree" ("endpoint");



CREATE INDEX "idx_push_subscriptions_profile_id" ON "public"."push_subscriptions" USING "btree" ("profile_id");



CREATE INDEX "idx_shop_transfers_email" ON "public"."shop_transfers" USING "btree" ("target_email");



CREATE INDEX "idx_shop_transfers_expires" ON "public"."shop_transfers" USING "btree" ("expires_at");



CREATE INDEX "idx_shop_transfers_shop" ON "public"."shop_transfers" USING "btree" ("shop_id");



CREATE INDEX "idx_shops_directory_cake_types" ON "public"."shops" USING "gin" ("directory_cake_types") WHERE ("directory_enabled" = true);



CREATE INDEX "idx_shops_directory_city" ON "public"."shops" USING "btree" ("directory_city") WHERE ("directory_enabled" = true);



CREATE INDEX "idx_shops_geo_coords" ON "public"."shops" USING "btree" ("latitude", "longitude") WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL) AND ("directory_enabled" = true));



CREATE INDEX "idx_shops_latitude" ON "public"."shops" USING "btree" ("latitude") WHERE ("latitude" IS NOT NULL);



CREATE INDEX "idx_shops_longitude" ON "public"."shops" USING "btree" ("longitude") WHERE ("longitude" IS NOT NULL);



CREATE INDEX "idx_shops_profile_id" ON "public"."shops" USING "btree" ("profile_id");



CREATE INDEX "idx_shops_slug" ON "public"."shops" USING "btree" ("slug");



CREATE INDEX "idx_stripe_events_created_at" ON "public"."stripe_events" USING "btree" ("created_at");



CREATE INDEX "idx_unavailabilities_dates" ON "public"."unavailabilities" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_unavailabilities_shop_id" ON "public"."unavailabilities" USING "btree" ("shop_id");



CREATE INDEX "idx_user_products_premium_check" ON "public"."user_products" USING "btree" ("profile_id", "stripe_product_id", "subscription_status") WHERE ("subscription_status" = 'active'::"public"."subscription_status");



CREATE OR REPLACE TRIGGER "create_shop_customizations_trigger" AFTER INSERT ON "public"."shops" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_shop_customizations"();



CREATE OR REPLACE TRIGGER "create_shop_policies_trigger" AFTER INSERT ON "public"."shops" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_shop_policies"();



CREATE OR REPLACE TRIGGER "enforce_max_product_images" BEFORE INSERT OR UPDATE ON "public"."product_images" FOR EACH ROW EXECUTE FUNCTION "public"."check_max_product_images"();



CREATE OR REPLACE TRIGGER "update_availabilities_updated_at" BEFORE UPDATE ON "public"."availabilities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contact_messages_updated_at" BEFORE UPDATE ON "public"."contact_messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_form_fields_updated_at" BEFORE UPDATE ON "public"."form_fields" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_forms_updated_at" BEFORE UPDATE ON "public"."forms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_links_updated_at" BEFORE UPDATE ON "public"."payment_links" FOR EACH ROW EXECUTE FUNCTION "public"."update_payment_links_updated_at"();



CREATE OR REPLACE TRIGGER "update_personal_order_notes_updated_at" BEFORE UPDATE ON "public"."personal_order_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_images_updated_at" BEFORE UPDATE ON "public"."product_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_product_images_updated_at"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_push_subscriptions_updated_at" BEFORE UPDATE ON "public"."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_shops_updated_at" BEFORE UPDATE ON "public"."shops" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stripe_customers_updated_at" BEFORE UPDATE ON "public"."stripe_customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_unavailabilities_updated_at" BEFORE UPDATE ON "public"."unavailabilities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_products_updated_at" BEFORE UPDATE ON "public"."user_products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."availabilities"
    ADD CONSTRAINT "availabilities_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."faq"
    ADD CONSTRAINT "faq_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_fields"
    ADD CONSTRAINT "form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_links"
    ADD CONSTRAINT "payment_links_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_order_notes"
    ADD CONSTRAINT "personal_order_notes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_order_notes"
    ADD CONSTRAINT "personal_order_notes_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_customizations"
    ADD CONSTRAINT "shop_customizations_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_policies"
    ADD CONSTRAINT "shop_policies_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shop_transfers"
    ADD CONSTRAINT "shop_transfers_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shops"
    ADD CONSTRAINT "shops_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_customers"
    ADD CONSTRAINT "stripe_customers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unavailabilities"
    ADD CONSTRAINT "unavailabilities_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_products"
    ADD CONSTRAINT "user_products_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Allow anonymous users to insert events" ON "public"."events" FOR INSERT TO "anon" WITH CHECK (("user_id" IS NULL));



CREATE POLICY "Allow authenticated users to insert events" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("user_id" IS NULL)));



CREATE POLICY "Allow authenticated users to read events" ON "public"."events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow service role to insert events" ON "public"."events" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Allow service role to manage admin_otp_codes" ON "public"."admin_otp_codes" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can create transfers" ON "public"."shop_transfers" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can view transfers" ON "public"."shop_transfers" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Contact messages server access" ON "public"."contact_messages" USING (false);



CREATE POLICY "Public can create orders" ON "public"."orders" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can delete pending orders" ON "public"."pending_orders" FOR DELETE USING (true);



CREATE POLICY "Public can insert pending orders" ON "public"."pending_orders" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public can read pending orders" ON "public"."pending_orders" FOR SELECT USING (true);



CREATE POLICY "Public can view product images" ON "public"."product_images" FOR SELECT USING (true);



COMMENT ON POLICY "Public can view product images" ON "public"."product_images" IS 'Permet à tout le monde de voir les images des produits des boutiques actives, et aux utilisateurs authentifiés de voir leurs propres images - optimisé avec (select auth.uid()) et fusionné en une seule politique';



CREATE POLICY "Server can delete subscriptions" ON "public"."user_products" FOR DELETE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Server can insert subscriptions" ON "public"."user_products" FOR INSERT WITH CHECK ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Server can update subscriptions" ON "public"."user_products" FOR UPDATE USING ((( SELECT "auth"."role"() AS "role") = 'service_role'::"text"));



CREATE POLICY "Service role can manage all stripe customers" ON "public"."stripe_customers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role has full access to admin_sessions" ON "public"."admin_sessions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can access their own shop customizations" ON "public"."shop_customizations" USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can access their own shop policies" ON "public"."shop_policies" USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can create their own payment links" ON "public"."payment_links" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



COMMENT ON POLICY "Users can create their own payment links" ON "public"."payment_links" IS 'Permet aux utilisateurs de créer leurs propres payment_links - optimisé avec (select auth.uid())';



CREATE POLICY "Users can delete own availabilities" ON "public"."availabilities" FOR DELETE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete own categories" ON "public"."categories" FOR DELETE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete own form fields" ON "public"."form_fields" FOR DELETE USING (("form_id" IN ( SELECT "forms"."id"
   FROM "public"."forms"
  WHERE ("forms"."shop_id" IN ( SELECT "shops"."id"
           FROM "public"."shops"
          WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can delete own forms" ON "public"."forms" FOR DELETE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete own products" ON "public"."products" FOR DELETE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete own push subscriptions" ON "public"."push_subscriptions" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Users can delete own unavailabilities" ON "public"."unavailabilities" FOR DELETE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete personal notes for their own shop" ON "public"."personal_order_notes" FOR DELETE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete their own payment links" ON "public"."payment_links" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



COMMENT ON POLICY "Users can delete their own payment links" ON "public"."payment_links" IS 'Permet aux utilisateurs de supprimer leurs propres payment_links - optimisé avec (select auth.uid())';



CREATE POLICY "Users can delete their own product images" ON "public"."product_images" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."shops" "s" ON (("p"."shop_id" = "s"."id")))
  WHERE (("p"."id" = "product_images"."product_id") AND ("s"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



COMMENT ON POLICY "Users can delete their own product images" ON "public"."product_images" IS 'Permet aux utilisateurs de supprimer les images de leurs propres produits - optimisé avec (select auth.uid())';



CREATE POLICY "Users can delete their own shop's FAQ" ON "public"."faq" FOR DELETE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert own availabilities" ON "public"."availabilities" FOR INSERT WITH CHECK (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert own categories" ON "public"."categories" FOR INSERT WITH CHECK (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert own form fields" ON "public"."form_fields" FOR INSERT WITH CHECK (("form_id" IN ( SELECT "forms"."id"
   FROM "public"."forms"
  WHERE ("forms"."shop_id" IN ( SELECT "shops"."id"
           FROM "public"."shops"
          WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can insert own forms" ON "public"."forms" FOR INSERT WITH CHECK (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert own products" ON "public"."products" FOR INSERT WITH CHECK (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can insert own push subscriptions" ON "public"."push_subscriptions" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Users can insert own shop" ON "public"."shops" FOR INSERT WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Users can insert own unavailabilities" ON "public"."unavailabilities" FOR INSERT WITH CHECK (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert personal notes for their own shop" ON "public"."personal_order_notes" FOR INSERT WITH CHECK (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert their own product images" ON "public"."product_images" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."shops" "s" ON (("p"."shop_id" = "s"."id")))
  WHERE (("p"."id" = "product_images"."product_id") AND ("s"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



COMMENT ON POLICY "Users can insert their own product images" ON "public"."product_images" IS 'Permet aux utilisateurs de créer des images pour leurs propres produits - optimisé avec (select auth.uid())';



CREATE POLICY "Users can insert their own shop's FAQ" ON "public"."faq" FOR INSERT WITH CHECK (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can mark transfers as used for their email" ON "public"."shop_transfers" FOR UPDATE USING (((( SELECT "auth"."uid"() AS "uid") IS NOT NULL) AND ("target_email" = (( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text") AND ("used_at" IS NULL)));



CREATE POLICY "Users can update own availabilities" ON "public"."availabilities" FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update own categories" ON "public"."categories" FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update own form fields" ON "public"."form_fields" FOR UPDATE USING (("form_id" IN ( SELECT "forms"."id"
   FROM "public"."forms"
  WHERE ("forms"."shop_id" IN ( SELECT "shops"."id"
           FROM "public"."shops"
          WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can update own forms" ON "public"."forms" FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update own orders" ON "public"."orders" FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update own products" ON "public"."products" FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own push subscriptions" ON "public"."push_subscriptions" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Users can update own shop" ON "public"."shops" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Users can update own unavailabilities" ON "public"."unavailabilities" FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update personal notes for their own shop" ON "public"."personal_order_notes" FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update their own payment links" ON "public"."payment_links" FOR UPDATE USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



COMMENT ON POLICY "Users can update their own payment links" ON "public"."payment_links" IS 'Permet aux utilisateurs de modifier leurs propres payment_links - optimisé avec (select auth.uid())';



CREATE POLICY "Users can update their own product images" ON "public"."product_images" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."products" "p"
     JOIN "public"."shops" "s" ON (("p"."shop_id" = "s"."id")))
  WHERE (("p"."id" = "product_images"."product_id") AND ("s"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



COMMENT ON POLICY "Users can update their own product images" ON "public"."product_images" IS 'Permet aux utilisateurs de modifier les images de leurs propres produits - optimisé avec (select auth.uid())';



CREATE POLICY "Users can update their own shop's FAQ" ON "public"."faq" FOR UPDATE USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view own availabilities" ON "public"."availabilities" FOR SELECT USING ((("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."is_active" = true))) OR ("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view own categories" ON "public"."categories" FOR SELECT USING ((("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."is_active" = true))) OR ("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view own form fields" ON "public"."form_fields" FOR SELECT USING ((("form_id" IN ( SELECT "forms"."id"
   FROM "public"."forms"
  WHERE ("forms"."shop_id" IN ( SELECT "shops"."id"
           FROM "public"."shops"
          WHERE ("shops"."is_active" = true))))) OR ("form_id" IN ( SELECT "forms"."id"
   FROM "public"."forms"
  WHERE ("forms"."shop_id" IN ( SELECT "shops"."id"
           FROM "public"."shops"
          WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))))));



CREATE POLICY "Users can view own forms" ON "public"."forms" FOR SELECT USING ((("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."is_active" = true))) OR ("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view own orders" ON "public"."orders" FOR SELECT USING ((("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."is_active" = true))) OR ("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view own products" ON "public"."products" FOR SELECT USING ((("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."is_active" = true))) OR ("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view own push subscriptions" ON "public"."push_subscriptions" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Users can view own shop" ON "public"."shops" FOR SELECT USING ((("is_active" = true) OR (( SELECT "auth"."uid"() AS "uid") = "profile_id")));



CREATE POLICY "Users can view own stripe customer" ON "public"."stripe_customers" FOR SELECT USING (("profile_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can view own subscriptions" ON "public"."user_products" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



CREATE POLICY "Users can view own unavailabilities" ON "public"."unavailabilities" FOR SELECT USING ((("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."is_active" = true))) OR ("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view personal notes for their own shop" ON "public"."personal_order_notes" FOR SELECT USING (("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view their own payment links" ON "public"."payment_links" FOR SELECT USING ((( SELECT "auth"."uid"() AS "uid") = "profile_id"));



COMMENT ON POLICY "Users can view their own payment links" ON "public"."payment_links" IS 'Permet aux utilisateurs de voir leurs propres payment_links - optimisé avec (select auth.uid())';



CREATE POLICY "Users can view their own shop's FAQ" ON "public"."faq" FOR SELECT USING ((("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."is_active" = true))) OR ("shop_id" IN ( SELECT "shops"."id"
   FROM "public"."shops"
  WHERE ("shops"."profile_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."admin_otp_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."availabilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."faq" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pending_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_order_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_customizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shop_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."unavailabilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_products" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_distance_km"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_distance_km"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_distance_km"("lat1" numeric, "lon1" numeric, "lat2" numeric, "lon2" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_early_adopter_eligibility"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_early_adopter_eligibility"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_early_adopter_eligibility"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_max_product_images"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_max_product_images"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_max_product_images"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_order_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_order_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_order_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_premium_profiles"("p_profile_ids" "uuid"[], "p_premium_product_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_premium_profiles"("p_profile_ids" "uuid"[], "p_premium_product_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_premium_profiles"("p_profile_ids" "uuid"[], "p_premium_product_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_product_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_product_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_product_limit"("p_shop_id" "uuid", "p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_admin_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_admin_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_admin_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_transfers"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_transfers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_transfers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_shop_customizations"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_shop_customizations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_shop_customizations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_shop_policies"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_shop_policies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_shop_policies"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_shop_with_availabilities"("p_profile_id" "uuid", "p_name" "text", "p_bio" "text", "p_slug" "text", "p_logo_url" "text", "p_instagram" "text", "p_tiktok" "text", "p_website" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_shop_with_availabilities"("p_profile_id" "uuid", "p_name" "text", "p_bio" "text", "p_slug" "text", "p_logo_url" "text", "p_instagram" "text", "p_tiktok" "text", "p_website" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_shop_with_availabilities"("p_profile_id" "uuid", "p_name" "text", "p_bio" "text", "p_slug" "text", "p_logo_url" "text", "p_instagram" "text", "p_tiktok" "text", "p_website" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_shop_transfer"("p_transfer_id" "uuid", "p_new_user_id" "uuid", "p_new_user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_shop_transfer"("p_transfer_id" "uuid", "p_new_user_id" "uuid", "p_new_user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_shop_transfer"("p_transfer_id" "uuid", "p_new_user_id" "uuid", "p_new_user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."execute_shop_transfer_by_email"("p_target_email" "text", "p_new_user_id" "uuid", "p_new_user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."execute_shop_transfer_by_email"("p_target_email" "text", "p_new_user_id" "uuid", "p_new_user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."execute_shop_transfer_by_email"("p_target_email" "text", "p_new_user_id" "uuid", "p_new_user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer, "p_premium_product_id" "text", "p_verified_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer, "p_premium_product_id" "text", "p_verified_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_shops_in_radius"("p_latitude" numeric, "p_longitude" numeric, "p_radius_km" numeric, "p_limit" integer, "p_offset" integer, "p_premium_product_id" "text", "p_verified_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_order_ref"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_order_ref"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_order_ref"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_availability_data"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_availability_data"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_availability_data"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_custom_form_data"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_custom_form_data"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_custom_form_data"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_data"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_faq_data"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_faq_data"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_faq_data"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval) TO "anon";
GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_order_count"("p_shop_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_order_count"("p_shop_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_order_count"("p_shop_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_onboarding_data"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_onboarding_data"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_onboarding_data"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_data"("p_shop_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_data"("p_shop_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_data"("p_shop_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_data"("p_slug" "text", "p_product_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_data"("p_slug" "text", "p_product_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_data"("p_slug" "text", "p_product_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_detail_data"("p_order_id" "uuid", "p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_detail_data"("p_order_id" "uuid", "p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_detail_data"("p_order_id" "uuid", "p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_details"("p_order_id" "uuid", "p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_details"("p_order_id" "uuid", "p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_details"("p_order_id" "uuid", "p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_limit"("p_plan" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_limit"("p_plan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_limit"("p_plan" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_data"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_data"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_data"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_orders_metrics"("p_shop_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_orders_metrics"("p_shop_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_orders_metrics"("p_shop_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_count"("profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_count"("profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_count"("profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_product_limit"("p_plan" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_product_limit"("p_plan" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_product_limit"("p_plan" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_data"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_data"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_data"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_products_sorted_by_shop_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_cake_type" "text", "p_shop_ids" "uuid"[], "p_verified_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_products_sorted_by_shop_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_cake_type" "text", "p_shop_ids" "uuid"[], "p_verified_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_products_sorted_by_shop_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_cake_type" "text", "p_shop_ids" "uuid"[], "p_verified_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shop_owner_email"("shop_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_shop_owner_email"("shop_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shop_owner_email"("shop_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shop_with_customizations"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_shop_with_customizations"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shop_with_customizations"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shops_sorted_by_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_city" "text", "p_cake_type" "text", "p_verified_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_shops_sorted_by_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_city" "text", "p_cake_type" "text", "p_verified_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shops_sorted_by_premium"("p_premium_product_id" "text", "p_limit" integer, "p_offset" integer, "p_city" "text", "p_cake_type" "text", "p_verified_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_permissions_complete"("p_profile_id" "uuid", "p_premium_product_id" "text", "p_basic_product_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_permissions_complete"("p_profile_id" "uuid", "p_premium_product_id" "text", "p_basic_product_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_permissions_complete"("p_profile_id" "uuid", "p_premium_product_id" "text", "p_basic_product_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_plan"("p_profile_id" "uuid", "premium_product_id" "text", "basic_product_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_plan"("p_profile_id" "uuid", "premium_product_id" "text", "basic_product_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_plan"("p_profile_id" "uuid", "premium_product_id" "text", "basic_product_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_plan_and_product_count"("p_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_plan_and_product_count"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_plan_and_product_count"("p_profile_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_shop_visible"("p_profile_id" "uuid", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."is_shop_visible"("p_profile_id" "uuid", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_shop_visible"("p_profile_id" "uuid", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_partners_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_partners_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_partners_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_payment_links_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_product_images_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_product_images_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_product_images_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_shop_coordinates"("p_shop_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."update_shop_coordinates"("p_shop_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_shop_coordinates"("p_shop_id" "uuid", "p_latitude" numeric, "p_longitude" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_password_set"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_password_set"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_password_set"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_shop_ownership"("p_profile_id" "uuid", "p_shop_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_shop_ownership"("p_profile_id" "uuid", "p_shop_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_shop_ownership"("p_profile_id" "uuid", "p_shop_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."admin_otp_codes" TO "anon";
GRANT ALL ON TABLE "public"."admin_otp_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_otp_codes" TO "service_role";



GRANT ALL ON TABLE "public"."admin_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."availabilities" TO "anon";
GRANT ALL ON TABLE "public"."availabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."availabilities" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."faq" TO "anon";
GRANT ALL ON TABLE "public"."faq" TO "authenticated";
GRANT ALL ON TABLE "public"."faq" TO "service_role";



GRANT ALL ON TABLE "public"."form_fields" TO "anon";
GRANT ALL ON TABLE "public"."form_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."form_fields" TO "service_role";



GRANT ALL ON TABLE "public"."forms" TO "anon";
GRANT ALL ON TABLE "public"."forms" TO "authenticated";
GRANT ALL ON TABLE "public"."forms" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_links" TO "anon";
GRANT ALL ON TABLE "public"."payment_links" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_links" TO "service_role";



GRANT ALL ON TABLE "public"."pending_orders" TO "anon";
GRANT ALL ON TABLE "public"."pending_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_orders" TO "service_role";



GRANT ALL ON TABLE "public"."personal_order_notes" TO "anon";
GRANT ALL ON TABLE "public"."personal_order_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_order_notes" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."shop_customizations" TO "anon";
GRANT ALL ON TABLE "public"."shop_customizations" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_customizations" TO "service_role";



GRANT ALL ON TABLE "public"."shop_policies" TO "anon";
GRANT ALL ON TABLE "public"."shop_policies" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_policies" TO "service_role";



GRANT ALL ON TABLE "public"."shop_transfers" TO "anon";
GRANT ALL ON TABLE "public"."shop_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."shop_transfers" TO "service_role";



GRANT ALL ON TABLE "public"."shops" TO "anon";
GRANT ALL ON TABLE "public"."shops" TO "authenticated";
GRANT ALL ON TABLE "public"."shops" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_customers" TO "anon";
GRANT ALL ON TABLE "public"."stripe_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_customers" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_events" TO "service_role";



GRANT ALL ON TABLE "public"."unavailabilities" TO "anon";
GRANT ALL ON TABLE "public"."unavailabilities" TO "authenticated";
GRANT ALL ON TABLE "public"."unavailabilities" TO "service_role";



GRANT ALL ON TABLE "public"."user_products" TO "anon";
GRANT ALL ON TABLE "public"."user_products" TO "authenticated";
GRANT ALL ON TABLE "public"."user_products" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






