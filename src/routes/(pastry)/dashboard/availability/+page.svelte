<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Switch } from '$lib/components/ui/switch';
	import { Calendar, Clock, X, Plus, Trash2, Check } from 'lucide-svelte';

	export let data: {
		availabilities: Array<{
			id: string;
			day: number;
			is_open: boolean;
		}>;
		unavailabilities: Array<{
			id: string;
			start_date: string;
			end_date: string;
		}>;
		shopId: string;
	};

	let availabilities = data.availabilities;
	let unavailabilities = data.unavailabilities;
	let error = '';

	// État pour la confirmation de suppression
	let confirmingDeleteId: string | null = null;

	// Form data for new unavailability
	let showUnavailabilityForm = false;
	let startDate = '';
	let endDate = '';

	const dayNames = [
		'Lundi', // 0 (mais correspond à DB day = 1)
		'Mardi', // 1 (mais correspond à DB day = 2)
		'Mercredi', // 2 (mais correspond à DB day = 3)
		'Jeudi', // 3 (mais correspond à DB day = 4)
		'Vendredi', // 4 (mais correspond à DB day = 5)
		'Samedi', // 5 (mais correspond à DB day = 6)
		'Dimanche', // 6 (mais correspond à DB day = 0)
	];

	// Mapping pour convertir l'index de l'interface vers le jour de la DB
	// Interface: 0=Lundi, 1=Mardi, 2=Mercredi, 3=Jeudi, 4=Vendredi, 5=Samedi, 6=Dimanche
	// DB: 0=Dimanche, 1=Lundi, 2=Mardi, 3=Mercredi, 4=Jeudi, 5=Vendredi, 6=Samedi
	const interfaceToDbDay = [1, 2, 3, 4, 5, 6, 0];

	// Handle availability toggle with auto-save
	async function handleAvailabilityToggle(availability: {
		id: string;
		is_open: boolean;
	}) {
		const newValue = !availability.is_open;

		// Auto-save the change
		const formData = new FormData();
		formData.append('availabilityId', availability.id);
		formData.append('isAvailable', newValue.toString());

		try {
			const response = await fetch('?/updateAvailability', {
				method: 'POST',
				body: formData,
			});

			const result = await response.json();

			if (result.type === 'success') {
				// Force Svelte reactivity by creating a new array
				availabilities = availabilities.map((a) =>
					a.id === availability.id ? { ...a, is_open: newValue } : a,
				);
			} else {
				error = result.data?.error || 'Une erreur est survenue';
			}
		} catch {
			error = 'Erreur de connexion';
		}
	}

	// Handle form result
	function handleResult(result: any) {
		if (result.type === 'failure') {
			error = result.data?.error || 'Une erreur est survenue';
		}
	}

	// Remove unavailability from local data
	function removeUnavailability(id: string) {
		unavailabilities = unavailabilities.filter((u) => u.id !== id);
	}

	// Add unavailability to local data

	// Fonctions pour la confirmation de suppression
	function startDeleteConfirmation(id: string) {
		confirmingDeleteId = id;
	}

	function cancelDeleteConfirmation() {
		confirmingDeleteId = null;
	}
	function handleAddUnavailability() {
		// Validate dates first
		if (!startDate || !endDate) {
			error = 'Veuillez sélectionner les dates';
			return;
		}

		if (new Date(startDate) > new Date(endDate)) {
			error = 'La date de début doit être antérieure à la date de fin';
			return;
		}

		// Check for overlapping dates
		const start = new Date(startDate);
		const end = new Date(endDate);

		const hasOverlap = unavailabilities.some((unavailability) => {
			const existingStart = new Date(unavailability.start_date);
			const existingEnd = new Date(unavailability.end_date);

			return start <= existingEnd && end >= existingStart;
		});

		if (hasOverlap) {
			return; // Silently prevent overlap without showing error
		}

		// Add to local data with temporary ID
		unavailabilities = [
			...unavailabilities,
			{
				id: Date.now().toString(), // Temporary ID
				start_date: startDate,
				end_date: endDate,
			},
		];

		// Reset form
		showUnavailabilityForm = false;
		startDate = '';
		endDate = '';
		error = '';
	}

	// Format date for display
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	}

	// Get today's date for min date
	const today = new Date().toISOString().split('T')[0];

	// Get all unavailable dates for date picker
	function getUnavailableDates() {
		const dates = [];
		unavailabilities.forEach((unavailability) => {
			const start = new Date(unavailability.start_date);
			const end = new Date(unavailability.end_date);

			for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
				dates.push(d.toISOString().split('T')[0]);
			}
		});
		return dates;
	}

	// Check if a date is unavailable
	function isDateUnavailable(date: string) {
		return getUnavailableDates().includes(date);
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

	{#if error}
		<Alert class="mb-6">
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

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
			<div class="space-y-4">
				{#each dayNames as dayName, index}
					{@const dbDay = interfaceToDbDay[index]}
					{@const availability = availabilities.find((a) => a.day === dbDay)}
					{#if availability}
						<div
							class="flex items-center justify-between rounded-lg border p-4"
						>
							<div class="flex items-center space-x-4">
								<Switch
									checked={availability.is_open}
									on:change={() => handleAvailabilityToggle(availability)}
								/>
								<div>
									<h3 class="font-medium">{dayName}</h3>
									<p class="text-sm text-muted-foreground">
										{availability.is_open ? 'Ouvert' : 'Fermé'}
									</p>
								</div>
							</div>
						</div>
					{/if}
				{/each}
			</div>
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
					on:click={() => (showUnavailabilityForm = !showUnavailabilityForm)}
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
					<form
						method="POST"
						action="?/addUnavailability"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success') {
									handleAddUnavailability();
								}
								handleResult(result);
							};
						}}
					>
						<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<Label for="startDate">Date de début</Label>
								<Input
									id="startDate"
									name="startDate"
									type="date"
									bind:value={startDate}
									min={today}
									required
									class={isDateUnavailable(startDate) ? 'border-red-500' : ''}
									title={isDateUnavailable(startDate)
										? 'Cette date est déjà indisponible'
										: ''}
								/>
								{#if isDateUnavailable(startDate)}
									<p class="mt-1 text-sm text-red-500">
										Cette date est déjà indisponible
									</p>
								{/if}
							</div>
							<div>
								<Label for="endDate">Date de fin</Label>
								<Input
									id="endDate"
									name="endDate"
									type="date"
									bind:value={endDate}
									min={startDate || today}
									required
									class={isDateUnavailable(endDate) ? 'border-red-500' : ''}
									title={isDateUnavailable(endDate)
										? 'Cette date est déjà indisponible'
										: ''}
								/>
								{#if isDateUnavailable(endDate)}
									<p class="mt-1 text-sm text-red-500">
										Cette date est déjà indisponible
									</p>
								{/if}
							</div>
						</div>
						<div class="flex space-x-2">
							<Button type="submit">Ajouter</Button>
							<Button
								type="button"
								variant="outline"
								on:click={() => (showUnavailabilityForm = false)}
							>
								Annuler
							</Button>
						</div>
					</form>
				</div>
			{/if}

			{#if unavailabilities.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					<Calendar class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>Aucune indisponibilité programmée</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each unavailabilities as unavailability}
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
								<div class="flex gap-1">
									<form
										method="POST"
										action="?/deleteUnavailability"
										use:enhance={() => {
											return async ({ result }) => {
												if (result.type === 'success') {
													removeUnavailability(unavailability.id);
													confirmingDeleteId = null;
												}
												handleResult(result);
											};
										}}
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
											<Check class="h-4 w-4" />
										</Button>
									</form>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										on:click={cancelDeleteConfirmation}
										title="Annuler la suppression"
									>
										<X class="h-4 w-4" />
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
