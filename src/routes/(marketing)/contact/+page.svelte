<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import ContactForm from './contact-form.svelte';
	import { WebsiteName } from '../../../config';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	let heroTitle: HTMLElement;
	let heroContent: HTMLElement;
	let heroCard: HTMLElement;
	let highlightsContainer: HTMLElement;
	let formContainer: HTMLElement;
	let faqContainer: HTMLElement;

	onMount(async () => {
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.6 });
		if (heroContent) await revealElement(heroContent, { delay: 0.1, duration: 0.6 });
		if (heroCard) await revealElement(heroCard, { delay: 0.2, duration: 0.6 });
		if (highlightsContainer) {
			// S'assurer que les éléments sont toujours visibles
			const elements = highlightsContainer.querySelectorAll(':scope > div');
			elements.forEach((el) => {
				const htmlEl = el as HTMLElement;
				htmlEl.style.opacity = '1';
				htmlEl.style.transform = 'translateY(0)';
			});
			await revealStagger(highlightsContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		}
		if (formContainer) await revealElement(formContainer, { delay: 0, duration: 0.6 });
		if (faqContainer) await revealStagger(faqContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
	});

	export let data;

	const contactHighlights = [
		{
			title: 'Support pour ta boutique',
			description:
				'Besoin d\'aide pour configurer ta boutique en ligne ou personnaliser tes formulaires de commande ? On t\'accompagne étape par étape.',
		},
		{
			title: 'Comprendre toutes les fonctionnalités',
			description:
				'On te montre comment gérer tes commandes, créer tes devis, organiser ton planning et faire grandir ton activité de cake designer.',
		},
		{
			title: 'Questions tarifaires ou administratives',
			description:
				'Tu veux un devis, mettre à jour une facture ou prévoir plusieurs boutiques ? On t\'accompagne avec des réponses claires et rapides.',
		},
	];

	const commitments = [
		{
			title: 'Réponse sous 24h ouvrées',
			description:
				'On lit chaque message et on revient vers toi rapidement avec des réponses claires et pratiques.',
		},
		{
			title: 'Équipe dédiée aux cake designers',
			description:
				'Tu discutes directement avec des personnes qui comprennent les défis de ton activité de pâtissier.',
		},
		{
			title: 'Guides et ressources utiles',
			description:
				'On partage les tutos et guides qui t\'aident à avancer sans attendre notre retour.',
		},
	];

	const quickFaqs = [
		{
			question: 'Puis-je tester avant de payer ?',
			answer:
				'Oui, tu peux créer ton compte gratuitement et utiliser la version gratuite à vie. Configure ta boutique et commence à recevoir des commandes sans engagement.',
		},
		{
			question: 'Comment modifier ma boutique après création ?',
			answer:
				'Tu peux modifier tous les éléments de ta boutique à tout moment : produits, disponibilités, personnalisation, etc. Tout est modifiable depuis ton tableau de bord.',
		},
		{
			question: 'Proposez-vous une facture ou un devis ?',
			answer:
				'Bien sûr. Écris-nous simplement le nom de ta boutique, les infos de facturation et on t\'envoie le document rapidement.',
		},
		{
			question: 'Puis-je rester sur la version gratuite ?',
			answer:
				'Absolument ! La version gratuite est disponible à vie. Tu peux rester sur ce plan aussi longtemps que tu veux. Si tu as besoin de plus de fonctionnalités, tu peux passer à un plan payant à tout moment.',
		},
	];
</script>

