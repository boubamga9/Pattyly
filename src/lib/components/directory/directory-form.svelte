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
	import {
		directorySchema,
		toggleDirectorySchema,
	} from '$lib/validations/schemas/shop';
	import {
		searchCities,
		MAJOR_CITIES,
		CAKE_TYPES_FOR_FORMS,
		type CitySuggestion,
	} from '$lib/services/city-autocomplete';
	import { MapPin, LoaderCircle, Check } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { enhance as formEnhance } from '$app/forms';

	export let data: SuperValidated<Infer<typeof directorySchema>>;
	export let toggleForm:
		| SuperValidated<Infer<typeof toggleDirectorySchema>>
		| undefined = undefined;
	export let shop: { id: string; slug: string } | null | undefined = undefined;
	export let showSkipButton: boolean = false; // Afficher le bouton pour passer l'étape
	export let userPlan: 'free' | 'basic' | 'premium' | 'exempt' | undefined =
		undefined; // Plan de l'utilisateur

	// Déterminer si on est dans l'onboarding (pour masquer certains éléments)
	$: isOnboarding =
		showSkipButton || $page.url.pathname.includes('/onboarding');

	// Déterminer si l'utilisateur a un plan payant
	$: hasPaidPlan =
		userPlan &&
		(userPlan === 'basic' || userPlan === 'premium' || userPlan === 'exempt');

	const form = superForm(data, {
		validators: zodClient(directorySchema),
		resetForm: false, // Ne pas réinitialiser le formulaire après soumission
		dataType: 'json', // Utiliser JSON pour gérer les arrays correctement
		onUpdated: ({ form: updatedForm }) => {
			// Préserver les valeurs après mise à jour
			if (updatedForm.valid && updatedForm.data) {
				// Synchroniser cityInput avec la valeur du formulaire
				cityInput = updatedForm.data.directory_actual_city || '';
				if (updatedForm.data.directory_postal_code && !selectedCity) {
					// Si on a un code postal mais pas de ville sélectionnée, essayer de trouver la ville
					// (optionnel, pour améliorer l'UX)
				}
			}
			// ✅ NE PAS réinitialiser submitted ici, il doit rester true pendant 2 secondes
		},
	});

	const { form: formData, enhance, submitting } = form;

	// Formulaire séparé pour le toggle (optionnel - seulement si toggleForm est fourni)
	const toggleFormStore = toggleForm
		? superForm(toggleForm, {
				validators: zodClient(toggleDirectorySchema),
			})
		: null;

	const toggleFormData = toggleFormStore ? toggleFormStore.form : null;
	const toggleEnhance = toggleFormStore ? toggleFormStore.enhance : null;
	// Simplifier : utiliser directement la valeur du store si disponible
	// Dans l'onboarding, toggleFormStore est null, donc on utilise false
	let toggleSubmittingBool = false;

	// État pour le feedback de succès
	let submitted = false;

	// État local pour l'optimistic update du toggle
	// Utiliser formData comme source de vérité principale
	let localDirectoryEnabled = $formData.directory_enabled || false;

	// Synchroniser localDirectoryEnabled avec formData (source de vérité principale)
	$: if (
		$formData.directory_enabled !== localDirectoryEnabled &&
		!toggleSubmittingBool
	) {
		localDirectoryEnabled = $formData.directory_enabled || false;
	}

	// Note: Dans l'onboarding, toggleFormStore est null, donc cette synchronisation ne s'applique pas
	// Le toggle fonctionne directement avec formData dans l'onboarding

	// Référence au bouton submit caché pour le toggle
	let toggleSubmitButton: HTMLButtonElement;

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
			return;
		}

		// Si on sélectionne et qu'on a déjà 3 types, on ne peut pas en ajouter plus
		if (currentTypes.length >= 3) {
			return;
		}

		// Ajouter le nouveau type
		const newTypes = [...currentTypes, cakeType];

		// Mettre à jour le formulaire de manière réactive
		$formData.directory_cake_types = newTypes;
	}

	// Synchroniser cityInput avec le formulaire (réactif) - seulement si l'input n'est pas en focus
	let isCityInputFocused = false;

	$: {
		// Ne synchroniser que si l'input n'est pas en focus (pour éviter de bloquer la saisie)
		if (
			!isCityInputFocused &&
			$formData.directory_actual_city &&
			cityInput !== $formData.directory_actual_city
		) {
			cityInput = $formData.directory_actual_city;
		}
	}

	// Handle toggle change
	function handleDirectoryToggleChange() {
		const newValue = !localDirectoryEnabled;

		// Mettre à jour l'état local immédiatement (optimistic update)
		localDirectoryEnabled = newValue;

		// Mettre à jour le formulaire principal (toujours)
		$formData.directory_enabled = newValue;

		// Si toggleForm est fourni, mettre à jour toggleFormData et soumettre
		if (toggleFormStore && toggleFormData) {
			toggleFormStore.form.update((f) => {
				f.directory_enabled = newValue;
				return f;
			});
			// Déclencher la soumission du formulaire toggle
			if (toggleSubmitButton) {
				toggleSubmitButton.click();
			}
		}
		// Sinon, dans l'onboarding, on met juste à jour le formulaire principal
		// qui sera soumis avec le bouton "Sauvegarder"
	}

	// Initialiser avec les données existantes
	onMount(() => {
		if ($formData.directory_actual_city) {
			cityInput = $formData.directory_actual_city;
		}
		// Initialiser l'état local du toggle depuis formData
		localDirectoryEnabled = $formData.directory_enabled || false;
	});
