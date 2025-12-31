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
	let exampleContainer: HTMLElement;
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
		if (exampleContainer) await revealElement(exampleContainer, { delay: 0, duration: 0.6 });
		if (faqContainer) await revealStagger(faqContainer, ':scope > *', { delay: 0.1, stagger: 0.05 });
		if (ctaContainer) await revealElement(ctaContainer, { delay: 0, duration: 0.6 });
	});

	const painPoints = [
		{
			icon: '📝',
			title: 'Les formulaires Google qui ne suffisent pas',
			description:
				'Google Forms est basique : pas de calcul de prix automatique, pas de gestion des options payantes, pas d\'intégration avec tes commandes. Tu dois tout faire manuellement ensuite.',
		},
		{
			icon: '💬',
			title: 'Les messages Instagram répétitifs',
			description:
				'Tes clients te posent les mêmes questions 50 fois : "C\'est combien avec cette décoration ?", "Tu fais quelle taille ?". Tu perds du temps à répéter les mêmes informations.',
		},
		{
			icon: '❌',
			title: 'Les commandes incomplètes',
			description:
				'Par message, tes clients oublient des informations importantes : la date, les préférences, les allergies. Tu dois les recontacter, ça fait perdre du temps.',
		},
		{
			icon: '💰',
			title: 'Pas de calcul automatique des prix',
			description:
				'Quand un client choisit plusieurs options, tu dois calculer le prix à la main. Risque d\'erreur, et tu perds du temps à chaque demande personnalisée.',
		},
	];

	const benefits = [
		{
			icon: '🎨',
			title: 'Formulaires de personnalisation complets',
			description:
				'Crée des formulaires sur mesure pour chaque gâteau : couleurs, décorations, toppers, tailles. Tes clients choisissent leurs options directement, sans te poser de questions.',
		},
		{
			icon: '💵',
			title: 'Calcul automatique des prix',
			description:
				'Définis des suppléments payants pour chaque option (+5€ pour un topper, +10€ pour une décoration premium). Le prix se calcule automatiquement selon les choix du client.',
		},
		{
			icon: '📋',
			title: 'Toutes les infos en une fois',
			description:
				'Tes clients remplissent tout : date souhaitée, préférences, allergies, message personnalisé. Tu reçois une commande complète, prête à être préparée.',
		},
		{
			icon: '⚡',
			title: 'Intégré à ta gestion',
			description:
				'Les commandes passées via le formulaire arrivent directement dans ton tableau de bord. Plus besoin de copier-coller les informations : tout est centralisé.',
		},
	];

	const howItWorks = [
		{
			step: '1',
			title: 'Crée ton formulaire de personnalisation',
			description:
				'Pour chaque gâteau, définis les options possibles : couleurs de glaçage, types de décorations, toppers, tailles. Ajoute des suppléments payants si besoin.',
		},
		{
			step: '2',
			title: 'Configure les prix',
			description:
				'Définis le prix de base du gâteau, puis les suppléments pour chaque option. Le système calcule automatiquement le prix final selon les choix du client.',
		},
		{
			step: '3',
			title: 'Partage ton formulaire',
			description:
				'Quand un client visite ta boutique et choisit un gâteau, il voit automatiquement le formulaire de personnalisation. Il remplit ses préférences directement.',
		},
		{
			step: '4',
			title: 'Reçois la commande complète',
			description:
				'Tu reçois une notification avec toutes les informations : gâteau choisi, options sélectionnées, prix calculé, date souhaitée. La commande est prête à être préparée.',
		},
	];

	const faq = [
		{
			question: 'Puis-je créer plusieurs formulaires différents ?',
			answer:
				'Oui ! Chaque gâteau peut avoir son propre formulaire de personnalisation. Un gâteau d\'anniversaire aura des options différentes d\'un gâteau de mariage. Tu adaptes les formulaires à chaque type de création.',
		},
		{
			question: 'Comment fonctionne le calcul automatique des prix ?',
			answer:
				'Tu définis un prix de base pour chaque gâteau, puis tu ajoutes des suppléments pour les options (par exemple : +5€ pour un topper en sucre, +10€ pour une décoration premium). Quand un client choisit ses options, le prix se calcule automatiquement. Plus besoin de calculer à la main !',
		},
		{
			question: 'Mes clients peuvent-ils voir le prix avant de commander ?',
			answer:
				'Oui, absolument ! Le prix se met à jour en temps réel selon les options choisies. Tes clients voient exactement combien ça coûte avant de valider leur commande. Plus de surprises, plus de négociations.',
		},
		{
			question: 'Puis-je rendre certaines options obligatoires ?',
			answer:
				'Oui, tu peux définir quelles options sont obligatoires et lesquelles sont optionnelles. Par exemple, tu peux rendre le choix de la taille obligatoire, mais laisser les décorations en option.',
		},
		{
			question: 'Quelle est la différence avec Google Forms ?',
			answer:
				'Google Forms est un outil générique basique. Avec Pattyly, tu as un formulaire spécialement conçu pour les pâtissiers : calcul automatique des prix, gestion des options payantes, intégration directe avec tes commandes. Plus besoin de copier-coller les informations : tout est automatique.',
		},
		{
			question: 'Puis-je modifier un formulaire après l\'avoir créé ?',
			answer:
				'Oui, tu peux modifier tes formulaires à tout moment : ajouter des options, changer les prix, rendre certaines options obligatoires. Les modifications s\'appliquent aux nouvelles commandes, pas aux commandes déjà passées.',
		},
	];

	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Formulaire de commande de gâteau en ligne - Personnalisation gâteaux | Pattyly',
		description:
			'Créez des formulaires de commande de gâteau en ligne avec personnalisation complète. Calcul automatique des prix, options payantes, intégration directe avec votre gestion. Spécialement conçu pour les pâtissiers.',
		about: {
			'@type': 'Thing',
			name: 'Formulaire commande gâteau',
		},
	};

	const productSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Pattyly - Formulaire de commande de gâteau en ligne',
		applicationCategory: 'BusinessApplication',
		operatingSystem: 'Web',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'EUR',
			availability: 'https://schema.org/InStock',
			description: 'Version gratuite disponible, sans carte bancaire',
		},
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '4.8',
			reviewCount: '50',
		},
		description:
			'Créez des formulaires de commande de gâteau en ligne avec personnalisation complète. Calcul automatique des prix, options payantes.',
		url: 'https://pattyly.com/formulaire-commande-gateau',
	};
