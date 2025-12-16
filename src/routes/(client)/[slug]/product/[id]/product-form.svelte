<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
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
	import {
		Alert,
		AlertDescription,
		AlertTitle,
	} from '$lib/components/ui/alert';
	import { AlertTriangle } from 'lucide-svelte';
	import type { OrderLimitStats } from '$lib/utils/order-limits';

	export let data: SuperValidated<any>;
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

	export let product: any;
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
		inputBackgroundStyle: `background-color: white;`,
		separatorColor: 'rgba(0, 0, 0, 0.3)',
	};

	const form = superForm(data, {
		validators: zodClient(dynamicSchema),
		dataType: 'json',
		onSubmit: () => {
			// Form submission handled by superForm
		},
		onUpdated: ({ form }) => {
			if (
				form.message &&
				typeof form.message === 'object' &&
				'redirectTo' in form.message
			) {
				const redirectTo = (form.message as any).redirectTo;
				goto(redirectTo);
			}
		},
	});

	const { form: formData, enhance, submitting, message } = form;

	// État pour les créneaux horaires
	let availableTimeSlots: string[] = [];
	let selectedTimeSlot = '';
	let isLoadingTimeSlots = false;

	$: totalPrice = (() => {
		let total = product.base_price || 0;

		// Ajouter les prix des options sélectionnées
		customFields.forEach((field) => {
			if (
				field.type === 'single-select' &&
				$formData.customization_data[field.id]
			) {
				const selectedOption = field.options?.find(
					(opt) => opt.label === $formData.customization_data[field.id],
				);
				if (selectedOption) {
					total += selectedOption.price || 0;
				}
			} else if (
				field.type === 'multi-select' &&
				Array.isArray($formData.customization_data[field.id])
			) {
				($formData.customization_data[field.id] as string[]).forEach(
					(optionLabel) => {
						const selectedOption = field.options?.find(
							(opt) => opt.label === optionLabel,
						);
						if (selectedOption) {
							total += selectedOption.price || 0;
						}
					},
				);
			}
		});

		return total;
	})();

	// Gérer la redirection en cas de succès
	$: if ($message?.redirectTo) {
		const url = $message.redirectTo;
		message.set(null); // reset pour éviter une boucle
		// Utiliser goto() pour la navigation PWA cross-platform
		if (url.startsWith('http://') || url.startsWith('https://')) {
			// URL externe (ex: Stripe) - utiliser window.location
			window.location.href = url;
		} else {
			// URL interne - utiliser goto() pour rester dans la PWA
			goto(url);
		}
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

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}
</script>

