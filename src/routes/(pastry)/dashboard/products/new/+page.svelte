<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Save, Upload, X, Plus, Check } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import {
		CustomizationFormBuilder,
		type CustomizationField,
	} from '$lib/components/CustomizationFormBuilder';
	import {
		compressProductImage,
		formatCompressionInfo,
	} from '$lib/utils/image-compression';

	// Données de la page
	$: ({ categories } = $page.data);
	$: form = $page.form;

	// Messages d'erreur/succès
	$: errorMessage = form?.error;
	$: successMessage = form?.message;

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

	// État optimiste pour les catégories
	let optimisticCategories: any[] = [];

	// Initialiser avec les catégories existantes
	$: if (categories && optimisticCategories.length === 0) {
		optimisticCategories = [...categories];
	}

	// Fonction pour obtenir toutes les catégories (existantes + optimistes)
	function getAllCategories() {
		const existingIds = new Set(categories?.map((cat: any) => cat.id) || []);
		const newCategories = optimisticCategories.filter(
			(cat: any) => !existingIds.has(cat.id),
		);
		return [...(categories || []), ...newCategories];
	}

	// Fonction pour retourner à la liste
	function goBack() {
		goto('/dashboard/products');
	}

	// Handle file selection with compression
	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		try {
			isCompressing = true;
			compressionInfo = null;
			errorMessage = '';

			// Validate file type
			if (!file.type.startsWith('image/')) {
				errorMessage = 'Veuillez sélectionner une image';
				return;
			}

			// Validate file size before compression (max 10MB pour éviter les abus)
			if (file.size > 10 * 1024 * 1024) {
				errorMessage = "L'image ne doit pas dépasser 10MB";
				return;
			}

			// Compresser et redimensionner l'image
			const compressionResult = await compressProductImage(file);

			// Utiliser l'image compressée
			_imageFile = compressionResult.file;
			compressionInfo = formatCompressionInfo(compressionResult);

			// 🔄 Synchroniser l'input file avec l'image compressée
			// Créer un nouveau FileList avec l'image compressée
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
			console.error('Erreur lors de la compression:', error);
			errorMessage =
				"Erreur lors du traitement de l'image. Veuillez réessayer.";
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
		const existingCategory = optimisticCategories?.find(
			(cat: any) => cat.name.toLowerCase() === name.trim().toLowerCase(),
		);
		if (existingCategory) {
			return 'Cette catégorie existe déjà';
		}
		return null;
	}

	// Fonction pour ajouter une catégorie de manière optimiste
	function addCategoryOptimistically(categoryName: string) {
		const newCategory = {
			id: `temp_${Date.now()}`, // ID temporaire
			name: categoryName,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		};
		optimisticCategories = [...optimisticCategories, newCategory];
	}
</script>

