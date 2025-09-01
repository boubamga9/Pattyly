<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let sectionRef: HTMLElement | null = null;
	let ulRef: HTMLElement | null = null;
	let progressBar: HTMLElement | null = null;

	let slidesCount = 0;
	let currentTranslate = 0;
	let targetTranslate = 0;
	let rafId: number | null = null;
	let isScrolling = false;
	let activeSlide = 0;

	const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));

	function recalcSlides() {
		slidesCount = ulRef ? ulRef.children.length || 1 : 1;
		if (sectionRef) sectionRef.style.height = `${slidesCount * 100}vh`;
		if (ulRef) ulRef.style.width = `${slidesCount * 100}vw`;
	}

	function updateTargetFromScroll() {
		if (!sectionRef) return;
		const rect = sectionRef.getBoundingClientRect();
		const total = sectionRef.clientHeight - window.innerHeight;
		const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
		const maxTranslate = (slidesCount - 1) * 100;
		targetTranslate = progress * maxTranslate;

		// Update progress bar
		if (progressBar) progressBar.style.transform = `scaleX(${progress})`;

		// Détecter la section active pour l'animation de focus
		const newActiveSlide = Math.round(progress * (slidesCount - 1));
		if (newActiveSlide !== activeSlide) {
			activeSlide = newActiveSlide;
			updateActiveSlideFocus();
		}
	}

	function animate() {
		// Easing plus fluide avec facteur adaptatif
		const diff = targetTranslate - currentTranslate;
		const factor = Math.abs(diff) > 1 ? 0.15 : 0.05; // Plus rapide au début, plus doux à la fin

		currentTranslate += diff * factor;

		if (ulRef) {
			ulRef.style.transform = `translate3d(-${currentTranslate}vw, 0, 0)`;
		}

		rafId = requestAnimationFrame(animate);
	}

	function updateActiveSlideFocus() {
		if (!ulRef) return;

		// Retirer la classe active de toutes les sections
		const allSlides = ulRef.querySelectorAll('li');
		allSlides.forEach((slide, index) => {
			if (index === activeSlide) {
				slide.classList.add('slide-active');
			} else {
				slide.classList.remove('slide-active');
			}
		});

		// Masquer la barre de progression après la dernière solution
		if (progressBar && activeSlide === slidesCount - 1) {
			progressBar.style.opacity = '0';
		} else if (progressBar) {
			progressBar.style.opacity = '1';
		}
	}

	function handleScrollEvent() {
		if (!isScrolling) {
			isScrolling = true;
			requestAnimationFrame(() => {
				updateTargetFromScroll();
				isScrolling = false;
			});
		}
	}

	onMount(() => {
		try {
			recalcSlides();
			updateTargetFromScroll();

			// Optimisations CSS pour la performance
			if (ulRef) {
				ulRef.style.willChange = 'transform';
				ulRef.style.backfaceVisibility = 'hidden';
				ulRef.style.perspective = '1000px';
			}

			if (progressBar) {
				progressBar.style.transformOrigin = 'left';
				progressBar.style.willChange = 'transform';
			}
		} catch (error) {}

		// Initialiser la barre de progression
		if (progressBar) {
			progressBar.style.transform = 'scaleX(0)';
		}

		// Initialiser la première section comme active
		setTimeout(() => {
			updateActiveSlideFocus();
		}, 100);

		// Démarrer l'animation
		if (!rafId) animate();

		// Événements optimisés
		window.addEventListener('scroll', handleScrollEvent, { passive: true });
		window.addEventListener('resize', recalcSlides, { passive: true });
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') {
			if (rafId) cancelAnimationFrame(rafId);
			window.removeEventListener('scroll', handleScrollEvent);
			window.removeEventListener('resize', recalcSlides);
		}
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

<section bind:this={sectionRef} class="relative bg-white">
	<div class="absolute left-1/2 top-8 z-10 -translate-x-1/2 text-center">
		<h2 class="mb-4 text-3xl font-normal md:text-4xl">
			Un assistant digital complet, pensé juste pour les pâtissier·ères.
		</h2>
	</div>

	<div class="sticky top-0 h-screen overflow-hidden">
		<ul
			bind:this={ulRef}
			class="flex h-full"
			style="transform: translate3d(0, 0, 0);"
		>
			{#each solutions as solution}
				<li
					class="flex h-screen w-screen flex-shrink-0 flex-col items-center justify-center overflow-hidden {solution.bgColor} px-4 sm:px-8"
				>
					<h3
						class="mb-6 text-2xl font-normal leading-[120%] tracking-tight lg:text-3xl xl:text-4xl"
					>
						{solution.title}
					</h3>
					<p
						class="mb-8 max-w-xs text-center text-lg text-[#333] sm:max-w-lg sm:text-xl lg:max-w-2xl lg:text-2xl"
					>
						{solution.description}
					</p>
					<img
						src={solution.image}
						alt={solution.alt}
						class="h-52 w-auto max-w-full rounded-lg object-contain sm:h-[300px] lg:h-[320px] xl:h-[380px]"
						loading="lazy"
					/>
				</li>
			{/each}

			<!-- Solution 5: Planning et disponibilités -->
			<li
				class="flex h-screen w-screen flex-shrink-0 flex-col items-center justify-center overflow-hidden bg-[#FFE0D6] px-4 sm:px-8"
			>
				<h3
					class="mb-6 text-2xl font-normal leading-[120%] tracking-tight lg:text-3xl xl:text-4xl"
				>
					PLANNING
				</h3>
				<p class="mb-8 max-w-2xl text-center text-xl text-[#333] lg:text-2xl">
					🗓️ Gère ton planning sans te casser la tête
				</p>
				<img
					src="/mockup/5_availability.png"
					alt="Interface de gestion des disponibilités"
					class="h-52 w-auto max-w-full rounded-lg object-contain sm:h-[300px] lg:h-[320px] xl:h-[380px]"
					loading="lazy"
				/>
			</li>

			<!-- Solution 6: FAQ et communication -->
			<li
				class="flex h-screen w-screen flex-shrink-0 flex-col items-center justify-center overflow-hidden bg-[#FFF1D6] px-4 sm:px-8"
			>
				<h3
					class="mb-6 text-2xl font-normal leading-[120%] tracking-tight lg:text-3xl xl:text-4xl"
				>
					FAQ
				</h3>
				<p class="mb-8 max-w-2xl text-center text-xl text-[#333] lg:text-2xl">
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
			</li>
		</ul>
	</div>

	<div
		bind:this={progressBar}
		class="fixed bottom-12 left-4 right-4 h-2 rounded-full bg-[#FF6F61] transition-opacity duration-500"
		style="transform-origin:left; transform:scaleX(0);"
	></div>
</section>

<style>
	/* Animation de focus pour la section active */
	li {
		transition: all 0.3s ease-out;
		transform: scale(0.98);
		border-radius: 10px;
		opacity: 1;
	}

	/* Animation subtile pour le titre et l'image de la section active */
	li.slide-active h2 {
		animation: slideFocus 0.4s ease-out;
	}

	li.slide-active img {
		animation: slideFocus 0.4s ease-out 0.1s both;
	}

	@keyframes slideFocus {
		from {
			transform: translateY(5px);
			opacity: 0.9;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>
