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
	import { goto } from '$app/navigation';

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

	export let availabilities: Array<{ day: number; is_open: boolean }>;
	export let unavailabilities: Array<{ start_date: string; end_date: string }>;
	export let onCancel: () => void;

	const dynamicSchema = createLocalDynamicSchema(customFields);

	const form = superForm(data, {
		validators: zodClient(dynamicSchema),
		dataType: 'json',
	});

	const { form: formData, enhance, submitting, message } = form;

	// Gérer la redirection en cas de succès
	$: if ($message?.redirectTo) {
		const url = $message.redirectTo;
		message.set(null); // reset pour éviter une boucle
		goto(url);
	}
</script>

<form method="POST" action="?/createCustomOrder" use:enhance>
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
							minDaysNotice={3}
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
				Récapitulatif de la demande
			</h3>
			<div class="space-y-3 rounded-lg border p-4">
				<p class="text-sm text-muted-foreground">
					Merci de bien vérifier les informations de votre demande car en cas
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
					{#if $formData.customization_data && Object.keys($formData.customization_data).length > 0}
						<div class="pt-2">
							<span class="text-muted-foreground">Options sélectionnées :</span>
							<ul class="mt-1 space-y-1">
								{#each Object.entries($formData.customization_data) as [fieldId, value]}
									{#if value && (typeof value === 'string' ? value.length > 0 : Array.isArray(value) && value.length > 0)}
										{@const field = customFields.find((f) => f.id === fieldId)}
										{#if field}
											<li class="text-sm">
												<span class="font-medium">{field.label} :</span>
												{#if Array.isArray(value)}
													{#each value as optionLabel}
														<span>{optionLabel}</span>
														{#if optionLabel !== value[value.length - 1]},
														{/if}
													{/each}
												{:else}
													<span>{value}</span>
												{/if}
											</li>
										{/if}
									{/if}
								{/each}
							</ul>
						</div>
					{/if}
					<Separator class="my-2" />
					<p class="text-xs italic text-muted-foreground">
						* Le prix final sera confirmé par le pâtissier après étude de votre
						demande
					</p>
				</div>
			</div>
		</div>

		<!-- Section 5: Boutons d'action -->
		<div class="flex gap-2">
			{#if $page.url.searchParams.get('preview') !== 'true'}
				<Button type="submit" disabled={$submitting} class="flex-1">
					{#if $submitting}
						<span class="loading loading-spinner loading-sm"></span>
						Envoi en cours...
					{:else}
						Envoyer ma demande
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
