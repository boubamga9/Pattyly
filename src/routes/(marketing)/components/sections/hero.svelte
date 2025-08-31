<script lang="ts">
	import { Button } from '$lib/components/ui/button';
</script>

<div
	class="flex min-h-[85vh] w-full flex-col justify-between bg-[#FFE8D6] md:min-h-screen"
>
	<!-- Top section -->
	<div
		class="flex flex-1 flex-col items-center justify-center px-6 pt-20 text-center sm:pt-28 md:pt-24"
	>
		<h2 class="text-3xl font-bold leading-[120%] text-neutral-800 md:text-4xl">
			Et si tu passais <br class="hidden sm:block" />moins de temps dans tes DM<br
				class="hidden sm:block"
			/>
			et plus de temps derrière ton four ?
		</h2>

		<p class="my-4 text-base leading-[160%] text-neutral-700">
			Commandes, paiements, devis, planning…<br />
			Tout centralisé pour que tu gagnes du temps, sans prise de tête.
		</p>

		<div class="flex flex-col items-center gap-4 md:flex-row md:gap-6">
			<Button
				href="/register"
				class="mb-3 h-14 w-[270px] rounded-xl bg-[#FF6F61] text-base text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:bg-[#e85a4f]"
			>
				Commencer mon essai gratuit
			</Button>
		</div>

		<p class="text-sm font-light text-neutral-600">
			✔️ Sans carte bancaire — tu restes libre à 100%
		</p>
	</div>

	<!-- Carousel -->
	<div
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
							src="/carousel/image_1.jpg"
							alt="Gâteau d'anniversaire personnalisé avec décorations colorées"
							loading="lazy"
							class="h-[140px] w-[210px] rounded-xl object-cover shadow-lg sm:h-[180px] sm:w-[270px] md:h-[210px] md:w-[315px]"
						/>
					</div>
					<div class="carousel-item">
						<img
							src="/carousel/image_2.jpg"
							alt="Macarons artisanaux aux saveurs variées"
							loading="lazy"
							class="h-[140px] w-[210px] rounded-xl object-cover shadow-lg sm:h-[180px] sm:w-[270px] md:h-[210px] md:w-[315px]"
						/>
					</div>
					<div class="carousel-item">
						<img
							src="/carousel/image_3.jpg"
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
