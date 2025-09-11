import { env } from '$env/dynamic/private';

/**
 * Force la revalidation ISR d'une boutique
 * @param shopSlug Slug de la boutique
 * @returns true si la revalidation a réussi
 */
export async function forceRevalidateShop(shopSlug: string): Promise<boolean> {
  try {
    const baseUrl = env.PUBLIC_SITE_URL;
    const revalidateUrl = `${baseUrl}/${shopSlug}?bypassToken=${env.REVALIDATION_TOKEN}`;

    console.log(`🔄 Forcing revalidation for shop: ${shopSlug}`);

    const response = await fetch(revalidateUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Pattyly-Revalidation/1.0'
      }
    });

    if (response.ok) {
      console.log(`✅ Shop ${shopSlug} revalidated successfully`);
      return true;
    } else {
      console.error(`❌ Failed to revalidate shop ${shopSlug}:`, response.status);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error revalidating shop ${shopSlug}:`, error);
    return false;
  }
}
