<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { directorySchema } from '$lib/validations/schemas/shop';
	import { searchCities, MAJOR_CITIES, CAKE_TYPES_FOR_FORMS, type CitySuggestion } from '$lib/services/city-autocomplete';
	import { MapPin, Search, LoaderCircle } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';

	export let data: SuperValidated<Infer<typeof directorySchema>>;

	const form = superForm(data, {
		validators: zodClient(directorySchema),
		resetForm: false, // Ne pas réinitialiser le formulaire après soumission
		dataType: 'json', // Utiliser JSON pour gérer les arrays correctement
		onUpdated: ({ form: updatedForm }) => {
			console.log('📋 [Directory Form] onUpdated called', {
				valid: updatedForm.valid,
				data: updatedForm.data,
				message: updatedForm.message
			});
			// Préserver les valeurs après mise à jour
			if (updatedForm.valid && updatedForm.data) {
				// Synchroniser cityInput avec la valeur du formulaire
				cityInput = updatedForm.data.directory_actual_city || '';
				console.log('📋 [Directory Form] cityInput updated to:', cityInput);
				if (updatedForm.data.directory_postal_code && !selectedCity) {
					// Si on a un code postal mais pas de ville sélectionnée, essayer de trouver la ville
					// (optionnel, pour améliorer l'UX)
				}
			}
		}
	});

	const { form: formData, enhance, submitting, errors } = form;

	// Autocomplétion de la ville
	let cityInput = $formData.directory_actual_city || '';
	let citySuggestions: CitySuggestion[] = [];
	let showSuggestions = false;
	let isSearching = false;
	let selectedCity: CitySuggestion | null = null;
	let cityInputElement: HTMLInputElement;

	// Recherche de villes avec debounce
	let searchTimeout: ReturnType<typeof setTimeout>;
	async function handleCityInput() {
		$formData.directory_actual_city = cityInput;
		$formData.directory_postal_code = ''; // Reset code postal si ville change

		clearTimeout(searchTimeout);
		
		if (cityInput.length < 2) {
			citySuggestions = [];
			showSuggestions = false;
			selectedCity = null;
			return;
		}

		searchTimeout = setTimeout(async () => {
			isSearching = true;
			const results = await searchCities(cityInput, 8);
			citySuggestions = results;
			showSuggestions = results.length > 0;
			isSearching = false;
		}, 300);
	}

	function selectCity(suggestion: CitySuggestion) {
		selectedCity = suggestion;
		cityInput = suggestion.city;
		$formData.directory_actual_city = suggestion.city;
		$formData.directory_postal_code = suggestion.postalCode;
		showSuggestions = false;
		citySuggestions = [];
	}

	function handleCityBlur() {
		// Délai pour permettre le clic sur une suggestion
		setTimeout(() => {
			showSuggestions = false;
		}, 200);
	}

	// Gestion des types de gâteaux (limite à 3 maximum)
	function toggleCakeType(cakeType: string) {
		const currentTypes = $formData.directory_cake_types || [];
		
		// Si on désélectionne, on peut toujours le faire
		if (currentTypes.includes(cakeType)) {
			const newTypes = currentTypes.filter((t) => t !== cakeType);
			$formData.directory_cake_types = newTypes;
			form.update({ directory_cake_types: newTypes }, { reset: false });
			return;
		}
		
		// Si on sélectionne et qu'on a déjà 3 types, on ne peut pas en ajouter plus
		if (currentTypes.length >= 3) {
			console.log('📋 [Directory Form] Maximum de 3 types atteint');
			return;
		}
		
		// Ajouter le nouveau type
		const newTypes = [...currentTypes, cakeType];
		
		console.log('📋 [Directory Form] toggleCakeType:', {
			cakeType,
			currentTypes,
			newTypes,
			beforeUpdate: $formData.directory_cake_types
		});
		
		// Mettre à jour le formulaire de manière réactive
		$formData.directory_cake_types = newTypes;
		
		// Forcer la mise à jour pour s'assurer que superForm détecte le changement
		form.update({ directory_cake_types: newTypes }, { reset: false });
		
		console.log('📋 [Directory Form] After update:', {
			directory_cake_types: $formData.directory_cake_types,
			formDataSnapshot: JSON.parse(JSON.stringify($formData))
		});
	}

	// Synchroniser cityInput avec le formulaire (réactif) - seulement si l'input n'est pas en focus
	let isCityInputFocused = false;
	
	$: {
		// Ne synchroniser que si l'input n'est pas en focus (pour éviter de bloquer la saisie)
		if (!isCityInputFocused && $formData.directory_actual_city && cityInput !== $formData.directory_actual_city) {
			console.log('📋 [Directory Form] Syncing cityInput from', cityInput, 'to', $formData.directory_actual_city);
			cityInput = $formData.directory_actual_city;
		}
	}
	
	// Logger les changements de formData seulement quand ils sont significatifs
	$: if ($formData.directory_city || $formData.directory_actual_city || $formData.directory_postal_code) {
		console.log('📋 [Directory Form] FormData changed:', {
			directory_city: $formData.directory_city,
			directory_actual_city: $formData.directory_actual_city,
			directory_postal_code: $formData.directory_postal_code,
			directory_cake_types: $formData.directory_cake_types,
			directory_enabled: $formData.directory_enabled
		});
	}

	// Initialiser avec les données existantes
	onMount(() => {
		console.log('📋 [Directory Form] onMount - initial data:', {
			directory_city: $formData.directory_city,
			directory_actual_city: $formData.directory_actual_city,
			directory_postal_code: $formData.directory_postal_code,
			directory_cake_types: $formData.directory_cake_types,
			directory_enabled: $formData.directory_enabled
		});
		if ($formData.directory_actual_city) {
			cityInput = $formData.directory_actual_city;
			console.log('📋 [Directory Form] Initialized cityInput to:', cityInput);
		}
	});
