<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { navigating } from '$app/stores';

	import { onMount } from 'svelte';
	import { expoOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import ScrollToTop from '$lib/components/scroll-to-top.svelte';
	import PWAUpdatePrompt from '$lib/components/pwa-update-prompt.svelte';
	import '../app.css';

	export let data;

	let { supabase } = data;
	$: ({ supabase } = data);
	
	// Vérifier si on est sur test.pattyly.com (déterminé côté serveur + vérification côté client)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	$: isTestDomain = (data as any).isTestDomain ?? false;
	
	// Vérification supplémentaire côté client au cas où
	$: clientIsTestDomain = typeof window !== 'undefined' && (
		window.location.hostname === 'test.pattyly.com' || 
		window.location.hostname.endsWith('.test.pattyly.com') ||
		window.location.hostname.includes('test.pattyly.com')
	);
	
	$: finalIsTestDomain = isTestDomain || clientIsTestDomain;

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange(
			async (event, _session) => {
				// Invalider pour forcer une nouvelle vérification côté serveur
				if (
					event === 'SIGNED_IN' ||
					event === 'SIGNED_OUT' ||
					event === 'TOKEN_REFRESHED'
				) {
					invalidate('supabase:auth');
				}
			},
		);

		return () => data.subscription.unsubscribe();
	});
</script>

<svelte:head>
	{#if finalIsTestDomain}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

{#if $navigating}
	<!-- 
	Loading animation for next page since svelte doesn't show any indicator. 
	- delay 100ms because most page loads are instant, and we don't want to flash 
	- long 12s duration because we don't actually know how long it will take
	- exponential easing so fast loads (>100ms and <1s) still see enough progress,
	while slow networks see it moving for a full 12 seconds
-->
	<div
		class="fixed left-0 right-0 top-0 z-50 h-1 w-full bg-primary"
		in:slide={{ delay: 100, duration: 12000, axis: 'x', easing: expoOut }}
	>	</div>
{/if}
<slot />
<ScrollToTop />
<PWAUpdatePrompt />
