<script lang="ts">
	import { WebsiteName } from './../../config';
	import HeroSection from './components/sections/hero.svelte';
	import Intro from './components/sections/intro.svelte';
	import PainPoints from './components/sections/pain-points.svelte';
	import BeforeAfter from './components/sections/before-after.svelte';
	import Solutions from './components/sections/solutions.svelte';
	import LastCta from './components/sections/last-cta.svelte';
	import Faq from './components/sections/faq.svelte';
	import ScrollToTop from './components/scroll-to-top.svelte';
	import CakeDesignerPopup from './components/cake-designer-popup.svelte';
	import { onMount } from 'svelte';

	// Schema.org Organization et WebSite pour SEO
	onMount(() => {
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
						name: 'Tarifs',
						url: 'https://pattyly.com/pricing',
					},
					{
						'@type': 'ListItem',
						position: 2,
						name: 'Boutique en ligne pâtissier',
						url: 'https://pattyly.com/boutique-en-ligne-patissier',
					},
					{
						'@type': 'ListItem',
						position: 3,
						name: 'Logiciel gestion pâtisserie',
						url: 'https://pattyly.com/logiciel-gestion-patisserie',
					},
					{
						'@type': 'ListItem',
						position: 4,
						name: 'Formulaire commande gâteau',
						url: 'https://pattyly.com/formulaire-commande-gateau',
					},
					{
						'@type': 'ListItem',
						position: 5,
						name: 'FAQ',
						url: 'https://pattyly.com/faq',
					},
					{
						'@type': 'ListItem',
						position: 6,
						name: 'Contact',
						url: 'https://pattyly.com/contact',
					},
				],
			},
		};

		// Ajouter Organization schema
		const orgScript = document.createElement('script');
		orgScript.type = 'application/ld+json';
		orgScript.text = JSON.stringify(organizationSchema);
		orgScript.id = 'organization-schema';
		document.head.appendChild(orgScript);

		// Ajouter WebSite schema
		const websiteScript = document.createElement('script');
		websiteScript.type = 'application/ld+json';
		websiteScript.text = JSON.stringify(websiteSchema);
		websiteScript.id = 'website-schema';
		document.head.appendChild(websiteScript);

		return () => {
			const existingOrgScript = document.getElementById('organization-schema');
			if (existingOrgScript) {
				document.head.removeChild(existingOrgScript);
			}
			const existingWebsiteScript = document.getElementById('website-schema');
			if (existingWebsiteScript) {
				document.head.removeChild(existingWebsiteScript);
			}
		};
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

	<!-- Scroll to top button -->
	<ScrollToTop />
</div>
