<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';

	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Save, Upload, X, Plus, Check } from 'lucide-svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { createProductFormSchema } from './new/schema';
	import {
		CustomizationFormBuilder,
		type CustomizationField,
	} from '$lib/components/forms';
	import {
		compressProductImage,
		formatCompressionInfo,
	} from '$lib/utils/images/client';

	// Props
	export let data: SuperValidated<Infer<CreateProductForm>>;
	export let categories: any[] = [];
	export let isEditing: boolean = false;
	export let productId: string | undefined = undefined;
	export let initialData: any = undefined;
	export let onSuccess: () => void = () => {};
	export let onCancel: () => void = () => {};

	// Superforms
	const form = superForm(data, {
		validators: zodClient(createProductFormSchema),
		dataType: 'json', // Permet d'envoyer des structures de données imbriquées
	});

	const { form: formData, enhance, submitting, message, errors } = form;

	// Variables pour l'upload d'image
	let _imageFile: File | null = null;
	let imagePreview: string | null = null;
	let compressionInfo: string | null = null;
	let isCompressing = false;
	let imageInputElement: HTMLInputElement;

	// Variables pour les champs de personnalisation
	let customizationFields: CustomizationField[] = [];

	// État pour l'ajout de catégorie inline
	let isAddingCategory = false;
	let newCategoryName = '';
	let categoryInputElement: HTMLInputElement | undefined;
	let categoryError = '';
	let newCategoryToCreate: string | null = null;

	// État optimiste pour les catégories
	let optimisticCategories: any[] = [];

	// Initialiser avec les catégories existantes
	$: if (categories && optimisticCategories.length === 0) {
		optimisticCategories = [...categories];
	}

	// Initialiser avec les données existantes si en mode édition
	$: if (initialData && isEditing) {
		$formData.name = initialData.name || '';
		$formData.description = initialData.description || '';
		$formData.base_price = initialData.base_price || 0;
		$formData.category_id = initialData.category_id || '';
		$formData.min_days_notice = initialData.min_days_notice || 0;
		if (initialData.image_url) {
			imagePreview = initialData.image_url;
		}
		if (initialData.customizationFields) {
			customizationFields = initialData.customizationFields;
		}
	}

	// Fonction pour obtenir toutes les catégories (existantes + optimistes)
	function getAllCategories() {
		return optimisticCategories || [];
	}

	// Handle file selection with compression
	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		try {
			isCompressing = true;
			compressionInfo = null;
			$errors = {};

			// Validate file type
			if (!file.type.startsWith('image/')) {
				$errors = { image: 'Veuillez sélectionner une image' };
				return;
			}

			// Validate file size before compression (max 10MB pour éviter les abus)
			if (file.size > 5 * 1024 * 1024) {
				$errors = { image: "L'image ne doit pas dépasser 5MB" };
				return;
			}

			// Compresser et redimensionner l'image
			const compressionResult = await compressProductImage(file);

			// Utiliser l'image compressée
			_imageFile = compressionResult.file;
			compressionInfo = formatCompressionInfo(compressionResult);

			// 🔄 Synchroniser l'input file avec l'image compressée
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(compressionResult.file);
			imageInputElement.files = dataTransfer.files;

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(compressionResult.file);
		} catch (error) {
			$errors = {
				image: "Erreur lors du traitement de l'image. Veuillez réessayer.",
			};
		} finally {
			isCompressing = false;
		}
	}

	// Remove image
	function removeImage() {
		_imageFile = null;
		imagePreview = null;
		compressionInfo = null;
	}

	// Gestionnaire pour les changements de champs
	function handleFieldsChange(event: CustomEvent<CustomizationField[]>) {
		customizationFields = event.detail;
		// Synchroniser avec le formulaire Superforms
		$formData.customizationFields = event.detail;
	}

	// Fonctions pour l'ajout de catégorie inline
	function startAddingCategory() {
		isAddingCategory = true;
		newCategoryName = '';
		categoryError = '';
		// Focus automatique sur l'input après le rendu
		setTimeout(() => {
			categoryInputElement?.focus();
		}, 0);
	}

	function cancelAddingCategory() {
		isAddingCategory = false;
		newCategoryName = '';
		categoryError = '';
	}

	function validateCategoryName(name: string): string | null {
		if (!name.trim()) {
			return 'Le nom de la catégorie est obligatoire';
		}
		if (name.trim().length < 2) {
			return 'Le nom doit contenir au moins 2 caractères';
		}
		if (name.trim().length > 50) {
			return 'Le nom ne peut pas dépasser 50 caractères';
		}
		// Vérifier si la catégorie existe déjà
		const existingCategory = categories?.find(
			(cat: any) => cat.name.toLowerCase() === name.trim().toLowerCase(),
		);
		if (existingCategory) {
			return 'Cette catégorie existe déjà';
		}
		return null;
	}

	// Valider et préparer la nouvelle catégorie
	function prepareNewCategory() {
		const error = validateCategoryName(newCategoryName);
		if (error) {
			categoryError = error;
			return;
		}

		// Stocker le nom de la nouvelle catégorie à créer
		newCategoryToCreate = newCategoryName.trim();

		// Créer une catégorie temporaire pour l'affichage dans le dropdown
		const tempCategory = {
			id: 'temp-new-category',
			name: newCategoryToCreate,
			shop_id: '',
			created_at: new Date().toISOString(),
		};

		// Ajouter à la liste optimiste pour l'affichage
		optimisticCategories = [...optimisticCategories, tempCategory];

		// Sélectionner automatiquement la nouvelle catégorie
		$formData.category_id = tempCategory.id;

		// Fermer le formulaire d'ajout
		cancelAddingCategory();
	}

	// Synchroniser customizationFields avec le formulaire au chargement
	$: if (customizationFields && customizationFields.length > 0) {
		$formData.customizationFields = customizationFields;
	}

	// Gérer le succès
	$: if ($message) {
		onSuccess();
	}
