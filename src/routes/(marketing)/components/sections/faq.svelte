<script lang="ts">
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger,
	} from '$lib/components/ui/collapsible';
	import { ChevronDown } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	let section: HTMLElement;
	let title: HTMLElement;
	let faqContainer: HTMLElement;

	// FAQ data - facile à modifier et ajouter
	const faqItems = [
		{
			question: 'Combien de temps ça prend pour configurer ma boutique ?',
			answer:
				'Environ 5 minutes ! Tu peux créer ton compte, ajouter tes premiers produits et commencer à recevoir des commandes en moins de 10 minutes. Pas besoin de connaissances techniques. Notre logiciel de gestion pour pâtissiers est conçu pour être ultra-simple. Tu commences par créer ta boutique en ligne en ajoutant tes gâteaux avec photos et descriptions. Ensuite, tu configures tes options de personnalisation (couleurs, décorations, toppers) et tes prix. Une fois ta boutique configurée, tu partages simplement le lien avec tes clients. Ils peuvent alors commander directement via le formulaire de commande en ligne, même quand tu es occupée. Pas besoin de savoir coder ou de payer un développeur : tout est intuitif et prêt à l\'emploi.',
		},
		{
			question: 'Est-ce que je peux personnaliser mes gâteaux ?',
			answer:
				'Absolument ! Tu peux créer des formulaires de personnalisation pour chaque gâteau avec des options (couleurs, décorations, toppers) et même des suppléments payants. Notre système de personnalisation te permet de proposer des gâteaux personnalisés avec autant d\'options que tu veux. Pour chaque gâteau, tu définis les choix possibles : couleurs de glaçage, types de décorations, toppers personnalisés, tailles, etc. Tu peux même ajouter des suppléments payants (par exemple, +5€ pour un topper en sucre, +10€ pour une décoration premium). Le prix se calcule automatiquement selon les options choisies par le client. C\'est parfait pour les gâteaux de mariage, anniversaires, ou événements spéciaux où chaque détail compte.',
		},
		{
			question: 'Comment ça marche pour les paiements ?',
			answer:
				'PayPal gère tout ! Tes clients paient en ligne de manière sécurisée via ton lien PayPal.me, et l\'argent arrive directement sur ton compte PayPal. Tu valides ensuite la réception sur la plateforme. Le processus est simple : quand un client passe commande via ta boutique en ligne, il reçoit automatiquement un lien PayPal pour effectuer le paiement. Une fois le paiement effectué, tu reçois une notification et tu peux valider la commande depuis ton tableau de bord. L\'argent arrive directement sur ton compte PayPal, sans intermédiaire. Notre logiciel de facturation pour pâtissiers génère aussi automatiquement les factures pour chaque commande payée. Tu as une traçabilité complète de tous tes paiements et commandes en un seul endroit. Plus besoin de gérer les paiements manuellement ou de créer tes factures à la main.',
		},
		{
			question: 'Est-ce que mes clients doivent créer un compte ?',
			answer:
				'Non, ils peuvent commander directement sans inscription compliquée. L\'expérience est fluide et pensée pour éviter les abandons de commande. Tes clients n\'ont pas besoin de créer un compte pour commander un gâteau. Ils remplissent simplement le formulaire de commande en ligne avec leurs informations (nom, email, téléphone) et leurs préférences de personnalisation. C\'est tout ! Cette simplicité réduit les frictions et augmente tes conversions. Beaucoup de clients abandonnent une commande si on leur demande de créer un compte : avec Pattyly, ils peuvent commander en quelques clics, même en tant qu\'invité. Tu reçois quand même toutes leurs informations pour pouvoir les contacter et livrer leur commande.',
		},
		{
			question: 'Et si je veux arrêter ?',
			answer:
				'Tu es libre à 100% ! Pas d\'engagement, pas de frais cachés. Tu peux arrêter quand tu veux, et tes données restent à toi. On croit à la liberté des entrepreneurs. Chez Pattyly, on comprend que les besoins évoluent. Tu peux résilier ton abonnement à tout moment, sans frais de résiliation ni engagement. Tes données (produits, commandes, clients) restent accessibles pendant 30 jours après la résiliation, le temps que tu puisses les exporter si besoin. Pas de piège, pas de frais cachés : tu paies uniquement pour les mois où tu utilises le service. Si tu veux faire une pause ou essayer autre chose, c\'est ton droit. On veut que tu restes parce que le service te plaît, pas parce que tu es bloqué.',
		},
		{
			question: 'Est-ce que je peux gérer mes disponibilités ?',
			answer:
				'Oui ! Tu définis tes créneaux disponibles, tes jours de fermeture, et même tes délais de préparation par gâteau. Tes clients voient en temps réel ce qui est possible. Notre système de gestion de planning te permet de définir tes disponibilités de manière flexible. Tu peux créer des créneaux récurrents (par exemple, "tous les samedis de 9h à 12h") ou des créneaux ponctuels. Tu définis aussi tes jours de fermeture (vacances, congés) et tes délais de préparation par type de gâteau. Quand un client veut commander, il voit automatiquement les créneaux disponibles selon le type de gâteau choisi et tes délais. Plus de risque de surcharge ou de double réservation. Le planning se met à jour en temps réel, et tu reçois une notification à chaque nouvelle réservation.',
		},
		{
			question: 'Mes clients vont-ils recevoir des confirmations ?',
			answer:
				'Oui, chaque commande envoie automatiquement un email de confirmation au client et à toi, pour éviter tout malentendu. Dès qu\'un client passe commande via ta boutique en ligne, il reçoit automatiquement un email de confirmation avec tous les détails : le gâteau commandé, les options choisies, le prix, et le créneau de livraison/récupération. Tu reçois aussi une notification par email avec toutes les informations de la commande. Ces emails automatiques réduisent les malentendus et les questions répétitives. Tes clients ont une trace écrite de leur commande, et toi tu as une notification immédiate pour pouvoir préparer la commande. C\'est un gain de temps énorme et une image professionnelle pour ton activité.',
		},
	];

	// Schema.org FAQPage pour SEO
	onMount(() => {
		const faqSchema = {
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

		const script = document.createElement('script');
		script.type = 'application/ld+json';
		script.text = JSON.stringify(faqSchema);
		document.head.appendChild(script);

		// Reveal animations
		if (section) {
			if (title) revealElement(title, { delay: 0 });
			if (faqContainer) revealStagger(faqContainer, ':scope > *', { delay: 0.1, stagger: 0.05 });
		}

		return () => {
			document.head.removeChild(script);
		};
	});
</script>

<section bind:this={section} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
	<!-- Background subtle -->
	<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/10 via-transparent to-transparent"></div>
	
	<div class="relative mx-auto max-w-4xl px-6 sm:px-8 lg:px-12">
		<!-- Header avec design premium -->
		<div class="mb-20 text-center">
			<h2
				bind:this={title}
				class="mb-6 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl xl:text-6xl"
				style="font-weight: 600; letter-spacing: -0.03em;"
			>
				Des questions ? On répond à tout
			</h2>
			<p 
				class="text-lg text-neutral-600 sm:text-xl md:text-2xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				Tout ce que tu veux savoir sur Pattyly
			</p>
			<!-- Séparateur élégant -->
			<div class="mt-8 flex items-center justify-center gap-4">
				<div class="h-px w-16 bg-neutral-300"></div>
				<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
				<div class="h-px w-16 bg-neutral-300"></div>
			</div>
		</div>

		<!-- FAQ Accordions avec design premium -->
		<div bind:this={faqContainer} class="space-y-3">
			{#each faqItems as faqItem}
				<Collapsible
					class="rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:border-neutral-300 hover:shadow-md"
				>
					<CollapsibleTrigger
						class="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-neutral-50/50 sm:p-8"
					>
						<h3
							class="flex-1 break-words pr-6 text-lg font-medium leading-[140%] text-neutral-900 sm:text-xl"
							style="font-weight: 500; letter-spacing: -0.01em;"
						>
							{faqItem.question}
						</h3>
						<ChevronDown
							class="h-5 w-5 flex-shrink-0 text-neutral-400 transition-transform duration-300"
						/>
					</CollapsibleTrigger>
					<CollapsibleContent class="px-6 pb-8 sm:px-8">
						<p 
							class="text-base leading-[175%] text-neutral-600 sm:text-lg"
							style="font-weight: 300; letter-spacing: -0.01em;"
						>
							{faqItem.answer}
						</p>
					</CollapsibleContent>
				</Collapsible>
			{/each}
		</div>

		<!-- CTA sous la FAQ avec design premium -->
		<div class="mt-20 text-center">
			<p 
				class="mb-8 text-lg leading-[160%] text-neutral-700 sm:text-xl md:text-2xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				Tu as d'autres questions ?
			</p>
			<a
				href="/contact"
				class="inline-flex items-center justify-center rounded-xl border border-neutral-300 bg-transparent px-10 py-4 text-base font-medium text-neutral-700 transition-all duration-300 hover:border-neutral-400 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-300 focus:ring-offset-2"
			>
				Contacte-nous
			</a>
		</div>
	</div>
</section>
