<script lang="ts">
	import { onMount } from 'svelte';
	import { WebsiteName } from '$src/config';
	import { revealElement, revealStagger } from '$lib/utils/animations';
	import { Button } from '$lib/components/ui/button';
	import { Cake, MapPin, ArrowRight } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';

	let heroTitle: HTMLElement;
	let heroContent: HTMLElement;
	let citiesContainer: HTMLElement;
	let benefitsContainer: HTMLElement;

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

	const benefits = [
		{
			icon: '🎨',
			title: 'Design 100% personnalisé',
			description: 'Chaque détail est personnalisable : forme, couleurs, décorations, saveurs, messages. Ton gâteau sera unique et créé selon tes envies exactes.'
		},
		{
			icon: '✨',
			title: 'Pour toutes les occasions',
			description: 'Anniversaires, mariages, naissances, événements d\'entreprise, fêtes... Un gâteau personnalisé s\'adapte à toutes tes occasions spéciales.'
		},
		{
			icon: '👨‍🍳',
			title: 'Cake designers expérimentés',
			description: 'Tous les cake designers sur notre plateforme sont des artisans qui créent des gâteaux sur mesure. Chaque création est unique et faite à la main.'
		},
		{
			icon: '💬',
			title: 'Formulaire de personnalisation en ligne',
			description: 'Commande directement en ligne avec un formulaire de personnalisation complet. Décris tes envies, choisis tes options, et reçois une confirmation immédiate.'
		}
	];

	const faq = [
		{
			question: 'Combien coûte un gâteau personnalisé sur mesure ?',
			answer: 'Le prix d\'un gâteau personnalisé varie selon la taille, la complexité du design, les saveurs et les options choisies. En général, un gâteau personnalisé coûte entre 40€ et 300€, voire plus pour les créations très élaborées. Les cake designers affichent leurs tarifs de base sur leur boutique en ligne, et le prix final est calculé selon tes choix de personnalisation.'
		},
		{
			question: 'Comment personnaliser mon gâteau ?',
			answer: 'Lors de la commande, tu remplis un formulaire de personnalisation en ligne. Tu peux choisir la taille, les saveurs, les couleurs, les décorations, ajouter des messages, des photos comestibles, des toppers, ou tout autre élément personnalisé. Certains cake designers proposent même des consultations pour les créations très complexes.'
		},
		{
			question: 'Combien de temps à l\'avance commander un gâteau personnalisé ?',
			answer: 'Il est recommandé de commander au moins 7 à 14 jours à l\'avance pour un gâteau personnalisé, surtout pour les créations complexes avec beaucoup de détails. Pour les gâteaux plus simples, certains cake designers peuvent accepter des commandes avec 3-5 jours de délai. Plus tôt tu commandes, plus tu auras de choix et de flexibilité.'
		},
		{
			question: 'Puis-je voir un aperçu de mon gâteau avant la commande ?',
			answer: 'Cela dépend du cake designer. Certains proposent des esquisses ou des photos de gâteaux similaires pour t\'aider à visualiser le résultat. Pour les créations très personnalisées, tu peux discuter directement avec le cake designer via sa boutique pour valider tous les détails avant la commande finale.'
		},
		{
			question: 'Les gâteaux personnalisés peuvent-ils être adaptés aux régimes alimentaires ?',
			answer: 'Oui, beaucoup de cake designers proposent des options vegan, sans gluten, sans lactose, ou adaptées à d\'autres régimes alimentaires. Tu peux filtrer les cake designers par spécialités sur notre plateforme pour trouver ceux qui proposent ces options. Mentionne tes besoins lors de la personnalisation.'
		},
		{
			question: 'Que faire si je ne suis pas satisfait de mon gâteau personnalisé ?',
			answer: 'Tous les cake designers sur notre plateforme sont des artisans professionnels qui s\'engagent à créer des gâteaux de qualité. En cas de problème, contacte directement le cake designer via sa boutique. La plupart sont très réactifs et feront leur maximum pour résoudre le problème. Tu peux aussi consulter les avis clients sur chaque boutique pour choisir un cake designer de confiance.'
		}
	];

	onMount(async () => {
		// Schema.org Product
		const productSchema = {
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: 'Gâteau personnalisé sur mesure',
			description: 'Commande ton gâteau personnalisé sur mesure en ligne ! Design 100% personnalisé, pour toutes les occasions. Découvre les meilleurs cake designers spécialisés en gâteaux sur mesure.',
			category: 'Gâteau personnalisé',
			alternateName: ['Custom cake', 'Gâteau sur mesure'],
			brand: {
				'@type': 'Brand',
				name: 'Pattyly'
			},
			offers: {
				'@type': 'AggregateOffer',
				priceCurrency: 'EUR',
				availability: 'https://schema.org/InStock',
				url: 'https://pattyly.com/gateau-personnalise'
			}
		};

		// Schema.org BreadcrumbList
		const breadcrumbSchema = {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: [
				{
					'@type': 'ListItem',
					position: 1,
					name: 'Accueil',
					item: 'https://pattyly.com'
				},
				{
					'@type': 'ListItem',
					position: 2,
					name: 'Gâteau personnalisé',
					item: 'https://pattyly.com/gateau-personnalise'
				}
			]
		};

		// Schema.org FAQPage
		const faqSchema = {
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: faq.map((item) => ({
				'@type': 'Question',
				name: item.question,
				acceptedAnswer: {
					'@type': 'Answer',
					text: item.answer
				}
			}))
		};

		// Ajouter les schemas
		const productScript = document.createElement('script');
		productScript.type = 'application/ld+json';
		productScript.text = JSON.stringify(productSchema);
		productScript.id = 'product-schema';
		document.head.appendChild(productScript);

		const breadcrumbScript = document.createElement('script');
		breadcrumbScript.type = 'application/ld+json';
		breadcrumbScript.text = JSON.stringify(breadcrumbSchema);
		breadcrumbScript.id = 'breadcrumb-schema';
		document.head.appendChild(breadcrumbScript);

		const faqScript = document.createElement('script');
		faqScript.type = 'application/ld+json';
		faqScript.text = JSON.stringify(faqSchema);
		faqScript.id = 'faq-schema';
		document.head.appendChild(faqScript);

		// Animations
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.5 });
		if (heroContent) await revealElement(heroContent, { delay: 0.1, duration: 0.5 });
		if (citiesContainer) await revealStagger(citiesContainer, ':scope > a', { delay: 0.2, stagger: 0.05 });
		if (benefitsContainer) await revealStagger(benefitsContainer, ':scope > div', { delay: 0.1, stagger: 0.1 });

		return () => {
			const productEl = document.getElementById('product-schema');
			if (productEl) document.head.removeChild(productEl);
			const breadcrumbEl = document.getElementById('breadcrumb-schema');
			if (breadcrumbEl) document.head.removeChild(breadcrumbEl);
			const faqEl = document.getElementById('faq-schema');
			if (faqEl) document.head.removeChild(faqEl);
		};
	});
