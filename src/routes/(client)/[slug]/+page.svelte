<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Heart, Instagram, Paperclip, Search } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components';

	// Données de la page
	$: ({ shop, categories, products, faqs, isShopActive, notFound } =
		$page.data);

	// Customizations depuis le layout
	$: ({ customizations } = $page.data);

	// Styles personnalisés
	$: customStyles = {
		background: customizations?.background_color || '#ffe8d6',
		backgroundImage: customizations?.background_image_url
			? `url(${customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${customizations?.button_color || '#ff6f61'}; color: ${customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${customizations?.text_color || '#333333'};`,
		iconStyle: `color: ${customizations?.icon_color || '#6b7280'};`,
		secondaryTextStyle: `color: ${customizations?.secondary_text_color || '#333333'};`,
		categoryBorderStyle: `border-color: ${customizations?.secondary_text_color || '#333333'}; color: ${customizations?.secondary_text_color || '#333333'}; background-color: white;`,
	};

	// État du filtre
	let selectedCategory: string | null = null;
	let filteredProducts = products;

	// Filtrer les produits quand la catégorie change
	$: filteredProducts =
		selectedCategory === null
			? products
			: products.filter((product) => product.category_id === selectedCategory);

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Fonction pour rediriger vers la page produit
	function viewProduct(productId: string) {
		goto(`/${shop.slug}/product/${productId}`);
	}

	// Fonction pour rediriger vers la demande personnalisée
	function goToCustomRequest() {
		goto(`/${shop.slug}/custom`);
	}

	// Fonction pour rediriger vers les questions fréquentes
	function goToFAQ() {
		goto(`/${shop.slug}/faq`);
	}

	// Variables SEO réactives
	$: productCount = products?.length || 0;
	$: hasCustomOrders = shop?.is_custom_accepted || false;
	$: seoTitle = shop?.name 
		? `${shop.name} - Cake Designer & Pâtissier | Commandez vos gâteaux personnalisés en ligne`
		: 'Boutique de pâtisserie - Pattyly';
	$: seoDescription = shop?.bio 
		? `${shop.bio} Commandez vos gâteaux personnalisés en ligne. ${productCount > 0 ? `${productCount} créations disponibles. ` : ''}${hasCustomOrders ? 'Demandes sur mesure acceptées. ' : ''}Livraison et retrait disponibles.`
		: shop?.name
			? `Découvrez ${shop.name}, votre cake designer et pâtissier. Commandez vos gâteaux personnalisés en ligne${productCount > 0 ? ` parmi ${productCount} créations disponibles` : ''}. ${hasCustomOrders ? 'Demandes sur mesure acceptées. ' : ''}Livraison et retrait disponibles.`
			: 'Commandez vos gâteaux personnalisés en ligne. Livraison et retrait disponibles.';
	$: seoKeywords = `cake designer, pâtissier, ${shop?.name || ''}, gâteaux personnalisés, commande en ligne, pâtisserie, gâteaux sur mesure${hasCustomOrders ? ', demande personnalisée' : ''}, livraison gâteaux`;
</script>

