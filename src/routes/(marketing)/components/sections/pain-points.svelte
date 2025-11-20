<script lang="ts">
	import { onMount } from 'svelte';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	let section: HTMLElement;
	let title: HTMLElement;
	let cardsContainer: HTMLElement;

	// Pain points data - facile à modifier et ajouter
	const painPoints = [
		{
			bgColor: '#FFF1D6',
			rotation: '-5deg',
			text: '⏳ Tu réponds au client quelques heures après son message<br /><br />→ et hop, il part ailleurs 😢',
		},
		{
			bgColor: '#FFD6D6',
			rotation: '5deg',
			text: '❌ Répéter mille fois<br />les mêmes infos<br /><br />→ ça use la patience',
		},
		{
			bgColor: '#D6E8FF',
			rotation: '-5deg',
			text: '📅 Jongler entre<br />commandes, planning et imprévus<br /><br />→ casse-tête assuré',
		},
		{
			bgColor: '#D9FFD6',
			rotation: '5deg',
			text: '🛒 courses, colis, matériel<br /><br />→ ça prend une énergie folle',
		},
	];

	onMount(async () => {
		if (section) {
			if (title) await revealElement(title, { delay: 0 });
			if (cardsContainer) await revealStagger(cardsContainer, 'figure', { delay: 0.1, stagger: 0.1 });
		}
	});
</script>

<section bind:this={section} class="w-full bg-white">
	<div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
		<!-- Left side - Sticky title avec design premium -->
		<div
			class="sticky top-0 flex h-screen items-center justify-center p-4 text-center lg:justify-start lg:p-8 lg:pl-16 lg:text-left"
		>
			<h2
				bind:this={title}
				class="z-10 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl xl:text-6xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				Soyons honnêtes :<br />
				Tu passes plus de temps à gérer <br />qu'à
				<span class="text-[#FF6F61]">pâtisser</span>, non ?
			</h2>
		</div>

		<!-- Right side - Scrolling cards avec design moderne -->
		<div bind:this={cardsContainer} class="grid gap-4 p-2 sm:gap-6 sm:p-4 lg:gap-8 lg:p-6 lg:pl-2">
			{#each painPoints as painPoint}
				<!-- Card avec design premium -->
				<figure class="z-20 grid h-screen place-content-center">
					<div
						class="group relative flex h-[320px] w-[340px] items-center justify-center rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-lg sm:h-[360px] sm:w-[380px] sm:p-10 lg:h-[400px] lg:w-[440px] lg:p-12"
					>
						<!-- Background color subtle -->
						<div 
							class="absolute inset-0 rounded-3xl opacity-5 transition-opacity duration-500 group-hover:opacity-10"
							style="background-color: {painPoint.bgColor};"
						></div>
						<p
							class="relative z-10 text-lg leading-[140%] text-neutral-800 sm:text-xl lg:text-2xl"
							style="font-weight: 300; letter-spacing: -0.01em;"
						>
							{@html painPoint.text}
						</p>
					</div>
				</figure>
			{/each}
			<!-- Reassuring message avec design élégant -->
			<figure class="z-20 grid h-[70vh] place-content-center">
				<div class="flex flex-col items-center justify-center gap-4 text-center">
					<div class="h-px w-24 bg-neutral-300"></div>
					<p
						class="text-2xl leading-[140%] text-neutral-700 sm:text-3xl lg:text-4xl"
						style="font-weight: 300; letter-spacing: -0.02em;"
					>
						T'inquiète pas, il y a une solution.. 😊
					</p>
					<div class="h-px w-24 bg-neutral-300"></div>
				</div>
			</figure>
		</div>
	</div>
</section>
