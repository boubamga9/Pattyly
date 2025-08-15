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
	import { ArrowLeft, Save, Plus, X, Upload } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import {
		CustomizationFormBuilder,
		type CustomizationField,
	} from '$lib/components/CustomizationFormBuilder/index';

	// Données de la page
	$: ({
		product,
		categories,
		customizationFields: initialCustomizationFields,
	} = $page.data);

	// Variables pour les champs de personnalisation
	let customizationFields: CustomizationField[] = [];

	// Variables pour l'upload d'image
	let _imageFile: File | null = null;
	let imagePreview: string | null = null;

	// Initialiser l'aperçu de l'image quand le produit est chargé
	$: if (product) {
		imagePreview = product.image_url;
	}

	// Initialiser les champs de personnalisation
	$: if (
		initialCustomizationFields &&
		initialCustomizationFields.length > 0 &&
		customizationFields.length === 0
	) {
		customizationFields = initialCustomizationFields.map((field: any) => ({
			id: field.id,
			label: field.label,
			type: field.type,
			required: field.required,
			options: field.options
				? typeof field.options === 'string'
					? JSON.parse(field.options)
					: field.options
				: [],
		}));
	}

	$: form = $page.form;

	// Messages d'erreur/succès
	$: errorMessage = form?.error;
	$: successMessage = form?.message;

	// Fonction pour retourner à la liste des produits
	function goBack() {
		goto('/dashboard/products');
	}

	// Handle file selection
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			// Validate file type
			if (!file.type.startsWith('image/')) {
				errorMessage = 'Veuillez sélectionner une image';
				return;
			}

			// Validate file size (2MB)
			if (file.size > 2 * 1024 * 1024) {
				errorMessage = "L'image ne doit pas dépasser 2MB";
				return;
			}

			_imageFile = file;
			errorMessage = '';

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	// Remove image
	function removeImage() {
		_imageFile = null;
		imagePreview = null;
	}

	// Gestionnaire pour les changements de champs
	function handleFieldsChange(event: CustomEvent<CustomizationField[]>) {
		customizationFields = event.detail;
	}
</script>

<svelte:head>
	<title>{product.name} - Dashboard</title>
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
			<Button variant="ghost" on:click={goBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Retour aux produits
			</Button>
			<div>
				<h1 class="text-3xl font-bold">{product.name}</h1>
				<p class="text-muted-foreground">
					Gérez les informations de votre gâteau
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
				Modifiez les informations de votre gâteau
			</CardDescription>
		</CardHeader>
		<CardContent>
			<form
				id="edit-product-form"
				method="POST"
				action="?/updateProduct"
				use:enhance={() => {
					return async ({ formData, result }) => {
						// Ajouter les champs de personnalisation
						formData.append(
							'customizationFields',
							JSON.stringify(customizationFields),
						);

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
					/>
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
						value={product.name}
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
						>{product.description || ''}</textarea
					>
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
							value={product.base_price}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="25.00"
						/>
					</div>

					<div>
						<label for="category_id" class="mb-2 block text-sm font-medium">
							Catégorie
						</label>
						<select
							id="category_id"
							name="category_id"
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Aucune catégorie</option>
							{#each categories as category}
								<option
									value={category.id}
									selected={product.category_id === category.id}
								>
									{category.name}
								</option>
							{/each}
						</select>
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
						value={product.min_days_notice}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="0"
					/>
					<p class="mt-1 text-sm text-muted-foreground">
						Nombre de jours minimum nécessaires pour préparer ce gâteau
					</p>
				</div>

				<!-- Champ caché pour les données de personnalisation -->
				<input
					type="hidden"
					name="customizationFields"
					value={JSON.stringify(customizationFields)}
				/>
			</form>
		</CardContent>
	</Card>

	<!-- Section Personnalisation -->
	<CustomizationFormBuilder
		fields={customizationFields}
		title="Personnalisation du Gâteau"
		description="Modifiez les champs de personnalisation pour ce gâteau"
		containerClass="customization-fields-container"
		on:fieldsChange={handleFieldsChange}
	/>

	<!-- Boutons d'action -->
	<div class="flex gap-4">
		<Button type="submit" form="edit-product-form" class="flex-1">
			<Save class="mr-2 h-4 w-4" />
			Sauvegarder les Modifications
		</Button>
		<Button type="button" variant="outline" on:click={goBack} class="flex-1"
			>Annuler</Button
		>
	</div>
</div>
