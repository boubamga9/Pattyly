<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Home, Search } from 'lucide-svelte';

	$: status = $page.status;
	$: message = $page.error?.message || 'Une erreur est survenue';
</script>

<svelte:head>
	<title>Boutique non trouvée - Pattyly</title>
	<meta
		name="description"
		content="Cette boutique n'existe pas ou n'est plus disponible"
	/>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4 py-12">
	<div class="mx-auto max-w-md text-center">
		<!-- Icône d'erreur -->
		<div class="mb-6 flex justify-center">
			<div class="rounded-full bg-red-100 p-4">
				<Search class="h-12 w-12 text-red-600" />
			</div>
		</div>

		<!-- Titre -->
		<h1 class="mb-4 text-3xl font-bold text-gray-900">Boutique non trouvée</h1>

		<!-- Message -->
		<p class="mb-8 text-lg text-gray-600">
			{#if status === 404}
				Cette boutique n'existe pas ou n'est plus disponible.
			{:else}
				{message}
			{/if}
		</p>
	</div>
</div>
