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
	import { Upload, X } from 'lucide-svelte';
	import { compressProductImage } from '$lib/utils/images/client';

	export let data: SuperValidated<Record<string, any>>;
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
	}>;
	export let unavailabilities: Array<{ start_date: string; end_date: string }>;
	export let datesWithLimitReached: string[] = [];
	export let onCancel: () => void;

	const dynamicSchema = createLocalDynamicSchema(customFields);

	const form = superForm(data, {
		validators: zodClient(dynamicSchema),
		dataType: 'json',
	});

	const { form: formData, enhance, submitting, message } = form;

	// Variables pour l'upload de photos d'inspiration
	let inspirationPhotos: string[] = $formData.inspiration_photos || [];
	let inspirationFiles: File[] = [];
	let _compressionInfo: string | null = null;
	let isCompressing = false;
	let inspirationInputElement: HTMLInputElement;

	// Handle redirection on success
	$: if ($message?.redirectTo) {
		const url = $message.redirectTo;
		message.set(null); // reset to avoid loop
		goto(url);
	}

	async function handleInspirationFileSelect(event: Event) {
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

		isCompressing = true;
		_compressionInfo = null;

		for (const file of files) {
			if (!file.type.startsWith('image/')) continue;
			if (file.size > 5 * 1024 * 1024) continue;

			const compressed = await compressProductImage(file);
			inspirationFiles.push(compressed.file);
			const reader = new FileReader();
			reader.onload = (e) => {
				inspirationPhotos = [...inspirationPhotos, e.target?.result as string];
			};
			reader.readAsDataURL(compressed.file);
		}

		// Remplacer l'input file par les fichiers compressés
		const dt = new DataTransfer();
		inspirationFiles.forEach((f) => dt.items.add(f));
		inspirationInputElement.files = dt.files;

		isCompressing = false;
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
	<Form.Errors {form} />

	<div class="space-y-8">
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
								disabled={$submitting}
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
						disabled={$submitting || isCompressing}
						class="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isCompressing}
							<div
								class="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
							></div>
							<p class="text-center text-sm text-muted-foreground">
								Compression en cours...
							</p>
						{:else}
							<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
							<p class="text-center text-sm text-muted-foreground">
								Cliquez pour ajouter des photos
							</p>
							<p class="text-center text-xs text-muted-foreground">
								{inspirationPhotos.length}/3 photos
							</p>
						{/if}
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
					disabled={$submitting || isCompressing}
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
									<Form.Control>
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
		</div>
		<Separator />

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

		<!-- Section 4: Summary of the request -->
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
											{#if Array.isArray(value)}
												<!-- Multi-select options: display line by line -->
												<li class="space-y-1">
													{#each value as option, index}
														{#if index === 0}
															<!-- Première option : label + option sur la même ligne -->
															<div
																class="flex items-center justify-between text-sm"
															>
																<span class="font-medium">{field.label} :</span>
																<span>{option}</span>
															</div>
														{:else}
															<!-- Autres options : seulement l'option alignée à droite -->
															<div class="text-right text-sm">{option}</div>
														{/if}
													{/each}
												</li>
											{:else}
												<!-- Single value: display normally -->
												<li class="flex gap-2 text-sm">
													<span class="font-medium">{field.label} :</span>
													<span>{value}</span>
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

					<Separator class="my-2" />
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
