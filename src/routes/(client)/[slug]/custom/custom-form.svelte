<script lang="ts">
	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { DatePicker, OptionGroup, TimeSlotSelector } from '$lib/components';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { createLocalDynamicSchema } from './schema';
	import { goto } from '$app/navigation';
	import { Upload, X } from 'lucide-svelte';
	import { Alert, AlertTitle } from '$lib/components/ui/alert';
	import { AlertTriangle } from 'lucide-svelte';
	import type { OrderLimitStats } from '$lib/utils/order-limits';

	export let data: SuperValidated<Record<string, any>>;
	export let shop: {
		id: string;
		name: string;
		slug: string;
		logo_url?: string;
		bio?: string;
		is_custom_accepted: boolean;
		is_active: boolean;
		is_visible: boolean;
		profile_id?: string;
	};
	export let customFields: Array<{
		id: string;
		label: string;
		type:
			| 'short-text'
			| 'long-text'
			| 'number'
			| 'single-select'
			| 'multi-select';
		required: boolean;
		options?: Array<{ label: string; price?: number }>;
	}>;

	export let availabilities: Array<{
		day: number;
		is_open: boolean;
		daily_order_limit?: number | null;
		start_time?: string | null;
		end_time?: string | null;
		interval_time?: string | null;
	}>;
	export let unavailabilities: Array<{ start_date: string; end_date: string }>;
	export let datesWithLimitReached: string[] = [];
	export let customizations: {
		button_color: string;
		button_text_color: string;
		text_color: string;
		icon_color: string;
		secondary_text_color: string;
		background_color: string;
		background_image_url?: string;
	};
	export let onCancel: () => void;
	export let orderLimitStats: OrderLimitStats | null = null;

	const dynamicSchema = createLocalDynamicSchema(customFields);

	// Vérifier si le formulaire doit être désactivé
	$: isFormDisabled = orderLimitStats?.isLimitReached || false;

	// Styles personnalisés
	$: customStyles = {
		buttonStyle: `background-color: ${customizations?.button_color || '#ff6f61'}; color: ${customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${customizations?.text_color || '#333333'};`,
		secondaryTextStyle: `color: ${customizations?.secondary_text_color || '#333333'};`,
		separatorColor: 'rgba(0, 0, 0, 0.3)',
	};

	const form = superForm(data, {
		validators: zodClient(dynamicSchema),
		dataType: 'json',
		onSubmit: () => {
			console.log('🔍 [Custom Form Front] Submitting form data...');
			console.log(
				'🔍 [Custom Form Front] pickup_date value:',
				$formData.pickup_date,
			);
			console.log(
				'🔍 [Custom Form Front] pickup_date type:',
				typeof $formData.pickup_date,
			);
			console.log(
				'🔍 [Custom Form Front] pickup_date isDate:',
				$formData.pickup_date instanceof Date,
			);
			if ($formData.pickup_date instanceof Date) {
				console.log(
					'🔍 [Custom Form Front] pickup_date ISO:',
					$formData.pickup_date.toISOString(),
				);
				console.log(
					'🔍 [Custom Form Front] pickup_date UTC:',
					$formData.pickup_date.toUTCString(),
				);
			}
		},
	});

	const { form: formData, enhance, submitting, message } = form;

	// Variables pour l'upload de photos d'inspiration
	let inspirationPhotos: string[] = $formData.inspiration_photos || [];
	let inspirationFiles: File[] = [];
	let inspirationInputElement: HTMLInputElement;

	// État pour les créneaux horaires
	let availableTimeSlots: string[] = [];
	let selectedTimeSlot = '';
	let isLoadingTimeSlots = false;

	// Handle redirection on success
	$: if ($message?.redirectTo) {
		const url = $message.redirectTo;
		message.set(null); // reset to avoid loop
		goto(url);
	}

	// Fonction pour charger les créneaux horaires disponibles
	async function loadTimeSlots(pickupDate: string) {
		if (!pickupDate) {
			availableTimeSlots = [];
			selectedTimeSlot = '';
			return;
		}

		isLoadingTimeSlots = true;
		try {
			// Trouver la disponibilité pour le jour sélectionné
			const selectedDate = new Date(pickupDate);
			const dayOfWeek = selectedDate.getDay(); // 0=dimanche, 1=lundi, etc.
			const availability = availabilities.find((a) => a.day === dayOfWeek);

			if (
				!availability ||
				!availability.is_open ||
				!availability.start_time ||
				!availability.end_time ||
				!availability.interval_time
			) {
				availableTimeSlots = [];
				selectedTimeSlot = '';
				return;
			}

			// Appeler l'API pour récupérer les créneaux libres
			const response = await fetch(`/api/get-free-pickup-slots`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					shop_id: shop.id, // Utiliser shop.id depuis les props
					pickup_date: pickupDate,
					start_time: availability.start_time,
					end_time: availability.end_time,
					interval_time: availability.interval_time,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				availableTimeSlots = data.timeSlots || [];

				// Ne réinitialiser que si le créneau sélectionné n'est plus disponible
				if (
					selectedTimeSlot &&
					!availableTimeSlots.includes(selectedTimeSlot)
				) {
					selectedTimeSlot = '';
					$formData.pickup_time = '';
				}
			} else {
				console.error('Erreur lors du chargement des créneaux');
				availableTimeSlots = [];
				selectedTimeSlot = '';
				$formData.pickup_time = '';
			}
		} catch (error) {
			console.error('Erreur lors du chargement des créneaux:', error);
			availableTimeSlots = [];
			selectedTimeSlot = '';
			$formData.pickup_time = '';
		} finally {
			isLoadingTimeSlots = false;
		}
	}

	// Charger les créneaux quand la date change
	$: if ($formData.pickup_date) {
		loadTimeSlots($formData.pickup_date);
	}

	function handleInspirationFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = Array.from(target.files || []);

		if (files.length === 0) return;

		// Limiter à 3 fichiers max
		if (files.length + inspirationFiles.length > 3) {
			alert(
				`Vous pouvez ajouter seulement ${3 - inspirationFiles.length} photo(s)`,
			);
			return;
		}

		for (const file of files) {
			if (!file.type.startsWith('image/')) continue;
			if (file.size > 5 * 1024 * 1024) continue;

			// Utiliser le fichier original (Cloudinary compresse automatiquement)
			inspirationFiles.push(file);
			const reader = new FileReader();
			reader.onload = (e) => {
				inspirationPhotos = [...inspirationPhotos, e.target?.result as string];
			};
			reader.readAsDataURL(file);
		}

		// Synchroniser l'input file
		const dt = new DataTransfer();
		inspirationFiles.forEach((f) => dt.items.add(f));
		inspirationInputElement.files = dt.files;
	}

	// Fonction pour supprimer une photo d'inspiration
	function removeInspirationPhoto(index: number) {
		inspirationPhotos = inspirationPhotos.filter((_, i) => i !== index);
		inspirationFiles = inspirationFiles.filter((_, i) => i !== index);

		// Synchroniser l'input file
		const dataTransfer = new DataTransfer();
		inspirationFiles.forEach((file) => dataTransfer.items.add(file));
		inspirationInputElement.files = dataTransfer.files;
	}
