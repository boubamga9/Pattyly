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
	let useCaseContainer: HTMLElement;
	let tipsContainer: HTMLElement;
	let ctaContainer: HTMLElement;
	let faqContainer: HTMLElement;
	let finalCtaContainer: HTMLElement;

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
		if (useCaseContainer) await revealElement(useCaseContainer, { delay: 0, duration: 0.6 });
		if (tipsContainer) {
			await revealStagger(tipsContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		}
		if (ctaContainer) await revealElement(ctaContainer, { delay: 0, duration: 0.6 });
		if (faqContainer) await revealStagger(faqContainer, ':scope > *', { delay: 0.1, stagger: 0.05 });
		if (finalCtaContainer) await revealElement(finalCtaContainer, { delay: 0, duration: 0.6 });
	});

	const painPoints = [
		{
			icon: '📱',
			title: 'Les messages Instagram qui s\'accumulent',
			description:
				'Tu reçois des dizaines de messages par jour : "C\'est combien ?", "Tu fais quel gâteau ?", "C\'est disponible quand ?". Tu passes tes journées à répondre aux mêmes questions.',
		},
		{
			icon: '⏰',
			title: 'Les clients perdus par manque de réactivité',
			description:
				'Quand tu ne réponds pas assez vite, tes clients contactent un autre pâtissier. Le premier à répondre gagne la commande, et tu perds des ventes.',
		},
		{
			icon: '💸',
			title: 'Pas de boutique en ligne professionnelle',
			description:
				'Tu partages tes créations sur Instagram, mais tes clients ne peuvent pas commander directement. Pas de paiement en ligne, pas de suivi de commande, tout se fait par message.',
		},
		{
			icon: '📋',
			title: 'La gestion manuelle qui prend du temps',
			description:
				'Tu jongles entre Excel pour les commandes, Instagram pour communiquer, Word pour les devis. C\'est chronophage et source d\'erreurs.',
		},
	];

	const benefits = [
		{
			icon: '🛒',
			title: 'Boutique en ligne 24/7',
			description:
				'Tes clients peuvent commander à tout moment, même quand tu dors. Plus besoin d\'être collé à ton téléphone : ta boutique travaille pour toi.',
		},
		{
			icon: '💳',
			title: 'Paiement en ligne sécurisé',
			description:
				'Paiements sécurisés via PayPal. Tes clients paient directement, tu reçois l\'argent sur ton compte. Plus de relances ou de chèques en retard.',
		},
		{
			icon: '🎨',
			title: 'Personnalisation complète',
			description:
				'Logo, couleurs, photos de tes créations. Ta boutique reflète ton identité et donne confiance à tes clients. Une image professionnelle qui te démarque.',
		},
		{
			icon: '⚡',
			title: 'Configuration en 5 minutes',
			description:
				'Pas besoin de savoir coder ou de payer un développeur. Tu crées ta boutique, tu ajoutes tes gâteaux, et c\'est prêt. Simple et rapide.',
		},
	];

	const howItWorks = [
		{
			step: '1',
			title: 'Crée ta boutique en ligne',
			description:
				'Inscris-toi, choisis le nom de ta boutique, ajoute ton logo et tes couleurs. En quelques minutes, ta boutique est prête.',
		},
		{
			step: '2',
			title: 'Ajoute tes gâteaux',
			description:
				'Importe tes photos, ajoute les descriptions, définis tes prix et tes options de personnalisation. Chaque gâteau peut avoir son propre formulaire.',
		},
		{
			step: '3',
			title: 'Partage ton lien',
			description:
				'Reçois ton lien unique (ex: pattyly.com/ma-boutique). Partage-le sur Instagram, dans ta bio, ou envoie-le directement à tes clients.',
		},
		{
			step: '4',
			title: 'Reçois des commandes',
			description:
				'Tes clients commandent directement, paient en ligne, et tu reçois une notification. Plus besoin de répondre à chaque message individuellement.',
		},
	];

	const faq = [
		{
			question: 'Combien de temps ça prend pour créer ma boutique en ligne ?',
			answer:
				'Environ 5 minutes ! Tu crées ton compte, tu choisis le nom de ta boutique, tu ajoutes ton logo, et c\'est prêt. Ensuite, tu ajoutes tes gâteaux au fur et à mesure. Ta boutique est fonctionnelle dès le premier produit ajouté.',
		},
		{
			question: 'Mes clients doivent-ils créer un compte pour commander ?',
			answer:
				'Non, absolument pas ! C\'est l\'un des avantages majeurs de Pattyly. Tes clients remplissent simplement un formulaire avec leurs informations (nom, email, téléphone) et leurs préférences. Pas d\'inscription compliquée qui fait abandonner les commandes.',
		},
		{
			question: 'Puis-je personnaliser l\'apparence de ma boutique ?',
			answer:
				'Oui, totalement ! Tu peux ajouter ton logo, choisir tes couleurs, personnaliser les textes d\'accueil. Ta boutique reflète ton identité et donne confiance à tes clients. Une image professionnelle qui te démarque de la concurrence.',
		},
		{
			question: 'Comment mes clients paient-ils ?',
			answer:
				'Paiement sécurisé via PayPal. Quand un client passe commande, il reçoit automatiquement un lien PayPal pour effectuer le paiement. L\'argent arrive directement sur ton compte PayPal, sans intermédiaire. Notre logiciel de facturation génère aussi automatiquement les factures.',
		},
		{
			question: 'Quelle est la différence avec un site e-commerce classique comme Shopify ?',
			answer:
				'Pattyly est spécialement conçu pour les pâtissiers. Contrairement à Shopify, tout est déjà pensé pour ton métier : formulaires de personnalisation de gâteaux, gestion des disponibilités, devis sur mesure. Pas besoin de configurer des plugins compliqués : tout est intégré et prêt à l\'emploi.',
		},
		{
			question: 'Puis-je vendre sur Instagram en même temps ?',
			answer:
				'Absolument ! Ta boutique en ligne complète Instagram, elle ne le remplace pas. Tu continues à partager tes créations sur Instagram, et tu ajoutes simplement le lien de ta boutique dans ta bio. Tes followers peuvent alors commander directement sans passer par les DM.',
		},
	];

	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'WebPage',
		name: 'Boutique en ligne pour pâtissiers - Créer son site de vente de gâteaux | Pattyly',
		description:
			'Créez votre boutique en ligne pour pâtissiers en 5 minutes. Vendez vos gâteaux en ligne, recevez des commandes 24/7, acceptez les paiements sécurisés. Logiciel spécialisé pour cake designers.',
		about: {
			'@type': 'Thing',
			name: 'Boutique en ligne pâtissier',
		},
	};

	const productSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Pattyly - Boutique en ligne pour pâtissiers',
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
			'Créez votre boutique en ligne pour pâtissiers en 5 minutes. Vendez vos gâteaux en ligne, recevez des commandes 24/7, acceptez les paiements sécurisés.',
		url: 'https://pattyly.com/boutique-en-ligne-patissier',
	};
