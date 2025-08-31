<script lang="ts">
	import { WebsiteName } from './../../config';
	import HeroSection from './components/sections/hero.svelte';
	import PainPoints from './components/sections/pain-points.svelte';
	import Solutions from './components/sections/solutions.svelte';
	import Benefits from './components/sections/benefits.svelte';
	import LastCta from './components/sections/last-cta.svelte';
	import Faq from './components/sections/faq.svelte';

	export let data;
</script>

<svelte:head>
	<title>{WebsiteName} - Plateforme de gestion pour pâtissiers</title>
	<meta
		name="description"
		content="Gérez vos commandes, paiements, devis et planning de pâtisserie en un seul endroit. Essai gratuit sans carte bancaire."
	/>
	<meta
		name="keywords"
		content="pâtisserie, gestion, commandes, planning, devis, paiements"
	/>
	<meta
		property="og:title"
		content="{WebsiteName} - Plateforme de gestion pour pâtissiers"
	/>
	<meta
		property="og:description"
		content="Gérez vos commandes, paiements, devis et planning de pâtisserie en un seul endroit."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com" />
	<meta property="og:image" content="/images/logo_text.svg" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="flex flex-col">
	<!-- Hero section takes full viewport height -->
	<HeroSection />
	<PainPoints />
	<Solutions />
	<Benefits />
	<LastCta />
	<Faq />
</div>
