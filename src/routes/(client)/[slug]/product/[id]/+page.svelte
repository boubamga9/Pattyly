<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Separator } from '$lib/components/ui/separator';
	import { Heart } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components';
	import ProductForm from './product-form.svelte';

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
		background: customizations?.background_color || '#ffe8d6',
		backgroundImage: customizations?.background_image_url
			? `url(${customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${customizations?.button_color || '#ff6f61'}; color: ${customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${customizations?.text_color || '#333333'};`,
		secondaryTextStyle: `color: ${customizations?.secondary_text_color || '#333333'};`,
	};

	// Fonction pour retourner à la boutique ou au dashboard
	function goBack() {
		// Si on est en mode preview, retourner au dashboard
		if ($page.url.searchParams.get('preview') === 'true') {
			goto('/dashboard/products');
		} else {
			// Sinon, retourner à la boutique
			goto(`/${shop.slug}`);
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
	<!-- Header avec logo et informations -->
	<header class="px-4 py-6 text-center sm:py-8 md:py-12">
		<!-- Logo -->
		<div class="mb-4 flex justify-center">
			{#if shop.logo_url}
				<img
					src={shop.logo_url}
					alt={shop.name}
					class="h-20 w-20 rounded-full border border-gray-300 object-cover sm:h-24 sm:w-24 md:h-28 md:w-28"
				/>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-muted sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-muted-foreground sm:text-3xl md:text-4xl"
					>
						{shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<!-- Nom de la boutique -->
		<h1 class="mb-2 text-xl font-semibold" style={customStyles.textStyle}>
			{shop.name}
		</h1>

		<!-- Bouton retour -->
		<button
			on:click={goBack}
			class="text-xs italic underline transition-colors hover:opacity-80 sm:text-sm"
			style={customStyles.secondaryTextStyle}
		>
			{#if $page.url.searchParams.get('preview') === 'true'}
				← Retour au dashboard
			{:else}
				← Retour à la boutique
			{/if}
		</button>
	</header>

	<!-- Separator -->
	<div class="px-4">
		<Separator
			class="mb-6 sm:mb-8"
			style={`background-color: ${customizations?.secondary_text_color || '#333333'};`}
		/>
	</div>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Layout responsive : 2 colonnes sur desktop, 1 colonne sur mobile -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
				<!-- Colonne gauche : Image (fixe sur desktop) -->
				<div class="h-fit md:sticky md:top-6">
					<div class="flex justify-center">
						{#if product.image_url}
							<img
								src={product.image_url}
								alt={product.name}
								class="aspect-square w-full max-w-[350px] rounded-lg object-cover lg:max-w-[450px] xl:max-w-[500px]"
							/>
						{:else}
							<div
								class="flex aspect-square w-full max-w-[350px] items-center justify-center rounded-lg bg-muted lg:max-w-[450px] xl:max-w-[500px]"
							>
								<Heart class="h-16 w-16 text-muted-foreground" />
							</div>
						{/if}
					</div>
				</div>

				<!-- Colonne droite : Contenu (scrollable) -->
				<div class="space-y-6">
					<!-- Section 1 : Informations produit -->
					<div class="space-y-4">
						<h2
							class="text-lg font-medium sm:text-xl md:text-2xl"
							style={customStyles.textStyle}
						>
							{product.name}
						</h2>
						<p
							class="text-sm font-medium sm:text-base"
							style={customStyles.textStyle}
						>
							À partir de {formatPrice(product.base_price)}
						</p>
						{#if product.description}
							<p
								class="text-sm sm:text-base"
								style={customStyles.secondaryTextStyle}
							>
								{product.description}
							</p>
						{/if}
						<p
							class="text-xs italic sm:text-sm"
							style={customStyles.secondaryTextStyle}
						>
							Temps de préparation minimum : {product.min_days_notice || 0} jours
						</p>
					</div>

					<Separator
						style={`background-color: ${customizations?.secondary_text_color || '#333333'};`}
					/>

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