<svelte:head>
	<title>Nouveau Gâteau - Dashboard</title>
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
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<div>
				<h1 class="text-3xl font-bold">Nouveau Gâteau</h1>
				<p class="text-muted-foreground">
					Ajoutez un nouveau gâteau à votre catalogue
				</p>
			</div>
		</div>
	</div>

	<!-- Messages d'erreur/succès -->
	{#if errorMessage}
		<Alert variant="destructive">
			<AlertDescription>{errorMessage}</AlertDescription>
		</Alert>
	{/if}

	{#if successMessage}
		<Alert>
			<AlertDescription>{successMessage}</AlertDescription>
		</Alert>
	{/if}

	<!-- Formulaire -->
	<Card>
		<CardHeader>
			<CardTitle>Informations du Gâteau</CardTitle>
			<CardDescription>
				Remplissez les informations de votre nouveau gâteau
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				id="product-form"
				method="POST"
				action="?/createProduct"
				on:submit={() => {
					console.log('=== FORM SUBMIT TRIGGERED ===');
				}}
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							// Redirection côté client
							goto('/dashboard/products');
						}
					};
				}}
				enctype="multipart/form-data"
				class="space-y-6"
			>
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
					{#if isCompressing}
						<div class="mt-2 flex items-center gap-2 text-sm text-blue-600">
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
							></div>
							Compression de l'image en cours...
						</div>
					{:else if compressionInfo}
						<div class="mt-2 rounded-md bg-green-50 p-3 text-sm">
							<p class="mb-1 font-medium text-green-800">
								✅ Image optimisée avec succès !
							</p>
							<div class="whitespace-pre-line text-xs text-green-700">
								{compressionInfo}
							</div>
						</div>
					{:else}
						<div class="mt-1 space-y-2">
							<p class="mt-1 text-sm text-muted-foreground">
								Format JPG, PNG. L'image sera automatiquement redimensionnée à
								800x800px et optimisée.
							</p>
							<div class="flex items-center gap-2 text-xs text-blue-600">
								<div class="h-3 w-3 rounded-full bg-blue-600"></div>
								<span>Validation hybride : Front + Serveur</span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Nom du gâteau -->
				<div>
					<label for="name" class="mb-2 block text-sm font-medium">
						Nom du gâteau *
					</label>
					<input
						type="text"
						id="name"
						name="name"
						required
						maxlength="50"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Ex: Gâteau au Chocolat"
					/>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="mb-2 block text-sm font-medium">
						Description
					</label>
					<textarea
						id="description"
						name="description"
						rows="4"
						maxlength="1000"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="Description détaillée du gâteau..."
					></textarea>
				</div>

				<!-- Prix et Catégorie -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label for="price" class="mb-2 block text-sm font-medium">
							Prix de base (€) *
						</label>
						<input
							type="number"
							id="price"
							name="price"
							step="0.01"
							min="0"
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="25.00"
						/>
					</div>

					<div>
						<label for="category_id" class="mb-2 block text-sm font-medium">
							Catégorie
						</label>

						{#if isAddingCategory}
							<!-- Interface d'ajout de catégorie inline -->
							<div class="space-y-2">
								<form
									method="POST"
									action="?/createCategory"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												// Ajouter la vraie catégorie retournée par le serveur
												if (result.data?.category) {
													optimisticCategories = [
														...optimisticCategories,
														result.data.category,
													];
												}

												// Fermer l'interface d'ajout
												isAddingCategory = false;
												newCategoryName = '';
												categoryError = '';

												// Mettre à jour les données de la page
												await update();
											} else if (result.type === 'failure') {
												categoryError =
													result.data?.error || 'Erreur lors de la création';
											}
										};
									}}
									class="flex items-center gap-2"
								>
									<input
										bind:this={categoryInputElement}
										bind:value={newCategoryName}
										type="text"
										name="categoryName"
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
										type="submit"
										variant="outline"
										size="sm"
										class="h-9 w-9 p-0"
										title="Valider"
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
								</form>
								{#if categoryError}
									<div class="text-xs text-red-500">{categoryError}</div>
								{/if}
							</div>
						{:else}
							<!-- Sélection de catégorie avec option d'ajout -->
							<div class="space-y-2">
								<select
									id="category_id"
									name="category_id"
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
				<div>
					<label for="min_days_notice" class="mb-2 block text-sm font-medium">
						Délai de préparation minimum (jours)
					</label>
					<input
						type="number"
						id="min_days_notice"
						name="min_days_notice"
						min="0"
						value="0"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="0"
					/>
					<p class="mt-1 text-sm text-muted-foreground">
						Nombre de jours minimum nécessaires pour préparer ce gâteau
					</p>
				</div>
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
	<div class="flex gap-4 pt-4">
		<Button type="submit" form="product-form" class="flex-1">
			<Save class="mr-2 h-4 w-4" />
			Créer le Gâteau
		</Button>
		<Button type="button" variant="outline" on:click={goBack} class="flex-1"
			>Annuler</Button
		>
	</div>
</div>