<svelte:head>
	{#if notFound}
		<title>Boutique non trouvée - Pattyly</title>
		<meta
			name="description"
			content="Cette boutique n'existe pas ou n'est plus disponible"
		/>
	{:else}
		<title>{seoTitle}</title>
		<meta
			name="description"
			content={seoDescription}
		/>
		<meta
			name="keywords"
			content={seoKeywords}
		/>
		<meta property="og:title" content={seoTitle} />
		<meta
			property="og:description"
			content={seoDescription}
		/>
		<meta property="og:type" content="website" />
		<meta property="og:url" content={$page.url.href} />
		{#if shop?.logo_url}
			<meta property="og:image" content={shop.logo_url} />
		{/if}
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:title" content={seoTitle} />
		<meta name="twitter:description" content={seoDescription} />
		{#if shop?.logo_url}
			<meta name="twitter:image" content={shop.logo_url} />
		{/if}
	{/if}
</svelte:head>

{#if notFound}
	<!-- Page d'erreur 404 intégrée -->
	<div
		class="flex min-h-screen flex-col items-center justify-center px-4 py-12"
	>
		<div class="mx-auto max-w-md text-center">
			<!-- Icône d'erreur -->
			<div class="mb-6 flex justify-center">
				<div class="rounded-full bg-red-100 p-4">
					<Search class="h-12 w-12 text-red-600" />
				</div>
			</div>

			<!-- Titre -->
			<h1 class="mb-4 text-3xl font-bold text-gray-900">
				Boutique non trouvée
			</h1>

			<!-- Message -->
			<p class="mb-8 text-lg text-gray-600">
				Cette boutique n'existe pas ou n'est plus disponible.
			</p>
		</div>
	</div>
{:else}
	<div
		class="flex min-h-screen flex-col overflow-x-hidden"
		style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
	>
		<!-- Header avec logo et informations -->
		<header class="relative px-4 py-6 text-center sm:py-8 md:py-12">
			<!-- Social Media Icons - Desktop/Tablet (top right) -->
			<div class="absolute right-4 top-4 hidden items-center gap-3 md:flex">
				{#if shop.instagram}
					<a
						href="https://instagram.com/{shop.instagram.replace('@', '')}"
						target="_blank"
						rel="noopener noreferrer"
						class="transition-colors hover:opacity-80"
						style={customStyles.iconStyle}
						title="Instagram"
					>
						<Instagram class="h-5 w-5" />
					</a>
				{/if}
				{#if shop.tiktok}
					<a
						href="https://tiktok.com/@{shop.tiktok.replace('@', '')}"
						target="_blank"
						rel="noopener noreferrer"
						class="transition-colors hover:opacity-80"
						style={customStyles.iconStyle}
						title="TikTok"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
							/>
						</svg>
					</a>
				{/if}
				{#if shop.website}
					<a
						href={shop.website}
						target="_blank"
						rel="noopener noreferrer"
						class="transition-colors hover:opacity-80"
						style={customStyles.iconStyle}
						title="Site internet"
					>
						<Paperclip class="h-5 w-5" />
					</a>
				{/if}
			</div>
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

			<!-- Description -->
			{#if shop.bio}
				<p
					class="mx-auto mb-4 max-w-2xl whitespace-pre-wrap text-sm sm:text-base"
					style={customStyles.secondaryTextStyle}
				>
					{shop.bio}
				</p>
			{/if}

			<!-- Bouton Composer mon gâteau (si activé et boutique active) -->
			{#if shop.is_custom_accepted && isShopActive}
				<Button
					on:click={goToCustomRequest}
					class="mb-4 rounded-full px-6 py-2 text-sm hover:opacity-90 sm:px-8 sm:py-3 sm:text-base"
					style={customStyles.buttonStyle}
				>
					Composer mon gâteau
				</Button>
			{/if}

			<!-- Questions fréquentes (seulement si il y a des FAQ) -->
			{#if faqs && faqs.length > 0}
				<button
					on:click={goToFAQ}
					class="mx-auto block text-xs italic underline transition-colors hover:opacity-80 sm:text-sm"
					style={customStyles.secondaryTextStyle}
				>
					FAQ ❓
				</button>
			{/if}

			<!-- Social Media Icons - Mobile (under FAQ button) -->
			<div class="mt-4 flex items-center justify-center gap-4 md:hidden">
				{#if shop.instagram}
					<a
						href="https://instagram.com/{shop.instagram.replace('@', '')}"
						target="_blank"
						rel="noopener noreferrer"
						class="transition-colors hover:opacity-80"
						style={customStyles.iconStyle}
						title="Instagram"
					>
						<Instagram class="h-5 w-5" />
					</a>
				{/if}
				{#if shop.tiktok}
					<a
						href="https://tiktok.com/@{shop.tiktok.replace('@', '')}"
						target="_blank"
						rel="noopener noreferrer"
						class="transition-colors hover:opacity-80"
						style={customStyles.iconStyle}
						title="TikTok"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
							/>
						</svg>
					</a>
				{/if}
				{#if shop.website}
					<a
						href={shop.website}
						target="_blank"
						rel="noopener noreferrer"
						class="transition-colors hover:opacity-80"
						style={customStyles.iconStyle}
						title="Site internet"
					>
						<Paperclip class="h-5 w-5" />
					</a>
				{/if}
			</div>
		</header>

		<!-- Separator -->
		<div class="px-4">
			<Separator
				class="mb-6 sm:mb-8"
				style={`background-color: ${customizations?.secondary_text_color || '#6b7280'};`}
			/>
		</div>

		<!-- Filtres de catégories (seulement si boutique active) -->
		{#if isShopActive}
			<div class="mb-6 px-4 sm:mb-8">
				<div class="flex gap-2 overflow-x-auto pb-2">
					<Button
						variant={selectedCategory === null ? 'default' : 'outline'}
						on:click={() => (selectedCategory = null)}
						class="whitespace-nowrap rounded-full text-xs sm:text-sm"
						style={selectedCategory === null
							? customStyles.buttonStyle
							: customStyles.categoryBorderStyle}
					>
						Tout
					</Button>
					{#each categories as category}
						<Button
							variant={selectedCategory === category.id ? 'default' : 'outline'}
							on:click={() => (selectedCategory = category.id)}
							class="whitespace-nowrap rounded-full text-xs sm:text-sm"
							style={selectedCategory === category.id
								? customStyles.buttonStyle
								: customStyles.categoryBorderStyle}
						>
							{category.name}
						</Button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Liste des produits ou message boutique inactive -->
		<div class="flex-1 px-4 pb-6 sm:pb-8">
			{#if isShopActive}
				<div
					class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
				>
					{#each filteredProducts as product}
						<div class="flex h-[150px] w-full max-w-[380px] items-center gap-5">
							<!-- Image du produit -->
							<div class="flex-shrink-0">
								{#if product.image_url}
									<img
										src={product.image_url}
										alt={product.name}
										class="h-[150px] w-[150px] rounded-lg object-cover"
									/>
								{:else}
									<div
										class="flex h-[150px] w-[150px] items-center justify-center rounded-lg bg-muted"
									>
										<Heart class="h-12 w-12 text-muted-foreground" />
									</div>
								{/if}
							</div>

							<!-- Informations du produit -->
							<div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
								<h3
									class="truncate text-sm font-medium"
									style={customStyles.textStyle}
								>
									{product.name}
								</h3>
								{#if product.description}
									<p
										class="line-clamp-2 text-xs"
										style={customStyles.secondaryTextStyle}
									>
										{product.description}
									</p>
								{/if}

								<p class="text-sm font-medium" style={customStyles.textStyle}>
									À partir de {formatPrice(product.base_price)}
								</p>
								<Button
									on:click={() => viewProduct(product.id)}
									class="mt-2 h-[25px] w-[100px] rounded-full text-xs hover:opacity-90"
									style={customStyles.buttonStyle}
								>
									Commander
								</Button>
							</div>
						</div>
					{/each}
				</div>

				<!-- Message si aucun produit -->
				{#if filteredProducts.length === 0}
					<div
						class="flex flex-1 items-center justify-center py-6 text-center sm:py-8"
					>
						<p
							class="text-sm sm:text-base"
							style={customStyles.secondaryTextStyle}
						>
							{#if selectedCategory}
								Aucun produit dans cette catégorie pour le moment.
							{:else}
								Aucun produit disponible pour le moment.
							{/if}
						</p>
					</div>
				{/if}
			{:else}
				<!-- Message boutique inactive -->
				<div
					class="flex flex-1 items-center justify-center py-12 text-center sm:py-16"
				>
					<div class="max-w-md">
						<div class="mb-4 flex justify-center">
							<div class="rounded-full bg-orange-100 p-3">
								<svg
									class="h-8 w-8 text-orange-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
									/>
								</svg>
							</div>
						</div>
						<h3 class="mb-2 text-lg font-semibold text-foreground">
							Boutique temporairement fermée
						</h3>
						<p class="text-sm text-muted-foreground sm:text-base">
							Cette boutique n'est pas disponible pour le moment. Revenez
							bientôt pour découvrir nos délicieuses créations !
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<ClientFooter {customizations} />
	</div>
{/if}
