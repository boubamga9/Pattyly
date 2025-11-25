<script lang="ts">
	import { onMount } from 'svelte';
	import { WebsiteName } from '$src/config';
	import { revealElement, revealStagger } from '$lib/utils/animations';
	import { Button } from '$lib/components/ui/button';
	let heroTitle: HTMLElement;
	let heroContent: HTMLElement;
	let citiesContainer: HTMLElement;
	let introSection: HTMLElement;
	let introContent: HTMLElement;
	let benefitsSection: HTMLElement;
	let benefitsContent: HTMLElement;
	let howItWorksSection: HTMLElement;
	let howItWorksContent: HTMLElement;
	let ctaSection: HTMLElement;
	let ctaContent: HTMLElement;

	const cities = [
		{ name: 'Paris', code: 'paris' },
		{ name: 'Lyon', code: 'lyon' },
		{ name: 'Marseille', code: 'marseille' },
		{ name: 'Toulouse', code: 'toulouse' },
		{ name: 'Nice', code: 'nice' },
		{ name: 'Nantes', code: 'nantes' },
		{ name: 'Strasbourg', code: 'strasbourg' },
		{ name: 'Montpellier', code: 'montpellier' },
		{ name: 'Bordeaux', code: 'bordeaux' },
		{ name: 'Lille', code: 'lille' },
		{ name: 'Rennes', code: 'rennes' },
		{ name: 'Reims', code: 'reims' },
		{ name: 'Grenoble', code: 'grenoble' },
		{ name: 'Dijon', code: 'dijon' },
		{ name: 'Angers', code: 'angers' },
		{ name: 'Le Havre', code: 'le-havre' },
		{ name: 'Toulon', code: 'toulon' },
		{ name: 'Nancy', code: 'nancy' },
		{ name: 'Rouen', code: 'rouen' },
		{ name: 'Amiens', code: 'amiens' },
		{ name: 'Caen', code: 'caen' },
	];

	onMount(async () => {
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.5 });
		if (heroContent) await revealElement(heroContent, { delay: 0.1, duration: 0.5 });
		if (citiesContainer) await revealStagger(citiesContainer, ':scope > a', { delay: 0.2, stagger: 0.05 });
		if (introSection) {
			if (introContent) await revealStagger(introContent, 'div', { delay: 0.1, stagger: 0.1 });
		}
		if (benefitsSection) {
			if (benefitsContent) await revealStagger(benefitsContent, 'div', { delay: 0.1, stagger: 0.1 });
		}
		if (howItWorksSection) {
			if (howItWorksContent) await revealStagger(howItWorksContent, 'div', { delay: 0.1, stagger: 0.1 });
		}
		if (ctaSection) {
			if (ctaContent) await revealElement(ctaContent, { delay: 0, duration: 0.6 });
		}
	});
</script>

<svelte:head>
	<title>Trouver un cake designer près de chez moi - Annuaire de pâtissiers | {WebsiteName}</title>
	<meta
		name="description"
		content="Trouve le cake designer parfait pour ton événement ! Recherche par ville, découvre leurs créations et commande directement en ligne. Annuaire de pâtissiers professionnels."
	/>
	<meta
		name="keywords"
		content="trouver cake designer, cake designer près de moi, annuaire pâtissiers, commande gâteau personnalisé, pâtissier [ville]"
	/>
	<meta
		property="og:title"
		content="Trouver un cake designer près de chez moi - Annuaire de pâtissiers | {WebsiteName}"
	/>
	<meta
		property="og:description"
		content="Trouve le cake designer parfait pour ton événement ! Recherche par ville, découvre leurs créations et commande directement en ligne."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/trouver-un-cake-designer" />
	<link rel="canonical" href="https://pattyly.com/trouver-un-cake-designer" />
</svelte:head>

