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
			icon: '💍',
			title: 'Gâteaux de mariage élégants',
			description: 'Layer cakes, wedding cakes sur plusieurs étages : des créations d\'exception pour votre grand jour.'
		},
		{
			icon: '🎨',
			title: 'Design sur mesure',
			description: 'Gâteaux personnalisés selon votre thème de mariage, vos couleurs et votre style. Chaque détail compte.'
		},
		{
			icon: '👰',
			title: 'Goûts d\'exception',
			description: 'Saveurs raffinées et combinaisons gourmandes pour un gâteau de mariage inoubliable.'
		},
		{
			icon: '📅',
			title: 'Réservation en ligne',
			description: 'Réserve ton gâteau de mariage en quelques clics, avec confirmation immédiate et suivi de commande.'
		}
	];

	const faq = [
		{
			question: 'Combien coûte un gâteau de mariage (wedding cake) ?',
			answer: 'Le prix d\'un wedding cake varie selon le nombre d\'étages, la complexité du design et les saveurs. En général, un gâteau de mariage coûte entre 200€ et 800€, voire plus pour les créations très élaborées. Les cake designers affichent leurs tarifs sur leur boutique en ligne avec un calculateur de prix selon le nombre de personnes.'
		},
		{
			question: 'Combien de temps à l\'avance réserver un wedding cake ?',
			answer: 'Il est fortement recommandé de réserver votre gâteau de mariage au moins 2 à 3 mois à l\'avance, surtout pour les créations complexes avec plusieurs étages. Pour les wedding cakes plus simples, certains cake designers peuvent accepter des commandes avec 4-6 semaines de délai. Plus tôt tu réserveras, plus tu auras de choix.'
		},
		{
			question: 'Quelle est la différence entre un wedding cake et un layer cake ?',
			answer: 'Un wedding cake est généralement un gâteau de mariage traditionnel, souvent avec plusieurs étages. Un layer cake est un gâteau avec plusieurs couches superposées, qui peut être utilisé comme wedding cake ou pour d\'autres occasions. Les deux termes sont souvent utilisés de manière interchangeable pour les gâteaux de mariage.'
		},
		{
			question: 'Puis-je goûter les saveurs avant de commander ?',
			answer: 'Oui, la plupart des cake designers proposent des séances de dégustation (tastings) pour les gâteaux de mariage. C\'est l\'occasion de goûter différentes saveurs, de discuter du design et de finaliser tous les détails. Contacte directement le cake designer via sa boutique pour organiser une dégustation.'
		},
		{
			question: 'Le gâteau peut-il être adapté aux régimes alimentaires ?',
			answer: 'Oui, beaucoup de cake designers proposent des options vegan, sans gluten, ou adaptées à d\'autres régimes alimentaires. Tu peux filtrer les cake designers par spécialités sur notre plateforme pour trouver ceux qui proposent des gâteaux vegan ou sans gluten.'
		},
		{
			question: 'Comment se passe la livraison et l\'installation le jour du mariage ?',
			answer: 'Les cake designers proposent généralement la livraison et l\'installation sur place le jour du mariage. Ils s\'assurent que le gâteau arrive en parfait état et est installé correctement. Les modalités (frais, horaires, zones) sont discutées lors de la commande et indiquées sur chaque boutique.'
		}
	];

	onMount(async () => {
		// Schema.org Product
		const productSchema = {
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: 'Gâteau de mariage - Wedding cake sur mesure',
			description: 'Commande ton gâteau de mariage (wedding cake) sur mesure ! Layer cakes élégants, design personnalisé. Découvre les meilleurs cake designers spécialisés en gâteaux de mariage.',
			category: 'Gâteau de mariage',
			alternateName: ['Wedding cake', 'Layer cake'],
			brand: {
				'@type': 'Brand',
				name: 'Pattyly'
			},
			offers: {
				'@type': 'AggregateOffer',
				priceCurrency: 'EUR',
				availability: 'https://schema.org/InStock',
				url: 'https://pattyly.com/gateau-mariage'
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
					name: 'Gâteau de mariage',
					item: 'https://pattyly.com/gateau-mariage'
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
	<title>Gâteau de mariage - Wedding cake sur mesure | {WebsiteName}</title>
	<meta
		name="description"
		content="Commande ton gâteau de mariage (wedding cake) sur mesure ! Layer cakes élégants, design personnalisé. Découvre les meilleurs cake designers spécialisés en gâteaux de mariage."
	/>
	<meta
		name="keywords"
		content="gâteau mariage, wedding cake, layer cake, gâteau de mariage personnalisé, wedding cake france, gâteau mariage sur mesure, cake designer mariage"
	/>
	<meta property="og:title" content="Gâteau de mariage - Wedding cake sur mesure | {WebsiteName}" />
	<meta
		property="og:description"
		content="Commande ton gâteau de mariage (wedding cake) sur mesure ! Layer cakes élégants, design personnalisé."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/gateau-mariage" />
	<link rel="canonical" href="https://pattyly.com/gateau-mariage" />
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
					Gâteau de <span class="text-[#FF6F61]">mariage</span><br />
					wedding cake sur mesure
				</h1>
				<p
					bind:this={heroContent}
					class="mx-auto max-w-3xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Layer cakes élégants, wedding cakes sur plusieurs étages : découvre les meilleurs cake designers spécialisés en gâteaux de mariage. Design personnalisé, goûts d'exception. Tu cherches un <a href="/gateau-anniversaire" class="text-[#FF6F61] underline hover:text-[#e85a4f]">gâteau d'anniversaire</a> ? C'est par ici !
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
							href="/patissiers/{city.code}/gateau-mariage"
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
					Pourquoi choisir un <span class="text-[#FF6F61]">wedding cake</span> sur mesure ?
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
					href="/patissiers"
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
					Questions fréquentes sur les <span class="text-[#FF6F61]">gâteaux de mariage</span>
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
				Prêt à commander ton gâteau de mariage ?
			</h2>
			<p
				class="mb-10 text-lg leading-relaxed text-white/90 sm:text-xl md:text-2xl"
				style="font-weight: 300;"
			>
				Découvre les cake designers spécialisés en wedding cakes près de chez toi.
			</p>
			<Button
				href="/patissiers"
				class="h-14 rounded-xl bg-white px-10 text-base font-medium text-[#FF6F61] shadow-lg transition-all duration-300 hover:scale-105 hover:bg-neutral-50 hover:shadow-xl"
			>
				Rechercher un cake designer
				<ArrowRight class="ml-2 h-5 w-5" />
			</Button>
		</div>
	</section>
</div>