</script>

<svelte:head>
	<title
		>Formulaire de commande de gâteau en ligne | Personnalisation gâteaux - {WebsiteName}</title
	>
	<meta
		name="description"
		content="Créez des formulaires de commande de gâteau en ligne avec personnalisation complète. Calcul automatique des prix, options payantes, intégration directe. Spécialement conçu pour les pâtissiers. Version gratuite disponible."
	/>
	<meta
		name="keywords"
		content="formulaire commande gâteau, formulaire commande gâteau en ligne, formulaire pâtisserie personnalisé, prise de commande pâtisserie, commande gâteau en ligne, outil prise de commande cake design, formulaire commande pâtissier, commande gâteau personnalisé en ligne, système de commande pour pâtissier"
	/>
	<meta
		property="og:title"
		content="Formulaire de commande de gâteau en ligne | Personnalisation gâteaux - {WebsiteName}"
	/>
	<meta
		property="og:description"
		content="Créez des formulaires de commande de gâteau en ligne avec personnalisation complète. Calcul automatique des prix, options payantes, intégration directe."
	/>
	<meta property="og:type" content="website" />
	<meta
		property="og:url"
		content="https://pattyly.com/formulaire-commande-gateau"
	/>
	<meta property="og:image" content="/images/logo_text.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="canonical" href="https://pattyly.com/formulaire-commande-gateau" />
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
					Formulaire commande gâteau
				</p>
				<h1
					class="mt-4 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Formulaires de commande intelligents pour tes gâteaux personnalisés
				</h1>
				<p 
					bind:this={heroContent}
					class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Fini les messages Instagram répétitifs et les calculs de prix à la main. Crée des
					formulaires de personnalisation complets, avec calcul automatique des prix. Tes
					clients choisissent leurs options, tu reçois une commande complète et prête.
				</p>
				<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
					<Button
						href="/register"
						class="h-14 rounded-xl bg-[#FF6F61] px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
					>
						Commencer gratuitement
					</Button>
					<a
						href="/pricing"
						class="inline-flex h-14 items-center justify-center rounded-xl border-2 border-neutral-800 bg-transparent px-6 text-sm font-semibold text-neutral-800 transition-colors duration-200 hover:bg-neutral-100"
					>
						Voir les tarifs
					</a>
				</div>
				<p class="mt-4 text-sm font-light text-neutral-600">
					✔️ <strong>Version gratuite disponible</strong> • Sans carte bancaire • Configuration en 5
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
					Avantages des formulaires
				</h2>
				<ul class="mt-6 space-y-4 text-left">
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Personnalisation complète (couleurs, décorations, toppers, tailles)</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Calcul automatique des prix selon les options choisies</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Options payantes (suppléments pour décorations premium)</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Intégration directe avec ta gestion (pas de copier-coller)</span>
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
					Les problèmes sans formulaire intelligent
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
					Des formulaires de commande qui travaillent pour toi
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
					Crée ton formulaire en 4 étapes
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

	<!-- Example Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-white via-[#FFE8D6]/5 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Exemple concret
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Comment fonctionne le calcul automatique des prix
				</h2>
			</div>

			<div
				bind:this={exampleContainer}
				class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-neutral-50 via-white to-neutral-50 p-8 shadow-xl md:p-12"
			>
				<div class="grid gap-8 md:grid-cols-2 md:items-center">
					<div>
						<h3 class="mb-4 text-xl font-semibold text-neutral-800">
							Exemple : Gâteau d'anniversaire personnalisé
						</h3>
						<div class="space-y-3 text-sm text-neutral-700 md:text-base">
							<div class="flex items-center justify-between rounded-lg bg-white p-3">
								<span>Prix de base</span>
								<span class="font-semibold">35€</span>
							</div>
							<div class="flex items-center justify-between rounded-lg bg-white p-3">
								<span>Topper personnalisé (+5€)</span>
								<span class="font-semibold text-green-600">+5€</span>
							</div>
							<div class="flex items-center justify-between rounded-lg bg-white p-3">
								<span>Décoration premium (+10€)</span>
								<span class="font-semibold text-green-600">+10€</span>
							</div>
							<div
								class="mt-4 flex items-center justify-between rounded-lg border-2 border-[#FF6F61] bg-[#FFE8D6] p-4"
							>
								<span class="font-semibold text-neutral-800">Prix total</span>
								<span class="text-xl font-bold text-[#FF6F61]">50€</span>
							</div>
						</div>
					</div>
					<div class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
						<h4 class="mb-4 font-semibold text-neutral-800">
							Avantages pour toi
						</h4>
						<ul class="space-y-2 text-sm text-neutral-700">
							<li class="flex items-start gap-2">
								<span class="text-[#FF6F61]">✓</span>
								<span>Plus besoin de calculer à la main</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-[#FF6F61]">✓</span>
								<span>Pas d'erreur de calcul</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-[#FF6F61]">✓</span>
								<span>Le client voit le prix avant de commander</span>
							</li>
							<li class="flex items-start gap-2">
								<span class="text-[#FF6F61]">✓</span>
								<span>La commande arrive avec toutes les infos</span>
							</li>
						</ul>
					</div>
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
				Prêt à créer tes formulaires de commande ?
			</h2>
			<p class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl" style="font-weight: 300; letter-spacing: -0.01em;">
				Crée des formulaires de personnalisation complets, avec calcul automatique des prix.
				Fini les messages répétitifs, fini les calculs à la main.
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
					Tout ce que tu veux savoir sur les formulaires de commande
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
				Crée tes formulaires de commande dès maintenant
			</h2>
			<p class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl" style="font-weight: 300; letter-spacing: -0.01em;">
				Rejoins les pâtissiers qui utilisent Pattyly pour simplifier la prise de commande.
				Version gratuite disponible, sans carte bancaire.
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

