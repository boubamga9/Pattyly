<script lang="ts">
	import { page } from '$app/stores';
	import { Search } from 'lucide-svelte';

	$: status = page.status;
	$: message = page.error?.message || 'Une erreur est survenue';
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
		<!-- Icône d'erreur - Design moderne -->
		<div class="mb-6 flex justify-center">
			<div class="rounded-full bg-red-50 p-4 shadow-sm">
				<Search class="h-12 w-12 text-red-600" />
			</div>
		</div>

		<!-- Titre - Charte typographique -->
		<h1
			class="mb-4 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			Boutique non trouvée
		</h1>

		<!-- Message -->
		<p
			class="mb-8 text-sm leading-[180%] text-neutral-600 sm:text-base"
			style="font-weight: 300; letter-spacing: -0.01em;"
		>
			{#if status === 404}
				Cette boutique n'existe pas ou n'est plus disponible.
			{:else}
				{message}
			{/if}
		</p>
	</div>
</div>