<svelte:head>
	<title>Contact {WebsiteName} | Support logiciel cake designer</title>
	<meta
		name="description"
		content="Besoin d'aide ? Contacte l'équipe Pattyly ! Support réactif sous 24h pour ton logiciel de gestion cake designer. On répond à toutes tes questions."
	/>
	<meta
		name="keywords"
		content="contact pattyly, support logiciel pâtisserie, aide boutique en ligne, assistance cake designer, support gestion pâtisserie, contact logiciel pâtissier, support pattyly, aide boutique pâtisserie"
	/>
	<meta
		property="og:title"
		content="Contact {WebsiteName} | Support logiciel cake designer"
	/>
	<meta
		property="og:description"
		content="Contactez l'équipe Pattyly pour toute question sur notre logiciel de gestion pour cake designers. Support réactif sous 24h."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/contact" />
	<link rel="canonical" href="https://pattyly.com/contact" />
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
						Besoin d'un coup de main ?
					</p>
					<h1
						class="text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
						style="font-weight: 600; letter-spacing: -0.03em;"
					>
						On prend soin de ton activité<br />
						<span class="text-[#FF6F61]">comme si c'était la nôtre</span>
					</h1>
					<p 
						class="text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
						style="font-weight: 300; letter-spacing: -0.01em;"
					>
						Écris-nous pour configurer ta boutique, optimiser tes commandes ou
						préparer ta facturation. On répond vite, sans jargon, avec des conseils
						prêts à être appliqués.
					</p>
				</div>

				<div 
					bind:this={heroCard}
					class="w-full max-w-md rounded-3xl border-2 border-[#FF6F61] bg-gradient-to-br from-white via-[#FFE8D6]/20 to-white p-10 shadow-xl"
				>
					<h2 class="text-2xl font-semibold uppercase tracking-[0.1em] text-neutral-900">
						Nos engagements
					</h2>
					<ul class="mt-6 space-y-5">
						{#each commitments as item}
							<li class="rounded-2xl bg-gradient-to-br from-[#FFE8D6]/40 to-[#FFE8D6]/20 p-5">
								<h3 class="text-base font-semibold text-neutral-900">
									{item.title}
								</h3>
								<p class="mt-2 text-sm leading-relaxed text-neutral-700">
									{item.description}
								</p>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Section "Comment on t'aide" avec style premium -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="mb-20 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Notre approche
				</p>
				<h2 
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Comment on t'aide concrètement
				</h2>
				<p 
					class="mt-6 mx-auto max-w-2xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					On s'adapte à ton niveau d'avancement : que tu lances tout juste
					Pattyly ou que tu sois déjà en train de recevoir des commandes.
				</p>
				<div class="mt-8 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>
			<div bind:this={highlightsContainer} class="grid gap-8 md:grid-cols-3">
				{#each contactHighlights as highlight}
					<div 
						class="highlight-card rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-[#FF6F61] hover:shadow-lg"
						style="opacity: 1 !important; transform: translateY(0) !important;"
					>
						<h3 class="text-xl font-semibold text-neutral-900">
							{highlight.title}
						</h3>
						<p class="mt-4 text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
							{highlight.description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Formulaire de contact avec style premium -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
			<div class="mb-12 text-center">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Contactez-nous
				</p>
				<h2 
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Nous écrire
				</h2>
				<p 
					class="mt-6 mx-auto max-w-2xl text-lg leading-[180%] text-neutral-600 sm:text-xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Partage le contexte de ton activité et ce que tu veux accomplir.<br />
					On te répond sous 24h ouvrées.
				</p>
				<div class="mt-8 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>
			
			<Card.Root bind:this={formContainer} class="mx-auto max-w-2xl rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-10 shadow-xl">
				<Card.Content class="flex flex-col gap-6">
					<ContactForm data={data.form} />
				</Card.Content>
			</Card.Root>
		</div>
	</section>

	<!-- Section FAQ rapide avec style premium -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/10 to-transparent"></div>
		
		<div class="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
			<div class="text-center mb-16">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Questions fréquentes
				</p>
				<h2 
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					On te répond avant même ton message
				</h2>
				<div class="mt-6 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>
			<div bind:this={faqContainer} class="space-y-6">
				{#each quickFaqs as faq}
					<div class="rounded-3xl border-2 border-[#FFE8D6] bg-gradient-to-br from-[#FFE8D6]/40 via-[#FFE8D6]/20 to-white p-8 shadow-sm transition-all duration-300 hover:border-[#FF6F61] hover:shadow-md">
						<h3 class="text-xl font-semibold text-neutral-900 sm:text-2xl">
							{faq.question}
						</h3>
						<p class="mt-4 text-base leading-[175%] text-neutral-700 sm:text-lg" style="font-weight: 300;">
							{faq.answer}
						</p>
					</div>
				{/each}
			</div>
			<div class="mt-12 text-center">
				<a
					href="/faq"
					class="inline-flex items-center justify-center rounded-xl border-2 border-[#FF6F61] bg-white px-8 py-4 text-base font-semibold text-[#FF6F61] transition-all duration-300 hover:bg-[#FFE8D6] hover:scale-[1.02]"
				>
					Explorer toutes les questions fréquentes
				</a>
			</div>
		</div>
	</section>
</main>

<style>
	.highlight-card {
		opacity: 1 !important;
		transform: translateY(0) !important;
	}
</style>
