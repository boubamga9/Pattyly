<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';

	import { Info, Eye } from 'lucide-svelte';
	import type { CustomizationField } from '$lib/components/CustomizationFormBuilder';
	import ToggleForm from './toggle-form.svelte';
	import UpdateForm from './update-form.svelte';

	// Données de la page
	$: ({
		shop,
		customForm: _customForm,
		customFields: initialCustomFields,
		needsUpgrade,
		toggleForm,
		updateForm,
		// Compat temporaire
		form,
	} = $page.data);

	// Variables pour les champs de personnalisation
	let customFields: CustomizationField[] = [];

	// Fonction pour gérer le changement de toggle
	function handleToggle(newValue: boolean) {
		console.log('✅ Toggle mis à jour localement:', newValue);
		// Pas besoin de stocker localement, on laisse Svelte gérer la réactivité
	}

	// Fonction pour gérer le succès du formulaire de mise à jour
	function handleUpdateSuccess() {
		console.log('✅ Formulaire personnalisé mis à jour avec succès !');
		// Optionnel : afficher une notification ou mettre à jour l'interface
	}

	// Fonction pour voir le preview du formulaire personnalisé
	function viewCustomFormPreview() {
		// Rediriger vers la page publique du formulaire personnalisé avec le mode preview
		if (shop?.slug) {
			goto(`/${shop.slug}/custom?preview=true`);
		} else {
			console.error('Shop slug not available');
		}
	}

	// Initialiser les champs de personnalisation
	$: if (initialCustomFields && initialCustomFields.length > 0) {
		customFields = initialCustomFields.map(
			(field: {
				id: string;
				label: string;
				type: string;
				required: boolean;
				options: string | Array<{ label: string; price: number }>;
			}) => ({
				id: field.id,
				label: field.label,
				type: field.type,
				required: field.required,
				options: field.options
					? typeof field.options === 'string'
						? JSON.parse(field.options)
						: field.options
					: [],
			}),
		);
	}
</script>

<svelte:head>
	<title>Questionnaire Personnalisé - Dashboard</title>
	<style>
		.sortable-ghost {
			opacity: 0.5;
			background: #f3f4f6;
		}

		.sortable-chosen {
			background: #fef3c7;
			transform: rotate(2deg);
		}

		.sortable-drag {
			opacity: 0.8;
			background: white;
			box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		}
	</style>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Questionnaire Personnalisé</h1>
			<p class="text-muted-foreground">
				Gérez les demandes personnalisées de vos clients
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if shop?.is_custom_accepted}
				<Button
					variant="outline"
					size="sm"
					on:click={viewCustomFormPreview}
					title="Voir le formulaire comme vos clients"
				>
					<Eye class="mr-2 h-4 w-4" />
					Preview
				</Button>
			{/if}
			{#if shop}
				<Badge variant={shop.is_custom_accepted ? 'default' : 'secondary'}>
					{shop.is_custom_accepted ? 'Activé' : 'Désactivé'}
				</Badge>
			{/if}
		</div>
	</div>

	<!-- Page d'upgrade pour les utilisateurs basic -->
	{#if needsUpgrade}
		<Card class="mx-auto max-w-4xl">
			<CardContent class="py-12">
				<div class="space-y-6 text-center">
					<!-- Icône -->
					<div
						class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600"
					>
						<svg
							class="h-8 w-8 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							></path>
						</svg>
					</div>

					<!-- Titre -->
					<div>
						<h2 class="mb-2 text-2xl font-bold text-gray-900">
							Fonctionnalité Premium
						</h2>
						<p class="text-gray-600">
							Les questionnaires personnalisés sont disponibles avec le plan
							Premium
						</p>
					</div>

					<!-- Avantages -->
					<div class="mx-auto grid max-w-2xl gap-6 md:grid-cols-3">
						<div class="space-y-2 text-center">
							<div
								class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50"
							>
								<svg
									class="h-6 w-6 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 6h16M4 10h16M4 14h16M4 18h16"
									></path>
								</svg>
							</div>
							<h3 class="font-semibold text-gray-900">
								Formulaires sur mesure
							</h3>
							<p class="text-sm text-gray-600">
								Créez des questionnaires personnalisés pour vos clients
							</p>
						</div>

						<div class="space-y-2 text-center">
							<div
								class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50"
							>
								<svg
									class="h-6 w-6 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									></path>
								</svg>
							</div>
							<h3 class="font-semibold text-gray-900">
								Demandes personnalisées
							</h3>
							<p class="text-sm text-gray-600">
								Acceptez des commandes spéciales de vos clients
							</p>
						</div>

						<div class="space-y-2 text-center">
							<div
								class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50"
							>
								<svg
									class="h-6 w-6 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									></path>
								</svg>
							</div>
							<h3 class="font-semibold text-gray-900">Gestion avancée</h3>
							<p class="text-sm text-gray-600">
								Organisez et gérez toutes vos demandes facilement
							</p>
						</div>
					</div>

					<!-- Bouton d'upgrade -->
					<div class="pt-6">
						<Button
							size="lg"
							class="bg-blue-600 px-8 py-3 text-white hover:bg-blue-700"
							on:click={() => (window.location.href = '/subscription')}
						>
							<svg
								class="mr-2 h-5 w-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
								></path>
							</svg>
							Passer au Plan Premium
						</Button>
						<p class="mt-3 text-sm text-gray-500">
							À partir de 19€/mois - Annulation à tout moment
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	{:else}
		<!-- Messages d'erreur/succès -->
		{#if form?.error}
			<Alert variant="destructive">
				<AlertDescription>{form.error}</AlertDescription>
			</Alert>
		{/if}

		{#if form?.message}
			<Alert>
				<AlertDescription>{form.message}</AlertDescription>
			</Alert>
		{/if}

		<!-- Section Activation/Désactivation -->
		<Card>
			<CardHeader>
				<CardTitle>Activation des Demandes Personnalisées</CardTitle>
				<CardDescription>
					Activez ou désactivez la possibilité pour vos clients de faire des
					demandes personnalisées
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if shop}
					<ToggleForm
						data={toggleForm}
						isCustomAccepted={shop.is_custom_accepted}
						onToggle={handleToggle}
					/>
				{:else}
					<div class="py-4 text-center text-muted-foreground">
						Chargement...
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Section Formulaire Personnalisé -->
		{#if shop?.is_custom_accepted}
			<UpdateForm
				data={updateForm}
				{customFields}
				onSuccess={handleUpdateSuccess}
			/>
		{:else}
			<!-- Message quand les demandes sont désactivées -->
			<Card>
				<CardContent class="py-8">
					<div class="text-center">
						<Info class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<h3 class="mb-2 text-lg font-medium">
							Demandes personnalisées désactivées
						</h3>
						<p class="mb-4 text-muted-foreground">
							Activez les demandes personnalisées pour configurer votre
							formulaire
						</p>
					</div>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
