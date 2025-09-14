<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, MessageCircle } from 'lucide-svelte';

	$: status = $page.status;
	$: message = $page.error?.message || 'Une erreur est survenue';
	$: shopSlug = $page.params.slug;
</script>

<svelte:head>
	<title>Demande personnalisée non disponible - Pattyly</title>
	<meta
		name="description"
		content="Les demandes personnalisées ne sont pas disponibles pour cette boutique"
	/>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4 py-12">
	<div class="mx-auto max-w-md text-center">
		<!-- Icône d'erreur -->
		<div class="mb-6 flex justify-center">
			<div class="rounded-full bg-purple-100 p-4">
				<MessageCircle class="h-12 w-12 text-purple-600" />
			</div>
		</div>

		<!-- Titre -->
		<h1 class="mb-4 text-3xl font-bold text-gray-900">
			Demande personnalisée non disponible
		</h1>

		<!-- Message -->
		<p class="mb-8 text-lg text-gray-600">
			{#if status === 404}
				Cette boutique n'accepte pas les demandes personnalisées pour le moment.
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

		<!-- Message d'aide -->
		<div class="mt-8 rounded-lg bg-gray-50 p-4">
			<p class="text-sm text-gray-600">
				💡 <strong>Conseil :</strong> Découvrez les produits disponibles de cette
				boutique ou contactez directement le pâtissier.
			</p>
		</div>
	</div>
</div>