</script>

<form
	method="POST"
	action="?/updateDirectory"
	use:enhance={({ cancel }) => {
		return async ({ result }) => {
			console.log('📋 [Directory Form] enhance callback - result:', {
				type: result.type,
				status: result.status,
				data: result.data
			});
			
			// Logger les valeurs AVANT la soumission
			console.log('📋 [Directory Form] FormData BEFORE submission:', {
				directory_city: $formData.directory_city,
				directory_actual_city: $formData.directory_actual_city,
				directory_postal_code: $formData.directory_postal_code,
				directory_cake_types: $formData.directory_cake_types,
				directory_enabled: $formData.directory_enabled
			});
			
			if (result.type === 'success') {
				console.log('📋 [Directory Form] Success response:', {
					success: result.data?.success,
					formData: result.data?.form?.data,
					message: result.data?.form?.message
				});
				
				if (result.data?.success) {
					// Si on est dans l'onboarding, rediriger directement vers le dashboard
					const pathname = window.location.pathname;
					console.log('📋 [Directory Form] Current pathname:', pathname);
					
					if (pathname.includes('/onboarding')) {
						console.log('📋 [Directory Form] In onboarding - canceling update and redirecting');
						// Annuler la mise à jour automatique du formulaire et rediriger
						cancel();
						goto('/dashboard');
					} else {
						console.log('📋 [Directory Form] In dashboard - invalidating all');
						// Dans le dashboard, recharger la page pour mettre à jour les données
						await invalidateAll();
					}
				}
			} else if (result.type === 'failure') {
				console.error('📋 [Directory Form] Failure response:', result.status, result.data);
			}
		};
	}}
	on:submit={() => {
		console.log('📋 [Directory Form] Form submitted with data:', {
			directory_city: $formData.directory_city,
			directory_actual_city: $formData.directory_actual_city,
			directory_postal_code: $formData.directory_postal_code,
			directory_cake_types: $formData.directory_cake_types,
			directory_enabled: $formData.directory_enabled
		});
	}}
	class="space-y-6"