</script>

<form
	method="POST"
	action="?/createCustomOrder"
	enctype="multipart/form-data"
	use:enhance
>
	<!-- ✅ OPTIMISÉ : Passer shopId et profileId via formData pour éviter requêtes redondantes -->
	<input type="hidden" name="shopId" value={shop.id} />
	<input type="hidden" name="profileId" value={shop.profile_id} />
	<Form.Errors {form} />

	{#if isFormDisabled}
		<Alert class="mb-6 border-[#FF6F61] bg-[#FFF1F0] text-[#8B1A1A]">
			<AlertTriangle class="h-4 w-4 text-[#FF6F61]" />
			<AlertTitle>Commandes désactivées temporairement</AlertTitle>
		</Alert>
	{/if}

	<div
		class="space-y-8"
		class:opacity-50={isFormDisabled}
		class:pointer-events-none={isFormDisabled}
	>
		<!-- Section Photos d'inspiration -->
		<div class="space-y-4">
			<div class="space-y-2">
				<h3 class="text-lg font-semibold text-foreground">
					Photos d'inspiration
				</h3>
				<p class="text-sm text-muted-foreground">
					Ajoutez jusqu'à 3 photos d'inspiration pour votre gâteau (optionnel)
				</p>
			</div>

			{#if inspirationPhotos.length > 0}
				<!-- Galerie des photos -->
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each inspirationPhotos as photo, index}
						<div class="group relative">
							<img
								src={photo}
								alt="Photo d'inspiration {index + 1}"
								class="aspect-square w-full rounded-lg border border-border object-cover"
							/>
							<button
								type="button"
								on:click={() => removeInspirationPhoto(index)}
								disabled={$submitting || isFormDisabled}
								class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
								title="Supprimer cette photo"
							>
								<X class="h-4 w-4" />
							</button>
						</div>
					{/each}
				</div>
			{/if}

			{#if inspirationPhotos.length < 3}
				<!-- Zone d'upload -->
				<div class="flex justify-center">
					<button
						type="button"
						on:click={() => inspirationInputElement?.click()}
						disabled={$submitting || isFormDisabled}
						class="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
						<p class="text-center text-sm text-muted-foreground">
							Cliquez pour ajouter des photos
						</p>
						<p class="text-center text-xs text-muted-foreground">
							{inspirationPhotos.length}/3 photos
						</p>
					</button>
				</div>

				<input
					bind:this={inspirationInputElement}
					name="inspiration_photos"
					type="file"
					accept="image/*"
					multiple
					on:change={handleInspirationFileSelect}
					class="hidden"
					disabled={$submitting || isFormDisabled}
				/>
			{/if}
		</div>

		{#if customFields && customFields.length > 0}
			<div class="space-y-4">
				<h3 class="text-lg font-semibold text-foreground">
					Personnalisation du gâteau
				</h3>

				<div class="space-y-4">
					{#each customFields as field}
						<div class="space-y-2">
							<Label for={field.id} class="text-sm font-medium">
								{field.label}
								{#if field.required}
									<span class="text-red-500">*</span>
								{/if}
							</Label>

							{#if field.type === 'short-text'}
								<Form.Field {form} name={`customization_data.${field.id}`}>
									<Form.Control let:attrs>
										<Input
											{...attrs}
											id={field.id}
											type="text"
											placeholder="Votre réponse"
											required={field.required}
											bind:value={$formData.customization_data[field.id]}
										/>
									</Form.Control>
									<Form.FieldErrors />
								</Form.Field>
							{:else if field.type === 'long-text'}
								<Form.Field {form} name={`customization_data.${field.id}`}>
									<Form.Control let:attrs>
										<Textarea
											{...attrs}
											id={field.id}
											placeholder="Votre réponse"
											required={field.required}
											rows={3}
											disabled={isFormDisabled}
											bind:value={$formData.customization_data[field.id]}
										/>
									</Form.Control>
									<Form.FieldErrors />
								</Form.Field>
							{:else if field.type === 'number'}
								<Form.Field {form} name={`customization_data.${field.id}`}>
									<Form.Control let:attrs>
										<Input
											{...attrs}
											id={field.id}
											type="number"
											step="1"
											placeholder="Votre réponse"
											required={field.required}
											disabled={isFormDisabled}
											bind:value={$formData.customization_data[field.id]}
										/>
									</Form.Control>
									<Form.FieldErrors />
								</Form.Field>
							{:else if field.type === 'single-select' || field.type === 'multi-select'}
								<Form.Field {form} name={`customization_data.${field.id}`}>
									<Form.Control>
										<OptionGroup
											fieldId={field.id}
											fieldType={field.type}
											options={field.options || []}
											selectedValues={$formData.customization_data[field.id]}
											required={field.required}
											disabled={isFormDisabled}
											{customizations}
											on:change={(e) =>
												($formData.customization_data[field.id] =
													e.detail.values)}
										/>
									</Form.Control>
									<Form.FieldErrors />
								</Form.Field>
							{/if}
						</div>
					{/each}
				</div>
			</div>
			<!-- Separator - Dégradé -->
			<div
				class="h-px bg-gradient-to-r from-transparent to-transparent"
				style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
			></div>
		{/if}

		<!-- Section 2: Information of pickup -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-foreground">
				Information de récupération
			</h3>
			<div class="space-y-2">
				<Form.Field {form} name="pickup_date">
					<Form.Control>
						<Form.Label>Date de récupération *</Form.Label>
						<DatePicker
							{availabilities}
							{unavailabilities}
							{datesWithLimitReached}
							minDaysNotice={3}
							on:dateSelected={(event) => {
								$formData.pickup_date = event.detail;
							}}
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
			</div>

			<!-- Sélecteur de créneau horaire -->
			<div class="space-y-2">
				{#if $formData.pickup_date && availableTimeSlots.length > 0}
					<div class="space-y-2">
						<Form.Field {form} name="pickup_time">
							<Form.Control let:attrs>
								<TimeSlotSelector
									timeSlots={availableTimeSlots}
									selectedTime={selectedTimeSlot}
									disabled={isLoadingTimeSlots || isFormDisabled}
									required={true}
									label="Choisir un créneau de récupération"
									{customizations}
									on:change={(event) => {
										selectedTimeSlot = event.detail.value;
										$formData.pickup_time = event.detail.value;
									}}
								/>
							</Form.Control>
							<Form.FieldErrors />
						</Form.Field>
					</div>
				{:else if $formData.pickup_date && isLoadingTimeSlots}
					<div class="space-y-2">
						<label class="text-sm font-medium text-gray-900">
							Choisir un créneau de récupération
						</label>
						<div
							class="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4"
						>
							<div class="flex items-center space-x-2 text-sm text-gray-500">
								<svg
									class="h-4 w-4 animate-spin"
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
								<span>Chargement des créneaux...</span>
							</div>
						</div>
					</div>
				{:else if $formData.pickup_date && availableTimeSlots.length === 0}
					<div class="space-y-2">
						<label class="text-sm font-medium text-gray-900">
							Choisir un créneau de récupération
						</label>
						<div
							class="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center"
						>
							<p class="text-sm text-orange-700">
								<span class="mr-2">⚠️</span>
								Aucun créneau disponible pour cette date
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>
		<!-- Separator - Dégradé -->
		<div
			class="h-px bg-gradient-to-r from-transparent to-transparent"
			style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
		></div>

		<!-- Section 3: Information of contact -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-foreground">
				Information de contact
			</h3>
			<div class="space-y-4">
				<div class="space-y-2">
					<Form.Field {form} name="customer_name">
						<Form.Control let:attrs>
							<Form.Label>Nom complet *</Form.Label>
							<Input
								{...attrs}
								id="name"
								placeholder="Votre nom complet"
								required
								disabled={isFormDisabled}
								bind:value={$formData.customer_name}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>

				<div class="space-y-2">
					<Form.Field {form} name="customer_email">
						<Form.Control let:attrs>
							<Form.Label>Email *</Form.Label>
							<Input
								{...attrs}
								id="email"
								type="email"
								placeholder="votre@email.com"
								required
								disabled={isFormDisabled}
								bind:value={$formData.customer_email}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>

				<div class="space-y-2">
					<Form.Field {form} name="customer_phone">
						<Form.Control let:attrs>
							<Form.Label>Numéro de téléphone (facultatif)</Form.Label>
							<Input
								{...attrs}
								id="phone"
								type="tel"
								placeholder="06 12 34 56 78"
								disabled={isFormDisabled}
								bind:value={$formData.customer_phone}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>

				<div class="space-y-2">
					<Form.Field {form} name="customer_instagram">
						<Form.Control let:attrs>
							<Form.Label>Instagram (facultatif)</Form.Label>
							<Input
								{...attrs}
								id="instagram"
								placeholder="@votre_compte"
								disabled={isFormDisabled}
								bind:value={$formData.customer_instagram}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>

				<div class="space-y-2">
					<Form.Field {form} name="additional_information">
						<Form.Control let:attrs>
							<Form.Label>Informations supplémentaires</Form.Label>
							<Textarea
								{...attrs}
								id="info"
								placeholder="Informations supplémentaires..."
								rows={3}
								disabled={isFormDisabled}
								bind:value={$formData.additional_information}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
			</div>
		</div>

		<!-- Separator - Dégradé -->
		<div
			class="h-px bg-gradient-to-r from-transparent to-transparent"
			style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
		></div>

		<!-- Section 4: Summary of the request -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold" style={customStyles.textStyle}>
				Récapitulatif de la demande
			</h3>
			<div class="space-y-3 rounded-lg border bg-white p-4">
				<p class="text-sm" style={customStyles.secondaryTextStyle}>
					Merci de bien vérifier les informations de votre demande car en cas
					d'erreur votre commande pourra être retardée.
				</p>
				<div class="space-y-2 text-sm">
					{#if $formData.pickup_date}
						<div class="flex justify-between">
							<span style={customStyles.secondaryTextStyle}
								>Date de récupération :</span
							>
							<span class="font-medium" style={customStyles.textStyle}
								>{new Date(
									$formData.pickup_date + 'T12:00:00Z',
								).toLocaleDateString('fr-FR')}</span
							>
						</div>
					{/if}
					{#if $formData.pickup_time}
						<div class="flex justify-between">
							<span style={customStyles.secondaryTextStyle}
								>Créneau horaire :</span
							>
							<span class="font-medium" style={customStyles.textStyle}
								>{$formData.pickup_time.substring(0, 5)}</span
							>
						</div>
					{/if}
					{#if $formData.customer_name}
						<div class="flex justify-between">
							<span style={customStyles.secondaryTextStyle}>Nom :</span>
							<span class="font-medium" style={customStyles.textStyle}
								>{$formData.customer_name}</span
							>
						</div>
					{/if}
					{#if $formData.customer_email}
						<div class="flex justify-between">
							<span style={customStyles.secondaryTextStyle}>Email :</span>
							<span class="font-medium" style={customStyles.textStyle}
								>{$formData.customer_email}</span
							>
						</div>
					{/if}
					{#if $formData.customer_phone}
						<div class="flex justify-between">
							<span style={customStyles.secondaryTextStyle}>Téléphone :</span>
							<span class="font-medium" style={customStyles.textStyle}
								>{$formData.customer_phone}</span
							>
						</div>
					{/if}
					{#if $formData.customer_instagram}
						<div class="flex justify-between">
							<span style={customStyles.secondaryTextStyle}>Instagram :</span>
							<span class="font-medium" style={customStyles.textStyle}
								>{$formData.customer_instagram}</span
							>
						</div>
					{/if}
					{#if $formData.customization_data && Object.keys($formData.customization_data).length > 0}
						<div class="pt-2">
							<span style={customStyles.secondaryTextStyle}
								>Options sélectionnées :</span
							>
							<ul class="mt-1 space-y-1">
								{#each Object.entries($formData.customization_data) as [fieldId, value]}
									{#if value && (typeof value === 'string' ? value.length > 0 : Array.isArray(value) && value.length > 0)}
										{@const field = customFields.find((f) => f.id === fieldId)}
										{#if field}
											{#if Array.isArray(value)}
												<!-- Multi-select options: display line by line -->
												<li class="space-y-1">
													{#each value as option, index}
														{#if index === 0}
															<!-- Première option : label + option sur la même ligne -->
															<div
																class="flex items-start justify-between gap-2"
															>
																<span
																	class="min-w-0 flex-shrink-0 font-medium text-foreground"
																	>{field.label} :</span
																>
																<span
																	class="flex-shrink-0 text-right text-muted-foreground"
																	>{option}</span
																>
															</div>
														{:else}
															<!-- Autres options : alignées à droite -->
															<div
																class="text-right text-sm text-muted-foreground"
															>
																{option}
															</div>
														{/if}
													{/each}
												</li>
											{:else}
												<!-- Single value: display normally -->
												<li class="flex items-start justify-between gap-2">
													<span
														class="min-w-0 flex-shrink-0 font-medium text-foreground"
														>{field.label} :</span
													>
													<span
														class="flex-shrink-0 text-right text-muted-foreground"
														>{value}</span
													>
												</li>
											{/if}
										{/if}
									{/if}
								{/each}
							</ul>
						</div>
					{/if}

					<!-- Photos d'inspiration -->
					{#if inspirationPhotos && inspirationPhotos.length > 0}
						<div class="pt-2">
							<span class="text-muted-foreground">Photos d'inspiration :</span>
							<div class="mt-2 grid grid-cols-3 gap-2">
								{#each inspirationPhotos as photo, index}
									<img
										src={photo}
										alt="Photo d'inspiration {index + 1}"
										class="aspect-square w-full rounded-lg border border-border object-cover"
									/>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Separator - Dégradé -->
					<div
						class="my-2 h-px bg-gradient-to-r from-transparent to-transparent"
						style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
					></div>
					<p class="text-xs italic text-muted-foreground">
						* Le prix final sera confirmé par le pâtissier après étude de votre
						demande
					</p>
				</div>
			</div>
		</div>

		<!-- Section 5: Action buttons -->
		<div class="flex gap-2">
			{#if $page.url.searchParams.get('preview') !== 'true'}
				<Button
					type="submit"
					disabled={$submitting || isFormDisabled}
					class="flex-1 rounded-xl"
					style={customStyles.buttonStyle}
				>
					{#if $submitting}
						<span class="loading loading-spinner loading-sm"></span>
						Envoi en cours...
					{:else}
						Envoyer ma demande
					{/if}
				</Button>
				<Button
					type="button"
					variant="outline"
					on:click={onCancel}
					disabled={isFormDisabled}
					class="rounded-xl"
				>
					Annuler
				</Button>
			{:else}
				<!-- Message in preview mode -->
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center"
				>
					<p class="text-sm text-blue-800">
						🔍 Mode prévisualisation - Bouton de commande masqué
					</p>
				</div>
			{/if}
		</div>
	</div>
</form>
