-- Migration: Add affiliate_code to profiles
-- Permet à chaque utilisateur d'avoir un code d'affiliation unique indépendant du slug de la boutique

-- Ajouter la colonne affiliate_code dans profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS affiliate_code TEXT UNIQUE;

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_profiles_affiliate_code ON profiles(affiliate_code);

-- Fonction pour générer un code unique court (8 caractères)
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_code BOOLEAN;
BEGIN
    LOOP
        -- Générer un code de 8 caractères aléatoires (lettres et chiffres en majuscules)
        code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
        
        -- Vérifier si le code existe déjà
        SELECT EXISTS(SELECT 1 FROM profiles WHERE affiliate_code = code) INTO exists_code;
        
        -- Si le code n'existe pas, on peut l'utiliser
        EXIT WHEN NOT exists_code;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;


