<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { revealElement, parallaxImage } from '$lib/utils/animations';

	let scrollContainer: HTMLDivElement | null = null;
	let animationFrame: number | null = null;
	let activeSlide = 0;
	let canScrollLeft = false;
	let canScrollRight = true;
	let section: HTMLElement;
	let title: HTMLElement;

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

		// Update scroll indicators
		canScrollLeft = container.scrollLeft > 10;
		canScrollRight = container.scrollLeft < maxScroll - 10;
	}

	function handleScroll() {
		if (animationFrame) cancelAnimationFrame(animationFrame);
		animationFrame = requestAnimationFrame(updateStateFromScroll);
	}

	onMount(async () => {
		updateStateFromScroll();
		scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });

		// Reveal animations
		if (section) {
			if (title) await revealElement(title, { delay: 0 });

			// Parallax on images
			const images = section.querySelectorAll('img');
			for (const img of images) {
				await parallaxImage(img as HTMLElement, { speed: 0.1 });
			}
		}
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
			detailedDescription:
				'Ton tableau de bord centralise toutes tes commandes de gâteaux, tes devis en cours, tes factures, et ton planning. Plus besoin de jongler entre plusieurs outils : tout est là, en un coup d\'œil.',
			image: 'https://res.cloudinary.com/dnyffye6y/image/upload/v1763992845/marketing/mockup/1_dashboard.png',
			alt: 'Dashboard principal de gestion pour pâtissiers - Logiciel de gestion cake designers',
			bgColor: 'bg-[#FFE8D6]',
		},
		{
			title: 'CATALOGUE',
			description: '🎂 Crée ton catalogue en ligne avec toutes tes options',
			detailedDescription:
				'Transforme tes créations en <a href="/boutique-en-ligne-patissier" class="font-semibold text-[#FF6F61] hover:underline">boutique en ligne professionnelle</a>. Ajoute tes gâteaux personnalisés avec photos, descriptions, et options de personnalisation. Tes clients peuvent voir tes créations et commander directement via un <a href="/formulaire-commande-gateau" class="font-semibold text-[#FF6F61] hover:underline">formulaire de commande en ligne</a>, même quand tu es occupée.',
			image: 'https://res.cloudinary.com/dnyffye6y/image/upload/v1763992850/marketing/mockup/2_cakes.png',
			alt: 'Catalogue de gâteaux en ligne - Boutique en ligne pour pâtissiers',
			bgColor: 'bg-[#FFF1D6]',
		},
		{
			title: 'COMMANDES',
			description: '🛒 Gère tes commandes en ligne facilement',
			detailedDescription:
				'Reçois et organise toutes tes commandes de gâteaux depuis un seul endroit. <span class="font-medium text-neutral-900">Comment gérer les commandes de gâteaux</span> efficacement ? Avec Pattyly, tu suis l\'état de chaque commande, communiques avec tes clients, et valides les paiements en quelques clics. Fini les messages perdus dans tes DM Instagram.',
			image: 'https://res.cloudinary.com/dnyffye6y/image/upload/v1763992852/marketing/mockup/3_orders.png',
			alt: 'Interface de gestion des commandes en ligne - Logiciel gestion commandes pâtisserie',
			bgColor: 'bg-[#FFE0D6]',
		},
		{
			title: 'DEVIS',
			description:
				'📑 Envoie un devis en deux clics pour les demandes spéciales',
			detailedDescription:
				'Notre <a href="/devis-factures-cake-designer" class="font-semibold text-[#FF6F61] hover:underline">logiciel de devis pour cake designers</a> génère automatiquement des devis professionnels pour tes gâteaux personnalisés. <span class="font-medium text-neutral-900">Comment faire un devis de gâteau</span> rapidement ? Personnalise les prix selon les options choisies, envoie le devis par email, et transforme-le en commande quand le client valide.',
			image: 'https://res.cloudinary.com/dnyffye6y/image/upload/v1763992854/marketing/mockup/4_quoting.png',
			alt: 'Interface de devis pour cake designers - Logiciel devis pâtisserie',
			bgColor: 'bg-[#FFD8D6]',
		},
	];
