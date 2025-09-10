<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { writable } from 'svelte/store';
	import CategoryForm from './category-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Switch } from '$lib/components/ui/switch';
	import {
		Plus,
		Trash2,
		Copy,
		Edit,
		Eye,
		Crown,
		Check,
		X,
		Pencil,
	} from 'lucide-svelte';

	// Données de la page
	$: ({
		products,
		categories,
		currentProductCount,
		canAddProducts,
		permissions,
		shopSlug,
	} = $page.data);

	// Store local pour les catégories (permet la mise à jour de l'interface)
	const localCategories = writable(categories || []);

	// Synchroniser le store local avec les données de la page
	$: if (categories) {
		localCategories.set(categories);
	}

	// État du filtre
	let selectedCategory: string | null = null;
	let filteredProducts = products;

	// État pour l'ajout de catégorie
	let isAddingCategory = false;

	// État pour l'édition de catégorie
	let editingCategoryId: string | null = null;
	let editingCategoryName = '';

	// État pour la confirmation de suppression
	let confirmingDeleteId: string | null = null;

	// Filtrer les produits quand la catégorie change
	$: filteredProducts =
		selectedCategory === null
			? products
			: products.filter(
					(product: (typeof products)[0]) =>
						product.category_id === selectedCategory,
				);
	$: form = $page.form;

	// Messages d'erreur/succès
	$: errorMessage = form?.error;
	$: successMessage = form?.message;

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Fonction pour tronquer le texte
	function truncateText(text: string, maxLength: number = 100): string {
		if (!text) return '';
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength) + '...';
	}

	// Fonction pour rediriger vers la création
	function goToNewProduct() {
		goto('/dashboard/products/new');
	}

	// Fonction pour rediriger vers la vue d'un produit
	function viewProduct(productId: string) {
		// Rediriger vers la page publique du produit avec le mode preview
		if (shopSlug) {
			goto(`/${shopSlug}/product/${productId}?preview=true`);
		}
	}

	// Fonction pour rediriger vers l'édition d'un produit
	function editProduct(productId: string) {
		goto(`/dashboard/products/${productId}`);
	}

	// Fonction de suppression de catégorie avec mise à jour instantanée
	async function handleCategoryDelete(categoryId: string) {
		const formData = new FormData();
		formData.append('categoryId', categoryId);

		try {
			const response = await fetch('?/deleteCategory', {
				method: 'POST',
				body: formData,
			});

			if (response.ok) {
				// Mise à jour instantanée !
				localCategories.update((cats: any[]) =>
					cats.filter((cat: any) => cat.id !== categoryId),
				);
				confirmingDeleteId = null;
			}
		} catch (error) {}
	}

	// Fonctions pour l'ajout de catégorie
	function startAddingCategory() {
		isAddingCategory = true;
	}

	// Fonctions pour l'édition de catégorie
	function startEditingCategory(categoryId: string, categoryName: string) {
		editingCategoryId = categoryId;
		editingCategoryName = categoryName;
	}

	// Fonctions pour la confirmation de suppression
	function startDeleteConfirmation(productId: string) {
		confirmingDeleteId = productId;
	}

	function cancelDeleteConfirmation() {
		confirmingDeleteId = null;
	}
</script>

