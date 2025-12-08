<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger,
	} from '$lib/components/ui/collapsible';
	import { ArrowLeft, ChevronDown } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components';
	import SocialMediaIcons from '$lib/components/client/social-media-icons.svelte';

	$: ({ shop, faqs, customizations } = $page.data);

	$: customStyles = {
		background: customizations?.background_color || '#fafafa',
		backgroundImage: customizations?.background_image_url
			? `url(${customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${customizations?.button_color || '#ff6f61'}; color: ${customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${customizations?.text_color || '#333333'};`,
		iconStyle: `color: ${customizations?.icon_color || '#6b7280'};`,
		secondaryTextStyle: `color: ${customizations?.secondary_text_color || '#333333'};`,
		separatorColor: 'rgba(0, 0, 0, 0.3)',
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
	<!-- Header with logo and information - Design moderne -->
	<header class="relative px-4 py-6 text-center sm:py-8 md:py-12">
		<!-- Réseaux sociaux - Top right -->
		{#if shop && (shop.instagram || shop.tiktok || shop.website)}
			<SocialMediaIcons {shop} iconStyle={customStyles.iconStyle} />
		{/if}
		<!-- Back button - Top left -->
		<button
			on:click={goBack}
			class="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/80 hover:shadow-sm sm:left-6 sm:top-6"
			style={`color: ${customizations?.secondary_text_color || '#6b7280'}; font-weight: 500; letter-spacing: -0.01em;`}
		>
			<ArrowLeft class="h-4 w-4" />
			<span class="hidden sm:inline">Retour</span>
		</button>

		<!-- Logo - Design moderne sans bordure -->
		<div class="mb-4 flex justify-center">
			{#if shop.logo_url}
				<div
					class="relative h-20 w-20 overflow-hidden rounded-full bg-white p-2.5 shadow-sm transition-transform duration-300 hover:scale-105 sm:h-24 sm:w-24 sm:p-3 md:h-28 md:w-28"
				>
					<img
						src={shop.logo_url}
						alt={shop.name}
						class="h-full w-full object-contain"
					/>
				</div>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE8D6]/30 to-white shadow-sm sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-neutral-700 sm:text-3xl md:text-4xl"
						style="font-weight: 600;"
					>
						{shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<!-- Shop name - Charte typographique -->
		<h1
			class="mb-3 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			{shop.name}
		</h1>

		<!-- Page title - Charte typographique avec couleur custom -->
		<h2
			class="text-lg font-medium leading-[110%] tracking-tight sm:text-xl"
			style={`font-weight: 500; letter-spacing: -0.02em; color: ${customizations?.button_color || '#FF6F61'};`}
		>
			Questions fréquentes
		</h2>
	</header>

	<!-- Separator - Design moderne avec couleur bouton et opacité -->
	<div class="px-4">
		<div
			class="mx-auto mb-6 h-px max-w-7xl bg-gradient-to-r from-transparent to-transparent sm:mb-8"
			style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
		></div>
	</div>

	<!-- Main content - Design style marketing FAQ (compact pour mobile) -->
	<div class="px-4 pb-6 sm:pb-8 md:px-6 lg:px-8">
		<div class="mx-auto max-w-4xl">
			<div class="space-y-3">
				{#if faqs && faqs.length > 0}
					{#each faqs as faq}
						<Collapsible
							class="group rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md sm:rounded-2xl"
							style={`--hover-border-color: ${customizations?.button_color || '#FF6F61'};`}
							onmouseenter={(e) => {
								const el = e.currentTarget;
								el.style.borderColor = customizations?.button_color || '#FF6F61';
							}}
							onmouseleave={(e) => {
								const el = e.currentTarget;
								el.style.borderColor = '';
							}}
						>
							<CollapsibleTrigger
								class="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-neutral-50/50 sm:p-6"
							>
								<h3
									class="flex-1 pr-3 text-sm font-medium leading-relaxed text-neutral-900 sm:pr-4 sm:text-base md:text-lg"
									style="font-weight: 500;"
								>
									{faq.question}
								</h3>
								<ChevronDown
									class="h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform duration-200 group-data-[state=open]:rotate-180 sm:h-5 sm:w-5"
								/>
							</CollapsibleTrigger>
							<CollapsibleContent class="px-4 pb-4 sm:px-6 sm:pb-6">
								<p
									class="text-sm leading-[175%] text-neutral-600 sm:text-base"
									style="font-weight: 300;"
								>
									{faq.answer}
								</p>
							</CollapsibleContent>
						</Collapsible>
					{/each}
				{:else}
					<div class="py-12 text-center sm:py-16">
						<p
							class="text-base leading-[180%] text-neutral-600 sm:text-lg"
							style="font-weight: 300; letter-spacing: -0.01em;"
						>
							Aucune question fréquente n'est disponible pour le moment.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter {customizations} />
</div>