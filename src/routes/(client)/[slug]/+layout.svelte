<script lang="ts">
	import { page } from '$app/stores';
	import SocialMediaIcons from '$lib/components/client/social-media-icons.svelte';

	// Récupérer les données du shop depuis les pages enfants
	// Le shop peut être dans différentes propriétés selon la page
	$: shop = $page.data.shop || ($page.data.order?.shops ? $page.data.order.shops : null);
	$: customizations = $page.data.customizations;

	// Styles personnalisés pour les icônes
	$: iconStyle = customizations?.icon_color 
		? `color: ${customizations.icon_color};`
		: 'color: #6b7280;';
</script>

<!-- Réseaux sociaux affichés sur toutes les pages /slug -->
{#if shop && (shop.instagram || shop.tiktok || shop.website)}
	<SocialMediaIcons {shop} {iconStyle} />
{/if}

<slot />

