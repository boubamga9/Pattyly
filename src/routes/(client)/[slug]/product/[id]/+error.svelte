<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';

	$: status = $page.status;
	$: message = $page.error?.message || 'Une erreur est survenue';
	$: shopSlug = $page.params.slug;
</script>

<svelte:head>
	<title>Produit non trouvé - Pattyly</title>
	<meta
		name="description"
		content="Ce produit n'existe pas ou n'est plus disponible"
	/>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4 py-12">
	<div class="mx-auto max-w-md text-center">
		<!-- Error icon -->
		<div class="mb-6 flex justify-center">
			<div class="rounded-full bg-orange-100 p-4">
				<svg
					class="h-12 w-12 text-orange-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
					/>
				</svg>
			</div>
		</div>

		<!-- Title -->
		<h1 class="mb-4 text-3xl font-bold text-gray-900">Produit non trouvé</h1>

		<!-- Message -->
		<p class="mb-8 text-lg text-gray-600">
			{#if status === 404}
				Ce produit n'existe pas ou n'est plus disponible.
			{:else}
				{message}
			{/if}
		</p>

		<!-- Actions -->
		<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
			{#if shopSlug}
				<Button
					href="/{shopSlug}"
					class="flex items-center gap-2 bg-[#FF6F61] hover:bg-[#e85a4f]"
				>
					<ArrowLeft class="h-4 w-4" />
					Retour à la boutique
				</Button>
			{/if}
		</div>

		<!-- Help message -->
		<div class="mt-8 rounded-lg bg-gray-50 p-4">
			<p class="text-sm text-gray-600">
				💡 <strong>Conseil :</strong> Ce produit a peut-être été retiré. Découvrez
				les autres créations de cette boutique !
			</p>
		</div>
	</div>
</div>
