<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Calendar, Plus, Clock, Trash2 } from 'lucide-svelte';
	import UnavailabilityForm from './unavailability-form.svelte';
	import AvailabilityList from './availability-list.svelte';
	import { writable } from 'svelte/store';
	import { enhance } from '$app/forms';

	// Données de la page
	$: ({ availabilities, unavailabilities, form } = $page.data);

	// Store local pour les indisponibilités (permet la mise à jour de l'interface)
	const localUnavailabilities = writable(unavailabilities || []);

	// Synchroniser le store local avec les données de la page
	$: if (unavailabilities) {
		localUnavailabilities.set(unavailabilities);
	}

	// État local
	let showUnavailabilityForm = false;

	// État pour la confirmation de suppression
	let confirmingDeleteId: string | null = null;

	// Get today's date for min date
	const today = new Date().toISOString().split('T')[0];

	// Fonctions
	function startCreate() {
		showUnavailabilityForm = true;
	}

	function cancelCreate() {
		showUnavailabilityForm = false;
	}

	function startDeleteConfirmation(id: string) {
		confirmingDeleteId = id;
	}

	function cancelDeleteConfirmation() {
		confirmingDeleteId = null;
	}

	// Format date for display
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	}

	// Handle successful deletion
	function handleDeleteSuccess(unavailabilityId: string) {
		localUnavailabilities.update((unavailabilities) =>
			unavailabilities.filter((u: { id: string }) => u.id !== unavailabilityId),
		);
	}
</script>

<svelte:head>
	<title>Gestion des disponibilités - Pattyly</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">
			Gestion des disponibilités
		</h1>
		<p class="mt-2 text-muted-foreground">
			Configurez vos horaires d'ouverture et vos périodes d'indisponibilité
		</p>
	</div>

	<!-- Weekly Schedule -->
	<Card class="mb-8">
		<CardHeader>
			<div class="flex items-center space-x-3">
				<Clock class="h-6 w-6 text-primary" />
				<div>
					<CardTitle>Horaires d'ouverture</CardTitle>
					<CardDescription>
						Définissez vos horaires pour chaque jour de la semaine
					</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<AvailabilityList {availabilities} />
		</CardContent>
	</Card>

	<!-- Unavailabilities -->
	<Card>
		<CardHeader>
			<div
				class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
			>
				<div class="flex items-center space-x-3">
					<Calendar class="h-6 w-6 text-primary" />
					<div>
						<CardTitle>Périodes d'indisponibilité</CardTitle>
						<CardDescription>
							Ajoutez des périodes où vous ne serez pas disponible
						</CardDescription>
					</div>
				</div>
				<Button
					on:click={startCreate}
					variant="outline"
					class="w-full sm:w-auto"
				>
					<Plus class="mr-2 h-4 w-4" />
					Ajouter une indisponibilité
				</Button>
			</div>
		</CardHeader>
		<CardContent>
			{#if showUnavailabilityForm}
				<div class="mb-6 rounded-lg border bg-muted/50 p-4">
					<h3 class="mb-4 font-medium">Nouvelle indisponibilité</h3>
					<UnavailabilityForm data={form} {today} onCancel={cancelCreate} />
				</div>
			{/if}

			{#if $localUnavailabilities.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					<Calendar class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>Aucune indisponibilité programmée</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each $localUnavailabilities as unavailability}
						<div
							class="flex items-center justify-between rounded-lg border p-4"
						>
							<div>
								<div class="font-medium">
									{formatDate(unavailability.start_date)}
									{#if unavailability.start_date !== unavailability.end_date}
										- {formatDate(unavailability.end_date)}
									{/if}
								</div>
							</div>
							{#if confirmingDeleteId === unavailability.id}
								<div class="flex gap-2">
									<form
										method="POST"
										action="?/deleteUnavailability"
										use:enhance={() => {
											return async ({ result }) => {
												if (result.type === 'success') {
													handleDeleteSuccess(unavailability.id);
													confirmingDeleteId = null;
												}
											};
										}}
										class="inline"
									>
										<input
											type="hidden"
											name="unavailabilityId"
											value={unavailability.id}
										/>
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											class="bg-red-600 text-white hover:bg-red-700 hover:text-white"
											title="Confirmer la suppression"
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										</Button>
									</form>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										on:click={cancelDeleteConfirmation}
										title="Annuler la suppression"
									>
										<svg
											class="h-4 w-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</Button>
								</div>
							{:else}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="text-red-600 hover:bg-red-50 hover:text-red-700"
									on:click={() => startDeleteConfirmation(unavailability.id)}
									title="Supprimer l'indisponibilité"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
