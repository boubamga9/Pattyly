<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
	import { revealElement, parallaxImage } from '$lib/utils/animations';

	let headline: HTMLElement;
	let subheadline: HTMLElement;
	let ctaContainer: HTMLElement;
	let carousel: HTMLElement;

	onMount(async () => {
		// Reveal animations - plus rapides pour le hero
		if (headline) await revealElement(headline, { delay: 0, duration: 0.5 });
		if (subheadline) await revealElement(subheadline, { delay: 0.1, duration: 0.5 });
		if (ctaContainer) await revealElement(ctaContainer, { delay: 0.2, duration: 0.5 });

		// Parallax on carousel images
		if (carousel) {
			const images = carousel.querySelectorAll('img');
			for (const img of images) {
				await parallaxImage(img as HTMLElement, { speed: 0.15 });
			}
		}
	});
</script>

<div
	class="relative flex min-h-[90vh] w-full flex-col justify-between overflow-hidden bg-white md:min-h-screen"
>
	<!-- Background subtle gradient -->
	<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
	
	<!-- Top section -->
	<div
		class="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-32 text-center sm:px-8 sm:pt-36 md:pt-40"
	>
		<h1 class="sr-only">
			Logiciel de gestion pour cake designers et pâtissiers indépendants
		</h1>
		
		<!-- Bouton "Envie d'un gâteau" -->
		<div class="mb-8">
			<Button
				href="/tous-les-gateaux"
				variant="outline"
				class="group rounded-full border-2 border-[#FF6F61] bg-white px-6 py-2.5 text-sm font-medium text-[#FF6F61] transition-all duration-300 hover:bg-[#FF6F61] hover:text-white hover:scale-105"
			>
				Envie d'un gâteau ? Par ici
				<ArrowRight class="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
			</Button>
		</div>
		
		<!-- Main headline avec typographie premium -->
		<h2 
			bind:this={headline}
			class="mb-8 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			Et si tu passais <br class="hidden sm:block" />
			<span class="text-[#FF6F61]">moins de temps</span> dans tes DM<br
				class="hidden sm:block"
			/>
			et <span class="text-[#FF6F61]">plus de temps</span> derrière ton four ?
		</h2>

		<!-- Subheadline avec typographie soignée -->
		<p 
			bind:this={subheadline}
			class="mb-12 max-w-3xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
			style="font-weight: 300; letter-spacing: -0.01em;"
		>
			Commandes, paiements, devis, planning…<br />
			<span class="font-medium text-neutral-800">Tout centralisé</span> pour que tu gagnes du temps, sans prise de tête. Le <span class="font-medium text-neutral-800">meilleur logiciel de gestion pâtisserie</span> pour les cake designers indépendants.
		</p>

		<!-- CTA Buttons avec design premium -->
		<div bind:this={ctaContainer} class="mb-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
			<Button
				href="/register"
				class="h-14 w-[280px] rounded-xl bg-[#FF6F61] text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2"
			>
				Commencer gratuitement
			</Button>
			<a
				href="/pricing"
				class="h-14 w-[280px] flex items-center justify-center rounded-xl border border-neutral-300 bg-transparent text-base font-medium text-neutral-700 transition-all duration-300 hover:border-neutral-400 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2"
			>
				Voir les tarifs
			</a>
		</div>

		<!-- Trust indicators avec design minimaliste -->
		<div class="flex flex-col items-center gap-6 text-sm text-neutral-500 sm:flex-row sm:gap-8 md:text-base">
			<p class="flex items-center gap-2.5">
				<span class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></span>
				Sans carte bancaire — tu restes libre à 100%
			</p>
			<p class="flex items-center gap-2.5">
				<span class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></span>
				Configuration en 5 minutes
			</p>
			<p class="flex items-center gap-2.5">
				<span class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></span>
				Support réactif sous 24h
			</p>
		</div>
	</div>

	<!-- Carousel -->
	<div
		bind:this={carousel}
		class="w-full pb-8 pt-12 md:pb-16 md:pt-16"
		role="region"
		aria-label="Galerie de pâtisseries"
	>
		<div class="w-full overflow-hidden">
			<div class="carousel-track" aria-live="polite">
				{#each Array(3) as _}
					<!-- Répétition automatique -->
					<div class="carousel-item">
						<img
							src="https://res.cloudinary.com/dnyffye6y/image/upload/v1763992841/marketing/carousel/image_1.jpg"
							alt="Gâteau d'anniversaire personnalisé avec décorations colorées"
							loading="lazy"
							class="h-[140px] w-[210px] rounded-xl object-cover shadow-lg sm:h-[180px] sm:w-[270px] md:h-[210px] md:w-[315px]"
						/>
					</div>
					<div class="carousel-item">
						<img
							src="https://res.cloudinary.com/dnyffye6y/image/upload/v1763992843/marketing/carousel/image_2.jpg"
							alt="Macarons artisanaux aux saveurs variées"
							loading="lazy"
							class="h-[140px] w-[210px] rounded-xl object-cover shadow-lg sm:h-[180px] sm:w-[270px] md:h-[210px] md:w-[315px]"
						/>
					</div>
					<div class="carousel-item">
						<img
							src="https://res.cloudinary.com/dnyffye6y/image/upload/v1763992844/marketing/carousel/image_3.jpg"
							alt="Tarte aux fruits frais avec pâte sablée maison"
							loading="lazy"
							class="h-[140px] w-[210px] rounded-xl object-cover shadow-lg sm:h-[180px] sm:w-[270px] md:h-[210px] md:w-[315px]"
						/>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.carousel-track {
		--gap: 1rem;
		--item-width: 210px;
		--scroll-distance: calc((var(--item-width) + var(--gap)) * 3);

		display: flex;
		gap: var(--gap);
		width: max-content;
		animation: scroll 20s linear infinite;
	}

	.carousel-item {
		flex-shrink: 0;
	}

	@keyframes scroll {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(calc(-1 * var(--scroll-distance)));
		}
	}

	/* Responsive sizes */
	@media (min-width: 640px) {
		.carousel-track {
			--item-width: 270px;
		}
	}

	@media (min-width: 768px) {
		.carousel-track {
			--item-width: 315px;
		}
	}
</style>
