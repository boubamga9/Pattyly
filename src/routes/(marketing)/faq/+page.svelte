<script lang="ts">
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger,
	} from '$lib/components/ui/collapsible';
	import { ChevronDown } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { WebsiteName } from '../../../config';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	// FAQ organisée par catégories (structure placemoi, charte pattyly)
	const faqSections = [
		{
			id: 'configuration',
			title: 'Configuration et démarrage',
			items: [
				{
					question: 'Combien de temps ça prend pour configurer ma boutique ?',
					answer:
						'Environ 5 minutes ! Tu peux créer ton compte, ajouter tes premiers produits et commencer à recevoir des commandes en moins de 10 minutes. Pas besoin de connaissances techniques. Notre interface intuitive te guide étape par étape pour configurer ta boutique en ligne de pâtisserie.',
				},
				{
					question: 'Est-ce que je peux personnaliser mes gâteaux ?',
					answer:
						'Absolument ! Tu peux créer des formulaires de personnalisation pour chaque gâteau avec des options (couleurs, décorations, toppers) et même des suppléments payants. Notre logiciel de gestion pour cake designers te permet de proposer une expérience de commande personnalisée à tes clients, tout en gardant le contrôle sur tes prix et options.',
				},
			],
		},
		{
			id: 'paiements',
			title: 'Paiements et facturation',
			items: [
				{
					question: 'Comment ça marche pour les paiements ?',
					answer:
						"PayPal gère tout ! Tes clients paient en ligne de manière sécurisée via ton lien PayPal.me, et l'argent arrive directement sur ton compte PayPal. Tu valides ensuite la réception sur la plateforme. Notre système de facturation pour pâtissiers génère automatiquement les confirmations de paiement.",
				},
				{
					question: 'Comment calculer le prix de revient d\'un gâteau ?',
					answer:
						'Notre logiciel de gestion pour pâtissiers te permet de définir le prix de chaque produit avec des options de personnalisation tarifées. Tu peux ajouter des suppléments payants (toppers, décorations spéciales) directement dans tes formulaires de commande. Pour calculer ton prix de revient, nous te recommandons de prendre en compte le coût des matières premières, le temps de préparation, et tes frais fixes.',
				},
			],
		},
		{
			id: 'commandes',
			title: 'Gestion des commandes',
			items: [
				{
					question: 'Est-ce que mes clients doivent créer un compte ?',
					answer:
						"Non, ils peuvent commander directement sans inscription compliquée. L'expérience est fluide et pensée pour éviter les abandons de commande. Tes clients remplissent simplement le formulaire de commande en ligne avec leurs informations, et reçoivent une confirmation par email.",
				},
				{
					question: 'Est-ce que je peux gérer mes disponibilités ?',
					answer:
						'Oui ! Tu définis tes créneaux disponibles, tes jours de fermeture, et même tes délais de préparation par gâteau. Tes clients voient en temps réel ce qui est possible. Notre logiciel de gestion pour pâtissiers te permet de gérer ton planning efficacement et d\'éviter les surcharges.',
				},
				{
					question: 'Mes clients vont-ils recevoir des confirmations ?',
					answer:
						'Oui, chaque commande envoie automatiquement un email de confirmation au client et à toi, pour éviter tout malentendu. Les emails sont personnalisés avec les détails de la commande, les options choisies, et les informations de livraison ou retrait.',
				},
				{
					question: 'Comment gérer les commandes de gâteaux de mariage ou d\'événements ?',
					answer:
						'Notre logiciel de gestion te permet de créer des formulaires de commande personnalisés pour chaque type de gâteau. Pour les commandes importantes comme les mariages, tu peux définir des délais de préparation spécifiques, des options de personnalisation détaillées, et même des devis personnalisés. Le système gère automatiquement les confirmations et les rappels.',
				},
			],
		},
		{
			id: 'general',
			title: 'Questions générales',
			items: [
				{
					question: 'Et si je veux arrêter ?',
					answer:
						"Tu es libre à 100% ! Pas d'engagement, pas de frais cachés. Tu peux arrêter quand tu veux, et tes données restent à toi. On croit à la liberté des entrepreneurs. Tu peux exporter toutes tes données à tout moment depuis ton tableau de bord.",
				},
				{
					question: 'Quelle est la différence entre Pattyly et un site e-commerce classique ?',
					answer:
						'Pattyly est spécialement conçu pour les cake designers et pâtissiers indépendants. Contrairement à un site e-commerce classique, notre plateforme intègre la gestion des devis, la facturation, le planning des disponibilités, et les formulaires de personnalisation de gâteaux. Tout est centralisé dans un seul outil, sans avoir besoin de plusieurs logiciels.',
				},
				{
					question: 'Puis-je intégrer Pattyly avec mon compte Instagram ?',
					answer:
						'Actuellement, Pattyly fonctionne comme une boutique en ligne indépendante avec son propre lien. Tu peux partager le lien de ta boutique sur Instagram, et tes clients peuvent commander directement. Nous travaillons sur des intégrations futures pour faciliter encore plus la promotion de tes créations.',
				},
				{
					question: 'Est-ce que je peux utiliser Pattyly si je suis auto-entrepreneur ?',
					answer:
						'Absolument ! Pattyly est parfaitement adapté aux cake designers auto-entrepreneurs. Notre logiciel de facturation pour pâtissiers génère automatiquement les devis et factures que tu peux utiliser pour ta comptabilité. Tu peux gérer toutes tes commandes, ta boutique en ligne, et ta facturation depuis un seul outil.',
				},
			],
		},
	];

	// Flatten pour le schema.org
	const faqItems = faqSections.flatMap((section) => section.items);

	// Schema.org FAQPage pour SEO
	const faqStructuredData = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqItems.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: item.answer,
			},
		})),
	};

	let heroTitle: HTMLElement;
	let heroContent: HTMLElement;
	let heroCard: HTMLElement;
	let navContainer: HTMLElement;
	let sectionsContainer: HTMLElement;
	let ctaContainer: HTMLElement;

	onMount(async () => {
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.6 });
		if (heroContent) await revealElement(heroContent, { delay: 0.1, duration: 0.6 });
		if (heroCard) await revealElement(heroCard, { delay: 0.2, duration: 0.6 });
		if (navContainer) await revealElement(navContainer, { delay: 0.3, duration: 0.6 });
		if (sectionsContainer) await revealStagger(sectionsContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		if (ctaContainer) await revealElement(ctaContainer, { delay: 0, duration: 0.6 });
	});
