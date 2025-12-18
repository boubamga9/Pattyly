-- Create a secure function to get shop owner email for notifications
-- This allows the API to access shop owner email without exposing RLS policies

CREATE OR REPLACE FUNCTION public.get_shop_owner_email(shop_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_shop_owner_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_owner_email(UUID) TO anon;
