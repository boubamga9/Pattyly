<script lang="ts">
	import { onMount } from 'svelte';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	let section: HTMLElement;
	let title: HTMLElement;
	let cardsContainer: HTMLElement;

	onMount(async () => {
		if (section) {
			if (title) await revealElement(title, { delay: 0 });
			if (cardsContainer) await revealStagger(cardsContainer, 'div[class*="group"]', { delay: 0.1, stagger: 0.1 });
		}
	});
</script>

<section bind:this={section} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
	<!-- Background subtle -->
	<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/10 to-transparent"></div>
	
	<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
		<!-- Titre de section avec design premium -->
		<div class="mb-20 text-center md:mb-24">
			<h2 
				bind:this={title}
				class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl xl:text-6xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				L'outil qui transforme ton activité de pâtisserie
			</h2>
			<p 
				class="mx-auto max-w-2xl text-lg text-neutral-600 sm:text-xl md:text-2xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				Vois par toi-même comment Pattyly transforme ton quotidien de cake designer
			</p>
			<!-- Séparateur élégant -->
			<div class="mt-8 flex items-center justify-center gap-4">
				<div class="h-px w-16 bg-neutral-300"></div>
				<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
				<div class="h-px w-16 bg-neutral-300"></div>
			</div>
		</div>

		<div bind:this={cardsContainer} class="grid gap-8 md:grid-cols-2 lg:gap-12">
			<!-- Avant Pattyly avec design premium -->
			<div class="group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white p-10 transition-all duration-500 hover:border-neutral-300 hover:shadow-lg sm:p-12">
				<!-- Badge minimaliste -->
				<div class="mb-8 inline-flex items-center gap-2.5">
					<div class="h-1.5 w-1.5 rounded-full bg-neutral-400"></div>
					<span class="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
						Avant Pattyly
					</span>
				</div>

				<!-- Contenu avec typographie soignée -->
				<ul class="space-y-6">
					<li class="flex items-start gap-5">
						<div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
							<div class="h-1 w-1 rounded-full bg-neutral-400"></div>
						</div>
						<div>
							<p 
								class="text-lg font-medium text-neutral-900 sm:text-xl"
								style="font-weight: 500;"
							>
								Multiplier les outils
							</p>
							<p 
								class="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg"
								style="font-weight: 300;"
							>
								Excel, Instagram, notes éparpillées
							</p>
						</div>
					</li>
					<li class="flex items-start gap-5">
						<div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
							<div class="h-1 w-1 rounded-full bg-neutral-400"></div>
						</div>
						<div>
							<p 
								class="text-lg font-medium text-neutral-900 sm:text-xl"
								style="font-weight: 500;"
							>
								Répéter les mêmes informations
							</p>
							<p 
								class="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg"
								style="font-weight: 300;"
							>
								50 fois par jour dans tes DM
							</p>
						</div>
					</li>
					<li class="flex items-start gap-5">
						<div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
							<div class="h-1 w-1 rounded-full bg-neutral-400"></div>
						</div>
						<div>
							<p 
								class="text-lg font-medium text-neutral-900 sm:text-xl"
								style="font-weight: 500;"
							>
								Temps perdu en administratif
							</p>
							<p 
								class="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg"
								style="font-weight: 300;"
							>
								Devis et factures à créer manuellement
							</p>
						</div>
					</li>
					<li class="flex items-start gap-5">
						<div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
							<div class="h-1 w-1 rounded-full bg-neutral-400"></div>
						</div>
						<div>
							<p 
								class="text-lg font-medium text-neutral-900 sm:text-xl"
								style="font-weight: 500;"
							>
								Moins de temps pour créer
							</p>
							<p 
								class="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg"
								style="font-weight: 300;"
							>
								L'administratif prend le dessus
							</p>
						</div>
					</li>
				</ul>
			</div>

			<!-- Avec Pattyly avec design premium - Plus en évidence -->
			<div class="group relative overflow-hidden rounded-3xl border-2 border-[#FF6F61] bg-gradient-to-br from-white via-[#FFE8D6]/30 to-[#FFE8D6]/40 p-10 shadow-xl transition-all duration-500 hover:border-[#FF6F61] hover:shadow-2xl sm:p-12">
				<!-- Badge plus visible -->
				<div class="mb-8 inline-flex items-center gap-2.5 rounded-full bg-[#FF6F61] px-4 py-2">
					<div class="h-2 w-2 rounded-full bg-white"></div>
					<span class="text-xs font-semibold uppercase tracking-[0.2em] text-white">
						Avec Pattyly
					</span>
				</div>
				
				<!-- Élément décoratif accentué -->
				<div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#FF6F61] opacity-15 blur-3xl"></div>
				<div class="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-[#FF6F61] opacity-10 blur-2xl"></div>

				<!-- Contenu avec typographie soignée -->
				<ul class="space-y-6">
					<li class="flex items-start gap-5">
						<div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
							<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
						</div>
						<div>
							<p 
								class="text-lg font-medium text-neutral-900 sm:text-xl"
								style="font-weight: 500;"
							>
								Tout centralisé
							</p>
							<p 
								class="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg"
								style="font-weight: 300;"
							>
								Un seul tableau de bord pour tout gérer
							</p>
						</div>
					</li>
					<li class="flex items-start gap-5">
						<div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
							<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
						</div>
						<div>
							<p 
								class="text-lg font-medium text-neutral-900 sm:text-xl"
								style="font-weight: 500;"
							>
								Boutique en ligne 24/7
							</p>
							<p 
								class="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg"
								style="font-weight: 300;"
							>
								Tes clients trouvent les réponses seuls
							</p>
						</div>
					</li>
					<li class="flex items-start gap-5">
						<div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
							<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
						</div>
						<div>
							<p 
								class="text-lg font-medium text-neutral-900 sm:text-xl"
								style="font-weight: 500;"
							>
								Automatisation complète
							</p>
							<p 
								class="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg"
								style="font-weight: 300;"
							>
								Devis et factures générés automatiquement. <span class="font-medium text-neutral-900">Comment calculer le prix d'un gâteau personnalisé</span> ? Notre système le fait pour toi selon les options choisies.
							</p>
						</div>
					</li>
					<li class="flex items-start gap-5">
						<div class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
							<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
						</div>
						<div>
							<p 
								class="text-lg font-medium text-neutral-900 sm:text-xl"
								style="font-weight: 500;"
							>
								Plus de temps pour créer
							</p>
							<p 
								class="mt-2 text-base leading-relaxed text-neutral-600 sm:text-lg"
								style="font-weight: 300;"
							>
								Tu te concentres sur tes pâtisseries
							</p>
						</div>
					</li>
				</ul>
			</div>
		</div>
	</div>
</section>