<svelte:head>
	<title>Mes Gâteaux - Pattyly</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête avec informations du plan -->
	<div
		class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
	>
		<div>
			<h1 class="text-3xl font-bold">Mes Gâteaux</h1>
			<p class="text-muted-foreground">Gérez votre catalogue de gâteaux</p>
		</div>

		<div
			class="flex flex-col space-y-2 sm:flex-row sm:items-center sm:gap-4 sm:space-y-0"
		>
			<!-- Compteur de produits -->
			<div class="text-sm text-muted-foreground">
				{currentProductCount} / {permissions.productLimit === Infinity
					? '∞'
					: permissions.productLimit} gâteaux
			</div>

			<!-- Bouton d'ajout -->
			{#if canAddProducts}
				<Button on:click={goToNewProduct} class="w-full sm:w-auto">
					<Plus class="mr-2 h-4 w-4" />
					Ajouter un Gâteau
				</Button>
			{:else}
				<Button variant="outline" disabled class="w-full sm:w-auto">
					<Plus class="mr-2 h-4 w-4" />
					Limite Atteinte
				</Button>
			{/if}
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

	<!-- Alerte de limite atteinte -->
	{#if !canAddProducts}
		<Alert>
			<Crown class="h-4 w-4" />
			<AlertDescription>
				<strong>Limite de gâteaux atteinte !</strong>
				Vous avez atteint la limite de {permissions.productLimit} gâteaux du plan
				Basic.
				<a href="/subscription" class="font-medium underline"
					>Passez au plan Premium</a
				>
				pour ajouter autant de gâteaux que vous voulez !
			</AlertDescription>
		</Alert>
	{/if}

	<!-- Section de filtres -->
	<div class="space-y-4">
		<div class="overflow-x-auto">
			<div class="flex min-w-max gap-2 py-2 pb-4">
				<!-- Filtre "Tout" -->
				<Button
					variant={selectedCategory === null ? 'default' : 'outline'}
					size="sm"
					on:click={() => (selectedCategory = null)}
					class="whitespace-nowrap"
				>
					Tout
				</Button>

				<!-- Filtres par catégorie -->
				{#each $localCategories as category}
					{#if editingCategoryId === category.id}
						<!-- Interface d'édition de catégorie -->
						<div class="flex items-center gap-1">
							<CategoryForm
								data={$page.data.updateCategoryForm}
								isEditing={true}
								editingCategoryId={category.id}
								{editingCategoryName}
								showDeleteButton={true}
								onSuccess={() => {
									editingCategoryId = null;
									editingCategoryName = '';
									// Mise à jour instantanée via le store local
									// TODO: Rafraîchir les données depuis le serveur
								}}
								onCancel={() => {
									editingCategoryId = null;
									editingCategoryName = '';
								}}
								onDelete={handleCategoryDelete}
							/>
						</div>
					{:else}
						<!-- Bouton de catégorie avec icône d'édition -->
						<Button
							variant={selectedCategory === category.id ? 'default' : 'outline'}
							size="sm"
							on:click={() => (selectedCategory = category.id)}
							class="group relative whitespace-nowrap pr-8"
						>
							{category.name}
							<Button
								variant="ghost"
								size="sm"
								class="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0 opacity-60 hover:opacity-100"
								on:click={(e) => {
									e.stopPropagation();
									startEditingCategory(category.id, category.name);
								}}
								title="Modifier la catégorie"
							>
								<Pencil class="h-3 w-3" />
							</Button>
						</Button>
					{/if}
				{/each}

				<!-- Interface d'ajout de catégorie -->
				{#if isAddingCategory}
					<div class="flex flex-col gap-2">
						<CategoryForm
							data={$page.data.createCategoryForm}
							isEditing={false}
							onSuccess={() => {
								isAddingCategory = false;
								// TODO: Mettre à jour la liste des catégories sans reload
							}}
							onCancel={() => {
								isAddingCategory = false;
							}}
						/>
					</div>
				{:else}
					<Button
						variant="outline"
						size="sm"
						class="whitespace-nowrap border-dashed"
						on:click={startAddingCategory}
					>
						<Plus class="mr-1 h-3 w-3" />
						Ajouter une catégorie
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Liste des gâteaux -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
		{#if filteredProducts && filteredProducts.length > 0}
			{#each filteredProducts as product}
				<Card class={product.is_active ? '' : 'bg-muted/50'}>
					<CardHeader>
						<div class="flex items-start gap-4">
							<!-- Colonne image à gauche -->
							<div class="flex-shrink-0">
								{#if product.image_url}
									<img
										src={product.image_url}
										alt={product.name}
										class="h-20 w-20 rounded-lg border border-border object-cover"
									/>
								{:else}
									<div
										class="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-muted"
									>
										<span class="text-2xl text-muted-foreground">🎂</span>
									</div>
								{/if}
							</div>

							<!-- Colonne contenu à droite -->
							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between">
									<div class="min-w-0 flex-1">
										<CardTitle class="text-lg">{product.name}</CardTitle>
										<CardDescription class="mt-1">
											{truncateText(
												product.description || 'Aucune description',
												45,
											)}
										</CardDescription>
									</div>

									<span
										class="ml-2 flex-shrink-0 text-sm text-muted-foreground"
									>
										{formatPrice(product.base_price)}
									</span>
								</div>
							</div>
						</div>
					</CardHeader>

					<CardContent>
						<div class="space-y-3">
							<div class="flex items-center justify-start">
								<Badge variant="outline">
									{product.categories?.name || 'Général'}
								</Badge>
							</div>

							<!-- Menu d'actions -->
							<div class="flex gap-1">
								<!-- Toggle d'activation -->
								<div class="mr-2 flex items-center">
									<Switch
										id={`active-${product.id}`}
										checked={product.is_active}
										on:change={async (event) => {
											const checked = event.detail;
											// Mise à jour optimiste immédiate
											product.is_active = checked;

											try {
												// Envoi de la requête au serveur
												const formData = new FormData();
												formData.append('productId', product.id);
												formData.append('isActive', checked.toString());

												const response = await fetch('?/toggleProductActive', {
													method: 'POST',
													body: formData,
												});

												if (!response.ok) {
													// En cas d'erreur, remettre l'état précédent
													product.is_active = !checked;
												}
											} catch (error) {
												// En cas d'erreur, remettre l'état précédent
												product.is_active = !checked;
											}
										}}
									/>
								</div>
								<!-- Bouton Voir -->
								<Button
									variant="ghost"
									size="sm"
									on:click={() => viewProduct(product.id)}
									title="Voir le gâteau"
									disabled={!product.is_active}
									class={!product.is_active
										? 'cursor-not-allowed opacity-50'
										: ''}
								>
									<Eye class="h-4 w-4" />
								</Button>

								<!-- Bouton Modifier -->
								<Button
									variant="ghost"
									size="sm"
									on:click={() => editProduct(product.id)}
									title="Modifier le gâteau"
								>
									<Edit class="h-4 w-4" />
								</Button>

								<!-- Bouton Dupliquer -->
								<form
									method="POST"
									action="?/duplicateProduct"
									use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												window.location.reload();
											}
										};
									}}
								>
									<input type="hidden" name="productId" value={product.id} />
									<Button
										type="submit"
										variant="ghost"
										size="sm"
										title={canAddProducts
											? 'Dupliquer le gâteau'
											: 'Limite de gâteaux atteinte'}
										disabled={!canAddProducts}
										class={!canAddProducts
											? 'cursor-not-allowed opacity-50'
											: ''}
									>
										<Copy class="h-4 w-4" />
									</Button>
								</form>

								<!-- Bouton Supprimer avec confirmation -->
								{#if confirmingDeleteId === product.id}
									<form
										method="POST"
										action="?/deleteProduct"
										use:enhance={() => {
											return async ({ result }) => {
												if (result.type === 'success') {
													confirmingDeleteId = null;
													window.location.reload();
												}
											};
										}}
									>
										<input type="hidden" name="productId" value={product.id} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											class="bg-red-600 text-white hover:bg-red-700 hover:text-white"
											title="Confirmer la suppression"
										>
											<Check class="h-4 w-4" />
										</Button>
									</form>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										on:click={cancelDeleteConfirmation}
										title="Annuler la suppression"
									>
										<X class="h-4 w-4" />
									</Button>
								{:else}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="text-red-600 hover:bg-red-50 hover:text-red-700"
										on:click={() => startDeleteConfirmation(product.id)}
										title="Supprimer le gâteau"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						</div>
					</CardContent>
				</Card>
			{/each}
		{:else}
			<div class="col-span-full">
				<Card>
					<CardContent class="flex flex-col items-center justify-center py-12">
						<div class="text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100"
							>
								<Plus class="h-8 w-8 text-gray-400" />
							</div>
							<h3 class="mb-2 text-lg font-medium">Aucun gâteau</h3>
							<p class="mb-4 text-muted-foreground">
								Commencez par ajouter votre premier gâteau à votre catalogue.
							</p>
							{#if canAddProducts}
								<Button on:click={goToNewProduct}>
									<Plus class="mr-2 h-4 w-4" />
									Ajouter un Gâteau
								</Button>
							{:else}
								<Button variant="outline" disabled>Limite Atteinte</Button>
							{/if}
						</div>
					</CardContent>
				</Card>
			</div>
		{/if}
	</div>
</div>