</script>

<div class="space-y-6">
	<!-- Messages d'erreur/succès -->
	{#if $errors?.error}
		<Alert variant="destructive">
			<AlertDescription>{$errors.error}</AlertDescription>
		</Alert>
	{/if}

	{#if $message?.success}
		<Alert>
			<AlertDescription>{$message.success}</AlertDescription>
		</Alert>
	{/if}

	<!-- Formulaire -->
	<Card>
		<CardHeader>
			<CardTitle>Informations du Gâteau</CardTitle>
			<CardDescription>
				{isEditing ? 'Modifiez' : 'Remplissez'} les informations de votre {isEditing
					? 'gâteau'
					: 'nouveau gâteau'}
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				id="product-form"
				method="POST"
				action={isEditing ? '?/updateProduct' : '?/createProduct'}
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							onSuccess();
						}
					};
				}}
				enctype="multipart/form-data"
				class="space-y-6"
			>
				{#if isEditing && productId}
					<input type="hidden" name="productId" value={productId} />
				{/if}

				<!-- Champ caché pour la nouvelle catégorie à créer -->
				{#if newCategoryToCreate}
					<input
						type="hidden"
						name="newCategoryName"
						value={newCategoryToCreate}
					/>
				{/if}

				<!-- Image du gâteau -->
				<div>
					<label class="mb-2 block text-sm font-medium">
						Image du gâteau
					</label>

					{#if imagePreview}
						<!-- Image preview -->
						<div class="mb-4 flex justify-center">
							<div class="relative">
								<img
									src={imagePreview}
									alt="Aperçu de l'image"
									class="h-48 w-48 rounded-lg border-2 border-border object-cover"
								/>
								<button
									type="button"
									on:click={removeImage}
									class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
								>
									<X class="h-4 w-4" />
								</button>
							</div>
						</div>
					{:else}
						<!-- File upload area -->
						<div class="mb-4 flex justify-center">
							<div
								class="flex h-48 w-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary"
								on:click={() => document.getElementById('image')?.click()}
								role="button"
								tabindex="0"
								on:keydown={(e) =>
									e.key === 'Enter' &&
									document.getElementById('image')?.click()}
							>
								<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
								<p class="text-center text-xs text-muted-foreground">
									Cliquez pour sélectionner une image
								</p>
							</div>
						</div>
					{/if}

					<input
						id="image"
						name="image"
						type="file"
						accept="image/*"
						on:change={handleFileSelect}
						class="hidden"
						bind:this={imageInputElement}
					/>

					<!-- Champ caché pour les données de personnalisation -->
					<input
						type="hidden"
						name="customizationFields"
						value={JSON.stringify(customizationFields)}
					/>

					{#if $errors?.image}
						<p class="mt-1 text-sm text-red-600">{$errors.image}</p>
					{/if}
				</div>

				<!-- Nom du gâteau -->
				<Form.Field {form} name="name">
					<Form.Control let:attrs>
						<Form.Label>Nom du gâteau *</Form.Label>
						<Input
							{...attrs}
							bind:value={$formData.name}
							type="text"
							placeholder="Ex: Gâteau au Chocolat"
							required
							maxlength="50"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<!-- Description -->
				<Form.Field {form} name="description">
					<Form.Control let:attrs>
						<Form.Label>Description</Form.Label>
						<Textarea
							{...attrs}
							bind:value={$formData.description}
							rows="4"
							placeholder="Description détaillée du gâteau..."
							maxlength="1000"
						/>
					</Form.Control>
					<Form.FieldErrors />
				</Form.Field>

				<!-- Prix et Catégorie -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Form.Field {form} name="base_price">
						<Form.Control let:attrs>
							<Form.Label>Prix de base (€) *</Form.Label>
							<Input
								{...attrs}
								bind:value={$formData.base_price}
								type="number"
								placeholder="25.00"
								inputmode="decimal"
								required
							/>
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<div>
						<label for="category_id" class="mb-2 block text-sm font-medium">
							Catégorie
						</label>

						{#if isAddingCategory}
							<!-- Interface d'ajout de catégorie inline -->
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<input
										bind:this={categoryInputElement}
										bind:value={newCategoryName}
										type="text"
										placeholder="Nom de la catégorie"
										class="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 {categoryError
											? 'border-red-500'
											: ''}"
										on:input={() => {
											// Effacer l'erreur quand l'utilisateur tape
											if (categoryError) {
												categoryError = '';
											}
										}}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="h-9 w-9 p-0"
										title="Valider"
										on:click={prepareNewCategory}
									>
										<Check class="h-4 w-4" />
									</Button>
									<Button
										type="button"
										variant="outline"
										size="sm"
										class="h-9 w-9 p-0"
										on:click={cancelAddingCategory}
										title="Annuler"
									>
										<X class="h-4 w-4" />
									</Button>
								</div>
								{#if categoryError}
									<div class="text-xs text-red-500">{categoryError}</div>
								{/if}
							</div>
						{:else}
							<!-- Sélection de catégorie avec option d'ajout -->
							<div class="space-y-2">
								<select
									bind:value={$formData.category_id}
									class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="">Aucune catégorie</option>
									{#each getAllCategories() as category}
										<option value={category.id}>{category.name}</option>
									{/each}
								</select>

								<Button
									type="button"
									variant="outline"
									size="sm"
									on:click={startAddingCategory}
									class="w-full"
								>
									<Plus class="mr-2 h-4 w-4" />
									Ajouter une nouvelle catégorie
								</Button>
							</div>
						{/if}
					</div>
				</div>

				<!-- Délai de préparation -->
				<Form.Field {form} name="min_days_notice">
					<Form.Control let:attrs>
						<Form.Label>Délai de préparation minimum (jours)</Form.Label>
						<Input
							{...attrs}
							bind:value={$formData.min_days_notice}
							type="number"
							placeholder="0"
							inputmode="numeric"
						/>
					</Form.Control>
					<Form.FieldErrors />
					<p class="mt-1 text-sm text-muted-foreground">
						Nombre de jours minimum nécessaires pour préparer ce gâteau
					</p>
				</Form.Field>
			</form>
		</CardContent>
	</Card>

	<!-- Section Personnalisation -->
	<CustomizationFormBuilder
		fields={customizationFields}
		title="Personnalisation du Gâteau (Optionnel)"
		description="Ajoutez des champs pour permettre aux clients de personnaliser leur commande. Cette section est entièrement optionnelle."
		containerClass="customization-fields-container"
		on:fieldsChange={handleFieldsChange}
	/>

	<!-- Boutons d'action -->
	<div class="flex flex-col gap-3 pt-4 sm:flex-row">
		<Button
			type="submit"
			form="product-form"
			class="h-11 flex-1 transition-all duration-200"
			disabled={$submitting ||
				!(
					$formData.name &&
					$formData.base_price !== undefined &&
					$formData.base_price > 0
				)}
		>
			{#if $submitting}
				<div
					class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
				/>
			{:else if !($formData.name && $formData.base_price !== undefined && $formData.base_price > 0)}
				Remplissez les champs requis
			{:else}
				<Save class="mr-2 h-4 w-4" />
				{isEditing ? 'Sauvegarder' : 'Créer'} le Gâteau
			{/if}
		</Button>
		<Button
			type="button"
			variant="outline"
			on:click={onCancel}
			class="h-11 flex-1"
		>
			Annuler
		</Button>
	</div>
</div>

<style>
	.sortable-ghost {
		opacity: 0.5;
		background: #f3f4f6;
	}

	.sortable-chosen {
		background: #fef3c7;
		transform: rotate(2deg);
	}

	.sortable-drag {
		opacity: 0.8;
		background: white;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
	}
</style>
