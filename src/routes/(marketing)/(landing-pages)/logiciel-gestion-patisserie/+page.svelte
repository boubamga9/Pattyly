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
	let featuresContainer: HTMLElement;
	let comparisonContainer: HTMLElement;
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
		if (featuresContainer) {
			await revealStagger(featuresContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		}
		if (comparisonContainer) await revealElement(comparisonContainer, { delay: 0, duration: 0.6 });
		if (faqContainer) await revealStagger(faqContainer, ':scope > *', { delay: 0.1, stagger: 0.05 });
		if (ctaContainer) await revealElement(ctaContainer, { delay: 0, duration: 0.6 });
	});

	const painPoints = [
		{
			icon: '📊',
			title: 'Jongler entre plusieurs outils',
			description:
				'Excel pour les commandes, Instagram DM pour communiquer, Word pour les devis, des notes partout. Tu perds du temps à chercher les informations et tu fais des erreurs.',
		},
		{
			icon: '⏱️',
			title: 'Trop de temps passé sur l\'administratif',
			description:
				'Tu passes 3-4 heures par jour à gérer tes commandes, créer tes devis, suivre tes paiements. Tu n\'as plus de temps pour créer et faire grandir ton activité.',
		},
		{
			icon: '💸',
			title: 'Pas de suivi financier clair',
			description:
				'Tu ne sais pas exactement combien tu as gagné ce mois, quels sont tes clients qui paient en retard, ou quels gâteaux se vendent le mieux. Pas de visibilité sur ton activité.',
		},
		{
			icon: '📅',
			title: 'Gestion du planning chaotique',
			description:
				'Tu notes tes disponibilités sur un calendrier papier ou dans ton téléphone. Tu oublies des commandes, tu double-book, et tu dois tout gérer mentalement.',
		},
	];

	const benefits = [
		{
			icon: '🎯',
			title: 'Tout centralisé en un seul endroit',
			description:
				'Commandes, devis, factures, planning, clients : tout est dans ton tableau de bord. Plus besoin de jongler entre plusieurs outils. Un seul endroit pour tout gérer.',
		},
		{
			icon: '⚡',
			title: 'Gain de temps considérable',
			description:
				'Automatisation des devis et factures, notifications automatiques, suivi des paiements. Tu récupères jusqu\'à 2h par jour pour te concentrer sur la création.',
		},
		{
			icon: '📈',
			title: 'Suivi financier en temps réel',
			description:
				'Vois tes revenus, tes commandes en cours, tes paiements en attente. Une vision claire de ton activité pour prendre les bonnes décisions.',
		},
		{
			icon: '🗓️',
			title: 'Planning intelligent',
			description:
				'Gère tes disponibilités, tes délais de préparation, tes jours de fermeture. Tes clients voient automatiquement ce qui est possible et réserver directement.',
		},
	];

	const features = [
		{
			title: 'Gestion des commandes',
			description:
				'Reçois et organise toutes tes commandes depuis un seul endroit. Suis l\'état de chaque commande, communique avec tes clients, valide les paiements en quelques clics.',
		},
		{
			title: 'Devis et factures automatiques',
			description:
				'Notre logiciel de devis pour cake designers génère automatiquement des devis professionnels. Transforme-les en factures quand le client paie. Plus besoin de Word ou Excel.',
		},
		{
			title: 'Boutique en ligne intégrée',
			description:
				'Crée ta boutique en ligne directement depuis ton tableau de bord. Ajoute tes gâteaux, configure tes prix, et reçois des commandes 24/7.',
		},
		{
			title: 'Planning des disponibilités',
			description:
				'Définis tes créneaux disponibles, tes jours de fermeture, tes délais de préparation. Tes clients voient en temps réel ce qui est possible.',
		},
		{
			title: 'Suivi des paiements',
			description:
				'Notre logiciel de facturation pour pâtissiers suit tous tes paiements. Vois qui a payé, qui est en attente, et génère tes factures automatiquement.',
		},
		{
			title: 'Base de données clients',
			description:
				'Conserve toutes les informations de tes clients : commandes passées, préférences, historique. Un outil précieux pour fidéliser et personnaliser.',
		},
	];

	const faq = [
		{
			question: 'Quelle est la différence entre Pattyly et Excel ?',
			answer:
				'Excel est un tableur générique, Pattyly est un logiciel de gestion spécialement conçu pour les pâtissiers. Avec Excel, tu dois tout créer toi-même : les formules, les tableaux, les suivis. Avec Pattyly, tout est déjà pensé : gestion des commandes, devis automatiques, facturation, planning. Tu gagnes un temps énorme et tu évites les erreurs.',
		},
		{
			question: 'Puis-je utiliser Pattyly si je suis auto-entrepreneur ?',
			answer:
				'Absolument ! Pattyly est parfaitement adapté aux cake designers auto-entrepreneurs. Notre logiciel de facturation génère automatiquement les devis et factures que tu peux utiliser pour ta comptabilité. Tu gères toute ton activité depuis un seul outil, sans avoir besoin de plusieurs logiciels coûteux.',
		},
		{
			question: 'Combien ça coûte par rapport à un logiciel classique ?',
			answer:
				'Pattyly démarre à partir de [prix]€ par mois, ce qui est bien moins cher qu\'un développeur web ou une solution e-commerce classique. Tu as accès à tout : boutique en ligne, gestion des commandes, devis, facturation, planning. Et tu peux essayer gratuitement pendant 7 jours, sans carte bancaire.',
		},
		{
			question: 'Dois-je avoir des connaissances techniques ?',
			answer:
				'Pas du tout ! Pattyly est conçu pour être ultra-simple. Tu crées ton compte, tu configures ta boutique, et c\'est prêt. Pas besoin de savoir coder, de configurer des serveurs, ou de payer un développeur. Tout est intuitif et pensé pour les pâtissiers.',
		},
		{
			question: 'Puis-je exporter mes données ?',
			answer:
				'Oui, tu restes propriétaire de tes données. Tu peux exporter tes commandes, tes produits, et tes informations clients à tout moment depuis ton tableau de bord. L\'export se fait au format CSV, compatible avec Excel ou Google Sheets.',
		},
		{
			question: 'Comment ça se compare à ProCake ou Cake Designer Club ?',
			answer:
				'Pattyly est plus simple et plus abordable. Contrairement aux solutions complexes, tout est déjà pensé pour les pâtissiers : pas besoin de configurer des plugins ou de payer des fonctionnalités séparées. Tu as accès à tout (boutique en ligne, devis, facturation, planning) dans un seul outil, à un prix transparent.',
		},
	];

	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Logiciel de gestion pour pâtissiers - Gestion commandes, devis, factures | Pattyly',
		description:
			'Logiciel de gestion complet pour pâtissiers et cake designers. Gérez vos commandes, devis, factures et planning depuis un seul tableau de bord. Spécialement conçu pour les pâtissiers indépendants.',
		about: {
			'@type': 'Thing',
			name: 'Logiciel gestion pâtisserie',
		},
	};

	const productSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Pattyly - Logiciel de gestion pour pâtissiers',
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
			'Logiciel de gestion complet pour pâtissiers. Gérez commandes, devis, factures et planning depuis un seul tableau de bord.',
		url: 'https://pattyly.com/logiciel-gestion-patisserie',
	};
