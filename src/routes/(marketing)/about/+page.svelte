<script lang="ts">
	import { onMount } from 'svelte';
	import { WebsiteName } from '../../../config';
	import { revealElement, revealStagger } from '$lib/utils/animations';

	let heroTitle: HTMLElement;
	let heroContent: HTMLElement;
	let heroCard: HTMLElement;
	let reasonsContainer: HTMLElement;
	let timelineContainer: HTMLElement;
	let valuesContainer: HTMLElement;
	let visionContainer: HTMLElement;
	let ctaContainer: HTMLElement;

	onMount(async () => {
		if (heroTitle) await revealElement(heroTitle, { delay: 0, duration: 0.6 });
		if (heroContent) await revealElement(heroContent, { delay: 0.1, duration: 0.6 });
		if (heroCard) await revealElement(heroCard, { delay: 0.2, duration: 0.6 });
		if (reasonsContainer) await revealStagger(reasonsContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		if (timelineContainer) await revealStagger(timelineContainer, ':scope > div', { delay: 0.1, stagger: 0.1 });
		if (valuesContainer) await revealStagger(valuesContainer, ':scope > div', { delay: 0.1, stagger: 0.08 });
		if (visionContainer) await revealElement(visionContainer, { delay: 0, duration: 0.6 });
		if (ctaContainer) await revealElement(ctaContainer, { delay: 0, duration: 0.6 });
	});

	const storyReasons = [
		{
			title: 'Simplifier la gestion administrative',
			description:
				'Les cake designers passent trop de temps à gérer Excel, devis et factures au détriment de leur passion créative.',
		},
		{
			title: 'Centraliser toutes les tâches',
			description:
				'Plutôt que d\'utiliser plusieurs outils (Instagram, Excel, Word), tout doit être centralisé dans un seul outil simple.',
		},
		{
			title: 'Offrir une expérience professionnelle',
			description:
				'Les clients méritent une expérience de commande fluide et moderne, pas des échanges par DM Instagram.',
		},
	];

	const timeline = [
		{
			title: 'Le constat initial',
			tag: 'Aux origines',
			description:
				'Les cake designers et pâtissiers indépendants passent trop de temps à gérer leur activité administrative : commandes par Instagram DM, gestion Excel, devis et factures manuels.',
		},
		{
			title: 'Une question simple',
			tag: 'Point de bascule',
			description:
				'Comment permettre aux cake designers de se concentrer sur leur passion créative tout en gérant efficacement leur activité ? La réponse s\'est dessinée en observant les défis quotidiens des pâtissiers.',
		},
		{
			title: 'Le prototype Pattyly',
			tag: 'Premiers tests',
			description:
				'Nous avons imaginé une plateforme complète : boutique en ligne, gestion des commandes, devis et factures automatiques, planning des disponibilités. Tout dans un seul outil.',
		},
		{
			title: 'La plateforme d\'aujourd\'hui',
			tag: 'Ce que c\'est devenu',
			description:
				'Pattyly accompagne désormais les cake designers et pâtissiers indépendants pour qu\'ils puissent se concentrer sur ce qui compte vraiment : créer des pâtisseries exceptionnelles.',
		},
	];

	const teamValues = [
		{
			title: 'Simplicité & accessibilité',
			description:
				'Du dashboard à la boutique en ligne, tout est pensé pour être simple et intuitif. Pas besoin de formations compliquées pour utiliser Pattyly.',
		},
		{
			title: 'Technologie au service de la créativité',
			description:
				'Les formulaires de personnalisation et la gestion des commandes sont pensés pour que tu passes plus de temps derrière ton four qu\'à répondre à des messages.',
		},
		{
			title: 'Accompagnement sincère',
			description:
				'On reste joignables avant, pendant et après ton inscription. Pattyly c\'est une équipe, pas seulement un outil.',
		},
	];

	const structuredData = {
		'@context': 'https://schema.org',
		'@type': 'AboutPage',
		name: 'À propos de Pattyly',
		description:
			'Découvrez l\'histoire de Pattyly : né d\'un constat simple, notre logiciel aide les cake designers à simplifier la gestion de leur activité et à se concentrer sur leur passion créative.',
	};
</script>

<svelte:head>
	<title>À propos de {WebsiteName} - Notre histoire | Logiciel gestion cake designer</title>
	<meta
		name="description"
		content="Découvre l'histoire de Pattyly : comment on aide les cake designers à gagner du temps et se concentrer sur leur passion. Une équipe dédiée à ta réussite."
	/>
	<meta
		name="keywords"
		content="à propos pattyly, histoire pattyly, qui sommes nous, logiciel gestion pâtisserie, solution cake designer, organisation pâtisserie, boutique en ligne pâtisserie, gestion commandes pâtisserie"
	/>
	<meta
		property="og:title"
		content="À propos de {WebsiteName} - Notre histoire | Logiciel gestion cake designer"
	/>
	<meta
		property="og:description"
		content="Découvrez l'histoire de Pattyly : né d'un constat simple, notre logiciel aide les cake designers et pâtissiers indépendants à simplifier la gestion de leur activité."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://pattyly.com/about" />
	<link rel="canonical" href="https://pattyly.com/about" />
	<script type="application/ld+json">
		{JSON.stringify(structuredData)}
	</script>
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
						Notre histoire
					</p>
					<h1 
						class="text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
						style="font-weight: 600; letter-spacing: -0.03em;"
					>
						L'origine de <span class="text-[#FF6F61]">Pattyly</span>
					</h1>
					<p 
						class="text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
						style="font-weight: 300; letter-spacing: -0.01em;"
					>
						Pattyly est né d'un constat très simple : les cake designers passent
						trop de temps à gérer leur activité administrative au détriment de
						leur passion créative. Face à ce défi, il fallait une solution
						simple, complète et moderne.
					</p>
				</div>

				<div 
					bind:this={heroCard}
					class="w-full max-w-md rounded-3xl border-2 border-[#FF6F61] bg-gradient-to-br from-white via-[#FFE8D6]/20 to-white p-10 shadow-xl"
				>
					<h2 class="text-2xl font-semibold uppercase tracking-[0.1em] text-neutral-900">
						Le déclic
					</h2>
					<p class="mt-6 text-base leading-relaxed text-neutral-700">
						« Et si les cake designers pouvaient se concentrer sur leur passion
						créative plutôt que sur la gestion administrative ? »
					</p>
					<p class="mt-4 text-base leading-relaxed text-neutral-700">
						De cette intuition est née une plateforme intuitive qui marie
						simplicité, innovation et praticité — pour faciliter la vie des cake
						designers et rendre leur activité plus professionnelle.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Section "Pourquoi on a créé Pattyly" avec style premium -->
	<section class="relative overflow-hidden border-y border-neutral-200 bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="grid gap-16 md:grid-cols-[3fr,2fr] md:items-start">
				<div class="space-y-8">
					<h2 
						class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
						style="font-weight: 600; letter-spacing: -0.02em;"
					>
						Pourquoi on a créé Pattyly
					</h2>
					<div class="space-y-6">
						<p 
							class="text-lg leading-[175%] text-neutral-600 sm:text-xl"
							style="font-weight: 300;"
						>
							En observant les cake designers et pâtissiers indépendants, on
							s'est heurtés à une évidence : les solutions existantes n'étaient
							ni assez simples, ni assez complètes pour répondre à leurs besoins
							spécifiques.
						</p>
						<p 
							class="text-lg leading-[175%] text-neutral-600 sm:text-xl"
							style="font-weight: 300;"
						>
							Plutôt que de multiplier les outils, nous avons réuni tout ce qui
							fait gagner du temps aux cake designers — et ce qui rend leur
							activité plus professionnelle — dans une seule expérience.
						</p>
					</div>
				</div>
				<div bind:this={reasonsContainer} class="rounded-3xl border-2 border-[#FF6F61] bg-gradient-to-br from-white via-[#FFE8D6]/20 to-white p-8 shadow-xl">
					<h3 class="text-base font-semibold uppercase tracking-[0.15em] text-neutral-900">
						Ce que nous voulions résoudre
					</h3>
					<ul class="mt-6 space-y-6">
						{#each storyReasons as reason}
							<li class="flex gap-4">
								<span
									class="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#FF6F61] text-sm font-semibold text-white"
								>
									✓
								</span>
								<div>
									<strong class="block text-base font-semibold text-neutral-900">
										{reason.title}
									</strong>
									<span class="mt-1 block text-sm leading-relaxed text-neutral-700">
										{reason.description}
									</span>
								</div>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Timeline avec style premium -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="rounded-3xl border-2 border-neutral-200 bg-gradient-to-br from-white via-[#FFE8D6]/10 to-white p-12 shadow-lg">
				<div class="mb-12">
					<h2 
						class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
						style="font-weight: 600; letter-spacing: -0.02em;"
					>
						Une histoire en mouvement
					</h2>
					<p 
						class="mt-4 text-lg leading-[175%] text-neutral-600 sm:text-xl"
						style="font-weight: 300;"
					>
						Suis notre ligne du temps : de la première intuition aux cake
						designers que nous accompagnons aujourd'hui.
					</p>
				</div>
				<div bind:this={timelineContainer} class="space-y-12">
					{#each timeline as item, index (item.title)}
						{@const isFirst = index === 0}
						{@const isLast = index === timeline.length - 1}
						<div class="flex gap-8 md:gap-12">
							<div class="relative flex flex-col items-center">
								<span
									class="flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold shadow-lg text-white"
									style="background-color: {isFirst ? '#333' : '#FF6F61'};"
								>
									{index + 1}
								</span>
								{#if !isLast}
									<span class="mt-2 h-full w-0.5 flex-1 bg-gradient-to-b from-neutral-200 to-transparent"></span>
								{/if}
							</div>
							<div class="flex-1 pb-8">
								<p class="text-xs font-semibold uppercase tracking-[0.2em] text-[#FF6F61]">
									{item.tag}
								</p>
								<h3 class="mt-3 text-xl font-semibold text-neutral-900 sm:text-2xl">
									{item.title}
								</h3>
								<p class="mt-3 text-base leading-[175%] text-neutral-600 sm:text-lg" style="font-weight: 300;">
									{item.description}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Section Valeurs avec style premium -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
			<div class="text-center mb-16">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Nos convictions
				</p>
				<h2 
					class="mt-4 text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Pourquoi Pattyly te facilite la vie
				</h2>
				<div class="mt-6 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>
			<div bind:this={valuesContainer} class="grid gap-8 md:grid-cols-3">
				{#each teamValues as item}
					<div class="rounded-3xl border-2 border-[#FFE8D6] bg-gradient-to-br from-[#FFE8D6]/30 via-[#FFE8D6]/20 to-white p-8 shadow-sm transition-all duration-300 hover:border-[#FF6F61] hover:shadow-lg">
						<h3 class="text-xl font-semibold text-neutral-900">
							{item.title}
						</h3>
						<p class="mt-4 text-base leading-[175%] text-neutral-700" style="font-weight: 300;">
							{item.description}
						</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Section Vision avec style premium -->
	<section bind:this={visionContainer} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-br from-[#FFE8D6]/40 via-[#FFE8D6]/20 to-transparent"></div>
		<div class="relative mx-auto max-w-4xl px-6 sm:px-8 lg:px-12">
			<div class="rounded-3xl border-2 border-[#FF6F61] bg-gradient-to-br from-white/90 via-white/80 to-white/90 p-12 text-center shadow-xl backdrop-blur-sm">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					La vision Pattyly
				</p>
				<blockquote 
					class="mt-8 text-2xl leading-relaxed text-neutral-900 sm:text-3xl md:text-4xl"
					style="font-weight: 400; letter-spacing: -0.01em;"
				>
					« On ne voulait plus choisir entre une activité créative et une
					gestion administrative efficace. Pattyly est né pour que les cake
					designers retrouvent de la sérénité et se concentrent sur leur
					passion. »
				</blockquote>
				<p class="mt-8 text-lg leading-[175%] text-neutral-600 sm:text-xl" style="font-weight: 300;">
					Nous continuons d'améliorer la plateforme avec les retours de la
					communauté : chaque cake designer nous inspire une nouvelle attention.
				</p>
			</div>
		</div>
	</section>

	<!-- CTA Final avec style premium -->
	<section bind:this={ctaContainer} class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/20 to-transparent"></div>
		
		<div class="relative mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
			<h2 
				class="text-3xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl"
				style="font-weight: 600; letter-spacing: -0.02em;"
			>
				Prêt·e à écrire la suite de ton histoire ?
			</h2>
			<p 
				class="mt-6 text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
				style="font-weight: 300; letter-spacing: -0.01em;"
			>
				Pattyly te permet de créer ta boutique en ligne, gérer tes commandes et
				faire grandir ton activité en toute simplicité. On t'accompagne à chaque
				étape.
			</p>
			<div class="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a
					href="/register"
					class="inline-flex h-14 items-center justify-center rounded-xl bg-[#FF6F61] px-8 text-base font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:bg-[#e85a4f] hover:shadow-xl"
				>
					Créer mon compte
				</a>
				<a
					href="/pricing"
					class="inline-flex h-14 items-center justify-center rounded-xl border-2 border-neutral-800 bg-white px-8 text-base font-semibold text-neutral-800 transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
				>
					Découvrir nos tarifs
				</a>
			</div>
		</div>
	</section>
</main>