</script>

<svelte:head>
	<title
		>Boutique en ligne pour pâtissiers | Créer son site de vente de gâteaux - {WebsiteName}</title
	>
	<meta
		name="description"
		content="Créez votre boutique en ligne pour pâtissiers en 5 minutes. Vendez vos gâteaux en ligne, recevez des commandes 24/7, acceptez les paiements sécurisés. Logiciel spécialisé pour cake designers. Essai gratuit 7 jours."
	/>
	<meta
		name="keywords"
		content="boutique en ligne pâtissier, créer site pâtisserie en ligne, site web pâtissier pro, vendre ses gâteaux en ligne, plateforme vente gâteaux en ligne, créer site de vente de gâteaux, site vitrines gâteaux personnalisés, logiciel site vitrine pâtisserie, e-commerce pâtisserie, boutique en ligne cake designer"
	/>
	<meta
		property="og:title"
		content="Boutique en ligne pour pâtissiers | Créer son site de vente de gâteaux - {WebsiteName}"
	/>
	<meta
		property="og:description"
		content="Créez votre boutique en ligne pour pâtissiers en 5 minutes. Vendez vos gâteaux en ligne, recevez des commandes 24/7, acceptez les paiements sécurisés."
	/>
	<meta property="og:type" content="website" />
	<meta
		property="og:url"
		content="https://pattyly.com/boutique-en-ligne-patissier"
	/>
	<meta property="og:image" content="/images/logo_text.svg" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="canonical" href="https://pattyly.com/boutique-en-ligne-patissier" />
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
					Boutique en ligne pâtissier
				</p>
				<h1
					class="mt-4 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Créez votre boutique en ligne pour pâtissiers en quelques minutes
				</h1>
				<p 
					bind:this={heroContent}
					class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Fini les messages Instagram qui s'accumulent et les clients perdus par manque de
					réactivité. Créez votre boutique en ligne professionnelle, recevez des commandes
					24/7, et acceptez les paiements sécurisés. Tout dans un seul outil pensé pour les
					cake designers.
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
					Pourquoi choisir Pattyly ?
				</h2>
				<ul class="mt-6 space-y-4 text-left">
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Boutique en ligne professionnelle personnalisable (logo, couleurs)</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Commandes 24/7 même quand tu dors (plus de clients perdus)</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Paiement en ligne sécurisé via PayPal (factures automatiques)</span>
					</li>
					<li class="flex gap-3 text-sm leading-relaxed text-neutral-700 md:text-base">
						<span
							class="mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
							style="background-color: #FF6F61;"
						>
							✓
						</span>
						<span>Gestion complète : commandes, devis, planning, facturation</span>
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
					Les problèmes sans boutique en ligne
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
					Ta boutique en ligne, simplifiée
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
					Crée ta boutique en ligne en 4 étapes
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

	<!-- Use Case Section -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Cas d'usage réel
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Comment Sarah a multiplié ses commandes avec sa boutique en ligne
				</h2>
			</div>

			<div
				bind:this={useCaseContainer}
				class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-[#FFE8D6] via-[#FFE8D6]/80 to-white p-8 shadow-xl md:p-12"
			>
				<div class="grid gap-8 md:grid-cols-2 md:items-center">
					<div>
						<h3 class="mb-4 text-xl font-semibold text-neutral-800">
							Le défi
						</h3>
						<p class="mb-6 text-base leading-relaxed text-neutral-700 md:text-lg">
							Sarah, cake designer indépendante, recevait 15-20 messages Instagram par jour pour des demandes de gâteaux. Elle passait 2-3 heures par jour à répondre aux mêmes questions : "C'est combien ?", "Tu fais quel gâteau ?", "C'est disponible quand ?". Résultat : elle perdait des clients parce qu'elle ne répondait pas assez vite, et elle n'avait plus de temps pour créer.
						</p>
						<h3 class="mb-4 text-xl font-semibold text-neutral-800">
							La solution Pattyly
						</h3>
						<p class="text-base leading-relaxed text-neutral-700 md:text-lg">
							En 30 minutes, Sarah a créé sa boutique en ligne, ajouté ses 15 gâteaux les plus populaires avec photos et prix. Elle a partagé le lien dans sa bio Instagram. Résultat : ses clients commandent directement, paient en ligne, et elle reçoit une notification. Elle a récupéré 2h par jour, multiplié ses commandes par 3, et peut maintenant se concentrer sur la création.
						</p>
					</div>
					<div class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-neutral-600">
									Messages Instagram/jour
								</span>
								<span class="text-lg font-semibold text-neutral-800">15-20</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-neutral-600">
									Temps passé à répondre
								</span>
								<span class="text-lg font-semibold text-neutral-800">2-3h</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-neutral-600">
									Commandes reçues/mois
								</span>
								<span class="text-lg font-semibold text-[#FF6F61]">x3</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-neutral-600">
									Temps récupéré/jour
								</span>
								<span class="text-lg font-semibold text-[#FF6F61]">2h</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Tips Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-white via-[#FFE8D6]/5 to-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Conseils pour réussir
				</p>
				<h2
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Comment bien utiliser ta boutique en ligne
				</h2>
			</div>

			<div bind:this={tipsContainer} class="grid gap-8 md:grid-cols-3">
				<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg">
					<div class="mb-4 text-4xl">📸</div>
					<h3 class="mb-2 text-xl font-semibold text-neutral-900">
						Photos de qualité
					</h3>
					<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
						Utilise de belles photos de tes créations, bien éclairées. Tes clients achètent
						avec les yeux : de bonnes photos augmentent tes conversions.
					</p>
				</div>
				<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg">
					<div class="mb-4 text-4xl">🔗</div>
					<h3 class="mb-2 text-xl font-semibold text-neutral-900">
						Partage ton lien partout
					</h3>
					<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
						Ajoute le lien de ta boutique dans ta bio Instagram, dans tes stories, sur
						Facebook. Plus tes clients le voient, plus ils commandent.
					</p>
				</div>
				<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg">
					<div class="mb-4 text-4xl">💰</div>
					<h3 class="mb-2 text-xl font-semibold text-neutral-900">
						Prix clairs et transparents
					</h3>
					<p class="text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
						Affiche tes prix directement sur tes gâteaux. Tes clients savent tout de suite
						combien ça coûte, et ça évite les négociations par message.
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
				Prêt à créer ta boutique en ligne ?
			</h2>
			<p class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl" style="font-weight: 300; letter-spacing: -0.01em;">
				Crée ta boutique en 5 minutes, ajoute tes gâteaux, partage ton lien. Tes clients
				commandent 24/7, tu récupères du temps précieux chaque jour.
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
					Tout ce que tu veux savoir sur ta boutique en ligne
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
		
		<div bind:this={finalCtaContainer} class="relative mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
			<h2
				class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
				style="font-weight: 600; letter-spacing: -0.02em;"
			>
				Crée ta boutique en ligne dès maintenant
			</h2>
			<p class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl" style="font-weight: 300; letter-spacing: -0.01em;">
				Rejoins les pâtissiers qui ont choisi Pattyly pour simplifier leur vente en ligne.
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
					class="inline-flex h-14 items-center justify-center rounded-xl border-2 border-neutral-800 bg-transparent px-6 text-sm font-semibold text-neutral-800 transition-colors duration-200 hover:bg-neutral-100"
				>
					Voir les tarifs
				</a>
			</div>
		</div>
	</section>
</main>

