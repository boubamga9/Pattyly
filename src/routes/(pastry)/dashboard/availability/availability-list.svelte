<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { enhance } from '$app/forms';

	export let availabilities: Array<{
		id: string;
		day: number;
		is_open: boolean;
		daily_order_limit: number | null;
	}>;

	// Refs pour les boutons de soumission
	let submitButtons: Record<string, HTMLButtonElement> = {};
	let limitSubmitButtons: Record<string, HTMLButtonElement> = {};

	// Valeurs des inputs pour la gestion réactive
	let inputValues: Record<string, string> = {};
	let isSubmitting: Record<string, boolean> = {};

	// Initialiser les valeurs des inputs
	$: {
		availabilities.forEach((availability) => {
			if (!(availability.id in inputValues)) {
				inputValues[availability.id] =
					availability.daily_order_limit?.toString() || '';
			}
		});
	}

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

	// Handle availability toggle
	function handleAvailabilityToggle(availability: {
		id: string;
		is_open: boolean;
		daily_order_limit: number | null;
	}) {
		const newValue = !availability.is_open;

		// Mettre à jour l'état local immédiatement
		availabilities = availabilities.map((a) =>
			a.id === availability.id ? { ...a, is_open: newValue } : a,
		);

		// Déclencher la soumission du formulaire via la ref Svelte
		const submitButton = submitButtons[availability.id];
		if (submitButton) {
			submitButton.click();
		}
	}

	// Handle cake limit change
	function handleCakeLimitChange(availabilityId: string, newLimit?: string) {
		const limitToUse =
			newLimit !== undefined ? newLimit : inputValues[availabilityId];
		const limitValue = limitToUse === '' ? null : parseInt(limitToUse);

		// Mettre à jour l'état local immédiatement
		availabilities = availabilities.map((a) =>
			a.id === availabilityId ? { ...a, daily_order_limit: limitValue } : a,
		);

		// Marquer comme en cours de soumission
		isSubmitting[availabilityId] = true;

		// Mettre à jour le champ caché dailyOrderLimit dans le formulaire
		const limitSubmitButton = limitSubmitButtons[availabilityId];
		if (limitSubmitButton) {
			const dailyOrderLimitInput =
				limitSubmitButton.parentElement?.querySelector(
					'input[name="dailyOrderLimit"]',
				) as HTMLInputElement;
			if (dailyOrderLimitInput) {
				dailyOrderLimitInput.value = limitToUse;
			}
			limitSubmitButton.click();
		}
	}
</script>

<div class="space-y-4">
	{#each dayNames as dayName, index}
		{@const dbDay = interfaceToDbDay[index]}
		{@const availability = availabilities.find((a) => a.day === dbDay)}
		{#if availability}
			<div class="rounded-lg border p-4">
				<!-- Formulaire pour le switch d'ouverture/fermeture -->
				<form
					method="POST"
					action="?/updateAvailability"
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								// Succès - rien à faire
							} else {
								// En cas d'erreur, remettre l'ancienne valeur
								availabilities = availabilities.map((a) =>
									a.id === availability.id
										? { ...a, is_open: !availability.is_open }
										: a,
								);
							}
						};
					}}
				>
					<input type="hidden" name="availabilityId" value={availability.id} />
					<input
						type="hidden"
						name="isAvailable"
						value={(!availability.is_open).toString()}
					/>
					<input
						type="hidden"
						name="dailyOrderLimit"
						value={availability.daily_order_limit || ''}
					/>

					<!-- Bouton caché pour déclencher la soumission -->
					<button
						type="submit"
						bind:this={submitButtons[availability.id]}
						class="hidden"
					>
						Soumettre
					</button>
				</form>

				<!-- Formulaire séparé pour la limite quotidienne -->
				{#if availability.is_open}
					<form
						method="POST"
						action="?/updateAvailability"
						use:enhance={() => {
							return async ({ result }) => {
								// Réinitialiser l'état de soumission
								isSubmitting[availability.id] = false;

								if (result.type !== 'success') {
									// En cas d'erreur, remettre l'ancienne valeur
									const originalAvailability = availabilities.find(
										(a) => a.id === availability.id,
									);
									if (originalAvailability) {
										availabilities = availabilities.map((a) =>
											a.id === availability.id
												? {
														...a,
														daily_order_limit:
															originalAvailability.daily_order_limit,
													}
												: a,
										);
									}
								}
							};
						}}
					>
						<input
							type="hidden"
							name="availabilityId"
							value={availability.id}
						/>
						<input type="hidden" name="isAvailable" value="true" />
						<input
							type="hidden"
							name="dailyOrderLimit"
							value={availability.daily_order_limit || ''}
						/>

						<!-- Bouton caché pour déclencher la soumission -->
						<button
							type="submit"
							bind:this={limitSubmitButtons[availability.id]}
							class="hidden"
						>
							Soumettre Limite
						</button>
					</form>
				{/if}

				<div
					class="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
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

					<!-- Input pour la limite (visible seulement si ouvert) -->
					{#if availability.is_open}
						<div
							class="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0"
						>
							<label class="text-sm text-muted-foreground"
								>Nombre de commandes maximum acceptées :</label
							>
							<div class="flex items-center">
								<input
									type="number"
									min="1"
									max="999"
									placeholder="∞"
									bind:value={inputValues[availability.id]}
									disabled={isSubmitting[availability.id]}
									class="w-20 rounded-l-md border border-input bg-background px-2 py-1 text-sm focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
									title="Nombre maximum de commandes acceptées ce jour (laisser vide pour illimité)"
								/>
								<!-- Bouton de validation avec icône check -->
								<button
									type="button"
									on:click={() => handleCakeLimitChange(availability.id)}
									disabled={isSubmitting[availability.id]}
									class="rounded-r-md border border-l-0 border-input bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
									title="Valider la limite"
								>
									{#if isSubmitting[availability.id]}
										<!-- Icône de chargement -->
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="animate-spin"
										>
											<circle cx="12" cy="12" r="10"></circle>
											<path d="m12 2 2 2"></path>
										</svg>
									{:else}
										<!-- Icône check -->
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<polyline points="20,6 9,17 4,12"></polyline>
										</svg>
									{/if}
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/each}
</div>
