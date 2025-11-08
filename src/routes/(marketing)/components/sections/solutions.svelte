<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let scrollContainer: HTMLDivElement | null = null;
	let animationFrame: number | null = null;
	let activeSlide = 0;

	const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

	function updateStateFromScroll() {
		if (!scrollContainer) return;

	const container = scrollContainer;
	const maxScroll = container.scrollWidth - container.clientWidth;
	const ratio = maxScroll > 0 ? container.scrollLeft / maxScroll : 0;
	const slideWidth = container.clientWidth;
	const newActiveSlide = Math.round(container.scrollLeft / slideWidth);

	const _progress = clamp(ratio, 0, 1);
	activeSlide = Math.min(Math.max(newActiveSlide, 0), solutions.length + 1);
	}

	function handleScroll() {
		if (animationFrame) cancelAnimationFrame(animationFrame);
		animationFrame = requestAnimationFrame(updateStateFromScroll);
	}

	onMount(() => {
		updateStateFromScroll();
		scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });
	});

	onDestroy(() => {
		if (animationFrame) cancelAnimationFrame(animationFrame);
		scrollContainer?.removeEventListener('scroll', handleScroll);
	});

	// Solutions data - facile à modifier et ajouter
	const solutions = [
		{
			title: 'DASHBOARD',
			description: '📊 Gère ton activité depuis un seul endroit',
			image: '/mockup/1_dashboard.png',
			alt: 'Dashboard principal de la plateforme',
			bgColor: 'bg-[#FFE8D6]',
		},
		{
			title: 'CATALOGUE',
			description: '🎂 Crée ton catalogue en ligne avec toutes tes options',
			image: '/mockup/2_cakes.png',
			alt: 'Catalogue de gâteaux en ligne',
			bgColor: 'bg-[#FFF1D6]',
		},
		{
			title: 'COMMANDES',
			description: '🛒 Gère tes commandes en ligne facilement',
			image: '/mockup/3_orders.png',
			alt: 'Interface de gestion des commandes',
			bgColor: 'bg-[#FFE0D6]',
		},
		{
			title: 'DEVIS',
			description:
				'📑 Envoie un devis en deux clics pour les demandes spéciales',
			image: '/mockup/4_quoting.png',
			alt: 'Interface de devis et devis',
			bgColor: 'bg-[#FFD8D6]',
		},
	];
</script>

<section class="relative bg-white py-16">
	<div class="mx-auto mb-8 max-w-4xl px-4 text-center md:mb-12">
		<h2 class="text-3xl font-normal md:text-4xl">
			Un assistant digital complet, pensé juste pour les pâtissier·ères.
		</h2>
		<p class="mt-4 text-base text-muted-foreground md:text-lg">
			Fais défiler horizontalement (ou swipe sur mobile) pour découvrir les différentes
			fonctionnalités.
		</p>
	</div>

	<div class="relative">
		<div
			bind:this={scrollContainer}
			class="hide-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-8 pt-6"
			aria-label="Solutions Pattyly"
		>
			{#each solutions as solution, index}
				<article
					class="flex w-[90%] max-w-4xl flex-shrink-0 snap-center flex-col items-center justify-center rounded-3xl px-6 py-10 text-center text-[#333] shadow-md sm:w-[80%] md:w-[65%] lg:w-[55%] xl:w-[45%] {solution.bgColor}"
					aria-current={activeSlide === index ? 'true' : 'false'}
				>
					<h3
						class="mb-4 text-2xl font-normal leading-[120%] tracking-tight lg:text-3xl xl:text-4xl"
					>
						{solution.title}
					</h3>
					<p
						class="mb-8 max-w-2xl text-lg text-[#333] sm:text-xl lg:text-2xl"
					>
						{solution.description}
					</p>
					<img
						src={solution.image}
						alt={solution.alt}
						class="h-52 w-auto max-w-full rounded-lg object-contain sm:h-[300px] lg:h-[320px] xl:h-[380px]"
						loading="lazy"
					/>
				</article>
			{/each}

			<article
				class="flex w-[90%] max-w-4xl flex-shrink-0 snap-center flex-col items-center justify-center rounded-3xl bg-[#FFE0D6] px-6 py-10 text-center text-[#333] shadow-md sm:w-[80%] md:w-[65%] lg:w-[55%] xl:w-[45%]"
				aria-current={activeSlide === solutions.length ? 'true' : 'false'}
			>
				<h3
					class="mb-4 text-2xl font-normal leading-[120%] tracking-tight lg:text-3xl xl:text-4xl"
				>
					PLANNING
				</h3>
				<p class="mb-8 max-w-2xl text-xl text-[#333] lg:text-2xl">
					🗓️ Gère ton planning sans te casser la tête
				</p>
				<img
					src="/mockup/5_availability.png"
					alt="Interface de gestion des disponibilités"
					class="h-52 w-auto max-w-full rounded-lg object-contain sm:h-[300px] lg:h-[320px] xl:h-[380px]"
					loading="lazy"
				/>
			</article>

			<article
				class="flex w-[90%] max-w-4xl flex-shrink-0 snap-center flex-col items-center justify-center rounded-3xl bg-[#FFF1D6] px-6 py-10 text-center text-[#333] shadow-md sm:w-[80%] md:w-[65%] lg:w-[55%] xl:w-[45%]"
				aria-current={activeSlide === solutions.length + 1 ? 'true' : 'false'}
			>
				<h3
					class="mb-4 text-2xl font-normal leading-[120%] tracking-tight lg:text-3xl xl:text-4xl"
				>
					FAQ
				</h3>
				<p class="mb-8 max-w-2xl text-xl text-[#333] lg:text-2xl">
					❓ Mets une FAQ en vitrine pour arrêter de répéter 50 fois la même
					chose
				</p>
				<img
					src="/mockup/6_faq.png"
					alt="Interface de FAQ et communication"
					class="h-52 w-auto max-w-full rounded-lg object-contain sm:h-[300px] lg:h-[320px] xl:h-[380px]"
					loading="lazy"
				/>

				<!-- CTA après la solution FAQ -->
				<div class="mt-8 text-center">
					<p class="mb-6 text-lg font-medium text-[#333] sm:text-xl">
						👉 Teste maintenant, ça ne prend que 2 minutes !
					</p>
					<a
						href="/register"
						class="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] px-8 py-4 text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[#e85a4f] focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2"
					>
						Commencer mon essai gratuit
					</a>
				</div>
			</article>
		</div>

		<div
			class="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-white to-transparent sm:block"
			aria-hidden="true"
		></div>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-white to-transparent sm:block"
			aria-hidden="true"
		></div>
	</div>

	<!-- Indicateur visuel retiré pour garder l'interface ultra légère -->
</section>

<style>
	.hide-scrollbar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
