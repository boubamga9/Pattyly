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
	$: ({ shop, product, form, customFields, availabilities, unavailabilities } =
		$page.data);

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
			`Découvrez ${product.name} chez ${shop.name}`}
	/>
</svelte:head>

<div class="min-h-screen bg-background">
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
		<h1 class="mb-2 text-xl font-semibold text-foreground">
			{shop.name}
		</h1>

		<!-- Bouton retour -->
		<button
			on:click={goBack}
			class="text-xs italic text-gray-400 underline transition-colors hover:text-gray-600 sm:text-sm"
		>
			{#if $page.url.searchParams.get('preview') === 'true'}
				← Retour au dashboard
			{:else}
				← Retour à la boutique
			{/if}
		</button>
	</header>

	<!-- Separator -->
	<Separator class="mx-4" />

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
							class="text-lg font-medium text-foreground sm:text-xl md:text-2xl"
						>
							{product.name}
						</h2>
						<p class="text-sm font-medium text-foreground sm:text-base">
							À partir de {formatPrice(product.base_price)}
						</p>
						{#if product.description}
							<p class="text-sm text-foreground sm:text-base">
								{@html product.description}
							</p>
						{/if}
						<p class="text-xs italic text-gray-400 sm:text-sm">
							Temps de préparation minimum : {product.min_days_notice || 0} jours
						</p>
					</div>

					<Separator />

					<ProductForm
						data={form}
						{product}
						{customFields}
						{availabilities}
						{unavailabilities}
						onCancel={goBack}
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter />
</div>