</script>

<svelte:head>
	<title>Gâteau personnalisé sur mesure - Commandes en ligne | {WebsiteName}</title>
	<meta
		name="description"
		content="Commande ton gâteau personnalisé sur mesure en ligne ! Design 100% personnalisé, pour toutes les occasions. Découvre les meilleurs cake designers spécialisés en gâteaux sur mesure."
	/>
	<meta
		name="keywords"
		content="gâteau personnalisé, custom cake, gâteau sur mesure, commande gâteau personnalisé en ligne, cake designer personnalisé"
	/>
	<meta property="og:title" content="Gâteau personnalisé sur mesure - Commandes en ligne | {WebsiteName}" />
	<meta
		property="og:description"
		content="Commande ton gâteau personnalisé sur mesure en ligne ! Design 100% personnalisé, pour toutes les occasions."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/gateau-personnalise" />
	<link rel="canonical" href="https://pattyly.com/gateau-personnalise" />
</svelte:head>

<div class="flex flex-col">
	<!-- Hero section -->
	<section class="relative flex min-h-[90vh] w-full flex-col justify-center overflow-hidden bg-white pt-24 md:min-h-screen md:pt-32">
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>

		<div class="relative z-10 mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-16 text-center">
				<h1
					bind:this={heroTitle}
					class="mb-8 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Gâteau <span class="text-[#FF6F61]">personnalisé</span><br />
					sur mesure en ligne
				</h1>
				<p
					bind:this={heroContent}
					class="mx-auto max-w-3xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Design 100% personnalisé selon tes envies. Découvre les meilleurs cake designers spécialisés en gâteaux sur mesure. Pour toutes les occasions : anniversaires, mariages, événements. Tu cherches un <a href="/gateau-anniversaire" class="text-[#FF6F61] underline hover:text-[#e85a4f]">gâteau d'anniversaire</a> ou un <a href="/gateau-mariage" class="text-[#FF6F61] underline hover:text-[#e85a4f]">gâteau de mariage</a> ? C'est par ici !
				</p>
			</div>

			<!-- Cities list -->
			<div class="mx-auto max-w-5xl">
				<div class="mb-8 text-center">
					<h2 class="text-xl font-semibold text-neutral-900 sm:text-2xl">
						Trouve un cake designer près de chez toi
					</h2>
				</div>
				<div
					bind:this={citiesContainer}
					class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 pb-16"
				>
					{#each cities as city}
						<a
							href="/annuaire/{city.code}/gateau-personnalise"
							class="group flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 text-center transition-all duration-300 hover:scale-105 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
						>
							<span class="text-base font-medium text-neutral-700 transition-colors group-hover:text-[#FF6F61] sm:text-lg">
								{city.name}
							</span>
						</a>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Benefits section -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/20 via-transparent to-transparent"></div>

		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-16 text-center">
				<h2
					class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Pourquoi commander un <span class="text-[#FF6F61]">gâteau personnalisé</span> en ligne ?
				</h2>
			</div>

			<div bind:this={benefitsContainer} class="grid gap-8 md:grid-cols-2">
				{#each benefits as benefit}
					<Card.Root class="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg">
						<div class="mb-4 text-4xl">{benefit.icon}</div>
						<h3 class="mb-3 text-xl font-semibold text-neutral-900">{benefit.title}</h3>
						<p class="text-base leading-relaxed text-neutral-600" style="font-weight: 300;">
							{benefit.description}
						</p>
					</Card.Root>
				{/each}
			</div>
		</div>
	</section>

	<!-- Related types section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-white via-[#FFE8D6]/10 to-white py-16 sm:py-20 md:py-24">
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-12 text-center">
				<h2
					class="mb-4 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Tu cherches autre chose ?
				</h2>
				<p class="text-base text-neutral-600" style="font-weight: 300;">
					Découvre nos autres types de gâteaux
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<a
					href="/gateau-anniversaire"
					class="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
				>
					<div class="mb-3 text-3xl">🎂</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-900">Gâteau d'anniversaire</h3>
					<p class="text-sm leading-relaxed text-neutral-600" style="font-weight: 300;">
						Gâteaux d'anniversaire personnalisés
					</p>
					<span class="mt-3 inline-flex items-center text-sm font-medium text-[#FF6F61] transition-colors group-hover:text-[#e85a4f]">
						Découvrir →
					</span>
				</a>
				<a
					href="/gateau-mariage"
					class="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
				>
					<div class="mb-3 text-3xl">💍</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-900">Gâteau de mariage</h3>
					<p class="text-sm leading-relaxed text-neutral-600" style="font-weight: 300;">
						Wedding cakes sur mesure
					</p>
					<span class="mt-3 inline-flex items-center text-sm font-medium text-[#FF6F61] transition-colors group-hover:text-[#e85a4f]">
						Découvrir →
					</span>
				</a>
				<a
					href="/cupcakes"
					class="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
				>
					<div class="mb-3 text-3xl">🧁</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-900">Cupcakes</h3>
					<p class="text-sm leading-relaxed text-neutral-600" style="font-weight: 300;">
						Cupcakes personnalisés pour tous tes événements
					</p>
					<span class="mt-3 inline-flex items-center text-sm font-medium text-[#FF6F61] transition-colors group-hover:text-[#e85a4f]">
						Découvrir →
					</span>
				</a>
				<a
					href="/annuaire"
					class="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
				>
					<div class="mb-3 text-3xl">🎨</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-900">Tous les types</h3>
					<p class="text-sm leading-relaxed text-neutral-600" style="font-weight: 300;">
						Découvre tous les types de gâteaux
					</p>
					<span class="mt-3 inline-flex items-center text-sm font-medium text-[#FF6F61] transition-colors group-hover:text-[#e85a4f]">
						Voir l'annuaire →
					</span>
				</a>
			</div>
		</div>
	</section>

	<!-- FAQ section -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="relative mx-auto max-w-4xl px-6 sm:px-8 lg:px-12">
			<div class="mb-16 text-center">
				<h2
					class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Questions fréquentes sur les <span class="text-[#FF6F61]">gâteaux personnalisés</span>
				</h2>
			</div>

			<div class="space-y-6">
				{#each faq as item}
					<Card.Root class="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
						<h3 class="mb-3 text-lg font-semibold text-neutral-900">{item.question}</h3>
						<p class="text-base leading-relaxed text-neutral-600" style="font-weight: 300;">
							{item.answer}
						</p>
					</Card.Root>
				{/each}
			</div>
		</div>
	</section>

	<!-- CTA section -->
	<section class="relative overflow-hidden bg-gradient-to-br from-[#FF6F61] via-[#FF6F61] to-[#e85a4f] py-24 sm:py-32 md:py-40">
		<div class="relative mx-auto max-w-4xl px-6 text-center sm:px-8">
			<h2
				class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-white sm:text-4xl lg:text-5xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				Prêt à commander ton gâteau personnalisé ?
			</h2>
			<p
				class="mb-10 text-lg leading-relaxed text-white/90 sm:text-xl md:text-2xl"
				style="font-weight: 300;"
			>
				Découvre les cake designers spécialisés en gâteaux sur mesure près de chez toi et commande directement en ligne.
			</p>
			<Button
				href="/annuaire"
				class="h-14 rounded-xl bg-white px-10 text-base font-medium text-[#FF6F61] shadow-lg transition-all duration-300 hover:scale-105 hover:bg-neutral-50 hover:shadow-xl"
			>
				Rechercher un cake designer
				<ArrowRight class="ml-2 h-5 w-5" />
			</Button>
		</div>
	</section>
</div>

