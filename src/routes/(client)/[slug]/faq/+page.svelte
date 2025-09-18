<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger,
	} from '$lib/components/ui/collapsible';
	import { ChevronDown } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components';

	$: ({ shop, faqs } = $page.data);

	function goBack() {
		goto(`/${shop.slug}`);
	}
</script>

<svelte:head>
	<title>FAQ - {shop.name}</title>
	<meta
		name="description"
		content="Questions fréquentes de {shop.name}. Trouvez rapidement les réponses à vos questions sur nos services et produits."
	/>
	<meta
		name="keywords"
		content="FAQ, questions fréquentes, {shop.name}, pâtisserie, services, informations"
	/>
	<meta property="og:title" content="FAQ - {shop.name}" />
	<meta
		property="og:description"
		content="Questions fréquentes de {shop.name}"
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content={$page.url.href} />
</svelte:head>

<div class="flex min-h-screen flex-col overflow-x-hidden bg-background">
	<!-- Header with logo and information -->
	<header class="px-4 py-6 text-center sm:py-8 md:py-12">
		<!-- Logo -->
		<div class="mb-4 flex justify-center">
			{#if shop.logo_url}
				<img
					src={shop.logo_url}
					alt={shop.name}
					class="h-20 w-20 rounded-full border border-gray-300 object-cover sm:h-24 sm:w-24 md:h-28 md:w-28"
				/>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-muted sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-muted-foreground sm:text-3xl md:text-4xl"
					>
						{shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<!-- Shop name -->
		<h1 class="mb-2 text-xl font-semibold text-foreground">
			{shop.name}
		</h1>

		<!-- Back button -->
		<button
			on:click={goBack}
			class="text-xs italic text-gray-400 underline transition-colors hover:text-gray-600 sm:text-sm"
		>
			← Retour à la boutique
		</button>
	</header>

	<!-- Separator -->
	<div class="px-4">
		<Separator class="mb-6 sm:mb-8" />
	</div>

	<!-- Main content -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Layout responsive: 2 columns on desktop, 1 column on mobile -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
				<!-- Left column: Description -->
				<div class="space-y-4 pr-4">
					<h2 class="text-2xl font-semibold text-foreground">
						Questions Fréquentes
					</h2>
					<div class="space-y-3 text-muted-foreground">
						<p>
							Vous avez des questions sur nos services, nos produits ou nos
							conditions ? Nous avons rassemblé ici les questions les plus
							fréquemment posées par nos clients.
						</p>
						<p>
							Si vous ne trouvez pas la réponse à votre question, n'hésitez pas
							à nous contacter directement. Nous serons ravis de vous aider !
						</p>
					</div>
				</div>

				<!-- Right column: FAQ -->
				<div class="space-y-4">
					{#if faqs && faqs.length > 0}
						{#each faqs as faq}
							<Collapsible>
								<CollapsibleTrigger
									class="flex w-full items-center justify-between py-2 text-left transition-colors hover:bg-neutral-50"
								>
									<h3
										class="flex-1 break-words pr-4 text-lg font-medium text-neutral-800 lg:text-xl"
									>
										{faq.question}
									</h3>
									<ChevronDown
										class="h-5 w-5 flex-shrink-0 text-neutral-500 transition-transform duration-200"
									/>
								</CollapsibleTrigger>
								<CollapsibleContent class=" pb-2">
									<p
										class="text-base leading-relaxed text-neutral-600 lg:text-lg"
									>
										{faq.answer}
									</p>
								</CollapsibleContent>
							</Collapsible>
						{/each}
					{:else}
						<div class="py-8 text-center">
							<p class="text-muted-foreground">
								Aucune question fréquente n'est disponible pour le moment.
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter />
</div>
