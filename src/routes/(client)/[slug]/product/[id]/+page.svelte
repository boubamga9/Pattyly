<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft, Cake, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import ProductForm from './product-form.svelte';
	import SocialMediaIcons from '$lib/components/client/social-media-icons.svelte';
	import * as Carousel from '$lib/components/ui/carousel';

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
		productImages,
		form,
		customFields,
		availabilities,
		unavailabilities,
		datesWithLimitReached,
		customizations,
		orderLimitStats,
	} = $page.data);

	// Gestion de la galerie d'images
	$: images = productImages || (product?.images || []);
	$: primaryImage = images.length > 0 ? images[0].image_url : (product?.image_url || null);
	$: hasMultipleImages = images.length > 1;
	
	// API du carousel pour contrôler la navigation
	let carouselApi: any;
	let selectedIndex = 0;
	let updateIndexFn: (() => void) | null = null;
	
	// Mettre à jour l'index sélectionné quand le carousel change
	$: if (carouselApi) {
		// Nettoyer l'ancien listener si il existe
		if (updateIndexFn) {
			carouselApi.off('select', updateIndexFn);
		}
		
		// Créer un nouveau listener
		updateIndexFn = () => {
			if (carouselApi) {
				selectedIndex = carouselApi.selectedScrollSnap();
			}
		};
		
		carouselApi.on('select', updateIndexFn);
		selectedIndex = carouselApi.selectedScrollSnap(); // Initialiser
	}
	
	// Nettoyer à la destruction
	onDestroy(() => {
		if (carouselApi && updateIndexFn) {
			carouselApi.off('select', updateIndexFn);
		}
	});

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
	<!-- Header avec logo, nom et bouton retour sur la même ligne -->
	<header class="relative border-b bg-white px-4 py-4 sm:px-6 sm:py-5">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
			<!-- Logo et nom de la boutique -->
			<div class="flex items-center gap-3">
			{#if shop.logo_url}
				<div
						class="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white p-1.5 shadow-sm sm:h-12 sm:w-12"
				>
					<img
						src={shop.logo_url}
						alt={shop.name}
						class="h-full w-full object-contain"
					/>
				</div>
			{:else}
				<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE8D6]/30 to-white shadow-sm sm:h-12 sm:w-12"
				>
					<span
							class="text-lg font-semibold text-neutral-700 sm:text-xl"
						style="font-weight: 600;"
					>
						{shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		<h1
					class="text-lg font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
		>
			{shop.name}
		</h1>
			</div>

			<!-- Réseaux sociaux -->
			{#if shop && (shop.instagram || shop.tiktok || shop.website)}
				<SocialMediaIcons {shop} iconStyle={customStyles.iconStyle} />
			{/if}
		</div>
	</header>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Bouton retour -->
			<div class="mb-6">
				<button
					on:click={goBack}
					class="flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/80 hover:shadow-sm"
					style={`color: ${customizations?.secondary_text_color || '#6b7280'}; font-weight: 500; letter-spacing: -0.01em;`}
				>
					<ArrowLeft class="h-4 w-4" />
					<span class="hidden sm:inline">Retour</span>
				</button>
			</div>
			<!-- Layout responsive : 2 colonnes sur desktop si image présente, 1 colonne sinon -->
			<div class="grid grid-cols-1 gap-6 {primaryImage ? 'md:grid-cols-2 md:gap-8' : ''}">
				<!-- Colonne gauche : Galerie d'images avec carousel (fixe sur desktop) - Design moderne -->
				{#if primaryImage}
					<div class="h-fit md:sticky md:top-6">
					<div class="flex flex-col items-center gap-4">
						{#if hasMultipleImages}
							<!-- Carousel pour plusieurs images -->
							<div class="relative w-full max-w-[350px] lg:max-w-[450px] xl:max-w-[500px]">
								<Carousel.Root
									bind:api={carouselApi}
									opts={{
										align: 'center',
										loop: true,
										dragFree: false,
										skipSnaps: false,
										duration: 25
									}}
									class="w-full"
								>
									<Carousel.Content class="-ml-0">
										{#each images as image, index}
											<Carousel.Item class="pl-0">
												<div class="flex justify-center">
													<img
														src={image.image_url}
														alt="{product.name} - Photo {index + 1}"
														class="aspect-square w-full rounded-2xl object-cover shadow-sm"
														loading={index === 0 ? 'eager' : 'lazy'}
													/>
												</div>
											</Carousel.Item>
										{/each}
									</Carousel.Content>
									
									<!-- Boutons de navigation -->
									<Carousel.Previous
										class="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-lg hover:bg-white transition-colors"
										style={`color: ${customizations?.button_color || '#FF6F61'};`}
									>
										<ChevronLeft class="h-5 w-5" />
									</Carousel.Previous>
									<Carousel.Next
										class="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-lg hover:bg-white transition-colors"
										style={`color: ${customizations?.button_color || '#FF6F61'};`}
									>
										<ChevronRight class="h-5 w-5" />
									</Carousel.Next>
								</Carousel.Root>
								
								<!-- Indicateurs de position (dots) -->
								<div class="flex justify-center gap-2 mt-4">
									{#each images as _, index}
										<button
											type="button"
											on:click={() => {
												if (carouselApi) {
													carouselApi.scrollTo(index);
												}
											}}
											class="h-2 rounded-full transition-all {selectedIndex === index ? 'w-8' : 'w-2'} {selectedIndex === index
												? 'opacity-100'
												: 'opacity-40'}"
											style={selectedIndex === index
												? `background-color: ${customizations?.button_color || '#FF6F61'};`
												: 'background-color: #9ca3af;'}
											aria-label="Aller à la photo {index + 1}"
										/>
									{/each}
								</div>
							</div>
						{:else}
							<!-- Image unique (pas de carousel) -->
							<div class="flex justify-center">
								{#if primaryImage}
									<img
										src={primaryImage}
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
						{/if}
					</div>
				</div>
				{/if}

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

					<!-- Separator -->
					<div class="pt-4">
						<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
					</div>

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

	<!-- Footer minimaliste style Airbnb -->
	{#if $page.data.hasPolicies}
		<footer class="mt-12 border-t border-neutral-200 bg-white px-4 py-6">
			<div class="mx-auto max-w-7xl">
				<div class="flex items-center justify-center">
					<a
						href="/{shop.slug}/policies"
						class="text-xs text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm"
						style="font-weight: 400;"
					>
						Conditions de vente
					</a>
				</div>
			</div>
		</footer>
	{/if}
</div>