<script lang="ts">
	import { Switch } from '$lib/components/ui/switch';
	import { enhance } from '$app/forms';

	export let availabilities: Array<{
		id: string;
		day: number;
		is_open: boolean;
	}>;

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

		// Force Svelte reactivity by creating a new array
		availabilities = availabilities.map((a) =>
			a.id === availability.id ? { ...a, is_open: newValue } : a,
		);
	}
</script>

<div class="space-y-4">
	{#each dayNames as dayName, index}
		{@const dbDay = interfaceToDbDay[index]}
		{@const availability = availabilities.find((a) => a.day === dbDay)}
		{#if availability}
			<div class="flex items-center justify-between rounded-lg border p-4">
				<div class="flex items-center space-x-4">
					<form
						method="POST"
						action="?/updateAvailability"
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success') {
									// Mise à jour locale déjà faite dans handleAvailabilityToggle
									console.log('✅ Disponibilité mise à jour avec succès !');
								} else {
									// En cas d'erreur, remettre l'ancienne valeur
									availabilities = availabilities.map((a) =>
										a.id === availability.id
											? { ...a, is_open: !availability.is_open }
											: a,
									);
									console.error('❌ Erreur lors de la mise à jour');
								}
							};
						}}
					>
						<input
							type="hidden"
							name="availabilityId"
							value={availability.id}
						/>
						<input
							type="hidden"
							name="isAvailable"
							value={availability.is_open.toString()}
						/>

						<Switch
							checked={availability.is_open}
							on:change={() => handleAvailabilityToggle(availability)}
						/>
					</form>
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
