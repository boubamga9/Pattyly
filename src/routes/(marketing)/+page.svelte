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
	<title>{WebsiteName}</title>
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
