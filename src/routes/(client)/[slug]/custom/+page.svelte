<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ClientFooter } from '$lib/components';
	import { Separator } from '$lib/components/ui/separator';
	import CustomForm from './custom-form.svelte';

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
	class="flex min-h-screen flex-col overflow-x-hidden"
	style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Header with logo and information -->
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

		<!-- Shop name -->
		<h1 class="mb-2 text-xl font-semibold" style={customStyles.textStyle}>
			{shop.name}
		</h1>

		<!-- Back button -->
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

	<!-- Main content -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Responsive layout: 2 columns on desktop, 1 column on mobile -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
				<!-- Left column: Description -->
				<div class="space-y-4 pr-4">
					<h2 class="text-2xl font-semibold" style={customStyles.textStyle}>
						{customForm?.title || 'Votre Gâteau Sur Mesure'}
					</h2>
					<div class="space-y-3" style={customStyles.secondaryTextStyle}>
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

				<!-- Right column: Form -->
				<CustomForm
					data={form}
					{shop}
					{customFields}
					{availabilities}
					{unavailabilities}
					{datesWithLimitReached}
					{customizations}
					onCancel={goBack}
				/>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter {customizations} />
</div>