</script>

<section bind:this={section} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
	<!-- Background subtle -->
	<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
	
	<div class="relative mx-auto mb-20 max-w-5xl px-6 text-center sm:px-8 lg:px-12">
		<h2
			bind:this={title}
			class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl xl:text-6xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			Comment Pattyly simplifie ton quotidien ?
		</h2>
		<p
			class="mx-auto max-w-2xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
			style="font-weight: 300; letter-spacing: -0.01em;"
		>
			Découvre toutes les fonctionnalités qui te font gagner du temps.
		</p>
		<!-- Séparateur élégant -->
		<div class="mt-8 flex items-center justify-center gap-4">
			<div class="h-px w-16 bg-neutral-300"></div>
			<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
			<div class="h-px w-16 bg-neutral-300"></div>
		</div>
	</div>

	<div class="relative">
		<div
			bind:this={scrollContainer}
			class="hide-scrollbar flex snap-x snap-mandatory gap-8 overflow-x-auto px-4 pb-8 pt-6"
			aria-label="Solutions Pattyly"
		>
			{#each solutions as solution, index}
				<article
					class="group flex w-[90%] max-w-5xl flex-shrink-0 snap-center flex-col rounded-3xl border border-neutral-200 bg-white px-10 py-14 shadow-sm transition-all duration-500 hover:border-neutral-300 hover:shadow-lg sm:w-[85%] sm:px-12 sm:py-16 md:w-[70%] lg:w-[60%] xl:w-[50%]"
					aria-current={activeSlide === index ? 'true' : 'false'}
				>
					<!-- Title Section avec design premium -->
					<div class="mb-10">
						<h3
							class="mb-3 text-2xl font-semibold uppercase leading-[110%] tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl"
							style="font-weight: 600; letter-spacing: 0.05em;"
						>
							{solution.title}
						</h3>
						<div class="h-0.5 w-20 rounded-full bg-[#FF6F61]"></div>
					</div>

					<!-- Visual Section -->
					<div class="mb-8 flex flex-1 items-center justify-center rounded-xl bg-[#FFE8D6] p-6">
						<img
							src={solution.image}
							alt={solution.alt}
							class="h-auto max-h-[280px] w-full max-w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02] sm:max-h-[320px] lg:max-h-[360px]"
							loading="lazy"
						/>
					</div>

					<!-- Description Section avec typographie soignée -->
					<div class="space-y-5">
						<p
							class="text-xl font-medium leading-[160%] text-neutral-900 sm:text-2xl"
							style="font-weight: 500; letter-spacing: -0.01em;"
						>
							{solution.description}
						</p>
						<p
							class="text-base leading-[175%] text-neutral-600 sm:text-lg"
							style="font-weight: 300; letter-spacing: -0.01em;"
						>
							{@html solution.detailedDescription}
						</p>
					</div>
				</article>
			{/each}

			<article
				class="group flex w-[90%] max-w-5xl flex-shrink-0 snap-center flex-col rounded-2xl border border-neutral-200 bg-white px-8 py-12 shadow-sm transition-all duration-300 hover:shadow-md sm:w-[85%] md:w-[70%] lg:w-[60%] xl:w-[50%]"
				aria-current={activeSlide === solutions.length ? 'true' : 'false'}
			>
				<!-- Title Section -->
				<div class="mb-8">
					<h3
						class="mb-2 text-2xl font-bold uppercase leading-[120%] tracking-tight text-neutral-900 lg:text-3xl"
					>
						PLANNING
					</h3>
					<div class="h-1 w-16 rounded-full bg-[#FF6F61]"></div>
				</div>

				<!-- Visual Section -->
				<div class="mb-8 flex flex-1 items-center justify-center rounded-xl bg-[#FFE8D6] p-6">
					<img
						src="https://res.cloudinary.com/dnyffye6y/image/upload/v1763992856/marketing/mockup/5_availability.png"
						alt="Interface de gestion des disponibilités"
						class="h-auto max-h-[280px] w-full max-w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02] sm:max-h-[320px] lg:max-h-[360px]"
						loading="lazy"
					/>
				</div>

				<!-- Description Section -->
				<div class="space-y-4">
					<p
						class="text-lg font-semibold leading-relaxed text-neutral-900 lg:text-xl"
					>
						🗓️ Gère ton planning sans te casser la tête
					</p>
					<p
						class="text-base leading-relaxed text-neutral-600 lg:text-lg"
					>
						Définis tes créneaux disponibles, tes jours de fermeture, et tes délais de
						préparation par gâteau. Tes clients voient en temps réel ce qui est possible et
						réserver directement un créneau. Plus de double réservation ou de surcharge. <span class="font-medium text-neutral-900">Comment organiser les commandes de cake design</span> sans stress ? Avec un planning automatique qui se met à jour en temps réel.
					</p>
				</div>
			</article>

			<article
				class="group flex w-[90%] max-w-5xl flex-shrink-0 snap-center flex-col rounded-2xl border border-neutral-200 bg-white px-8 py-12 shadow-sm transition-all duration-300 hover:shadow-md sm:w-[85%] md:w-[70%] lg:w-[60%] xl:w-[50%]"
				aria-current={activeSlide === solutions.length + 1 ? 'true' : 'false'}
			>
				<!-- Title Section -->
				<div class="mb-8">
					<h3
						class="mb-2 text-2xl font-bold uppercase leading-[120%] tracking-tight text-neutral-900 lg:text-3xl"
					>
						FAQ
					</h3>
					<div class="h-1 w-16 rounded-full bg-[#FF6F61]"></div>
				</div>

				<!-- Visual Section -->
				<div class="mb-8 flex flex-1 items-center justify-center rounded-xl bg-[#FFE8D6] p-6">
					<img
						src="https://res.cloudinary.com/dnyffye6y/image/upload/v1763992857/marketing/mockup/6_faq.png"
						alt="Interface de FAQ et communication"
						class="h-auto max-h-[280px] w-full max-w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02] sm:max-h-[320px] lg:max-h-[360px]"
						loading="lazy"
					/>
				</div>

				<!-- Description Section -->
				<div class="space-y-4">
					<p
						class="text-lg font-semibold leading-relaxed text-neutral-900 lg:text-xl"
					>
						❓ Mets une FAQ en vitrine pour arrêter de répéter 50 fois la même chose
					</p>
					<p
						class="text-base leading-relaxed text-neutral-600 lg:text-lg"
					>
						Réponds aux questions fréquentes de tes clients directement sur ta boutique en ligne. Plus besoin de répéter les mêmes informations : tout est disponible 24/7 pour tes clients.
					</p>
				</div>
			</article>
		</div>

		<!-- Left gradient with arrow -->
		<div
			class="pointer-events-none absolute inset-y-0 left-0 hidden w-20 bg-gradient-to-r from-white via-white/80 to-transparent sm:flex sm:items-center sm:justify-start sm:pl-4"
			aria-hidden="true"
		>
			{#if canScrollLeft}
				<ChevronLeft
					class="h-8 w-8 text-neutral-400 animate-pulse"
				/>
			{/if}
		</div>
		<!-- Right gradient with arrow -->
		<div
			class="pointer-events-none absolute inset-y-0 right-0 hidden w-20 bg-gradient-to-l from-white via-white/80 to-transparent sm:flex sm:items-center sm:justify-end sm:pr-4"
			aria-hidden="true"
		>
			{#if canScrollRight}
				<ChevronRight
					class="h-8 w-8 text-neutral-400 animate-pulse"
				/>
			{/if}
		</div>
	</div>

	<!-- CTA après la section Solutions avec design premium -->
	<div class="relative mx-auto mt-20 max-w-2xl px-6 text-center sm:px-8">
		<p 
			class="mb-8 text-lg leading-[160%] text-neutral-700 sm:text-xl md:text-2xl"
			style="font-weight: 300; letter-spacing: -0.01em;"
		>
			Démarre maintenant, ça ne prend que 2 minutes
		</p>
		<a
			href="/register"
			class="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] px-10 py-4 text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2"
		>
			Commencer gratuitement
		</a>
	</div>
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
