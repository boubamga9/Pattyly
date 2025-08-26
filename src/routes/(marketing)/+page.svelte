<script lang="ts">
	import { WebsiteName } from './../../config';
	import HeroSection from './components/sections/hero.svelte';
	import PainPoints from './components/sections/pain-points.svelte';

	export let data;

	const { prices } = data;
</script>

<svelte:head>
	<title>{WebsiteName}</title>
</svelte:head>

<div class="flex flex-col">
	<!-- Hero section takes full viewport height -->
	<HeroSection />
	<PainPoints />
</div>
