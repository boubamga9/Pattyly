<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ArrowLeft } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components';
	import CustomForm from './custom-form.svelte';
	import SocialMediaIcons from '$lib/components/client/social-media-icons.svelte';

	// Page data
	$: ({
		shop,
		customForm,
		customFields,
		availabilities,
		unavailabilities,
		datesWithLimitReached,
		form,
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

	// Function to go back to the shop or dashboard
	function goBack() {
		// If in preview mode, go back to dashboard
		if ($page.url.searchParams.get('preview') === 'true') {
			goto('/dashboard/custom-form');
		} else {
			// Otherwise, go back to the shop
			goto(`/${shop.slug}`);
		}
	}
</script>

<svelte:head>
	<title>Demande Personnalisée - {shop.name}</title>
	<meta
		name="description"
		content="Faites votre demande personnalisée chez {shop.name}. Créez ensemble votre gâteau sur mesure pour vos occasions spéciales."
	/>
	<meta
		name="keywords"
		content="gâteau sur mesure, demande personnalisée, {shop.name}, pâtisserie, occasion spéciale, création"
	/>
	<meta property="og:title" content="Demande Personnalisée - {shop.name}" />
	<meta
		property="og:description"
		content="Faites votre demande personnalisée chez {shop.name}"
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content={$page.url.href} />
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

	<!-- Separator -->
	<div class="px-4">
		<div class="mx-auto mb-6 max-w-7xl sm:mb-8">
			<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
		</div>
	</div>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Layout responsive : 2 colonnes sur desktop, 1 colonne sur mobile -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
				<!-- Colonne gauche : Description (fixe sur desktop) - Design moderne -->
				<div class="h-fit space-y-6 md:sticky md:top-6">
					<!-- Section 1 : Informations -->
					<div class="space-y-4">
						<h2
							class="text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
							style="font-weight: 600; letter-spacing: -0.03em;"
						>
							{customForm?.title || 'Votre Gâteau Sur Mesure'}
						</h2>
						<div
							class="space-y-3 text-sm leading-[180%] text-neutral-600 sm:text-base"
							style="font-weight: 300; letter-spacing: -0.01em;"
						>
							{#if customForm?.description}
								<p class="whitespace-pre-wrap">{customForm.description}</p>
							{:else}
								<p>
									Vous avez une idée précise en tête ? Un gâteau pour une occasion
									spéciale ? Nous sommes là pour créer ensemble votre dessert
									parfait !
								</p>
								<p>
									Notre pâtissier passionné prendra le temps d'écouter vos envies
									et de vous proposer des suggestions personnalisées pour réaliser
									le gâteau de vos rêves.
								</p>
								<p>
									Que ce soit pour un anniversaire, un mariage, une célébration ou
									simplement pour le plaisir, nous nous adaptons à vos besoins et
									à vos goûts.
								</p>
								<p>
									Remplissez le formulaire ci-contre avec tous les détails de
									votre projet, et nous vous recontacterons rapidement avec un
									devis personnalisé !
								</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Colonne droite : Formulaire (scrollable) -->
				<div class="space-y-6">
					<CustomForm
						data={form}
						{shop}
						{customFields}
						{availabilities}
						{orderLimitStats}
						{unavailabilities}
						{datesWithLimitReached}
						{customizations}
						onCancel={goBack}
					/>
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter {customizations} shopSlug={shop.slug} hasPolicies={$page.data.hasPolicies} />
</div>