<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Cake } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components';
	import ProductForm from './product-form.svelte';
	import SocialMediaIcons from '$lib/components/client/social-media-icons.svelte';

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Données de la page
	$: ({
		shop,
		product,
		form,
		customFields,
		availabilities,
		unavailabilities,
		datesWithLimitReached,
		customizations,
		orderLimitStats,
	} = $page.data);

	// Styles personnalisés
	$: customStyles = {
		background: customizations?.background_color || '#fafafa',
		backgroundImage: customizations?.background_image_url
			? `url(${customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${customizations?.button_color || '#ff6f61'}; color: ${customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${customizations?.text_color || '#333333'};`,
		iconStyle: `color: ${customizations?.icon_color || '#6b7280'};`,
		secondaryTextStyle: `color: ${customizations?.secondary_text_color || '#333333'};`,
		separatorColor: 'rgba(0, 0, 0, 0.3)',
	};

	// Fonction pour retourner à la boutique ou au dashboard
	function goBack() {
		// Si on est en mode preview, retourner au dashboard
		if ($page.url.searchParams.get('preview') === 'true') {
			goto('/dashboard/products');
		} else {
			// Sinon, utiliser l'historique pour retourner en arrière
			if (typeof window !== 'undefined' && window.history.length > 1) {
				window.history.back();
			} else {
				// Sinon, retourner à la boutique
				goto(`/${shop.slug}`);
			}
		}
	}
</script>

<svelte:head>
	<title>{product.name} - {shop.name} - Pattyly</title>
	<meta
		name="description"
		content={product.description ||
			`Découvrez ${product.name} chez ${shop.name}. Commandez en ligne ce délicieux gâteau personnalisé.`}
	/>
	<meta
		name="keywords"
		content="gâteau, pâtisserie, {product.name}, {shop.name}, commande en ligne, personnalisation"
	/>
	<meta property="og:title" content="{product.name} - {shop.name}" />
	<meta
		property="og:description"
		content={product.description ||
			`Découvrez ${product.name} chez ${shop.name}`}
	/>
	<meta property="og:type" content="product" />
	<meta property="og:url" content={$page.url.href} />
	{#if product.image_url}
		<meta property="og:image" content={product.image_url} />
	{/if}
</svelte:head>

<div
	class="min-h-screen"
	style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Header avec logo et informations - Design moderne -->
	<header class="relative px-4 py-6 text-center sm:py-8 md:py-12">
		<!-- Réseaux sociaux - Top right -->
		{#if shop && (shop.instagram || shop.tiktok || shop.website)}
			<SocialMediaIcons {shop} iconStyle={customStyles.iconStyle} />
		{/if}
		<!-- Bouton retour - Top left -->
		<button
			on:click={goBack}
			class="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/80 hover:shadow-sm sm:left-6 sm:top-6"
			style={`color: ${customizations?.secondary_text_color || '#6b7280'}; font-weight: 500; letter-spacing: -0.01em;`}
		>
			<ArrowLeft class="h-4 w-4" />
			<span class="hidden sm:inline">
				{#if $page.url.searchParams.get('preview') === 'true'}
					Retour
				{:else}
					Retour
				{/if}
			</span>
		</button>

		<!-- Logo - Design moderne sans bordure -->
		<div class="mb-4 flex justify-center">
			{#if shop.logo_url}
				<div
					class="relative h-20 w-20 overflow-hidden rounded-full bg-white p-2.5 shadow-sm transition-transform duration-300 hover:scale-105 sm:h-24 sm:w-24 sm:p-3 md:h-28 md:w-28"
				>
					<img
						src={shop.logo_url}
						alt={shop.name}
						class="h-full w-full object-contain"
					/>
				</div>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE8D6]/30 to-white shadow-sm sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-neutral-700 sm:text-3xl md:text-4xl"
						style="font-weight: 600;"
					>
						{shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<!-- Nom de la boutique - Charte typographique -->
		<h1
			class="mb-3 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			{shop.name}
		</h1>
	</header>

	<!-- Separator - Design moderne avec couleur bouton et opacité -->
	<div class="px-4">
		<div
			class="mx-auto mb-6 h-px max-w-7xl bg-gradient-to-r from-transparent to-transparent sm:mb-8"
			style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
		></div>
	</div>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Layout responsive : 2 colonnes sur desktop, 1 colonne sur mobile -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
				<!-- Colonne gauche : Image (fixe sur desktop) - Design moderne -->
				<div class="h-fit md:sticky md:top-6">
					<div class="flex justify-center">
						{#if product.image_url}
							<img
								src={product.image_url}
								alt={product.name}
								class="aspect-square w-full max-w-[350px] rounded-2xl object-cover shadow-sm lg:max-w-[450px] xl:max-w-[500px]"
							/>
						{:else}
							<div
								class="flex aspect-square w-full max-w-[350px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFE8D6]/30 to-white shadow-sm lg:max-w-[450px] xl:max-w-[500px]"
							>
								<Cake class="h-16 w-16 text-neutral-300" />
							</div>
						{/if}
					</div>
				</div>

				<!-- Colonne droite : Contenu (scrollable) - Charte typographique -->
				<div class="space-y-6">
					<!-- Section 1 : Informations produit -->
					<div class="space-y-4">
						<h2
							class="text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
							style="font-weight: 600; letter-spacing: -0.03em;"
						>
							{product.name}
						</h2>
						<p
							class="text-xl font-semibold sm:text-2xl"
							style={`color: ${customizations?.button_color || '#FF6F61'}; font-weight: 600;`}
						>
							À partir de {formatPrice(product.base_price)}
						</p>
						{#if product.description}
							<p
								class="text-sm leading-[180%] text-neutral-600 sm:text-base"
								style="font-weight: 300; letter-spacing: -0.01em;"
							>
								{product.description}
							</p>
						{/if}
						<p
							class="text-xs italic leading-relaxed text-neutral-500 sm:text-sm"
							style="font-weight: 400; letter-spacing: -0.01em;"
						>
							Temps de préparation minimum : {product.min_days_notice || 0} jours
						</p>
						{#if product.deposit_percentage !== undefined && product.deposit_percentage !== null}
							<p
								class="text-xs italic leading-relaxed text-neutral-500 sm:text-sm"
								style="font-weight: 400; letter-spacing: -0.01em;"
							>
								Acompte à la commande : {product.deposit_percentage}%
							</p>
						{/if}
					</div>

					<!-- Separator - Dégradé avec couleur bouton et opacité -->
					<div
						class="h-px bg-gradient-to-r from-transparent to-transparent"
						style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
					></div>

					<ProductForm
						data={form}
						{shop}
						{product}
						{customFields}
						{availabilities}
						{unavailabilities}
						{datesWithLimitReached}
						{customizations}
						{orderLimitStats}
						onCancel={goBack}
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter {customizations} />
</div>