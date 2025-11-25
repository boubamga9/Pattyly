<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';
	import ProductForm from '../product-form.svelte';

	// Données de la page
	$: ({ product, categories, customizationFields, updateProductForm } =
		$page.data);

	// Fonction pour retourner à la liste des produits
	function goBack() {
		goto('/dashboard/products');
	}
</script>

<svelte:head>
	<title>Modifier le produit - {product?.name}</title>
</svelte:head>

<div class="container mx-auto space-y-6 px-4 py-6 sm:px-6">
	<!-- En-tête -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<Button variant="ghost" size="sm" on:click={goBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Retour
			</Button>
			<div>
				<h1 class="text-2xl font-bold">Modifier le produit</h1>
				<p class="text-muted-foreground">
					Modifiez les informations de votre produit
				</p>
			</div>
		</div>
	</div>

	<!-- Formulaire de modification -->
	<ProductForm
		data={updateProductForm}
		{categories}
		isEditing={true}
		productId={product?.id}
		initialData={{
			name: product?.name,
			description: product?.description,
			base_price: product?.base_price,
			category_id: product?.category_id,
			min_days_notice: product?.min_days_notice,
			cake_type: product?.cake_type,
			image_url: product?.image_url,
			customizationFields: customizationFields,
		}}
		onSuccess={goBack}
		onCancel={goBack}
	/>
</div>
