<script lang="ts">
	import { onMount } from 'svelte';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	let section: HTMLElement;
	let title: HTMLElement;
	let content: HTMLElement;

	onMount(async () => {
		if (section) {
			if (title) await revealElement(title, { delay: 0 });
			if (content) await revealStagger(content, 'div', { delay: 0.1, stagger: 0.1 });
		}
	});
</script>

<section bind:this={section} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
	<!-- Background subtle gradient -->
	<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/20 via-transparent to-transparent"></div>
	
	<div class="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
		<!-- Header minimaliste -->
		<div class="mb-20 text-center">
			<h2
				bind:this={title}
				class="intro-title mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
			>
				Un <span class="font-bold text-[#FF6F61]">logiciel de gestion</span><br />
				pensé pour les cake designers
			</h2>
		</div>

		<!-- Contenu principal avec design éditorial -->
		<div bind:this={content} class="space-y-16">
			<!-- Premier bloc : Message principal -->
			<div class="mx-auto max-w-3xl">
				<p
					class="text-center text-xl leading-[180%] text-neutral-700 sm:text-2xl md:text-3xl"
					style="font-weight: 300; letter-spacing: -0.02em;"
				>
					Pattyly centralise toutes les tâches administratives de ton activité de
					pâtisserie dans un seul outil simple et intuitif.
				</p>
			</div>

			<!-- Séparateur élégant -->
			<div class="flex items-center justify-center gap-4">
				<div class="h-px w-16 bg-neutral-300"></div>
				<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
				<div class="h-px flex-1 max-w-xs bg-neutral-300"></div>
			</div>

			<!-- Features en ligne horizontale (desktop) / verticale (mobile) -->
			<div class="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-12 md:gap-16">
				<a
					href="/boutique-en-ligne-patissier"
					class="group relative flex flex-col items-center text-center transition-all duration-500 hover:scale-105"
				>
					<div class="mb-4 text-5xl opacity-80 transition-opacity group-hover:opacity-100">🛒</div>
					<span class="text-sm font-medium uppercase tracking-[0.15em] text-neutral-500 transition-colors group-hover:text-[#FF6F61]">
						Boutique en ligne
					</span>
					<div class="mt-2 h-0.5 w-0 bg-[#FF6F61] transition-all duration-300 group-hover:w-full"></div>
				</a>
				<a
					href="/logiciel-gestion-patisserie"
					class="group relative flex flex-col items-center text-center transition-all duration-500 hover:scale-105"
				>
					<div class="mb-4 text-5xl opacity-80 transition-opacity group-hover:opacity-100">📊</div>
					<span class="text-sm font-medium uppercase tracking-[0.15em] text-neutral-500 transition-colors group-hover:text-[#FF6F61]">
						Gestion commandes
					</span>
					<div class="mt-2 h-0.5 w-0 bg-[#FF6F61] transition-all duration-300 group-hover:w-full"></div>
				</a>
				<a
					href="/devis-factures-cake-designer"
					class="group relative flex flex-col items-center text-center transition-all duration-500 hover:scale-105"
				>
					<div class="mb-4 text-5xl opacity-80 transition-opacity group-hover:opacity-100">📑</div>
					<span class="text-sm font-medium uppercase tracking-[0.15em] text-neutral-500 transition-colors group-hover:text-[#FF6F61]">
						Devis et facturation
					</span>
					<div class="mt-2 h-0.5 w-0 bg-[#FF6F61] transition-all duration-300 group-hover:w-full"></div>
				</a>
			</div>

			<!-- Séparateur élégant -->
			<div class="flex items-center justify-center gap-4">
				<div class="h-px flex-1 max-w-xs bg-neutral-300"></div>
				<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
				<div class="h-px w-16 bg-neutral-300"></div>
			</div>

			<!-- Deuxième bloc : Contenu détaillé avec typographie soignée -->
			<div class="mx-auto max-w-4xl space-y-12">
				<!-- Premier paragraphe -->
				<div class="space-y-4">
					<p
						class="text-lg leading-[175%] text-neutral-700 sm:text-xl md:text-2xl"
						style="font-weight: 300;"
					>
						Que tu sois <span class="font-semibold text-neutral-900">auto-entrepreneur</span> ou que tu gères un <span class="font-semibold text-neutral-900">atelier de pâtisserie</span>, notre <a href="/logiciel-gestion-patisserie" class="font-medium text-[#FF6F61] transition-colors hover:text-[#e85a4f] border-b border-transparent hover:border-[#FF6F61]">logiciel de gestion pour pâtissiers</a> — spécialement conçu pour les <span class="font-medium text-neutral-900">auto-entrepreneurs cake designers</span> — t'aide à créer ta <a href="/boutique-en-ligne-patissier" class="font-medium text-[#FF6F61] transition-colors hover:text-[#e85a4f] border-b border-transparent hover:border-[#FF6F61]">boutique en ligne</a> en quelques minutes.
					</p>
				</div>

				<!-- Deuxième paragraphe -->
				<div class="space-y-4">
					<p
						class="text-lg leading-[175%] text-neutral-700 sm:text-xl md:text-2xl"
						style="font-weight: 300;"
					>
						Tes clients peuvent commander des gâteaux personnalisés directement via un <a href="/formulaire-commande-gateau" class="font-medium text-[#FF6F61] transition-colors hover:text-[#e85a4f] border-b border-transparent hover:border-[#FF6F61]">formulaire de commande en ligne</a>, sans que tu aies besoin de répondre à chaque message individuellement.
					</p>
				</div>

				<!-- Troisième paragraphe -->
				<div class="space-y-4">
					<p
						class="text-lg leading-[175%] text-neutral-700 sm:text-xl md:text-2xl"
						style="font-weight: 300;"
					>
						Plus besoin de jongler entre <span class="font-medium text-neutral-900">Excel</span>, <span class="font-medium text-neutral-900">Instagram</span>, et tes <span class="font-medium text-neutral-900">notes</span> : tout est centralisé dans un seul <span class="font-semibold text-[#FF6F61]">tableau de bord intuitif</span>. Fini l'<span class="font-medium text-neutral-900">alternative Excel pour pâtissiers</span> : tu as désormais une solution complète qui remplace tous tes outils éparpillés.
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	@media (max-width: 480px) {
		.intro-title {
			font-size: 2rem;
		}
	}
</style>
