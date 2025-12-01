-- Migration: Corriger la politique RLS de stripe_customers pour la sécurité
-- Date: 2025-01-XX
-- Description: La politique actuelle permet l'accès à tous (USING true), ce qui est un problème de sécurité.
--              Cette migration met en place des politiques sécurisées :
--              - Les utilisateurs peuvent voir leur propre enregistrement
--              - Le service_role peut gérer tous les enregistrements
--              - Les autres accès sont bloqués

-- Supprimer l'ancienne politique non sécurisée
DROP POLICY IF EXISTS "Stripe customers server access" ON public.stripe_customers;

-- Politique pour permettre aux utilisateurs de voir leur propre enregistrement stripe_customer
CREATE POLICY "Users can view own stripe customer" ON public.stripe_customers
  FOR SELECT
  TO public
  USING (profile_id = auth.uid());

-- Politique pour permettre au service_role (serveur) de gérer tous les enregistrements
CREATE POLICY "Service role can manage all stripe customers" ON public.stripe_customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Note: Les utilisateurs ne peuvent PAS insérer/modifier/supprimer directement
-- Ces opérations doivent être faites via le serveur (service_role) pour des raisons de sécurité
-- et pour s'assurer que les données Stripe restent synchronisées correctement

