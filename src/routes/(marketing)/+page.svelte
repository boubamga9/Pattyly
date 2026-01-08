<script lang="ts">
	import { WebsiteName } from './../../config';
	import HeroSection from './components/sections/hero.svelte';
	import Intro from './components/sections/intro.svelte';
	import PainPoints from './components/sections/pain-points.svelte';
	import BeforeAfter from './components/sections/before-after.svelte';
	import Solutions from './components/sections/solutions.svelte';
	import LastCta from './components/sections/last-cta.svelte';
	import Faq from './components/sections/faq.svelte';
	import CakeDesignerPopup from './components/cake-designer-popup.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	// Schema.org Organization et WebSite pour SEO (dans le HTML initial pour Google)
		const organizationSchema = {
			'@context': 'https://schema.org',
			'@type': 'Organization',
			name: 'Pattyly',
			url: 'https://pattyly.com',
			logo: 'https://pattyly.com/images/logo_text.svg',
			description:
				'Logiciel de gestion pour cake designers et pâtissiers indépendants. Créez votre boutique en ligne, gérez commandes, devis, factures et planning facilement.',
			sameAs: [
				'https://www.instagram.com/pattyly_com',
				'https://www.tiktok.com/@pattyly.com',
			],
			contactPoint: {
				'@type': 'ContactPoint',
				contactType: 'Support client',
				url: 'https://pattyly.com/contact',
			},
		};

		const websiteSchema = {
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: 'Pattyly',
			url: 'https://pattyly.com',
			description:
				'Logiciel de gestion pour cake designers et pâtissiers indépendants. Créez votre boutique en ligne, gérez commandes, devis, factures et planning facilement.',
			publisher: {
				'@type': 'Organization',
				name: 'Pattyly',
			},
			// Sitelinks suggérés pour Google (Google décide finalement quels liens afficher)
			mainEntity: {
				'@type': 'ItemList',
				itemListElement: [
					{
						'@type': 'ListItem',
						position: 1,
					name: 'FAQ',
					url: 'https://pattyly.com/faq',
					},
					{
						'@type': 'ListItem',
						position: 2,
					name: 'Contact',
					url: 'https://pattyly.com/contact',
					},
					{
						'@type': 'ListItem',
						position: 3,
					name: 'Tarifs',
					url: 'https://pattyly.com/pricing',
					},
					{
						'@type': 'ListItem',
						position: 4,
					name: 'Annuaire',
					url: 'https://pattyly.com/patissiers',
					},
				],
			},
		};

	// Préparer les scripts JSON-LD pour le HTML initial
	const organizationJson = JSON.stringify(organizationSchema);
	const websiteJson = JSON.stringify(websiteSchema);
	
	const quote = String.fromCharCode(34);
	const scriptType = 'application/ld+json';
	const scriptOpen = '<script type=' + quote + scriptType + quote + '>';
	const scriptEnd = '</' + 'script>';
	const organizationScript = scriptOpen + organizationJson + scriptEnd;
	const websiteScript = scriptOpen + websiteJson + scriptEnd;

	import { browser } from '$app/environment';

	onMount(() => {
		// ✅ Tracking: Page view côté client (home page)
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const supabase = $page.data.supabase;
			logPageView(supabase, {
				page: '/'
			}).catch((err: unknown) => {
				console.error('Error tracking page_view:', err);
			});
		});
	});
</script>

<svelte:head>
	<title
		>Logiciel de gestion pour cake designers - Gagnez du temps avec {WebsiteName}</title
	>
	<meta
		name="description"
		content="Gagnez 2h par jour avec Pattyly ! Logiciel de gestion pour cake designers : boutique en ligne, commandes, devis, factures. Plan gratuit disponible, sans CB."
	/>
	<!-- Schema.org Organization -->
	{@html organizationScript}
	<!-- Schema.org WebSite avec sitelinks suggérés -->
	{@html websiteScript}
	<meta
		name="keywords"
		content="logiciel gestion pâtisserie, logiciel cake designer, boutique en ligne pâtissier, formulaire commande gâteau, logiciel facturation pâtissier, devis cake designer, gestion commandes pâtisserie"
	/>
	<meta
		property="og:title"
		content="Logiciel de gestion pour cake designers - Gagnez du temps avec {WebsiteName}"
	/>
	<meta
		property="og:description"
		content="Gagnez 2h par jour avec Pattyly ! Logiciel de gestion pour cake designers : boutique en ligne, commandes, devis, factures. Plan gratuit disponible, sans CB."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com" />
	<meta property="og:image" content="/images/logo_text.svg" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="flex flex-col">
	<!-- Popup de redirection vers l'annuaire -->
	<CakeDesignerPopup />

	<!-- Hero section - Premier impact -->
	<HeroSection />

	<!-- Introduction - Présentation du produit -->
	<Intro />

	<!-- Pain Points - Problèmes rencontrés -->
	<PainPoints />

	<!-- Before/After - Comparaison visuelle -->
	<BeforeAfter />

	<!-- Solutions - Fonctionnalités principales (avec benefits intégrés) -->
	<Solutions />

	<!-- FAQ - Réponses aux questions -->
	<Faq />

	<!-- Last CTA - Appel à l'action final -->
	<LastCta />
</div>
