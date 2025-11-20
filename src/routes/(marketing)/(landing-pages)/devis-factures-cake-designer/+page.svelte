<script lang="ts">
	import { onMount } from 'svelte';
	import { WebsiteName } from '$src/config';
	import { Button } from '$lib/components/ui/button';
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger,
	} from '$lib/components/ui/collapsible';
	import { ChevronDown } from 'lucide-svelte';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	let heroTitle: HTMLElement;
	let heroContent: HTMLElement;
	let heroCard: HTMLElement;
	let painPointsContainer: HTMLElement;
	let benefitsContainer: HTMLElement;
	let howItWorksContainer: HTMLElement;
	let featuresContainer: HTMLElement;
	let faqContainer: HTMLElement;
	let ctaContainer: HTMLElement;

	onMount(async () => {
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.6 });
		if (heroContent) await revealElement(heroContent, { delay: 0.1, duration: 0.6 });
		if (heroCard) await revealElement(heroCard, { delay: 0.2, duration: 0.6 });
		if (painPointsContainer) {
			await revealStagger(painPointsContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		}
		if (benefitsContainer) {
			await revealStagger(benefitsContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		}
		if (howItWorksContainer) {
			await revealStagger(howItWorksContainer, ':scope > div', { delay: 0.1, stagger: 0.1 });
		}
		if (featuresContainer) {
			await revealStagger(featuresContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		}
		if (faqContainer) await revealStagger(faqContainer, ':scope > *', { delay: 0.1, stagger: 0.05 });
		if (ctaContainer) await revealElement(ctaContainer, { delay: 0, duration: 0.6 });
	});

	const painPoints = [
		{
			icon: '📄',
			title: 'Créer des devis à la main dans Word',
			description:
				'Tu passes du temps à créer chaque devis dans Word, copier-coller les informations, formater le document. C\'est chronophage et source d\'erreurs.',
		},
		{
			icon: '💰',
			title: 'Pas de suivi des paiements',
			description:
				'Tu ne sais pas qui a payé, qui est en retard, ou combien tu as gagné ce mois. Pas de visibilité sur tes finances, tu dois tout calculer à la main.',
		},
		{
			icon: '⏰',
			title: 'Les factures qui traînent',
			description:
				'Tu oublies de créer des factures, ou tu les crées en retard. Pas de système pour te rappeler, et tu perds du temps à chercher les anciennes factures.',
		},
		{
			icon: '❌',
			title: 'Pas de traçabilité',
			description:
				'Quand un client te demande une facture, tu dois chercher dans tes fichiers. Pas d\'historique clair, pas de base de données centralisée.',
		},
	];

	const benefits = [
		{
			icon: '⚡',
			title: 'Devis automatiques en 2 clics',
			description:
				'Crée un devis professionnel en quelques clics : sélectionne le gâteau, les options, le prix se calcule automatiquement. Envoie-le par email directement depuis la plateforme.',
		},
		{
			icon: '📊',
			title: 'Facturation automatique',
			description:
				'Quand un client paie, la facture est générée automatiquement. Plus besoin de créer tes factures à la main : tout est automatique et traçable.',
		},
		{
			icon: '💳',
			title: 'Suivi des paiements en temps réel',
			description:
				'Vois qui a payé, qui est en attente, qui est en retard. Une vision claire de tes finances pour prendre les bonnes décisions et relancer les clients si besoin.',
		},
		{
			icon: '📁',
			title: 'Historique complet',
			description:
				'Tous tes devis et factures sont stockés dans ton tableau de bord. Recherche facile, export possible, traçabilité complète de ton activité.',
		},
	];

	const howItWorks = [
		{
			step: '1',
			title: 'Reçois une demande personnalisée',
			description:
				'Un client fait une demande via ta boutique en ligne ou par message. Tu reçois une notification dans ton tableau de bord avec toutes les informations.',
		},
		{
			step: '2',
			title: 'Crée un devis en quelques clics',
			description:
				'Sélectionne le type de gâteau, les options choisies, la taille. Le prix se calcule automatiquement selon tes tarifs. Ajoute un message personnalisé si besoin.',
		},
		{
			step: '3',
			title: 'Envoie le devis par email',
			description:
				'Le devis professionnel est envoyé automatiquement au client par email. Il contient tous les détails : gâteau, options, prix, conditions.',
		},
		{
			step: '4',
			title: 'Transforme en facture automatiquement',
			description:
				'Quand le client paie, le devis se transforme automatiquement en facture. Plus besoin de créer la facture à la main : tout est traçable et organisé.',
		},
	];

	const faq = [
		{
			question: 'Les devis sont-ils personnalisables ?',
			answer:
				'Oui, totalement ! Tu peux ajouter un message personnalisé à chaque devis, modifier les conditions, ajouter des notes. Les devis sont professionnels mais adaptables à chaque situation.',
		},
		{
			question: 'Puis-je utiliser les factures pour ma comptabilité ?',
			answer:
				'Oui, absolument ! Notre logiciel de facturation pour pâtissiers génère des factures conformes avec toutes les informations nécessaires : numéro de facture, date, montant, TVA si applicable. Tu peux les exporter et les utiliser pour ta comptabilité.',
		},
		{
			question: 'Comment fonctionne le suivi des paiements ?',
			answer:
				'Quand un client paie via PayPal, tu reçois une notification. Tu valides la réception du paiement dans ton tableau de bord, et la facture est générée automatiquement. Tu vois en temps réel qui a payé, qui est en attente, et qui est en retard.',
		},
		{
			question: 'Puis-je modifier un devis après l\'avoir envoyé ?',
			answer:
				'Oui, tu peux modifier un devis à tout moment : changer le prix, ajouter des options, modifier le message. Le client recevra une notification avec le devis mis à jour.',
		},
		{
			question: 'Que se passe-t-il si un client ne paie pas ?',
			answer:
				'Tu vois dans ton tableau de bord les commandes en attente de paiement. Tu peux relancer le client directement depuis la plateforme, ou annuler la commande si nécessaire. Tout est traçable.',
		},
		{
			question: 'Puis-je exporter mes factures ?',
			answer:
				'Oui, tu peux exporter toutes tes factures au format PDF ou CSV. Parfait pour ta comptabilité, tes déclarations, ou tes archives. Tu restes propriétaire de tes données.',
		},
	];

	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Gestion devis et factures pour cake designers - Logiciel facturation pâtissiers | Pattyly',
		description:
			'Logiciel de devis et facturation pour cake designers. Créez des devis professionnels en 2 clics, générez des factures automatiques, suivez vos paiements. Spécialement conçu pour les pâtissiers indépendants.',
		about: {
			'@type': 'Thing',
			name: 'Devis et facturation cake designer',
		},
	};

	const productSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Pattyly - Logiciel de devis et facturation pour cake designers',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'EUR',
			availability: 'https://schema.org/InStock',
			description: 'Essai gratuit 7 jours, sans carte bancaire',
		},
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '4.8',
			reviewCount: '50',
		},
		description:
			'Logiciel de devis et facturation pour cake designers. Créez des devis professionnels en 2 clics, générez des factures automatiques.',
		url: 'https://pattyly.com/devis-factures-cake-designer',
	};
