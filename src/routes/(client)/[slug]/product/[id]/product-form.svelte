<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { DatePicker, OptionGroup, TimeSlotSelector } from '$lib/components';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { createLocalDynamicSchema } from './schema';

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
	export let onCancel: () => void;

	const dynamicSchema = createLocalDynamicSchema(customFields);

	const form = superForm(data, {
		validators: zodClient(dynamicSchema),
		dataType: 'json',
		onSubmit: () => {
			console.log('🔍 [Product Form Front] Submitting form data...');
			console.log(
				'🔍 [Product Form Front] pickup_date value:',
				$formData.pickup_date,
			);
			console.log(
				'🔍 [Product Form Front] pickup_date type:',
				typeof $formData.pickup_date,
			);
			console.log(
				'🔍 [Product Form Front] pickup_date isDate:',
				$formData.pickup_date instanceof Date,
			);
			console.log(
				'🔍 [Product Form Front] pickup_time value:',
				$formData.pickup_time,
			);
			console.log(
				'🔍 [Product Form Front] pickup_time type:',
				typeof $formData.pickup_time,
			);
			if ($formData.pickup_date instanceof Date) {
				console.log(
					'🔍 [Product Form Front] pickup_date ISO:',
					$formData.pickup_date.toISOString(),
				);
				console.log(
					'🔍 [Product Form Front] pickup_date UTC:',
					$formData.pickup_date.toUTCString(),
				);
			}
		},
		onUpdated: ({ form }) => {
			console.log('🔍 [Product Form Front] Form updated:', form);
			if (
				form.message &&
				typeof form.message === 'object' &&
				'redirectTo' in form.message
			) {
				const redirectTo = (form.message as any).redirectTo;
				console.log('🔍 [Product Form Front] Redirecting to:', redirectTo);
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
		window.location.href = url;
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
	<Form.Errors {form} />

	<div class="space-y-8">
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
			<Separator />
		{/if}

		<!-- Section 2: Information de récupération -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-foreground">
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
									disabled={isLoadingTimeSlots}
									required={true}
									label="Choisir un créneau de récupération"
									on:change={(event) => {
										selectedTimeSlot = event.detail.value;
										$formData.pickup_time = event.detail.value;
										console.log(
											'🕐 [Product Form] Time slot selected:',
											event.detail.value,
										);
										console.log(
											'🕐 [Product Form] formData.pickup_time:',
											$formData.pickup_time,
										);
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
		<Separator />

		<!-- Section 3: Information de contact -->
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
								bind:value={$formData.additional_information}
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</div>
			</div>
		</div>
		<Separator />

		<!-- Section 4: Récapitulatif de la demande -->
		<div class="space-y-4">
			<h3 class="text-lg font-semibold text-foreground">
				Récapitulatif de la commande
			</h3>
			<div class="space-y-3 rounded-lg border p-4">
				<p class="text-sm text-muted-foreground">
					Merci de bien vérifier les informations de commande car en cas
					d'erreur votre commande pourra être retardée.
				</p>
				<div class="space-y-2 text-sm">
					{#if $formData.pickup_date}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Date de récupération :</span>
							<span class="font-medium"
								>{new Date(
									$formData.pickup_date + 'T12:00:00Z',
								).toLocaleDateString('fr-FR')}</span
							>
						</div>
					{/if}
					{#if $formData.pickup_time}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Créneau horaire :</span>
							<span class="font-medium"
								>{$formData.pickup_time.substring(0, 5)}</span
							>
						</div>
					{/if}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Gâteau :</span>
						<span class="font-medium">{formatPrice(product.base_price)}</span>
					</div>
					{#if $formData.customer_name}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Nom :</span>
							<span class="font-medium">{$formData.customer_name}</span>
						</div>
					{/if}
					{#if $formData.customer_email}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Email :</span>
							<span class="font-medium">{$formData.customer_email}</span>
						</div>
					{/if}
					{#if $formData.customer_phone}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Téléphone :</span>
							<span class="font-medium">{$formData.customer_phone}</span>
						</div>
					{/if}
					{#if $formData.customer_instagram}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Instagram :</span>
							<span class="font-medium">{$formData.customer_instagram}</span>
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
									return selectedOption
										? `${option} (+${formatPrice(selectedOption.price || 0)})`
										: option;
								})}
								<div class="space-y-1">
									{#each selectedOptions as option, index}
										{#if index === 0}
											<!-- Première option : label + option sur la même ligne -->
											<div class="flex items-center justify-between">
												<span class="text-muted-foreground"
													>{field.label} :</span
												>
												<span class="font-medium">{option}</span>
											</div>
										{:else}
											<!-- Autres options : seulement l'option alignée à droite -->
											<div class="text-right font-medium">{option}</div>
										{/if}
									{/each}
								</div>
							{:else}
								{@const selectedOption = field.options?.find(
									(opt) => opt.label === $formData.customization_data[field.id],
								)}
								{#if selectedOption}
									<div class="flex justify-between gap-4">
										<span class="text-muted-foreground">{field.label} :</span>
										<span class="font-medium"
											>{$formData.customization_data[field.id]} (+{formatPrice(
												selectedOption.price || 0,
											)})</span
										>
									</div>
								{/if}
							{/if}
						{/if}
					{/each}
					<Separator class="my-2" />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Total :</span>
						<span class="font-medium">{formatPrice(totalPrice)}</span>
					</div>
					<div class="flex justify-between font-medium text-blue-600">
						<span>À payer aujourd'hui :</span>
						<span>{formatPrice(totalPrice * 0.5)}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Section 5: Boutons d'action -->
		<div class="flex gap-2">
			{#if $page.url.searchParams.get('preview') !== 'true'}
				<Button type="submit" disabled={$submitting} class="flex-1">
					{#if $submitting}
						<span class="loading loading-spinner loading-sm"></span>
						Commande en cours...
					{:else}
						Commander
					{/if}
				</Button>
				<Button type="button" variant="outline" on:click={onCancel}>
					Annuler
				</Button>
			{:else}
				<!-- Message en mode preview -->
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
