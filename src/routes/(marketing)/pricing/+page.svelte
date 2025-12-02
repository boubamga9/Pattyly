<script lang="ts">
	import { WebsiteName } from '../../../config';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Star, Check, X } from 'lucide-svelte';
	import { revealElement, revealStagger } from '$lib/utils/animations';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	export let data;
	const { plans } = data;

	// ✅ Tracking: Page view côté client (pricing page)
	onMount(() => {
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const supabase = $page.data.supabase;
			logPageView(supabase, {
				page: '/pricing'
			}).catch((err: unknown) => {
				console.error('Error tracking page_view:', err);
			});
		});
	});

	let headerTitle: HTMLElement;
	let headerDescription: HTMLElement;
	let plansContainer: HTMLElement;

	// Fonction pour identifier les différenciateurs de chaque plan
	function isDifferentiator(planId: string, feature: string): boolean {
		if (planId === 'starter') {
			// Différenciateurs Starter vs Gratuit
			return feature.includes('20 commandes') || 
			       feature.includes('10 gâteaux') ||
			       feature.includes('prioritaire');
		}
		
		if (planId === 'premium') {
			// Différenciateurs Premium vs Starter
			return feature.includes('illimitées') || 
			       feature.includes('Visibilité +') || 
			       feature.includes('Envoi de devis');
		}
		
		return false;
	}

	// Fonction pour obtenir la couleur du différenciateur selon le plan
	function getDifferentiatorColor(planId: string): string {
		if (planId === 'starter') {
			return '#3B82F6'; // Bleu pour Starter
		}
		if (planId === 'premium') {
			return '#FF6F61'; // Rouge/Orange pour Premium
		}
		return '';
	}

	onMount(async () => {
		if (headerTitle) await revealElement(headerTitle, { delay: 0, duration: 0.6 });
		if (headerDescription) await revealElement(headerDescription, { delay: 0.1, duration: 0.6 });
		if (plansContainer) await revealStagger(plansContainer, ':scope > div', { delay: 0.2, stagger: 0.1 });
	});
</script>

<svelte:head>
	<title>Tarifs et abonnements - Logiciel gestion pâtisserie | {WebsiteName}</title>
	<meta
		name="description"
		content="Tarifs transparents pour logiciel gestion cake designers. Plan gratuit disponible à vie. Abonnements flexibles dès 14,99€/mois. Crée ta boutique sans engagement."
	/>
	<meta
		name="keywords"
		content="tarifs pattyly, prix logiciel pâtisserie, abonnement cake designer, logiciel gestion pâtissier prix, tarif boutique en ligne pâtisserie, logiciel pâtisserie gratuit"
	/>
</svelte:head>

