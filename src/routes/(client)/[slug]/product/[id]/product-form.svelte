<script lang="ts">
	import { page } from '$app/stores';
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import { DatePicker, OptionGroup } from '$lib/components';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { createLocalDynamicSchema } from './schema';

	export let data: SuperValidated<any>;
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
	export let availabilities: Array<{ day: number; is_open: boolean }>;
	export let unavailabilities: Array<{ start_date: string; end_date: string }>;
	export let onCancel: () => void;

	const dynamicSchema = createLocalDynamicSchema(customFields);

	const form = superForm(data, {
		validators: zodClient(dynamicSchema),
		dataType: 'json',
	});

	const { form: formData, enhance, submitting, message } = form;

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
							minDaysNotice={product.min_days_notice}
							on:dateSelected={(event) => {
								$formData.pickup_date = event.detail;
							}}
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>
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
								>{$formData.pickup_date.toLocaleDateString('fr-FR')}</span
							>
						</div>
					{/if}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Gâteau :</span>
						<span class="font-medium">{formatPrice(product.base_price)}</span>
					</div>
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
