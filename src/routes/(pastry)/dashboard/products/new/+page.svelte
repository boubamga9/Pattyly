<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ProductForm from '../product-form.svelte';

	// Données de la page
	$: ({ categories, createProductForm } = $page.data);

	// Fonction pour retourner à la liste
	function goBack() {
		goto('/dashboard/products');
	}

	// Fonction de succès
	function handleSuccess() {
		goto('/dashboard/products');
	}

	// ✅ Tracking: Page view côté client (dashboard products new page)
	onMount(() => {
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const supabase = $page.data.supabase;
			if (supabase) {
				logPageView(supabase, {
					page: '/dashboard/products/new'
				}).catch((err: unknown) => {
					console.error('Error tracking page_view:', err);
				});
			}
		});
	});
</script>

<svelte:head>
	<title>Nouveau Gâteau - Dashboard</title>
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

	<!-- Composant ProductForm -->
	<ProductForm
		data={createProductForm}
		{categories}
		isEditing={false}
		onSuccess={handleSuccess}
		onCancel={goBack}
	/>
</div>
