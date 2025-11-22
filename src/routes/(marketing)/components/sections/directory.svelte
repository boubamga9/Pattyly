<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	let section: HTMLElement;
	let title: HTMLElement;
	let content: HTMLElement;
	let ctaContainer: HTMLElement;

	onMount(async () => {
		if (section) {
			if (title) await revealElement(title, { delay: 0 });
			if (content) await revealElement(content, { delay: 0.1 });
			if (ctaContainer) await revealElement(ctaContainer, { delay: 0.2 });
		}
	});
</script>

<section bind:this={section} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
	<!-- Background subtle gradient -->
	<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
	
	<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
		<!-- Header minimaliste -->
		<div class="mb-20 text-center md:mb-24">
			<h2 
				bind:this={title}
				class="mb-8 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl xl:text-6xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				Gagne en <span class="text-[#FF6F61]">visibilité</span><br />
				sans effort supplémentaire
			</h2>
			<!-- Séparateur élégant -->
			<div class="flex items-center justify-center gap-4">
				<div class="h-px w-16 bg-neutral-300"></div>
				<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
				<div class="h-px w-16 bg-neutral-300"></div>
			</div>
		</div>

		<!-- Contenu principal avec design éditorial premium -->
		<div bind:this={content} class="space-y-16">
			<!-- Premier bloc : Message principal -->
			<div class="mx-auto max-w-4xl">
				<div class="space-y-8">
					<p
						class="text-center text-xl leading-[180%] text-neutral-700 sm:text-2xl md:text-3xl"
						style="font-weight: 300; letter-spacing: -0.02em;"
					>
						Tu veux <span class="font-semibold text-neutral-900">attirer plus de clients</span> sans passer ta vie à poster sur Instagram ?
					</p>
				</div>
			</div>

			<!-- Séparateur élégant -->
			<div class="flex items-center justify-center gap-4">
				<div class="h-px flex-1 max-w-xs bg-neutral-300"></div>
				<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
				<div class="h-px flex-1 max-w-xs bg-neutral-300"></div>
			</div>

			<!-- Deuxième bloc : Explication détaillée -->
			<div class="mx-auto max-w-4xl space-y-12">
				<div class="space-y-6">
					<p
						class="text-lg leading-[175%] text-neutral-700 sm:text-xl md:text-2xl"
						style="font-weight: 300;"
					>
						Notre <span class="font-semibold text-neutral-900">annuaire de cake designers</span> permet aux clients de te trouver quand ils cherchent un pâtissier dans ta région. Active ta visibilité en un clic depuis ton tableau de bord.
					</p>
					<p
						class="text-lg leading-[175%] text-neutral-600 sm:text-xl md:text-2xl"
						style="font-weight: 300;"
					>
						Ta <span class="font-medium text-neutral-800">boutique en ligne Pattyly</span> est directement accessible depuis l'annuaire. Les clients voient tes créations, tes prix, et peuvent <span class="font-medium text-neutral-800">commander directement</span> — sans passer par les DM Instagram.
					</p>
				</div>
			</div>

			<!-- Troisième bloc : Bénéfices en liste élégante -->
			<div class="mx-auto max-w-3xl">
				<div class="space-y-6 rounded-2xl bg-gradient-to-br from-[#FFE8D6]/20 via-[#FFE8D6]/10 to-transparent p-8 sm:p-12">
					<div class="space-y-4">
						<div class="flex items-start gap-4">
							<div class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]">
								<div class="h-2 w-2 rounded-full bg-white"></div>
							</div>
							<p class="text-base leading-relaxed text-neutral-700 sm:text-lg">
								<span class="font-semibold text-neutral-900">Sois trouvé facilement</span> : Les clients te découvrent quand ils cherchent "cake designer [ta ville]"
							</p>
						</div>
						<div class="flex items-start gap-4">
							<div class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]">
								<div class="h-2 w-2 rounded-full bg-white"></div>
							</div>
							<p class="text-base leading-relaxed text-neutral-700 sm:text-lg">
								<span class="font-semibold text-neutral-900">Visibilité locale</span> : Apparais dans les recherches par ville et rayon
							</p>
						</div>
						<div class="flex items-start gap-4">
							<div class="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]">
								<div class="h-2 w-2 rounded-full bg-white"></div>
							</div>
							<p class="text-base leading-relaxed text-neutral-700 sm:text-lg">
								<span class="font-semibold text-neutral-900">Plus de commandes</span> : Reçois des commandes de nouveaux clients qui te découvrent via l'annuaire
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- CTA minimaliste -->
		<div bind:this={ctaContainer} class="mt-20 text-center">
			<Button
				href="/register"
				class="h-14 rounded-xl bg-[#FF6F61] px-10 text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
			>
				Apparaître dans l'annuaire
			</Button>
		</div>
	</div>
</section>