</script>

<svelte:head>
	<title
		>Gestion devis et factures pour cake designers | Logiciel facturation pâtissiers -
		{WebsiteName}</title
	>
	<meta
		name="description"
		content="Logiciel de devis et facturation pour cake designers. Créez des devis professionnels en 2 clics, générez des factures automatiques, suivez vos paiements. Spécialement conçu pour les pâtissiers. Essai gratuit 7 jours."
	/>
	<meta
		name="keywords"
		content="devis cake designer, devis gâteau personnalisé, logiciel devis pâtisserie, logiciel facturation pâtissier, logiciel facturation cake designer, logiciel facture pâtisserie, gestion devis pâtisserie, facturation automatique pâtissier, créer devis gâteau, factures cake designer"
	/>
	<meta
		property="og:title"
		content="Gestion devis et factures pour cake designers | Logiciel facturation pâtissiers - {WebsiteName}"
	/>
	<meta
		property="og:description"
		content="Logiciel de devis et facturation pour cake designers. Créez des devis professionnels en 2 clics, générez des factures automatiques, suivez vos paiements."
	/>
	<meta property="og:type" content="website" />
	<meta
		property="og:url"
		content="https://pattyly.com/devis-factures-cake-designer"
	/>
	<meta property="og:image" content="/images/logo_text.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="canonical" href="https://pattyly.com/devis-factures-cake-designer" />
	<script type="application/ld+json">
		{JSON.stringify(structuredData)}
	</script>
	<script type="application/ld+json">
		{JSON.stringify(productSchema)}
	</script>
</svelte:head>