<form method="POST" action="?/createProductOrder" use:enhance>
	<!-- ✅ OPTIMISÉ : Passer shopId, profileId et productId via formData pour éviter requêtes redondantes -->
	<input type="hidden" name="shopId" value={shop.id} />
	<input type="hidden" name="profileId" value={shop.profile_id} />
	<input type="hidden" name="productId" value={product.id} />
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
		{#if customFields && customFields.length > 0}
			<div class="space-y-4">
				<h3
					class="text-lg font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
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
											disabled={isFormDisabled}
											style={customStyles.inputBackgroundStyle}
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
											style={customStyles.inputBackgroundStyle}
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
											style={customStyles.inputBackgroundStyle}
											bind:value={$formData.customization_data[field.id]}
										/>
									</Form.Control>
									<Form.FieldErrors />
								</Form.Field>
							{:else if field.type === 'single-select' || field.type === 'multi-select'}
								<Form.Field {form} name={`customization_data.${field.id}`}>
									<Form.Control let:attrs>
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
			<!-- Separator - Dégradé avec couleur bouton et opacité -->
			<div
				class="h-px bg-gradient-to-r from-transparent to-transparent"
				style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
			></div>
		{/if}

		<!-- Section 2: Information de récupération -->
		<div class="space-y-4">
			<h3
				class="text-lg font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-xl"
				style="font-weight: 600; letter-spacing: -0.02em;"
			>
				Information de récupération
			</h3>
			<div class="space-y-2">
				<Form.Field {form} name="pickup_date">
					<Form.Control let:attrs>
						<Form.Label>Date de récupération *</Form.Label>
						<DatePicker
							{availabilities}
							{unavailabilities}
							{datesWithLimitReached}
							minDaysNotice={product.min_days_notice}
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
							class="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 p-4"
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
							class="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center"
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
		<!-- Separator - Dégradé avec couleur bouton et opacité -->
		<div
			class="h-px bg-gradient-to-r from-transparent to-transparent"
			style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
		></div>

		<!-- Section 3: Information de contact -->
		<div class="space-y-4">
			<h3
				class="text-lg font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-xl"
				style="font-weight: 600; letter-spacing: -0.02em;"
			>
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
								style={customStyles.inputBackgroundStyle}
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
								style={customStyles.inputBackgroundStyle}
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
								style={customStyles.inputBackgroundStyle}
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
								style={customStyles.inputBackgroundStyle}
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
								style={customStyles.inputBackgroundStyle}
								bind:value={$formData.additional_information}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
			</div>
		</div>
		<!-- Separator - Dégradé avec couleur bouton et opacité -->
		<div
			class="h-px bg-gradient-to-r from-transparent to-transparent"
			style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
		></div>

		<!-- Section 4: Récapitulatif de la demande -->
		<div class="space-y-4">
			<h3
				class="text-lg font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-xl"
				style="font-weight: 600; letter-spacing: -0.02em;"
			>
				Récapitulatif de la commande
			</h3>
			<div class="space-y-3 rounded-2xl border bg-white p-4">
				<p class="text-sm" style={customStyles.secondaryTextStyle}>
					Merci de bien vérifier les informations de commande car en cas
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
					<div class="flex items-center justify-between gap-2">
						<span class="font-semibold text-neutral-700" style="font-weight: 600;">Gâteau :</span>
						<span class="text-right text-neutral-900 whitespace-nowrap" style={customStyles.textStyle}>
							{formatPrice(product.base_price)}
						</span>
					</div>
					{#if $formData.customer_name}
						<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
							<span class="break-words font-semibold text-neutral-700" style="font-weight: 600;">Nom :</span>
							<span class="break-words text-right text-neutral-900 sm:ml-auto" style={customStyles.textStyle}>
								{$formData.customer_name}
							</span>
						</div>
					{/if}
					{#if $formData.customer_email}
						<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
							<span class="break-words font-semibold text-neutral-700" style="font-weight: 600;">Email :</span>
							<span class="break-words break-all text-right text-neutral-900 sm:ml-auto" style={customStyles.textStyle}>
								{$formData.customer_email}
							</span>
						</div>
					{/if}
					{#if $formData.customer_phone}
						<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
							<span class="break-words font-semibold text-neutral-700" style="font-weight: 600;">Téléphone :</span>
							<span class="break-words text-right text-neutral-900 sm:ml-auto" style={customStyles.textStyle}>
								{$formData.customer_phone}
							</span>
						</div>
					{/if}
					{#if $formData.customer_instagram}
						<div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
							<span class="break-words font-semibold text-neutral-700" style="font-weight: 600;">Instagram :</span>
							<span class="break-words text-right text-neutral-900 sm:ml-auto" style={customStyles.textStyle}>
								{$formData.customer_instagram}
							</span>
						</div>
					{/if}
					{#each customFields as field}
						{#if $formData.customization_data[field.id]}
							{#if Array.isArray($formData.customization_data[field.id])}
								{@const options = $formData.customization_data[field.id]}
								{@const selectedOptions = options.map((option) => {
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
									(opt) => opt.label === $formData.customization_data[field.id],
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
												{$formData.customization_data[field.id]}
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
					{/each}

					<!-- Separator - Dégradé avec couleur bouton et opacité -->
					<div
						class="my-2 h-px bg-gradient-to-r from-transparent to-transparent"
						style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
					></div>
					<div class="flex items-center justify-between gap-2">
						<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
							Total :
						</span>
						<span
							class="font-semibold text-right text-neutral-900 whitespace-nowrap"
							style="font-weight: 600;"
						>
							{formatPrice(totalPrice)}
						</span>
					</div>
					<div
						class="flex items-center justify-between gap-2 font-semibold"
						style={`color: ${customizations?.button_color || '#FF6F61'}; font-weight: 600;`}
					>
						<span>À payer aujourd'hui :</span>
						<span class="text-right whitespace-nowrap">{formatPrice((totalPrice * (product?.deposit_percentage ?? 50)) / 100)}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Section 5: Boutons d'action -->
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
						Commande en cours...
					{:else}
						Commander
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
				<!-- Message en mode preview -->
				<div
					class="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center"
				>
					<p class="text-sm text-blue-800">
						🔍 Mode prévisualisation - Bouton de commande masqué
					</p>
				</div>
			{/if}
		</div>
	</div>
</form>

