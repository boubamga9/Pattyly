<script lang="ts">
	import { onMount } from 'svelte';
	import { revealElement } from '$lib/utils/animations';

	let section: HTMLElement;
	let title: HTMLElement;
	let content: HTMLElement;

	onMount(async () => {
		if (section) {
			if (title) await revealElement(title, { delay: 0 });
			if (content) await revealElement(content, { delay: 0.1 });
		}
	});
</script>

<!-- CTA Section avec design premium -->
<div
	bind:this={section}
	class="relative flex flex-col items-center justify-center overflow-hidden border-t border-neutral-200 bg-gradient-to-b from-[#FFE8D6]/40 to-white px-6 py-24 text-center sm:px-8 sm:py-32 md:py-40"
>
	<!-- Background subtle -->
	<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/20 to-transparent"></div>
	
	<div bind:this={content} class="relative z-10 max-w-3xl">
		<h2
			bind:this={title}
			class="mb-8 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl xl:text-6xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			Prêt.e à transformer ton activité ?
		</h2>
		<p
			class="mb-12 max-w-2xl mx-auto text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
			style="font-weight: 300; letter-spacing: -0.01em;"
		>
			Démarre maintenant, ça ne prend que 2 minutes
		</p>
		<div class="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
			<a
				href="/register"
				class="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] px-10 py-4 text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2"
				style="width: 280px; height: 56px;"
			>
				Commencer gratuitement
			</a>
		</div>
		<p 
			class="flex items-center justify-center gap-2.5 text-sm text-neutral-500 sm:text-base"
		>
			<span class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></span>
			Sans carte bancaire — tu restes libre à 100%
		</p>
	</div>
</div>
