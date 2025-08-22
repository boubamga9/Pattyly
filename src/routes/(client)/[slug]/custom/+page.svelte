<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ClientFooter } from '$lib/components';
	import CustomForm from './custom-form.svelte';

	// Données de la page
	$: ({
		shop,
		customForm,
		customFields,
		availabilities,
		unavailabilities,
		form,
	} = $page.data);

	// Fonction pour retourner à la boutique
	function goBack() {
		goto(`/${shop.slug}`);
	}
</script>

<svelte:head>
	<title>Demande Personnalisée - {shop.name}</title>
	<meta
		name="description"
		content="Faites votre demande personnalisée chez {shop.name}"
	/>
</svelte:head>

<div class="flex min-h-screen flex-col overflow-x-hidden bg-background">
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
			← Retour à la boutique
		</button>
	</header>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Layout responsive : 2 colonnes sur desktop, 1 colonne sur mobile -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
				<!-- Colonne gauche : Description -->
				<div class="space-y-4 pr-4">
					<h2 class="text-2xl font-semibold text-foreground">
						{customForm?.title || 'Votre Gâteau Sur Mesure'}
					</h2>
					<div class="space-y-3 text-muted-foreground">
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

				<CustomForm
					data={form}
					{customFields}
					{availabilities}
					{unavailabilities}
					onCancel={goBack}
				/>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter />
</div>
