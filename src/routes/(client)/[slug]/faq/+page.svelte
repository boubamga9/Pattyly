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

	$: ({ shop, faqs, customizations } = $page.data);

	$: customStyles = {
		background: customizations?.background_color || '#ffe8d6',
		backgroundImage: customizations?.background_image_url
			? `url(${customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${customizations?.button_color || '#ff6f61'}; color: ${customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${customizations?.text_color || '#333333'};`,
		secondaryTextStyle: `color: ${customizations?.secondary_text_color || '#333333'};`,
	};

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

<div
	class="flex min-h-screen flex-col overflow-x-hidden"
	style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
>
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
		<h1 class="mb-2 text-xl font-semibold" style={customStyles.textStyle}>
			{shop.name}
		</h1>

		<!-- Back button -->
		<button
			on:click={goBack}
			class="text-xs italic underline transition-colors hover:opacity-80 sm:text-sm"
			style={customStyles.secondaryTextStyle}
		>
			← Retour à la boutique
		</button>
	</header>

	<!-- Separator -->
	<div class="px-4">
		<Separator
			class="mb-6 sm:mb-8"
			style={`background-color: ${customizations?.secondary_text_color || '#333333'};`}
		/>
	</div>

	<!-- Main content -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-6xl p-4 sm:p-8 lg:p-12">
			<!-- Layout responsive: 2 columns on desktop, 1 column on mobile -->
			<div class="grid grid-cols-1 gap-6 md:gap-8">
				<!-- Right column: FAQ -->
				<div class="space-y-4">
					{#if faqs && faqs.length > 0}
						{#each faqs as faq}
							<Collapsible>
								<CollapsibleTrigger
									class="flex w-full items-center justify-between py-2 text-left transition-colors hover:bg-neutral-50"
								>
									<h3
										class="flex-1 break-words pr-4 text-lg font-medium lg:text-xl"
										style={customStyles.textStyle}
									>
										{faq.question}
									</h3>
									<ChevronDown
										class="h-5 w-5 flex-shrink-0 transition-transform duration-200"
										style={customStyles.secondaryTextStyle}
									/>
								</CollapsibleTrigger>
								<CollapsibleContent class=" pb-2">
									<p
										class="text-base leading-relaxed lg:text-lg"
										style={customStyles.secondaryTextStyle}
									>
										{faq.answer}
									</p>
								</CollapsibleContent>
							</Collapsible>
						{/each}
					{:else}
						<div class="py-8 text-center">
							<p style={customStyles.secondaryTextStyle}>
								Aucune question fréquente n'est disponible pour le moment.
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter {customizations} />
</div>
