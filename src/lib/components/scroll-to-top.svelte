<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowUp } from 'lucide-svelte';
	import { lenis } from '$lib/utils/smooth-scroll';

	let showButton = false;

	function scrollToTop() {
		if (lenis) {
			// Utiliser Lenis pour un scroll smooth
			lenis.scrollTo(0, {
				duration: 1.2,
				easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
			});
		} else {
			// Fallback si Lenis n'est pas disponible
			window.scrollTo({
				top: 0,
				behavior: 'smooth',
			});
		}
	}

	function handleScroll() {
		showButton = window.scrollY > 1200;
	}

	onMount(() => {
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	});
</script>

{#if showButton}
	<button
		on:click={scrollToTop}
		class="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6F61] shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[#e85a4f] hover:shadow-xl"
		aria-label="Retour en haut de la page"
	>
		<ArrowUp class="h-6 w-6 text-white" />
	</button>
{/if}