</script>

<svelte:head>
	<title>FAQ - Questions fréquentes | {WebsiteName}</title>
	<meta
		name="description"
		content="FAQ Pattyly : toutes tes questions sur notre logiciel de gestion pour cake designers. Configuration, paiements, commandes. Réponses détaillées en 2 minutes."
	/>
	<meta
		name="keywords"
		content="FAQ, questions fréquentes, aide, support, logiciel gestion pâtisserie, cake designer, boutique en ligne pâtisserie"
	/>
	<meta property="og:title" content="FAQ - Questions fréquentes | {WebsiteName}" />
	<meta
		property="og:description"
		content="FAQ complète sur Pattyly : configuration, paiements, gestion des commandes. Tout ce que tu veux savoir sur notre logiciel de gestion pour cake designers."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/faq" />
	<link rel="canonical" href="https://pattyly.com/faq" />
	<script type="application/ld+json">
		{JSON.stringify(faqStructuredData)}
	</script>
</svelte:head>

<main class="flex flex-col">
	<!-- Hero Section avec style premium -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<!-- Background subtle gradient -->
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
				<div bind:this={heroContent} class="max-w-3xl space-y-8">
					<p 
						bind:this={heroTitle}
						class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]"
					>
						Foire aux questions
					</p>
					<h1
						class="text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
						style="font-weight: 600; letter-spacing: -0.03em;"
					>
						Des questions ?<br />
						<span class="text-[#FF6F61]">On répond à tout</span>
					</h1>
					<p 
						class="text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
						style="font-weight: 300; letter-spacing: -0.01em;"
					>
						Retrouve ici les informations essentielles pour démarrer avec Pattyly
						et faire grandir ton activité de cake designer.
					</p>
				</div>

				<div 
					bind:this={heroCard}
					class="w-full max-w-md rounded-3xl border-2 border-[#FF6F61] bg-gradient-to-br from-white via-[#FFE8D6]/20 to-white p-10 shadow-xl"
				>
					<h2 class="text-2xl font-semibold leading-tight text-neutral-900">
						Par où commencer ?
					</h2>
					<p class="mt-4 text-base leading-relaxed text-neutral-700">
						Crée gratuitement ton compte, configure ta boutique en quelques minutes
						et commence à recevoir tes premières commandes. Version gratuite disponible à vie.
					</p>
					<a
						href="/register"
						class="mt-8 inline-flex h-14 w-full items-center justify-center rounded-xl bg-[#FF6F61] px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
					>
						Créer mon compte
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Navigation des sections avec style premium -->
	<nav bind:this={navContainer} class="border-y border-neutral-200 bg-white py-12">
		<div class="mx-auto flex max-w-6xl flex-wrap justify-center gap-4 px-6 sm:px-8 lg:px-12">
			{#each faqSections as section}
				<a
					href={`#${section.id}`}
					class="rounded-full border-2 border-[#FF6F61] bg-white px-6 py-3 text-sm font-semibold text-neutral-800 transition-all duration-300 hover:bg-[#FF6F61] hover:text-white hover:scale-105"
				>
					{section.title}
				</a>
			{/each}
		</div>
	</nav>

	<!-- FAQ Sections avec style premium -->
	<section bind:this={sectionsContainer} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<!-- Background subtle -->
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto flex max-w-5xl flex-col gap-20 px-6 sm:px-8 lg:px-12">
			{#each faqSections as section}
				<div id={section.id} class="scroll-mt-24 space-y-10 mb-20">
					<div class="text-center">
						<h2 
							class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
							style="font-weight: 600; letter-spacing: -0.02em;"
						>
							{section.title}
						</h2>
						<div class="mt-4 flex items-center justify-center gap-4">
							<div class="h-px w-16 bg-neutral-300"></div>
							<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
							<div class="h-px w-16 bg-neutral-300"></div>
						</div>
					</div>
					<div class="space-y-4">
						{#each section.items as item}
							<Collapsible class="group rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:border-[#FF6F61] hover:shadow-md">
								<CollapsibleTrigger
									class="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-neutral-50/50"
								>
									<h3 class="flex-1 pr-4 text-lg font-medium leading-relaxed text-neutral-900 sm:text-xl">
										{item.question}
									</h3>
									<ChevronDown class="h-5 w-5 flex-shrink-0 text-neutral-500 transition-transform duration-200 group-data-[state=open]:rotate-180" />
								</CollapsibleTrigger>
								<CollapsibleContent class="px-6 pb-6">
									<p class="text-base leading-[175%] text-neutral-600 sm:text-lg" style="font-weight: 300;">
										{item.answer}
									</p>
								</CollapsibleContent>
							</Collapsible>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- CTA Final avec style premium -->
	<section bind:this={ctaContainer} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<!-- Background subtle gradient -->
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/20 to-transparent"></div>
		
		<div class="relative mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
			<h2 
				class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
				style="font-weight: 600; letter-spacing: -0.02em;"
			>
				Tu n'as pas trouvé la réponse ?
			</h2>
			<p 
				class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				Écris-nous via le formulaire de contact. Nous serons ravis de t'aider
				à faire grandir ton activité de cake designer.
			</p>
			<div class="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a
					href="/contact"
					class="inline-flex h-14 items-center justify-center rounded-xl bg-[#FF6F61] px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
				>
					Contacter l'équipe Pattyly
				</a>
				<a
					href="/register"
					class="inline-flex h-14 items-center justify-center rounded-xl border-2 border-[#FF6F61] bg-white px-8 text-base font-semibold text-[#FF6F61] transition-all duration-300 hover:bg-[#FFE8D6] hover:scale-[1.02]"
				>
					Commencer gratuitement
				</a>
			</div>
		</div>
	</section>
</main>
