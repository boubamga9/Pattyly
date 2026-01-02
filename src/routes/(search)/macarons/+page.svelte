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
			icon: '🍪',
			title: 'Macarons artisanaux',
			description: 'Macarons faits maison avec des ingrédients de qualité, coques légères et ganaches crémeuses. Chaque macaron est une œuvre d\'art.'
		},
		{
			icon: '🌈',
			title: 'Saveurs variées',
			description: 'Vanille, chocolat, fruits de la passion, pistache, rose, caramel beurre salé... Une palette de saveurs pour tous les goûts.'
		},
		{
			icon: '🎁',
			title: 'Idéal pour offrir',
			description: 'Boîtes de macarons personnalisées, coffrets cadeaux, assortiments pour toutes les occasions : anniversaires, fêtes, remerciements.'
		},
		{
			icon: '🚀',
			title: 'Commande en ligne rapide',
			description: 'Commande directement depuis la boutique en ligne du pâtissier, choisis tes saveurs et la quantité, paiement sécurisé, livraison rapide.'
		}
	];

	const faq = [
		{
			question: 'Combien coûtent des macarons artisanaux ?',
			answer: 'Le prix varie selon le pâtissier et la quantité. En général, un macaron coûte entre 1,50€ et 3€. Pour les boîtes de macarons (6, 12, 24, 36 pièces), les tarifs sont souvent dégressifs. Les prix sont affichés directement sur chaque boutique en ligne avec les différentes formules disponibles.'
		},
		{
			question: 'Combien de macarons dois-je commander ?',
			answer: 'Pour une dégustation personnelle, 6 à 12 macarons suffisent. Pour un événement ou un cadeau, prévois entre 12 et 24 macarons pour 10-15 personnes. Pour un événement plus important, compte environ 2-3 macarons par personne. Les pâtissiers proposent souvent des formules "événement" avec plusieurs saveurs.'
		},
		{
			question: 'Puis-je choisir les saveurs de mes macarons ?',
			answer: 'Oui, la plupart des pâtissiers proposent de choisir les saveurs dans leurs assortiments. Tu peux composer ta boîte personnalisée en sélectionnant tes saveurs préférées parmi celles disponibles. Certains proposent même des saveurs saisonnières ou des créations exclusives.'
		},
		{
			question: 'Combien de temps à l\'avance commander des macarons ?',
			answer: 'Pour les macarons standards, il est recommandé de commander au moins 2 à 5 jours à l\'avance. Pour les grandes quantités (50+ macarons) ou les personnalisations spéciales, prévois au moins 1 semaine. Certains pâtissiers peuvent accepter des commandes express avec 24h de délai selon leur disponibilité.'
		},
		{
			question: 'Les macarons peuvent-ils être adaptés aux régimes alimentaires ?',
			answer: 'Oui, certains pâtissiers proposent des macarons vegan ou sans gluten. Cependant, les macarons traditionnels contiennent des amandes et des œufs. Tu peux filtrer les pâtissiers par spécialités sur notre plateforme pour trouver ceux qui proposent des options vegan ou sans gluten.'
		},
		{
			question: 'Combien de temps se conservent les macarons ?',
			answer: 'Les macarons se conservent généralement 3 à 5 jours au réfrigérateur dans leur boîte d\'origine. Il est recommandé de les sortir 15-20 minutes avant dégustation pour qu\'ils retrouvent leur texture optimale. Les macarons sont meilleurs consommés dans les 48h suivant leur préparation.'
		}
	];

	onMount(async () => {
		// Schema.org Product
		const productSchema = {
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: 'Macarons artisanaux personnalisés',
			description: 'Commande tes macarons artisanaux en ligne ! Découvre les meilleurs pâtissiers spécialisés en macarons. Saveurs variées, boîtes personnalisées, paiement sécurisé.',
			category: 'Macarons',
			brand: {
				'@type': 'Brand',
				name: 'Pattyly'
			},
			offers: {
				'@type': 'AggregateOffer',
				priceCurrency: 'EUR',
				availability: 'https://schema.org/InStock',
				url: 'https://pattyly.com/macarons'
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
					name: 'Macarons',
					item: 'https://pattyly.com/macarons'
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
	<title>Macarons artisanaux personnalisés - Commandes en ligne | {WebsiteName}</title>
	<meta
		name="description"
		content="Commande tes macarons artisanaux en ligne ! Découvre les meilleurs pâtissiers spécialisés en macarons. Saveurs variées, boîtes personnalisées, paiement sécurisé."
	/>
	<meta
		name="keywords"
		content="macarons, macarons personnalisés, commande macarons en ligne, macarons artisanaux, pâtissier macarons"
	/>
	<meta property="og:title" content="Macarons artisanaux personnalisés - Commandes en ligne | {WebsiteName}" />
	<meta
		property="og:description"
		content="Commande tes macarons artisanaux en ligne ! Découvre les meilleurs pâtissiers spécialisés en macarons."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/macarons" />
	<link rel="canonical" href="https://pattyly.com/macarons" />
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
					<span class="text-[#FF6F61]">Macarons</span> artisanaux<br />
					personnalisés en ligne
				</h1>
				<p
					bind:this={heroContent}
					class="mx-auto max-w-3xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Découvre les meilleurs pâtissiers spécialisés en macarons. Saveurs variées, boîtes personnalisées, parfait pour offrir ou se faire plaisir. Tu cherches des <a href="/cupcakes" class="text-[#FF6F61] underline hover:text-[#e85a4f]">cupcakes</a> ? C'est par ici !
				</p>
			</div>

			<!-- Cities list -->
			<div class="mx-auto max-w-5xl">
				<div class="mb-8 text-center">
					<h2 class="text-xl font-semibold text-neutral-900 sm:text-2xl">
						Trouve un pâtissier près de chez toi
					</h2>
				</div>
				<div
					bind:this={citiesContainer}
					class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 pb-16"
				>
					{#each cities as city}
						<a
							href="/patissiers/{city.code}/macarons"
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
					Pourquoi commander des <span class="text-[#FF6F61]">macarons</span> en ligne ?
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
					Questions fréquentes sur les <span class="text-[#FF6F61]">macarons</span>
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
				Prêt à commander tes macarons ?
			</h2>
			<p
				class="mb-10 text-lg leading-relaxed text-white/90 sm:text-xl md:text-2xl"
				style="font-weight: 300;"
			>
				Découvre les pâtissiers spécialisés en macarons près de chez toi et commande directement en ligne.
			</p>
			<Button
				href="/patissiers"
				class="h-14 rounded-xl bg-white px-10 text-base font-medium text-[#FF6F61] shadow-lg transition-all duration-300 hover:scale-105 hover:bg-neutral-50 hover:shadow-xl"
			>
				Rechercher un pâtissier
				<ArrowRight class="ml-2 h-5 w-5" />
			</Button>
		</div>
	</section>
</div>

