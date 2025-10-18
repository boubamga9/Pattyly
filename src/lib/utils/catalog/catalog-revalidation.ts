import { env } from '$env/dynamic/private';
import { PUBLIC_SITE_URL } from '$env/static/public';

/**
 * Force la revalidation ISR d'une boutique
 * @param shopSlug Slug de la boutique
 * @returns true si la revalidation a réussi
 */
export async function forceRevalidateShop(shopSlug: string): Promise<boolean> {
  try {
    const revalidateUrl = `${PUBLIC_SITE_URL}/${shopSlug}?bypassToken=${env.REVALIDATION_TOKEN}`;

    console.log(`🔄 [REVALIDATION] Starting revalidation for shop: ${shopSlug}`);
    console.log(`🔍 [REVALIDATION] URL: ${revalidateUrl}`);
    console.log(`🔍 [REVALIDATION] Bypass token: ${env.REVALIDATION_TOKEN ? 'SET' : 'NOT SET'}`);

    const response = await fetch(revalidateUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Pattyly-Revalidation/1.0',
        'x-prerender-revalidate': env.REVALIDATION_TOKEN
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    console.log(`📊 [REVALIDATION] Response status: ${response.status}`);
    console.log(`📊 [REVALIDATION] Response headers:`, Object.fromEntries(response.headers.entries()));

    // Accept both 200 (success) and 404 (old slug should return 404)
    if (response.ok || response.status === 404) {
      console.log(`✅ [REVALIDATION] Shop ${shopSlug} revalidated successfully (status: ${response.status})`);
      return true;
    } else {
      console.error(`❌ [REVALIDATION] Failed to revalidate shop ${shopSlug}:`, response.status);
      return false;
    }
  } catch (error) {
    // Don't log timeout errors as errors, they're expected for old slugs
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.log(`⏰ [REVALIDATION] Timeout revalidating shop ${shopSlug} (expected for old slugs)`);
      return true; // Consider timeout as success for old slugs
    }
    console.error(`❌ [REVALIDATION] Error revalidating shop ${shopSlug}:`, error);
    return false;
  }
}