</script>

<svelte:head>
	<title
		>Logiciel de gestion pour pâtissiers | Gestion commandes, devis, factures - {WebsiteName}</title
	>
	<meta
		name="description"
		content="Logiciel de gestion complet pour pâtissiers. Gérez commandes, devis, factures et planning depuis un seul tableau de bord. Spécialement conçu pour cake designers et pâtissiers indépendants. Essai gratuit 7 jours."
	/>
	<meta
		name="keywords"
		content="logiciel gestion pâtisserie, logiciel gestion cake designer, logiciel facturation pâtissier, gestion commandes pâtisserie, logiciel devis pâtisserie, logiciel facture pâtisserie, logiciel pricing gâteau, suivi commandes pâtisserie, alternative excel pâtisserie, meilleur logiciel pâtisserie"
	/>
	<meta
		property="og:title"
		content="Logiciel de gestion pour pâtissiers | Gestion commandes, devis, factures - {WebsiteName}"
	/>
	<meta
		property="og:description"
		content="Logiciel de gestion complet pour pâtissiers. Gérez commandes, devis, factures et planning depuis un seul tableau de bord. Spécialement conçu pour les pâtissiers indépendants."
	/>
	<meta property="og:type" content="website" />
	<meta
		property="og:url"
		content="https://pattyly.com/logiciel-gestion-pâtisserie"
	/>
	<meta property="og:image" content="/images/logo_text.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="canonical" href="https://pattyly.com/logiciel-gestion-patisserie" />
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
					Logiciel gestion pâtisserie
				</p>
				<h1
					class="mt-4 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Le logiciel de gestion pensé pour les pâtissiers indépendants
				</h1>
				<p 
					bind:this={heroContent}
					class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Fini de jongler entre Excel, Instagram DM et tes notes. Gère toutes tes commandes,
					devis, factures et ton planning depuis un seul tableau de bord. Un logiciel de
					gestion complet, spécialement conçu pour les cake designers.
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
					Tout ce dont tu as besoin
				</h2>
				<ul class="mt-6 space-y-4 text-left">
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Gestion complète des commandes (suivi, statuts, notifications)</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Logiciel de devis et facturation automatique</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Planning des disponibilités et délais de préparation</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Boutique en ligne intégrée (tout-en-un)</span>
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
					Les problèmes sans logiciel de gestion
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
					Ton logiciel de gestion, simplifié
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

	<!-- Features Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-[#FFE8D6] via-[#FFE8D6]/95 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Fonctionnalités complètes
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Tout ce dont tu as besoin pour gérer ton activité
				</h2>
			</div>

			<div bind:this={featuresContainer} class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
				{#each features as feature}
					<div
						class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg"
					>
						<h3 class="mb-3 text-xl font-semibold text-neutral-900">
							{feature.title}
						</h3>
						<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
							{feature.description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Comparison Section -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Pourquoi choisir Pattyly
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Pattyly vs solutions classiques
				</h2>
			</div>

			<div
				bind:this={comparisonContainer}
				class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-neutral-50 via-white to-neutral-50 p-8 shadow-xl md:p-12"
			>
				<div class="overflow-x-auto">
					<table class="w-full text-left">
						<thead>
							<tr class="border-b border-neutral-200">
								<th class="pb-4 text-base font-semibold text-neutral-800"></th>
								<th class="pb-4 text-base font-semibold text-neutral-800">
									Pattyly
								</th>
								<th class="pb-4 text-base font-semibold text-neutral-600">
									Excel + autres outils
								</th>
								<th class="pb-4 text-base font-semibold text-neutral-600">
									Solutions e-commerce classiques
								</th>
							</tr>
						</thead>
						<tbody class="text-sm md:text-base">
							<tr class="border-b border-neutral-200">
								<td class="py-4 font-medium text-neutral-800">
									Gestion des commandes
								</td>
								<td class="py-4 text-center">
									<span class="text-green-600">✓</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
							</tr>
							<tr class="border-b border-neutral-200">
								<td class="py-4 font-medium text-neutral-800">
									Devis automatiques
								</td>
								<td class="py-4 text-center">
									<span class="text-green-600">✓</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
							</tr>
							<tr class="border-b border-neutral-200">
								<td class="py-4 font-medium text-neutral-800">
									Facturation automatique
								</td>
								<td class="py-4 text-center">
									<span class="text-green-600">✓</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
							</tr>
							<tr class="border-b border-neutral-200">
								<td class="py-4 font-medium text-neutral-800">
									Boutique en ligne intégrée
								</td>
								<td class="py-4 text-center">
									<span class="text-green-600">✓</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
								<td class="py-4 text-center">
									<span class="text-green-600">✓</span>
								</td>
							</tr>
							<tr class="border-b border-neutral-200">
								<td class="py-4 font-medium text-neutral-800">
									Spécialisé pour pâtissiers
								</td>
								<td class="py-4 text-center">
									<span class="text-green-600">✓</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
								<td class="py-4 text-center text-neutral-600">
									<span class="text-neutral-400">✗</span>
								</td>
							</tr>
						</tbody>
					</table>
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
				Prêt à simplifier la gestion de ton activité ?
			</h2>
			<p class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl" style="font-weight: 300; letter-spacing: -0.01em;">
				Essaie Pattyly gratuitement pendant 7 jours. Gère toutes tes commandes, devis,
				factures et planning depuis un seul tableau de bord. Sans carte bancaire.
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
					class="inline-flex h-14 items-center justify-center rounded-xl border-2 border-neutral-800 bg-transparent px-6 text-sm font-semibold text-neutral-800 transition-colors duration-200 hover:bg-neutral-100"
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
					Tout ce que tu veux savoir sur notre logiciel de gestion
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
				Essaie notre logiciel de gestion dès maintenant
			</h2>
			<p class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl" style="font-weight: 300; letter-spacing: -0.01em;">
				Rejoins les pâtissiers qui ont choisi Pattyly pour simplifier la gestion de leur
				activité. Essai gratuit 7 jours, sans carte bancaire.
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
					class="inline-flex h-14 items-center justify-center rounded-xl border-2 border-neutral-800 bg-transparent px-6 text-sm font-semibold text-neutral-800 transition-colors duration-200 hover:bg-neutral-100"
				>
					Voir les tarifs
				</a>
			</div>
		</div>
	</section>
</main>

