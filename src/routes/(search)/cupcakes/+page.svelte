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
	];

	const benefits = [
		{
			icon: '🧁',
			title: 'Cupcakes personnalisés',
			description: 'Chaque cupcake est unique et peut être décoré selon tes envies, le thème de l\'événement ou les couleurs de ta fête.'
		},
		{
			icon: '🎨',
			title: 'Variétés de saveurs',
			description: 'Vanille, chocolat, fruits rouges, caramel, matcha... Une large gamme de saveurs pour satisfaire tous les goûts.'
		},
		{
			icon: '📦',
			title: 'Idéal pour les événements',
			description: 'Parfait pour les anniversaires, mariages, baby showers, ou événements d\'entreprise. Faciles à servir et à partager.'
		},
		{
			icon: '💳',
			title: 'Commande en ligne simple',
			description: 'Commande directement depuis la boutique en ligne du cake designer, choisis la quantité et les saveurs, paiement sécurisé.'
		}
	];

	const faq = [
		{
			question: 'Combien coûtent des cupcakes personnalisés ?',
			answer: 'Le prix varie selon la complexité de la décoration et la quantité. En général, un cupcake personnalisé coûte entre 2€ et 8€. Pour les commandes en grande quantité (20+ cupcakes), les cake designers proposent souvent des tarifs dégressifs. Les prix sont affichés directement sur chaque boutique en ligne.'
		},
		{
			question: 'Combien de cupcakes dois-je commander pour un événement ?',
			answer: 'Pour un événement, il est recommandé de prévoir 1,5 à 2 cupcakes par personne. Par exemple, pour 20 invités, commande entre 30 et 40 cupcakes. Cela permet d\'avoir une variété de saveurs et de garantir qu\'il y en aura assez pour tout le monde. Certains cake designers proposent des formules "événement" avec plusieurs saveurs.'
		},
		{
			question: 'Puis-je commander des cupcakes avec des saveurs différentes ?',
			answer: 'Oui, absolument ! La plupart des cake designers proposent des formules avec plusieurs saveurs. Tu peux choisir un assortiment de saveurs (par exemple : 10 vanille, 10 chocolat, 10 fruits rouges). C\'est parfait pour satisfaire tous les goûts lors d\'un événement.'
		},
		{
			question: 'Combien de temps à l\'avance commander des cupcakes ?',
			answer: 'Pour les cupcakes personnalisés, il est recommandé de commander au moins 3 à 7 jours à l\'avance. Pour les commandes simples sans personnalisation complexe, certains cake designers peuvent accepter des commandes avec 24-48h de délai. Pour les grandes quantités (50+ cupcakes), prévois au moins 1 semaine.'
		},
		{
			question: 'Les cupcakes peuvent-ils être adaptés aux régimes alimentaires ?',
			answer: 'Oui, beaucoup de cake designers proposent des cupcakes vegan, sans gluten, ou sans lactose. Tu peux filtrer les cake designers par spécialités sur notre plateforme pour trouver ceux qui proposent ces options. N\'hésite pas à mentionner tes besoins lors de la commande.'
		},
		{
			question: 'Comment se passe la livraison des cupcakes ?',
			answer: 'Cela dépend du cake designer. Certains proposent la livraison à domicile, d\'autres le retrait en boutique. Les cupcakes sont généralement livrés dans des boîtes spéciales pour préserver leur fraîcheur et leur présentation. Les modalités de livraison (zones, frais, horaires) sont indiquées sur chaque boutique en ligne.'
		}
	];

	onMount(async () => {
		// Schema.org Product
		const productSchema = {
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: 'Cupcakes personnalisés',
			description: 'Commande tes cupcakes personnalisés en ligne ! Découvre les meilleurs cake designers spécialisés en cupcakes. Saveurs variées, décoration sur mesure, paiement sécurisé.',
			category: 'Cupcakes',
			brand: {
				'@type': 'Brand',
				name: 'Pattyly'
			},
			offers: {
				'@type': 'AggregateOffer',
				priceCurrency: 'EUR',
				availability: 'https://schema.org/InStock',
				url: 'https://pattyly.com/cupcakes'
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
					name: 'Cupcakes',
					item: 'https://pattyly.com/cupcakes'
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
	<title>Cupcakes personnalisés - Commandes en ligne | {WebsiteName}</title>
	<meta
		name="description"
		content="Commande tes cupcakes personnalisés en ligne ! Découvre les meilleurs cake designers spécialisés en cupcakes. Saveurs variées, décoration sur mesure, paiement sécurisé."
	/>
	<meta
		name="keywords"
		content="cupcakes, cupcakes personnalisés, commande cupcakes en ligne, petits gâteaux, cake designer cupcakes"
	/>
	<meta property="og:title" content="Cupcakes personnalisés - Commandes en ligne | {WebsiteName}" />
	<meta
		property="og:description"
		content="Commande tes cupcakes personnalisés en ligne ! Découvre les meilleurs cake designers spécialisés en cupcakes."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/cupcakes" />
	<link rel="canonical" href="https://pattyly.com/cupcakes" />
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
					<span class="text-[#FF6F61]">Cupcakes</span> personnalisés<br />
					pour tous tes événements
				</h1>
				<p
					bind:this={heroContent}
					class="mx-auto max-w-3xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Découvre les meilleurs cake designers spécialisés en cupcakes. Saveurs variées, décoration sur mesure, parfait pour anniversaires, mariages ou événements. Tu cherches des <a href="/macarons" class="text-[#FF6F61] underline hover:text-[#e85a4f]">macarons</a> ? C'est par ici !
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
					class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
				>
					{#each cities as city}
						<a
							href="/annuaire/{city.code}/cupcakes"
							class="group flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 text-center transition-all duration-300 hover:scale-105 hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
						>
							<MapPin class="mb-2 h-6 w-6 text-neutral-400 transition-colors group-hover:text-[#FF6F61]" />
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
					Pourquoi commander des <span class="text-[#FF6F61]">cupcakes</span> en ligne ?
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
					href="/macarons"
					class="group rounded-xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF6F61] hover:bg-[#FFE8D6]/20 hover:shadow-lg"
				>
					<div class="mb-3 text-3xl">🍪</div>
					<h3 class="mb-2 text-lg font-semibold text-neutral-900">Macarons</h3>
					<p class="text-sm leading-relaxed text-neutral-600" style="font-weight: 300;">
						Macarons artisanaux et personnalisés
					</p>
					<span class="mt-3 inline-flex items-center text-sm font-medium text-[#FF6F61] transition-colors group-hover:text-[#e85a4f]">
						Découvrir →
					</span>
				</a>
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
					Questions fréquentes sur les <span class="text-[#FF6F61]">cupcakes</span>
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
				Prêt à commander tes cupcakes ?
			</h2>
			<p
				class="mb-10 text-lg leading-relaxed text-white/90 sm:text-xl md:text-2xl"
				style="font-weight: 300;"
			>
				Découvre les cake designers spécialisés en cupcakes près de chez toi et commande directement en ligne.
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

