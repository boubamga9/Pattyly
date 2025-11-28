<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Package } from 'lucide-svelte';

	$: status = $page.status;
	$: message = $page.error?.message || 'Une erreur est survenue';
	$: shopSlug = $page.params.slug;
</script>

<svelte:head>
	<title>Commande non trouvée - Pattyly</title>
	<meta
		name="description"
		content="Cette commande n'existe pas ou n'est plus accessible"
	/>
</svelte:head>

<div class="flex min-h-screen flex-col items-center justify-center px-4 py-12">
	<div class="mx-auto max-w-md text-center">
		<!-- Error icon - Design moderne -->
		<div class="mb-6 flex justify-center">
			<div class="rounded-full bg-blue-50 p-4 shadow-sm">
				<Package class="h-12 w-12 text-blue-600" />
			</div>
		</div>

		<!-- Title - Charte typographique -->
		<h1
			class="mb-4 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			Commande non trouvée
		</h1>

		<!-- Message -->
		<p
			class="mb-8 text-sm leading-[180%] text-neutral-600 sm:text-base"
			style="font-weight: 300; letter-spacing: -0.01em;"
		>
			{#if status === 404}
				Cette commande n'existe pas ou n'est plus accessible.
			{:else}
				{message}
			{/if}
		</p>

		<!-- Actions -->
		<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
			{#if shopSlug}
				<Button
					href="/{shopSlug}"
					class="flex h-11 items-center gap-2 rounded-xl text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md"
					style="background-color: #FF6F61; font-weight: 500;"
				>
					<ArrowLeft class="h-4 w-4" />
					Retour à la boutique
				</Button>
			{/if}
		</div>

		<!-- Help message -->
		<div class="mt-8 rounded-xl border bg-white p-4 shadow-sm">
			<p
				class="text-sm text-neutral-600"
				style="font-weight: 400;"
			>
				💡 <strong>Conseil :</strong> Vérifiez votre email pour retrouver le lien
				de suivi de commande.
			</p>
		</div>
	</div>
</div>