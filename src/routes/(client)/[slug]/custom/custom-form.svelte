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
	import { Upload, X, Info } from 'lucide-svelte';
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

	// Fonction helper pour convertir hex en rgba avec opacité
	function hexToRgba(hex: string, alpha: number): string {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	// Styles personnalisés
	$: buttonColor = customizations?.button_color || '#ff6f61';
	$: customStyles = {
		buttonStyle: `background-color: ${buttonColor}; color: ${customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${customizations?.text_color || '#333333'};`,
		secondaryTextStyle: `color: ${customizations?.secondary_text_color || '#333333'};`,
		separatorColor: 'rgba(0, 0, 0, 0.3)',
		errorAlertStyle: {
			borderColor: buttonColor,
			backgroundColor: hexToRgba(buttonColor, 0.08), // 8% opacity pour un fond subtil
			color: buttonColor,
		}
	};

	const form = superForm(data, {
		validators: zodClient(dynamicSchema),
		dataType: 'json',
		onSubmit: () => {
			// Form submission handled by superForm
		},
	});

	const { form: formData, enhance, submitting, message } = form;

	// Variables pour l'upload de photos d'inspiration
	let inspirationPhotos: string[] = $formData.inspiration_photos || [];
	let inspirationFiles: File[] = [];
	let inspirationInputElement: HTMLInputElement;
	let inspirationError: string | null = null;

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
	$: pickupDate = $formData.pickup_date;
	$: if (pickupDate) {
		loadTimeSlots(pickupDate);
	}

	function handleInspirationFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = Array.from(target.files || []);

		if (files.length === 0) return;

		// Réinitialiser l'erreur précédente
		inspirationError = null;

		// Limiter à 3 fichiers max
		if (files.length + inspirationFiles.length > 3) {
			inspirationError = `Vous pouvez ajouter seulement ${3 - inspirationFiles.length} photo(s)`;
			return;
		}

		const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
		const oversizedFiles: string[] = [];

		for (const file of files) {
			// Vérifier le type de fichier
			if (!file.type.startsWith('image/')) {
				inspirationError = 'Veuillez sélectionner uniquement des fichiers image valides';
				continue;
			}

			// Vérifier la taille
			if (file.size > maxSizeBytes) {
				oversizedFiles.push(''); // On ne stocke plus le nom, juste le compteur
				continue;
			}

			// Utiliser le fichier original (Cloudinary compresse automatiquement)
			inspirationFiles.push(file);
			const reader = new FileReader();
			reader.onload = (e) => {
				inspirationPhotos = [...inspirationPhotos, e.target?.result as string];
			};
			reader.readAsDataURL(file);
		}

		// Afficher un message d'erreur si des fichiers sont trop volumineux
		if (oversizedFiles.length > 0) {
			const fileCount = oversizedFiles.length;
			inspirationError = fileCount > 1 
				? `Les fichiers sélectionnés dépassent la limite de 5 MB. Veuillez choisir des fichiers plus petits.`
				: `Le fichier sélectionné dépasse la limite de 5 MB. Veuillez choisir un fichier plus petit.`;
		}

		// Si des fichiers valides ont été ajoutés, l'erreur est juste un avertissement
		// On la garde pour informer l'utilisateur, mais on continue quand même

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

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
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
			<div class="space-y-3">
				<h3 class="text-xl font-semibold tracking-tight" style={customStyles.textStyle}>
					Photos d'inspiration
				</h3>
				<div class="space-y-2">
					<p class="text-sm leading-relaxed text-muted-foreground">
						Ajoutez jusqu'à 3 photos d'inspiration pour votre gâteau <span class="text-xs italic">(optionnel)</span>
					</p>
					<div class="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
						<Info class="h-4 w-4 shrink-0 text-muted-foreground/70" />
						<p class="text-xs font-medium text-muted-foreground">
							Taille maximale par image : <span class="font-semibold">5 MB</span>
						</p>
					</div>
				</div>
			</div>

			{#if inspirationError}
				<Alert 
					style="border-color: {customStyles.errorAlertStyle.borderColor}; background-color: {customStyles.errorAlertStyle.backgroundColor}; color: {customStyles.errorAlertStyle.color};"
					class="border"
				>
					<AlertTriangle class="h-4 w-4 shrink-0" style="color: {customStyles.errorAlertStyle.color};" />
					<AlertTitle class="text-sm font-medium leading-relaxed" style="color: {customStyles.errorAlertStyle.color};">
						{inspirationError}
					</AlertTitle>
				</Alert>
			{/if}

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
						<Upload class="mb-2 h-8 w-8 text-muted-foreground/70 transition-colors group-hover:text-primary" />
						<p class="text-center text-sm font-medium text-foreground">
							Cliquez pour ajouter des photos
						</p>
						<p class="mt-1 text-center text-xs font-medium text-muted-foreground">
							<span class="font-semibold">{inspirationPhotos.length}</span>/3 photos
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
			<!-- Separator -->
			<div class="pt-4">
				<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
			</div>
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
		<!-- Separator -->
		<div class="pt-4">
			<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
		</div>

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

		<!-- Separator -->
		<div class="pt-4">
			<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
		</div>

		<!-- Section 4: Summary of the request -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold" style={customStyles.textStyle}>
				Récapitulatif de la demande
			</h3>
			<div class="space-y-3 rounded-2xl border bg-white p-4">
				<p class="text-sm" style={customStyles.secondaryTextStyle}>
					Merci de bien vérifier les informations de votre demande car en cas
					d'erreur votre commande pourra être retardée.
				</p>
				<div class="space-y-3 text-sm">
					{#if $formData.pickup_date}
						<div class="flex items-center justify-between gap-2">
							<span class="font-semibold text-neutral-700" style="font-weight: 600;">
								Date de récupération :
							</span>
							<span class="text-right text-neutral-900 whitespace-nowrap" style={customStyles.textStyle}>
								{new Date($formData.pickup_date + 'T12:00:00Z').toLocaleDateString('fr-FR')}
							</span>
						</div>
					{/if}
					{#if $formData.pickup_time}
						<div class="flex items-center justify-between gap-2">
							<span class="font-semibold text-neutral-700" style="font-weight: 600;">
								Créneau horaire :
							</span>
							<span class="text-right text-neutral-900 whitespace-nowrap" style={customStyles.textStyle}>
								{$formData.pickup_time.substring(0, 5)}
							</span>
						</div>
					{/if}
					{#if $formData.customer_name}
						<div class="flex items-center justify-between gap-2">
							<span class="font-semibold text-neutral-700" style="font-weight: 600;">Nom :</span>
							<span class="text-right text-neutral-900 sm:ml-auto" style={customStyles.textStyle}>
								{$formData.customer_name}
							</span>
						</div>
					{/if}
					{#if $formData.customer_email}
						<div class="flex items-center justify-between gap-2">
							<span class="font-semibold text-neutral-700" style="font-weight: 600;">Email :</span>
							<span class="break-words break-all text-right text-neutral-900 sm:ml-auto" style={customStyles.textStyle}>
								{$formData.customer_email}
							</span>
						</div>
					{/if}
					{#if $formData.customer_phone}
						<div class="flex items-center justify-between gap-2">
							<span class="font-semibold text-neutral-700" style="font-weight: 600;">Téléphone :</span>
							<span class="text-right text-neutral-900 sm:ml-auto" style={customStyles.textStyle}>
								{$formData.customer_phone}
							</span>
						</div>
					{/if}
					{#if $formData.customer_instagram}
						<div class="flex items-center justify-between gap-2">
							<span class="font-semibold text-neutral-700" style="font-weight: 600;">Instagram :</span>
							<span class="text-right text-neutral-900 sm:ml-auto" style={customStyles.textStyle}>
								{$formData.customer_instagram}
							</span>
						</div>
					{/if}
					{#if $formData.customization_data && Object.keys($formData.customization_data).length > 0}
						{#each Object.entries($formData.customization_data) as [fieldId, value]}
							{#if value && (typeof value === 'string' ? value.length > 0 : Array.isArray(value) && value.length > 0)}
								{@const field = customFields.find((f) => f.id === fieldId)}
								{#if field}
									{#if Array.isArray(value)}
										{@const selectedOptions = value.map((option) => {
											const selectedOption = field.options?.find(
												(opt) => opt.label === option,
											);
											return {
												label: option,
												price: selectedOption?.price || 0
											};
										})}
										<!-- Multi-select: Structure avec badges -->
										<div class="rounded-lg bg-neutral-50 p-3">
											<div class="mb-2">
												<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
													{field.label}
												</span>
											</div>
											<div class="flex flex-wrap gap-2">
												{#each selectedOptions as selectedOption}
													<span class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm">
														<span class="break-words text-neutral-900" style={customStyles.textStyle}>
															{selectedOption.label}
														</span>
														{#if selectedOption.price > 0}
															<span class="shrink-0 text-xs font-medium text-neutral-600">
																+{formatPrice(selectedOption.price)}
															</span>
														{/if}
													</span>
												{/each}
											</div>
										</div>
									{:else}
										{@const selectedOption = field.options?.find(
											(opt) => opt.label === value,
										)}
										{@const isTextField = !field.options || field.options.length === 0}
										{#if selectedOption || isTextField}
											<!-- Single-select ou texte: Structure avec fond -->
											<div class="rounded-lg bg-neutral-50 p-3">
												<div class="mb-1">
													<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
														{field.label}
													</span>
												</div>
												<div class="flex items-start justify-between gap-2">
													<span class="min-w-0 flex-1 break-words text-sm text-neutral-900" style={customStyles.textStyle}>
														{value}
													</span>
													{#if selectedOption && selectedOption.price > 0}
														<span class="shrink-0 text-sm font-medium text-neutral-600">
															+{formatPrice(selectedOption.price)}
														</span>
													{/if}
												</div>
											</div>
										{/if}
									{/if}
								{/if}
							{/if}
						{/each}
					{/if}

					<!-- Photos d'inspiration -->
					{#if inspirationPhotos && inspirationPhotos.length > 0}
						<div class="rounded-lg bg-neutral-50 p-3">
							<div class="mb-2">
								<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
									Photos d'inspiration
								</span>
							</div>
							<div class="grid grid-cols-3 gap-2">
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

					<!-- Separator -->
					<div class="my-2">
						<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
					</div>
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
