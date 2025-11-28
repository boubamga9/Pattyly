<script lang="ts">
	import { page } from '$app/stores';
	import { Switch } from '$lib/components/ui/switch';
	import { enhance } from '$app/forms';

	export let availabilities: Array<{
		id: string;
		day: number;
		is_open: boolean;
		daily_order_limit: number | null;
		start_time: string | null;
		end_time: string | null;
		interval_time: string | null;
	}>;

	// Refs pour les boutons de soumission
	let submitButtons: Record<string, HTMLButtonElement> = {};
	let timeSubmitButtons: Record<string, HTMLButtonElement> = {};

	// Valeurs des inputs pour la gestion réactive
	let inputValues: Record<string, string> = {};
	let timeValues: Record<
		string,
		{ start: string; end: string; interval: string }
	> = {};
	let isSubmitting: Record<string, boolean> = {};
	let showSuccessFeedback: Record<string, boolean> = {};

	// Initialiser les valeurs des inputs
	$: {
		availabilities.forEach((availability) => {
			// Initialiser seulement si pas encore défini (évite d'écraser les modifications utilisateur)
			if (!(availability.id in inputValues)) {
				inputValues[availability.id] =
					availability.daily_order_limit?.toString() || '';
			}
			if (!(availability.id in timeValues)) {
				timeValues[availability.id] = {
					start: availability.start_time || '09:00',
					end: availability.end_time || '18:00',
					interval: availability.interval_time || '00:30:00',
				};
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

	// Handle complete configuration update (time slots + daily limit)
	function handleTimeConfigUpdate(availabilityId: string) {
		const timeConfig = timeValues[availabilityId];
		const dailyLimit = inputValues[availabilityId];

		// Mettre à jour l'état local immédiatement
		availabilities = availabilities.map((a) =>
			a.id === availabilityId
				? {
						...a,
						start_time: timeConfig.start,
						end_time: timeConfig.end,
						interval_time: timeConfig.interval,
						daily_order_limit: dailyLimit ? parseInt(dailyLimit) : null,
					}
				: a,
		);

		// Marquer comme en cours de soumission
		isSubmitting[availabilityId] = true;

		// Déclencher la soumission du formulaire
		const timeSubmitButton = timeSubmitButtons[availabilityId];
		if (timeSubmitButton) {
			// Mettre à jour les champs cachés
			const form = timeSubmitButton.parentElement;
			if (form) {
				const startTimeInput = form.querySelector(
					'input[name="startTime"]',
				) as HTMLInputElement;
				const endTimeInput = form.querySelector(
					'input[name="endTime"]',
				) as HTMLInputElement;
				const intervalTimeInput = form.querySelector(
					'input[name="intervalTime"]',
				) as HTMLInputElement;
				const dailyOrderLimitInput = form.querySelector(
					'input[name="dailyOrderLimit"]',
				) as HTMLInputElement;

				if (startTimeInput) startTimeInput.value = timeConfig.start;
				if (endTimeInput) endTimeInput.value = timeConfig.end;
				if (intervalTimeInput) intervalTimeInput.value = timeConfig.interval;
				if (dailyOrderLimitInput) dailyOrderLimitInput.value = dailyLimit || '';
			}
			timeSubmitButton.click();
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
					<!-- ✅ OPTIMISÉ : Passer shopId pour éviter getUserPermissions + requête shop -->
					{#if $page.data.shopId}
						<input type="hidden" name="shopId" value={$page.data.shopId} />
					{/if}
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

				<!-- Formulaire séparé pour les créneaux horaires -->
				{#if availability.is_open}
					<form
						method="POST"
						action="?/updateAvailability"
						use:enhance={() => {
							return async ({ result }) => {
								// Réinitialiser l'état de soumission
								isSubmitting[availability.id] = false;

								if (result.type === 'success') {
									// ✅ Succès : Mettre à jour les valeurs locales avec les données sauvegardées
									const updatedAvailability = availabilities.find(
										(a) => a.id === availability.id,
									);
									if (updatedAvailability) {
										// Mettre à jour inputValues (limite de commandes)
										inputValues[availability.id] =
											updatedAvailability.daily_order_limit?.toString() || '';

										// Mettre à jour timeValues (créneaux horaires)
										timeValues[availability.id] = {
											start: updatedAvailability.start_time || '09:00',
											end: updatedAvailability.end_time || '18:00',
											interval: updatedAvailability.interval_time || '00:30:00',
										};

										// Afficher le feedback de succès temporairement
										showSuccessFeedback[availability.id] = true;
										setTimeout(() => {
											showSuccessFeedback[availability.id] = false;
										}, 2000);
									}
								} else {
									// ❌ Erreur : Remettre les anciennes valeurs
									const originalAvailability = availabilities.find(
										(a) => a.id === availability.id,
									);
									if (originalAvailability) {
										availabilities = availabilities.map((a) =>
											a.id === availability.id
												? {
														...a,
														start_time: originalAvailability.start_time,
														end_time: originalAvailability.end_time,
														interval_time: originalAvailability.interval_time,
													}
												: a,
										);
									}
								}
							};
						}}
					>
						<!-- ✅ OPTIMISÉ : Passer shopId pour éviter getUserPermissions + requête shop -->
						{#if $page.data.shopId}
							<input type="hidden" name="shopId" value={$page.data.shopId} />
						{/if}
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
						<input
							type="hidden"
							name="startTime"
							value={availability.start_time || ''}
						/>
						<input
							type="hidden"
							name="endTime"
							value={availability.end_time || ''}
						/>
						<input
							type="hidden"
							name="intervalTime"
							value={availability.interval_time || ''}
						/>

						<!-- Bouton caché pour déclencher la soumission -->
						<button
							type="submit"
							bind:this={timeSubmitButtons[availability.id]}
							class="hidden"
						>
							Soumettre Créneaux
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
						<div class="space-y-4">
							<!-- Limite de commandes -->
							<div class="space-y-2">
								<label class="text-sm font-medium text-muted-foreground">
									Nombre de commandes maximum acceptées
								</label>
								<input
									type="number"
									min="1"
									max="999"
									placeholder="∞"
									bind:value={inputValues[availability.id]}
									disabled={isSubmitting[availability.id]}
									class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
									title="Nombre maximum de commandes acceptées ce jour (laisser vide pour illimité)"
								/>
							</div>

							<!-- Configuration des créneaux horaires -->
							<div class="space-y-3">
								<div class="flex items-center gap-2">
									<svg
										class="h-4 w-4 text-muted-foreground"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
									<h4 class="text-sm font-medium text-muted-foreground">
										Créneaux de récupération
									</h4>
								</div>
								<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
									<!-- Heure de début -->
									<div>
										<label class="mb-1 block text-xs text-muted-foreground">
											Heure de début
										</label>
										<input
											type="time"
											step="1800"
											bind:value={timeValues[availability.id].start}
											disabled={isSubmitting[availability.id]}
											class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
										/>
									</div>
									<!-- Heure de fin -->
									<div>
										<label class="mb-1 block text-xs text-muted-foreground">
											Heure de fin
										</label>
										<input
											type="time"
											step="1800"
											bind:value={timeValues[availability.id].end}
											disabled={isSubmitting[availability.id]}
											class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
										/>
									</div>
									<!-- Intervalle -->
									<div>
										<label class="mb-1 block text-xs text-muted-foreground">
											Intervalle
										</label>
										<select
											bind:value={timeValues[availability.id].interval}
											disabled={isSubmitting[availability.id]}
											class="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
										>
											<option value="00:30:00">30 min</option>
											<option value="01:00:00">1h</option>
											<option value="02:00:00">2h</option>
											<option value="03:00:00">3h</option>
										</select>
									</div>
								</div>
								<div class="flex justify-end">
									<button
										type="button"
										on:click={() => handleTimeConfigUpdate(availability.id)}
										disabled={isSubmitting[availability.id] ||
											showSuccessFeedback[availability.id]}
										class="rounded-md px-3 py-1.5 text-xs text-white transition-all duration-200 disabled:cursor-not-allowed {showSuccessFeedback[
											availability.id
										]
											? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
											: isSubmitting[availability.id]
												? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
												: 'bg-primary hover:bg-primary/90 disabled:opacity-50'}"
									>
										{#if showSuccessFeedback[availability.id]}
											<div class="flex items-center gap-2">
												<svg
													class="h-3 w-3"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M5 13l4 4L19 7"
													></path>
												</svg>
												<span>Sauvegardé !</span>
											</div>
										{:else if isSubmitting[availability.id]}
											<div class="flex items-center gap-2">
												<svg
													class="h-5 w-5 animate-spin"
													fill="none"
													viewBox="0 0 24 24"
												>
													<circle
														class="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														stroke-width="4"
													></circle>
													<path
														class="opacity-75"
														fill="currentColor"
														d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
												<span>Sauvegarde...</span>
											</div>
										{:else}
											Valider
										{/if}
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{/each}
</div>