<div class="flex flex-col">
	<!-- Hero section premium -->
	<section class="relative flex min-h-[90vh] w-full flex-col justify-center overflow-hidden bg-white pt-24 md:min-h-screen md:pt-32">
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
		
		<div class="relative z-10 mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-16 text-center">
				<h1
					bind:this={heroTitle}
					class="mb-8 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Trouve le <span class="text-[#FF6F61]">cake designer</span><br />
					parfait pour ton événement
				</h1>
				<p
					bind:this={heroContent}
					class="mx-auto max-w-3xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Des pâtissiers professionnels près de chez toi, avec leur boutique en ligne pour commander facilement.
				</p>
				<!-- Bouton Trouver un patissier rapidement -->
				<div class="mt-8">
					<Button
						href="/annuaire"
						class="inline-flex items-center gap-2 rounded-full bg-[#FF6F61] px-8 py-4 text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-105 hover:bg-[#e85a4f] hover:shadow-xl"
					>
						Trouver un patissier rapidement
					</Button>
				</div>
			</div>

			<!-- Cities list minimaliste -->
			<div class="mx-auto max-w-5xl">
				<div class="mb-8 text-center">
					<h2 class="text-xl font-semibold text-neutral-900 sm:text-2xl">
						Choisis ta ville
					</h2>
				</div>
				<div
					bind:this={citiesContainer}
					class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
				>
					{#each cities as city}
						<a
							href="/annuaire/{city.code}"
							class="group flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 text-center transition-all duration-300 hover:scale-105 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
						>
							<span class="text-base font-medium text-neutral-700 transition-colors group-hover:text-[#FF6F61] sm:text-lg">
								{city.name}
							</span>
						</a>
					{/each}
				</div>
				<!-- Bouton Autres villes -->
				<div class="mt-6 pb-16 text-center">
					<Button
						href="/annuaire"
						class="inline-flex items-center gap-2 rounded-xl bg-[#FF6F61] px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-[#e85a4f] hover:shadow-lg"
					>
						Autres villes
					</Button>
				</div>
			</div>
		</div>
	</section>

	<!-- Intro section - Design éditorial premium -->
	<section bind:this={introSection} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/20 via-transparent to-transparent"></div>
		
		<div class="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
			<!-- Header minimaliste -->
			<div class="mb-20 text-center">
				<h2
					class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Pourquoi utiliser notre annuaire ?
				</h2>
				<!-- Séparateur élégant -->
				<div class="mt-8 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>

			<!-- Contenu principal avec design éditorial -->
			<div bind:this={introContent} class="space-y-16">
				<!-- Premier bloc : Message principal -->
				<div class="mx-auto max-w-3xl">
					<p
						class="text-center text-xl leading-[180%] text-neutral-700 sm:text-2xl md:text-3xl"
						style="font-weight: 300; letter-spacing: -0.02em;"
					>
						Tu cherches un <span class="font-semibold text-neutral-900">gâteau personnalisé</span> pour un événement spécial ?
					</p>
				</div>

				<!-- Séparateur élégant -->
				<div class="flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px flex-1 max-w-xs bg-neutral-300"></div>
				</div>

				<!-- Deuxième bloc : Contenu détaillé -->
				<div class="mx-auto max-w-4xl space-y-12">
					<div class="space-y-4">
						<p
							class="text-lg leading-[175%] text-neutral-700 sm:text-xl md:text-2xl"
							style="font-weight: 300;"
						>
							Notre annuaire te permet de <span class="font-medium text-neutral-800">trouver des cake designers</span> près de chez toi, de voir leurs créations, et de <span class="font-medium text-neutral-800">commander directement</span> depuis leur boutique en ligne professionnelle.
						</p>
					</div>
					<div class="space-y-4">
						<p
							class="text-lg leading-[175%] text-neutral-600 sm:text-xl md:text-2xl"
							style="font-weight: 300;"
						>
							Plus besoin de passer par les <span class="font-medium text-neutral-900">DM Instagram</span> ou de chercher sur plusieurs sites. Tous les cake designers de l'annuaire ont leur <span class="font-semibold text-[#FF6F61]">boutique en ligne Pattyly</span> : tu vois leurs gâteaux, leurs prix, et tu commandes en quelques clics.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Benefits section - Design premium -->
	<section bind:this={benefitsSection} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<h2
					class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Les avantages de notre annuaire
				</h2>
				<!-- Séparateur élégant -->
				<div class="mt-8 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>

			<div bind:this={benefitsContent} class="mx-auto max-w-3xl space-y-12">
				<div class="space-y-6">
					<div class="flex items-start gap-6">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]">
							<div class="h-3 w-3 rounded-full bg-white"></div>
						</div>
						<div>
							<h3 class="mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
								Recherche facile par localisation
							</h3>
							<p class="text-lg leading-relaxed text-neutral-600 sm:text-xl" style="font-weight: 300;">
								Trouve le cake designer parfait près de chez toi en quelques clics. Filtre par ville ou rayon pour trouver des pâtissiers dans ta région.
							</p>
						</div>
					</div>
				</div>

				<div class="space-y-6">
					<div class="flex items-start gap-6">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]">
							<div class="h-3 w-3 rounded-full bg-white"></div>
						</div>
						<div>
							<h3 class="mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
								Boutiques en ligne professionnelles
							</h3>
							<p class="text-lg leading-relaxed text-neutral-600 sm:text-xl" style="font-weight: 300;">
								Tous les cake designers ont leur propre boutique en ligne avec photos, prix et options de personnalisation. Tu vois exactement ce que tu commandes.
							</p>
						</div>
					</div>
				</div>

				<div class="space-y-6">
					<div class="flex items-start gap-6">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]">
							<div class="h-3 w-3 rounded-full bg-white"></div>
						</div>
						<div>
							<h3 class="mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
								Commande directe et sécurisée
							</h3>
							<p class="text-lg leading-relaxed text-neutral-600 sm:text-xl" style="font-weight: 300;">
								Commande directement depuis la boutique du cake designer. Paiement sécurisé, confirmation immédiate, pas besoin de passer par les DM Instagram.
							</p>
						</div>
					</div>
				</div>

				<div class="space-y-6">
					<div class="flex items-start gap-6">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6F61]">
							<div class="h-3 w-3 rounded-full bg-white"></div>
						</div>
						<div>
							<h3 class="mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
								Cake designers vérifiés
							</h3>
							<p class="text-lg leading-relaxed text-neutral-600 sm:text-xl" style="font-weight: 300;">
								Tous les pâtissiers de l'annuaire utilisent Pattyly pour gérer leur activité. Ils ont une boutique professionnelle et sont sérieux.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- How it works section - Design premium -->
	<section bind:this={howItWorksSection} class="relative overflow-hidden bg-gradient-to-b from-white via-[#FFE8D6]/10 to-white py-24 sm:py-32 md:py-40">
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<h2
					class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Comment ça marche ?
				</h2>
				<!-- Séparateur élégant -->
				<div class="mt-8 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>

			<div bind:this={howItWorksContent} class="mx-auto max-w-4xl space-y-16">
				<div class="space-y-6">
					<div class="flex items-start gap-6">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6F61] text-lg font-bold text-white">
							1
						</div>
						<div>
							<h3 class="mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
								Recherche par ville
							</h3>
							<p class="text-lg leading-relaxed text-neutral-600 sm:text-xl" style="font-weight: 300;">
								Entre ta ville ou ton code postal pour trouver les cake designers près de chez toi.
							</p>
						</div>
					</div>
				</div>

				<div class="space-y-6">
					<div class="flex items-start gap-6">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6F61] text-lg font-bold text-white">
							2
						</div>
						<div>
							<h3 class="mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
								Découvre leurs créations
							</h3>
							<p class="text-lg leading-relaxed text-neutral-600 sm:text-xl" style="font-weight: 300;">
								Parcours leurs boutiques en ligne, vois leurs gâteaux, leurs prix et leurs spécialités.
							</p>
						</div>
					</div>
				</div>

				<div class="space-y-6">
					<div class="flex items-start gap-6">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6F61] text-lg font-bold text-white">
							3
						</div>
						<div>
							<h3 class="mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
								Commande en ligne
							</h3>
							<p class="text-lg leading-relaxed text-neutral-600 sm:text-xl" style="font-weight: 300;">
								Personnalise ton gâteau, choisis tes options, et commande directement depuis leur boutique.
							</p>
						</div>
					</div>
				</div>

				<div class="space-y-6">
					<div class="flex items-start gap-6">
						<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6F61] text-lg font-bold text-white">
							4
						</div>
						<div>
							<h3 class="mb-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
								Reçois ton gâteau
							</h3>
							<p class="text-lg leading-relaxed text-neutral-600 sm:text-xl" style="font-weight: 300;">
								Le cake designer te contacte pour confirmer les détails et organiser la livraison ou le retrait.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA section premium -->
	<section bind:this={ctaSection} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/10 to-transparent"></div>
		
		<div class="relative mx-auto max-w-4xl px-6 text-center sm:px-8">
			<div bind:this={ctaContent} class="space-y-8">
				<h2
					class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Prêt à trouver ton cake designer ?
				</h2>
				<p
					class="mx-auto max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300;"
				>
					Recherche par ville et découvre les pâtissiers près de chez toi.
				</p>
				<div class="pt-4">
					<Button
						href="/annuaire"
						class="h-14 rounded-xl bg-[#FF6F61] px-10 text-base font-medium text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
					>
						Rechercher un cake designer
					</Button>
				</div>
			</div>
		</div>
	</section>
</div>