>
	<Form.Errors {form} />

	<!-- Activer l'annuaire -->
	<Form.Field {form} name="directory_enabled">
		<Form.Control>
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Form.Label>Apparaître dans l'annuaire des pâtissiers</Form.Label>
					<Form.Description>
						Si activé, votre boutique sera visible dans l'annuaire et pourra être trouvée par les clients
					</Form.Description>
				</div>
				<Switch
					checked={$formData.directory_enabled}
					on:change={(event) => {
						$formData.directory_enabled = event.detail;
						console.log('📋 [Directory Form] Switch toggled:', event.detail);
					}}
				/>
			</div>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>

	{#if $formData.directory_enabled}
		<!-- Grande ville la plus proche -->
		<Form.Field {form} name="directory_city">
		<Form.Control let:attrs>
			<Form.Label>Grande ville la plus proche</Form.Label>
			<select
				{...attrs}
				bind:value={$formData.directory_city}
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<option value="">Sélectionnez une grande ville</option>
				{#each MAJOR_CITIES as city}
					<option value={city}>{city}</option>
				{/each}
			</select>
		</Form.Control>
		<Form.Description>
			Choisissez la grande ville la plus proche de votre boutique
		</Form.Description>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Vraie ville avec autocomplétion -->
	<Form.Field {form} name="directory_actual_city">
		<Form.Control let:attrs>
			<Form.Label>Votre ville</Form.Label>
			<div class="relative w-full">
				<MapPin class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
				<input
					{...attrs}
					bind:this={cityInputElement}
					type="text"
					bind:value={cityInput}
					on:input={handleCityInput}
					on:blur={() => {
						isCityInputFocused = false;
						handleCityBlur();
					}}
					on:focus={() => {
						isCityInputFocused = true;
						if (citySuggestions.length > 0) showSuggestions = true;
					}}
					placeholder="Commencez à taper le nom de votre ville..."
					class="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				/>
				{#if isSearching}
					<LoaderCircle class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground pointer-events-none z-10" />
				{/if}

				<!-- Suggestions d'autocomplétion -->
				{#if showSuggestions && citySuggestions.length > 0}
					<div class="absolute left-0 right-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
						<ul class="max-h-60 overflow-auto p-1">
							{#each citySuggestions as suggestion}
								<li>
									<button
										type="button"
										on:click={() => selectCity(suggestion)}
										class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
									>
										<MapPin class="h-4 w-4 shrink-0 text-muted-foreground" />
										<span class="truncate">{suggestion.label}</span>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		</Form.Control>
		<Form.Description>
			Tapez le nom de votre ville pour voir les suggestions
		</Form.Description>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Code postal (auto-rempli) -->
	<Form.Field {form} name="directory_postal_code">
		<Form.Control let:attrs>
			<Form.Label>Code postal</Form.Label>
			<Input
				{...attrs}
				type="text"
				bind:value={$formData.directory_postal_code}
				placeholder="75001"
				maxlength="5"
				readonly
				class="bg-muted"
			/>
		</Form.Control>
		<Form.Description>
			Rempli automatiquement lors de la sélection de la ville
		</Form.Description>
		<Form.FieldErrors />
	</Form.Field>

	<!-- Types de gâteaux -->
	<Form.Field {form} name="directory_cake_types">
		<Form.Control>
			<Form.Label>Types de gâteaux proposés</Form.Label>
			<Form.Description>
				Sélectionnez jusqu'à 3 types de gâteaux que vous proposez
				{#if ($formData.directory_cake_types || []).length > 0}
					<span class="ml-2 text-muted-foreground">
						({($formData.directory_cake_types || []).length}/3)
					</span>
				{/if}
			</Form.Description>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{#each CAKE_TYPES_FOR_FORMS as cakeType}
					{@const isSelected = ($formData.directory_cake_types || []).includes(cakeType)}
					{@const isMaxReached = ($formData.directory_cake_types || []).length >= 3}
					<div class="flex items-center space-x-2">
						<Checkbox
							id="cake-type-{cakeType}"
							checked={isSelected}
							disabled={!isSelected && isMaxReached}
							onCheckedChange={() => toggleCakeType(cakeType)}
						/>
						<Label
							for="cake-type-{cakeType}"
							class="text-sm font-normal cursor-pointer {!isSelected && isMaxReached ? 'text-muted-foreground cursor-not-allowed' : ''}"
						>
							{cakeType}
						</Label>
					</div>
				{/each}
			</div>
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	{/if}

	<!-- Bouton de soumission -->
	<div class="flex">
		<Button type="submit" disabled={$submitting} class="w-full">
			{#if $submitting}
				<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
				Sauvegarde...
			{:else}
				Sauvegarder
			{/if}
		</Button>
	</div>
</form>

<style>
	/* Style pour les suggestions d'autocomplétion */
	:global(.relative) {
		position: relative;
	}
</style>