<main class="flex flex-col">
	<!-- Hero Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-[#FFE8D6] via-[#FFE8D6]/95 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div
			class="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-20 pt-12 sm:px-8 md:flex-row md:items-center md:justify-between md:gap-16 lg:px-12 lg:pt-16"
		>
			<div class="max-w-2xl text-center md:text-left">
				<p 
					bind:this={heroTitle}
					class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]"
				>
					Devis et facturation
				</p>
				<h1
					class="mt-4 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Logiciel de devis et facturation pour cake designers
				</h1>
				<p 
					bind:this={heroContent}
					class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Fini de créer tes devis dans Word et de chercher tes factures. Crée des devis
					professionnels en 2 clics, génère des factures automatiques, et suis tes paiements
					en temps réel. Un logiciel de facturation pensé pour les pâtissiers.
				</p>
				<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
					<Button
						href="/register"
						class="h-14 rounded-xl bg-[#FF6F61] px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
					>
						Commencer mon essai gratuit
					</Button>
					<a
						href="/pricing"
						class="inline-flex h-14 items-center justify-center rounded-xl border-2 border-neutral-800 bg-transparent px-6 text-sm font-semibold text-neutral-800 transition-colors duration-200 hover:bg-neutral-100"
					>
						Voir les tarifs
					</a>
				</div>
				<p class="mt-4 text-sm font-light text-neutral-600">
					✔️ <strong>Essai gratuit 7 jours</strong> • Sans carte bancaire • Configuration en 5
					minutes
				</p>
			</div>

			<div
				bind:this={heroCard}
				class="mx-auto w-full max-w-md rounded-3xl border-2 border-[#FF6F61]/20 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-xl md:mx-0"
			>
				<h2
					class="text-center text-lg font-semibold uppercase tracking-[0.2em] text-neutral-800 md:text-left"
				>
					Avantages du logiciel
				</h2>
				<ul class="mt-6 space-y-4 text-left">
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Devis professionnels créés en 2 clics (plus de Word)</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Factures automatiques générées au paiement</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Suivi des paiements en temps réel (qui a payé, qui attend)</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Historique complet et export pour ta comptabilité</span>
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- Pain Points Section -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Les problèmes sans logiciel de facturation
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Tu te reconnais dans ces situations ?
				</h2>
			</div>

			<div bind:this={painPointsContainer} class="grid gap-8 md:grid-cols-2">
				{#each painPoints as point}
					<div
						class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg"
					>
						<div class="mb-4 text-4xl">{point.icon}</div>
						<h3 class="mb-2 text-xl font-semibold text-neutral-900">
							{point.title}
						</h3>
						<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
							{point.description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Benefits Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-white via-[#FFE8D6]/5 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					La solution Pattyly
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Ton logiciel de facturation, simplifié
				</h2>
			</div>

			<div bind:this={benefitsContainer} class="grid gap-8 md:grid-cols-2">
				{#each benefits as benefit}
					<div class="flex gap-6">
						<div
							class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm"
							style="background-color: #FFE8D6;"
						>
							{benefit.icon}
						</div>
						<div>
							<h3 class="mb-2 text-xl font-semibold text-neutral-900">
								{benefit.title}
							</h3>
							<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
								{benefit.description}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- How It Works Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-[#FFE8D6] via-[#FFE8D6]/95 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Comment ça marche
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					De la demande au paiement en 4 étapes
				</h2>
			</div>

			<div bind:this={howItWorksContainer} class="space-y-12">
				{#each howItWorks as item, index}
					<div class="flex gap-8">
						<div class="flex flex-col items-center">
							<span
								class="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-lg"
								style="background-color: #FF6F61;"
							>
								{item.step}
							</span>
							{#if index < howItWorks.length - 1}
								<span class="mt-4 h-full w-px flex-1 bg-gradient-to-b from-[#FF6F61]/30 to-transparent"></span>
							{/if}
						</div>
						<div class="flex-1">
							<h3 class="mt-2 text-2xl font-semibold text-neutral-900">
								{item.title}
							</h3>
							<p class="mt-4 text-lg leading-[175%] text-neutral-700" style="font-weight: 300;">
								{item.description}
							</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-white via-[#FFE8D6]/5 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Fonctionnalités
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Tout ce dont tu as besoin pour tes devis et factures
				</h2>
			</div>

			<div bind:this={featuresContainer} class="grid gap-8 md:grid-cols-3">
				<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg">
					<div class="mb-4 text-4xl">📝</div>
					<h3 class="mb-2 text-xl font-semibold text-neutral-900">
						Devis professionnels
					</h3>
					<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
						Crée des devis avec ton logo, tes coordonnées, les détails du gâteau, le prix.
						Format professionnel, prêt à envoyer.
					</p>
				</div>
				<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg">
					<div class="mb-4 text-4xl">💳</div>
					<h3 class="mb-2 text-xl font-semibold text-neutral-900">
						Factures automatiques
					</h3>
					<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
						Quand un client paie, la facture est générée automatiquement. Plus besoin de
						créer tes factures à la main.
					</p>
				</div>
				<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg">
					<div class="mb-4 text-4xl">📊</div>
					<h3 class="mb-2 text-xl font-semibold text-neutral-900">
						Suivi financier
					</h3>
					<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
						Vois tes revenus, tes commandes payées, tes paiements en attente. Une vision
						claire de ton activité.
					</p>
				</div>
				<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg">
					<div class="mb-4 text-4xl">📧</div>
					<h3 class="mb-2 text-xl font-semibold text-neutral-900">
						Envoi par email
					</h3>
					<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
						Envoie tes devis directement par email depuis la plateforme. Le client reçoit un
						devis professionnel avec tous les détails.
					</p>
				</div>
				<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg">
					<div class="mb-4 text-4xl">🔄</div>
					<h3 class="mb-2 text-xl font-semibold text-neutral-900">
						Transformation automatique
					</h3>
					<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
						Un devis validé se transforme automatiquement en commande. Quand le client paie,
						il devient une facture. Tout est lié.
					</p>
				</div>
				<div class="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
					<div class="mb-3 text-3xl">📁</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-800">
						Historique complet
					</h3>
					<p class="text-sm leading-relaxed text-neutral-700">
						Tous tes devis et factures sont stockés dans ton tableau de bord. Recherche
						facile, export possible pour ta comptabilité.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div bind:this={ctaContainer} class="relative mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
			<h2
				class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
				style="font-weight: 600; letter-spacing: -0.02em;"
			>
				Prêt à simplifier tes devis et factures ?
			</h2>
			<p class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl" style="font-weight: 300; letter-spacing: -0.01em;">
				Essaie notre logiciel de facturation gratuitement pendant 7 jours. Crée des devis en 2
				clics, génère des factures automatiques, suis tes paiements. Sans carte bancaire.
			</p>
			<div
				class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
			>
				<Button
					href="/register"
					class="h-14 rounded-xl bg-[#FF6F61] px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
				>
					Commencer mon essai gratuit
				</Button>
				<a
					href="/contact"
					class="inline-flex h-12 items-center justify-center rounded-xl border-2 border-neutral-800 bg-transparent px-6 text-sm font-semibold text-neutral-800 transition-colors duration-200 hover:bg-neutral-100"
				>
					Nous contacter
				</a>
			</div>
		</div>
	</section>

	<!-- FAQ Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-white via-[#FFE8D6]/5 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-4xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Questions fréquentes
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Tout ce que tu veux savoir sur les devis et factures
				</h2>
			</div>

			<div bind:this={faqContainer} class="space-y-4">
				{#each faq as faqItem}
					<Collapsible
						class="rounded-2xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white shadow-sm transition-all duration-300 hover:border-[#FF6F61] hover:shadow-lg"
					>
						<CollapsibleTrigger
							class="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-transparent"
						>
							<h3
								class="flex-1 break-words pr-4 text-lg font-semibold text-neutral-900 lg:text-xl"
							>
								{faqItem.question}
							</h3>
							<ChevronDown
								class="h-5 w-5 flex-shrink-0 text-neutral-500 transition-transform duration-200"
							/>
						</CollapsibleTrigger>
						<CollapsibleContent class="px-6 pb-6">
							<p class="text-base leading-[175%] text-neutral-700 lg:text-lg" style="font-weight: 300;">
								{faqItem.answer}
							</p>
						</CollapsibleContent>
					</Collapsible>
				{/each}
			</div>

			<div class="mt-8 text-center">
				<a
					href="/faq"
					class="inline-flex items-center justify-center rounded-xl border-2 border-[#FF6F61] bg-transparent px-6 py-3 text-sm font-semibold text-neutral-800 transition-colors duration-200 hover:bg-[#FFE8D6]"
				>
					Consulter toutes les questions
				</a>
			</div>
		</div>
	</section>

	<!-- Final CTA -->
	<section class="relative overflow-hidden border-t border-neutral-200 bg-gradient-to-b from-[#FFE8D6] via-[#FFE8D6]/95 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
			<h2
				class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
				style="font-weight: 600; letter-spacing: -0.02em;"
			>
				Essaie notre logiciel de facturation dès maintenant
			</h2>
			<p class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl" style="font-weight: 300; letter-spacing: -0.01em;">
				Rejoins les pâtissiers qui utilisent Pattyly pour simplifier leurs devis et factures.
				Essai gratuit 7 jours, sans carte bancaire.
			</p>
			<div
				class="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
			>
				<Button
					href="/register"
					class="h-14 rounded-xl bg-[#FF6F61] px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
				>
					Commencer maintenant
				</Button>
				<a
					href="/pricing"
					class="inline-flex h-12 items-center justify-center rounded-xl border-2 border-neutral-800 bg-transparent px-6 text-sm font-semibold text-neutral-800 transition-colors duration-200 hover:bg-neutral-100"
				>
					Voir les tarifs
				</a>
			</div>
		</div>
	</section>
</main>