<div class="flex flex-col">
	<!-- Hero Section avec style premium awwards -->
	<section class="relative overflow-hidden bg-white pt-24 pb-4 sm:pt-32 sm:pb-6 md:pt-40 md:pb-8">
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/20 via-transparent to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="text-center mb-12">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61] mb-6">
					Tarifs transparents
				</p>
				<h1 
					bind:this={headerTitle}
					class="text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Choisis ton <span class="text-[#FF6F61]">forfait</span>
				</h1>
				<p 
					bind:this={headerDescription}
					class="mt-6 mx-auto max-w-2xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Démarre ton activité de pâtissier en ligne avec nos plans flexibles.
					Crée ta boutique, gère tes commandes et développe ton activité.
				</p>
				<!-- Séparateur élégant -->
				<div class="mt-8 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>
		</div>
	</section>

	<!-- Plans Section avec design awwards -->
	<section class="relative overflow-hidden bg-white pt-6 pb-24 sm:pt-8 sm:pb-32 md:pt-10 md:pb-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
			<div
				bind:this={plansContainer}
				class="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
			>
				{#each plans as plan}
					<div class="group relative flex flex-col">
						<Card.Root class="relative h-full rounded-3xl border transition-all duration-500 hover:shadow-2xl {plan.popular 
							? 'border-2 border-[#FF6F61] bg-gradient-to-br from-white via-[#FFE8D6]/30 to-[#FFE8D6]/40 shadow-xl' 
							: plan.isFree
								? 'border-neutral-200 bg-white hover:border-neutral-300'
								: 'border-neutral-200 bg-white hover:border-neutral-300'}">
							
							{#if plan.popular}
								<!-- Badge populaire -->
								<div class="absolute -top-5 left-1/2 -translate-x-1/2 transform z-10">
									<Badge
										class="flex items-center gap-1.5 rounded-full bg-[#FF6F61] px-5 py-2 text-xs font-semibold text-white shadow-lg"
									>
										<Star class="h-3.5 w-3.5 fill-white" />
										Le plus populaire
									</Badge>
								</div>
								
								<!-- Éléments décoratifs pour le plan populaire -->
								<div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#FF6F61] opacity-10 blur-3xl"></div>
								<div class="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-[#FF6F61] opacity-10 blur-2xl"></div>
							{/if}

							<Card.Header class="pb-6 pt-6 sm:pb-8 sm:pt-8">
								<Card.Title class="text-xl font-semibold text-neutral-900 mb-2 sm:text-2xl sm:mb-3" style="font-weight: 600;">
									{plan.name}
								</Card.Title>
								{#if !plan.isFree}
									<Card.Description class="text-sm leading-relaxed text-neutral-600 sm:text-base" style="font-weight: 300;">
										Facturation mensuelle, sans engagement
									</Card.Description>
								{:else}
									<Card.Description class="text-sm leading-relaxed text-neutral-600 sm:text-base" style="font-weight: 300;">
										Version gratuite à vie, parfait pour démarrer
									</Card.Description>
								{/if}
							</Card.Header>

							<Card.Content class="flex flex-col gap-6 pb-6 sm:gap-8 sm:pb-8">
								<!-- Prix -->
								<div class="flex flex-col items-center gap-2">
									{#if plan.isFree}
										<div class="text-center">
											<span class="text-xs font-semibold text-green-600 sm:text-sm">Gratuit à vie</span>
										</div>
										<div class="flex items-baseline justify-center">
											<span class="text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl" style="font-weight: 700; letter-spacing: -0.04em;">
												Gratuit
											</span>
										</div>
									{:else}
										<div class="text-center">
											<span class="text-xs font-semibold text-green-600 sm:text-sm">7 jours gratuits</span>
										</div>
										<div class="flex flex-col items-center gap-1">
											{#if plan.originalPrice}
												<div class="flex flex-col items-center gap-1">
													<span class="text-xs font-semibold text-[#FF6F61] sm:text-sm">Prix de lancement</span>
													<div class="flex items-baseline justify-center gap-2">
														<span class="text-2xl font-semibold tracking-tight text-neutral-400 line-through sm:text-3xl" style="font-weight: 500; letter-spacing: -0.02em;">
															{plan.originalPrice}€
														</span>
													</div>
												</div>
											{/if}
											<div class="flex items-baseline justify-center gap-2">
												<span class="text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl" style="font-weight: 700; letter-spacing: -0.04em;">
													{plan.price}€
												</span>
												<span class="text-base text-neutral-600 sm:text-lg" style="font-weight: 300;">/mois</span>
											</div>
										</div>
										<div class="mt-2 text-center">
											<span class="text-xs text-neutral-600 sm:text-sm" style="font-weight: 400;">
												✔ Rentabilisé dès la première commande
											</span>
										</div>
									{/if}
								</div>

								<!-- Bouton CTA -->
								<Button
									class="w-full h-12 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-[1.02] sm:h-14 sm:text-base {plan.popular
										? 'bg-[#FF6F61] hover:bg-[#e85a4f] text-white shadow-lg hover:shadow-xl'
										: plan.isFree
											? 'bg-neutral-800 hover:bg-neutral-700 text-white shadow-lg hover:shadow-xl'
											: 'bg-neutral-800 hover:bg-neutral-700 text-white shadow-lg hover:shadow-xl'}"
									href="/register"
									on:click={() => {
										if (!plan.isFree && plan.id && typeof window !== 'undefined') {
											localStorage.setItem('selected_plan', plan.id);
										}
									}}
								>
									{plan.isFree ? 'Commencer gratuitement' : 'Choisir ce plan'}
								</Button>
							</Card.Content>

							<!-- Features avec design premium -->
							<Card.Footer class="pt-4 pb-6 px-4 sm:pt-6 sm:pb-8 sm:px-6">
								<div class="space-y-3 sm:space-y-4">
									{#each plan.features as feature}
										{@const isDiff = isDifferentiator(plan.id, feature)}
										{@const diffColor = getDifferentiatorColor(plan.id)}
										
										<div class="flex items-start gap-2.5 sm:gap-3 {isDiff ? 'rounded-lg px-2 py-1.5 -mx-2 sm:px-3 sm:py-2 sm:-mx-3' : ''}" style={isDiff ? `background-color: ${diffColor}15;` : ''}>
											<div class="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center sm:h-5 sm:w-5">
												
													<Check class="h-3.5 w-3.5 sm:h-4 sm:w-4" style={isDiff ? `color: ${diffColor};` : plan.popular ? 'color: #FF6F61;' : 'color: #525252;'} />
												
											</div>
											<p 
												class="text-sm leading-relaxed sm:text-base"
												style={isDiff 
													? `font-weight: 600; color: ${diffColor};`
													: 'font-weight: 400; color: #404040;'}
											>
												{#if feature.includes('annuaire') || feature.includes('Annuaire')}
													{@html feature.replace(/(annuaire|Annuaire)/gi, '<a href="/annuaire" class="underline transition-colors hover:text-[#FF6F61]" style="text-decoration-color: currentColor;">$&</a>')}
												{:else}
													{feature}
												{/if}
											</p>
										</div>
									{/each}
									{#each plan.limitations as limitation}
										<div class="flex items-start gap-3">
											<div class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
												<div class="h-1 w-1 rounded-full bg-neutral-400"></div>
											</div>
											<p class="text-base leading-relaxed text-neutral-500" style="font-weight: 300;">
												{limitation}
											</p>
										</div>
									{/each}
								</div>
							</Card.Footer>
						</Card.Root>
					</div>
				{/each}
			</div>

			<!-- Section informative en bas -->
			<div class="mt-24 text-center">
				<div class="mx-auto max-w-3xl space-y-6">
					<p 
						class="text-lg leading-[175%] text-neutral-700 sm:text-xl"
						style="font-weight: 300; letter-spacing: -0.01em;"
					>
						Tous les plans incluent une <span class="font-medium text-neutral-900">boutique en ligne personnalisée</span>, la <span class="font-medium text-neutral-900">gestion des commandes</span>, et un <span class="font-medium text-neutral-900">support dédié</span>.
					</p>
					<p 
						class="text-base leading-relaxed text-neutral-600"
						style="font-weight: 300;"
					>
						Tu peux changer de plan ou annuler à tout moment, sans engagement.
					</p>
				</div>
			</div>
		</div>
	</section>
</div>
