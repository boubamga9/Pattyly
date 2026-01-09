<script lang="ts">
	import * as Section from '$lib/components/landing/section';
	import * as Pricing from '$lib/components/landing/pricing';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Star, Check } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	export let data: PageData;

	// État du toggle mensuel/annuel (récupérer depuis localStorage si présent, sinon mensuel par défaut)
	let billingPeriod: 'monthly' | 'annual' = 'monthly';

	// Récupérer la période depuis localStorage si elle existe (depuis /pricing)
	onMount(() => {
		if (typeof window !== 'undefined') {
			const savedPeriod = localStorage.getItem('billing_period');
			if (savedPeriod === 'annual' || savedPeriod === 'monthly') {
				billingPeriod = savedPeriod;
				// Nettoyer localStorage après récupération
				localStorage.removeItem('billing_period');
			}
		}
	});

	// Déterminer le plan à afficher (depuis l'URL)
	$: displayPlan = data.selectedPlan;
	$: shouldShowOnlySelectedPlan = displayPlan && (displayPlan === 'starter' || displayPlan === 'premium');

	// Scroll automatique vers le plan pré-sélectionné si présent
	onMount(() => {
		if (data.selectedPlan) {
			// Attendre que le DOM soit rendu
			setTimeout(() => {
				const planElement = document.getElementById(`plan-${data.selectedPlan}`);
				if (planElement) {
					planElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
					// Ajouter un effet visuel pour attirer l'attention
					planElement.classList.add('ring-2', 'ring-[#FF6F61]', 'ring-offset-2');
					setTimeout(() => {
						planElement.classList.remove('ring-2', 'ring-[#FF6F61]', 'ring-offset-2');
					}, 2000);
				}
			}, 100);
		}
	});

	// Fonction pour identifier les différenciateurs de chaque plan
	function isDifferentiator(planId: string, feature: string): boolean {
		if (planId === 'starter') {
			// Différenciateurs Starter
			return feature.includes('20 commandes') || 
			       feature.includes('10 gâteaux') ||
			       feature.includes('prioritaire');
		}
		
		if (planId === 'premium') {
			// Différenciateurs Premium
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

	// Fonction pour obtenir le prix actuel selon la période
	function getCurrentPrice(plan: (typeof data.plans)[0]): number {
		if (plan.isFree) return 0;
		return billingPeriod === 'annual' && plan.annualPrice ? plan.annualPrice : plan.monthlyPrice;
	}

	// Fonction pour obtenir le stripePriceId actuel selon la période
	function getCurrentStripePriceId(plan: (typeof data.plans)[0]): string {
		if (plan.isFree) return '';
		return billingPeriod === 'annual' && plan.annualStripePriceId ? plan.annualStripePriceId : plan.monthlyStripePriceId;
	}

	// Fonction pour calculer l'économie avec l'annuel
	function getSavings(plan: (typeof data.plans)[0]): number | null {
		if (plan.isFree || !plan.annualPrice || !plan.monthlyPrice) return null;
		const annualCost = plan.monthlyPrice * 12;
		const savings = annualCost - plan.annualPrice;
		return savings > 0 ? savings : null;
	}

	// Fonction pour calculer le pourcentage d'économie
	function getSavingsPercentage(plan: (typeof data.plans)[0]): number | null {
		if (plan.isFree || !plan.annualPrice || !plan.monthlyPrice) return null;
		const annualCost = plan.monthlyPrice * 12;
		const savings = annualCost - plan.annualPrice;
		if (savings <= 0) return null;
		const percentage = Math.round((savings / annualCost) * 100);
		return percentage;
	}

	// Fonction pour calculer l'équivalent mensuel
	function getMonthlyEquivalent(plan: (typeof data.plans)[0]): number | null {
		if (plan.isFree || !plan.annualPrice) return null;
		return Math.round((plan.annualPrice / 12) * 100) / 100;
	}

	// Fonction pour déterminer le texte et l'action du bouton selon le contexte
	function getButtonConfig(plan: (typeof data.plans)[0]) {
		const isCurrentPlan = data.currentPlan === plan.id;
		const isPopular = plan.popular;
		// Si un plan est sélectionné, changer le texte en "Souscrire"
		const hasSelectedPlan = data.selectedPlan && (data.selectedPlan === 'starter' || data.selectedPlan === 'premium');
		const isSelectedPlan = hasSelectedPlan && data.selectedPlan === plan.id;

		if (isCurrentPlan) {
			return {
				text: 'Plan actuel',
				action: 'disabled',
				class: 'w-full rounded-lg cursor-not-allowed bg-gray-500',
				disabled: true,
			};
		} else {
			return {
				text: isSelectedPlan ? 'Souscrire' : `Choisir ${plan.name}`,
				action: 'checkout',
				class: `w-full h-12 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-[1.02] ${isPopular ? 'bg-[#FF6F61] hover:bg-[#e85a4f] text-white shadow-lg hover:shadow-xl' : 'bg-neutral-800 hover:bg-neutral-700 text-white shadow-lg hover:shadow-xl'}`,
				href: `/checkout/${getCurrentStripePriceId(plan)}`,
			};
		}
	}
</script>

<svelte:head>
	<title>Choisissez votre plan - Pattyly</title>
	<meta
		name="description"
		content="Démarrez votre activité de pâtissier en ligne avec nos plans d'abonnement flexibles"
	/>
</svelte:head>

<div class="mb-40 flex flex-col gap-20 pt-20">
	<Section.Root>
		<Section.Header>
			<Section.Title>
				{data.currentPlan ? 'Gérer votre abonnement' : 'Choisissez votre plan'}
			</Section.Title>
			<Section.Description class="text-balance">
				{data.currentPlan
					? `Vous avez actuellement le plan ${data.currentPlan === 'starter' ? 'Starter' : 'Premium'}. Vous pouvez changer de plan à tout moment.`
					: 'Démarrez votre activité de pâtissier en ligne avec nos plans flexibles. Créez votre boutique, gérez vos commandes et développez votre activité.'}
			</Section.Description>
			
			<!-- Toggle Mensuel/Annuel -->
			{#if !data.currentPlan}
				<div class="mt-12 mb-0 flex items-center justify-center sm:mt-16">
					<div class="flex items-center gap-2 rounded-full border border-neutral-300 bg-white p-1.5 shadow-sm sm:p-1">
						<button
							type="button"
							on:click={() => billingPeriod = 'monthly'}
							class="rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm {billingPeriod === 'monthly'
								? 'bg-[#FF6F61] text-white shadow-sm'
								: 'text-neutral-700 hover:text-neutral-900'}"
						>
							Mensuel
						</button>
						<button
							type="button"
							on:click={() => billingPeriod = 'annual'}
							class="rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 sm:px-4 sm:py-2 sm:text-sm {billingPeriod === 'annual'
								? 'bg-[#FF6F61] text-white shadow-sm'
								: 'text-neutral-700 hover:text-neutral-900'}"
						>
							Annuel
						</button>
					</div>
				</div>
			{/if}
		</Section.Header>

		<div
			class="grid gap-12 pt-12 px-4 md:mx-auto md:max-w-4xl md:px-0 {shouldShowOnlySelectedPlan ? 'md:grid-cols-1 md:max-w-2xl' : 'md:grid-cols-2'} md:gap-8"
		>
			{#each data.plans as plan}
				{#if !shouldShowOnlySelectedPlan || plan.id === displayPlan}
					<div class="group relative flex flex-col w-full max-w-sm mx-auto" id="plan-{plan.id}">
					<Pricing.Plan emphasized={plan.popular}>
						<Card.Root class="relative h-full w-full">
							{#if plan.popular}
								<div
									class="absolute -top-4 left-1/2 -translate-x-1/2 transform"
								>
									<Badge
										class="flex items-center gap-1 rounded-full bg-[#FF6F61] px-4 py-1 text-white"
									>
										<Star class="h-4 w-4" />
										Le plus populaire
									</Badge>
								</div>
							{/if}

							<Card.Header>
								<Card.Title>{plan.name}</Card.Title>
								<Card.Description>
									{#if plan.isLifetime}
										Paiement unique, accès à vie
									{:else if billingPeriod === 'annual'}
										Facturation annuelle, annulable à tout moment
									{:else}
										Facturation mensuelle, annulable à tout moment
									{/if}
								</Card.Description>
							</Card.Header>

							<Card.Content class="flex flex-col gap-6">
								<div
									class="flex min-w-[280px] flex-col items-center justify-center gap-1"
								>
									{#if plan.isLifetime && plan.availableUntil}
										<div class="text-center mb-2">
											<span class="text-xs font-semibold text-orange-600 sm:text-sm">Offre limitée</span>
										</div>
									{/if}
									<div class="flex flex-col items-center gap-1">
										{#if billingPeriod === 'annual' && getSavingsPercentage(plan)}
											<div class="mb-2">
												<Badge class="bg-green-100 text-green-700 font-semibold">
													Économisez {getSavingsPercentage(plan)}%
												</Badge>
											</div>
										{/if}
										{#if plan.originalPrice && billingPeriod === 'monthly'}
											<div class="flex flex-col items-center gap-1">
												<span class="text-xs font-semibold text-[#FF6F61] sm:text-sm">Prix de lancement</span>
												<div class="flex items-baseline justify-center gap-2">
													<span class="text-2xl font-semibold tracking-tight text-neutral-400 line-through sm:text-3xl" style="font-weight: 500; letter-spacing: -0.02em;">
														{plan.originalPrice}€
													</span>
												</div>
											</div>
										{/if}
										{#if billingPeriod === 'annual' && plan.monthlyPrice && plan.annualPrice}
											<div class="flex flex-col items-center gap-1">
												<div class="flex items-baseline justify-center gap-2">
													<span class="text-2xl font-semibold tracking-tight text-neutral-400 line-through sm:text-3xl" style="font-weight: 500; letter-spacing: -0.02em;">
														{Math.round(plan.monthlyPrice * 12)}€
													</span>
												</div>
											</div>
										{/if}
										<div class="flex items-baseline justify-center gap-1">
											<span class="text-5xl font-bold tracking-tight">
												{billingPeriod === 'annual' && plan.annualPrice ? plan.annualPrice : plan.monthlyPrice}€
											</span>
											{#if !plan.isLifetime}
												<span class="text-muted-foreground">
													/{billingPeriod === 'annual' ? 'an' : 'mois'}
												</span>
											{/if}
										</div>
										{#if billingPeriod === 'annual' && getMonthlyEquivalent(plan)}
											<span class="text-sm text-neutral-600">
												Soit {getMonthlyEquivalent(plan)}€/mois
											</span>
										{/if}
									</div>
									<div class="mt-2 text-center">
										{#if plan.isLifetime && plan.availableUntil}
											<span class="text-xs text-muted-foreground">
												Disponible jusqu'au 31 janvier 2026
											</span>
										{:else if billingPeriod === 'monthly'}
											<span class="text-xs text-muted-foreground">
												✔ Rentabilisé dès la première commande
											</span>
										{/if}
									</div>
								</div>

								{@const buttonConfig = getButtonConfig(plan)}

								{#if buttonConfig.action === 'disabled'}
									<!-- Bouton désactivé -->
									<Button
										class={buttonConfig.class}
										disabled={buttonConfig.disabled}
									>
										{buttonConfig.text}
									</Button>
								{:else if buttonConfig.action === 'checkout'}
									<!-- Bouton checkout Stripe -->
									<Button 
										class={buttonConfig.class}
										on:click={() => {
											const priceId = getCurrentStripePriceId(plan);
											if (priceId) {
												goto(`/checkout/${priceId}`);
											}
										}}
									>
										{buttonConfig.text}
									</Button>
								{/if}
							</Card.Content>

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
													{@html feature.replace(/(annuaire|Annuaire)/gi, '<a href="/patissiers" class="underline transition-colors hover:text-[#FF6F61]" style="text-decoration-color: currentColor;">$&</a>')}
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
				</Pricing.Plan>
			</div>
		{/if}
		{/each}
		</div>
	</Section.Root>

	<!-- Bouton retour -->
	<div class="mx-auto max-w-4xl px-4">
		<Button
			variant="outline"
			href="/dashboard"
			class="mt-8 flex items-center gap-2"
		>
			{#if data.from === 'onboarding'}
				<!-- Flèche vers la droite pour "Continuer" -->
				Continuer vers le dashboard
				<svg
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M14 5l7 7m0 0l-7 7m7-7H3"
					/>
				</svg>
			{:else}
				<!-- Flèche vers la gauche pour "Retour" -->
			<svg
				class="h-4 w-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
			Retour au dashboard
			{/if}
		</Button>
	</div>
</div>