</script>

<!-- Formulaire séparé pour le toggle directory_enabled -->
{#if toggleFormStore && toggleEnhance}
	<form
		method="POST"
		action="?/toggleDirectory"
		use:toggleEnhance={{
			onResult: ({ result }) => {
				if (result.type === 'success') {
					// Succès - synchroniser avec le formulaire principal pour l'affichage conditionnel
					$formData.directory_enabled = localDirectoryEnabled;
				} else {
					// En cas d'erreur, remettre l'ancienne valeur depuis formData
					localDirectoryEnabled = $formData.directory_enabled || false;
				}
			},
		}}
	>
		<!-- ✅ OPTIMISÉ : Passer shopId et shopSlug pour éviter getUser + requête shop -->
		{#if shop || $page.data.shop}
			{@const shopData = shop || $page.data.shop}
			<input type="hidden" name="shopId" value={shopData.id} />
			<input type="hidden" name="shopSlug" value={shopData.slug} />
		{/if}
		<input
			type="hidden"
			name="directory_enabled"
			value={String(!localDirectoryEnabled)}
		/>
		<Form.Errors form={toggleFormStore} />

		<!-- Bouton submit caché pour déclencher la soumission du toggle -->
		<button
			type="submit"
			bind:this={toggleSubmitButton}
			class="hidden"
			aria-hidden="true"
			tabindex="-1"
		>
			Soumettre
		</button>
	</form>
{/if}

<!-- Activer l'annuaire -->
<div class="mb-6 flex items-center justify-between">
	<div class="space-y-0.5">
		<Label>Apparaître dans l'annuaire des pâtissiers</Label>
		<p class="text-sm text-muted-foreground">
			Si activé, votre boutique sera visible dans l'annuaire et pourra être
			trouvée par les clients
		</p>
		{#if !isOnboarding && !hasPaidPlan}
			<p class="mt-2 text-xs text-[#FF6F61]">
				<a
					href="/subscription?plan=premium"
					class="underline transition-colors hover:text-[#e85a4f]"
				>
					Multipliez votre visibilité par 5 et augmentez le nombre de commandes
					reçues
				</a>
				{' '}en souscrivant au plan Premium
			</p>
		{/if}
	</div>
	<Switch
		checked={localDirectoryEnabled}
		on:change={handleDirectoryToggleChange}
		disabled={toggleSubmittingBool}
	/>
</div>

<!-- Formulaire principal pour les autres champs directory -->
<form
	method="POST"
	action="?/updateDirectory"
	use:enhance={{
		onResult: ({ result }) => {
			if (result.type === 'success') {
				// Afficher le feedback de succès
				submitted = true;

				// Si on est dans l'onboarding, rediriger directement vers le dashboard
				const pathname = window.location.pathname;

				if (pathname.includes('/onboarding')) {
					// Vérifier le plan dans localStorage
					const selectedPlan = typeof window !== 'undefined' 
						? localStorage.getItem('selected_plan') 
						: null;
					
					// Utiliser setTimeout pour s'assurer que la redirection se fait après la mise à jour du formulaire
					setTimeout(() => {
						if (selectedPlan === 'starter') {
							localStorage.removeItem('selected_plan');
							goto('/subscription?plan=starter&from=onboarding');
						} else if (selectedPlan === 'premium') {
							localStorage.removeItem('selected_plan');
							goto('/subscription?plan=premium&from=onboarding');
						} else {
							goto('/dashboard');
						}
					}, 100);
				} else {
					// Dans le dashboard, afficher le feedback pendant 2 secondes
					setTimeout(() => {
						submitted = false;
					}, 2000);
				}
			} else if (result.type === 'failure') {
				console.error(
					'📋 [Directory Form] Failure response:',
					result.status,
					result.data,
				);
				submitted = false;
			}
		},
	}}
	class="space-y-6"
>
	<!-- ✅ OPTIMISÉ : Passer shopId et shopSlug pour éviter getUser + requête shop -->
	{#if shop || $page.data.shop}
		{@const shopData = shop || $page.data.shop}
		<input type="hidden" name="shopId" value={shopData.id} />
		<input type="hidden" name="shopSlug" value={shopData.slug} />
	{/if}

	<Form.Errors {form} />

	{#if localDirectoryEnabled}
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
					<MapPin
						class="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
					/>
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
						class="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					/>
					{#if isSearching}
						<LoaderCircle
							class="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
						/>
					{/if}

					<!-- Suggestions d'autocomplétion -->
					{#if showSuggestions && citySuggestions.length > 0}
						<div
							class="absolute left-0 right-0 top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-lg"
						>
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
					maxlength={5}
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
						{@const isSelected = (
							$formData.directory_cake_types || []
						).includes(cakeType)}
						{@const isMaxReached =
							($formData.directory_cake_types || []).length >= 3}
						<div class="flex items-center space-x-2">
							<Checkbox
								id="cake-type-{cakeType}"
								checked={isSelected}
								disabled={!isSelected && isMaxReached}
								onCheckedChange={() => toggleCakeType(cakeType)}
							/>
							<Label
								for="cake-type-{cakeType}"
								class="cursor-pointer text-sm font-normal {!isSelected &&
								isMaxReached
									? 'cursor-not-allowed text-muted-foreground'
									: ''}"
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

	<!-- Bouton de soumission (affiché uniquement si l'annuaire est activé) -->
	{#if localDirectoryEnabled}
		<div class="flex">
			<Button
				type="submit"
				disabled={$submitting || submitted}
				class={`h-11 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
					submitted
						? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
						: $submitting
							? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
							: 'bg-primary hover:bg-primary/90 disabled:opacity-50'
				}`}
			>
				{#if $submitting}
					<LoaderCircle class="mr-2 h-5 w-5 animate-spin" />
					Sauvegarde...
				{:else if submitted}
					<Check class="mr-2 h-5 w-5" />
					Sauvegardé !
				{:else}
					Sauvegarder
				{/if}
			</Button>
		</div>
	{/if}
</form>

<!-- Bouton pour passer l'étape (visible quand toggle est off et showSkipButton est true) -->
{#if !localDirectoryEnabled && showSkipButton}
	<form 
		method="POST" 
		action="?/skipDirectory" 
		use:formEnhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					const pathname = window.location.pathname;
					if (pathname.includes('/onboarding')) {
						// Vérifier le plan dans localStorage
						const selectedPlan = typeof window !== 'undefined' 
							? localStorage.getItem('selected_plan') 
							: null;
						
						// Utiliser setTimeout pour s'assurer que la redirection se fait après la réponse serveur
						setTimeout(() => {
							if (selectedPlan === 'starter') {
								localStorage.removeItem('selected_plan');
								goto('/subscription?plan=starter&from=onboarding');
							} else if (selectedPlan === 'premium') {
								localStorage.removeItem('selected_plan');
								goto('/subscription?plan=premium&from=onboarding');
							} else {
								goto('/dashboard');
							}
						}, 100);
					}
				}
			};
		}}
	>
		<div class="mt-6 space-y-3">
			<Button type="submit" variant="outline" class="w-full">
				Je ne veux pas apparaître dans l'annuaire
			</Button>
			<p class="text-center text-xs text-muted-foreground">
				Vous pourrez modifier ce choix plus tard dans les paramètres de votre
				boutique
			</p>
		</div>
	</form>
{/if}

<style>
	/* Style pour les suggestions d'autocomplétion */
	:global(.relative) {
		position: relative;
	}
</style>
