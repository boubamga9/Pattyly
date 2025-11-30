<script lang="ts">
	import * as Section from '$lib/components/landing/section';
	import * as Pricing from '$lib/components/landing/pricing';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Star, Check } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	export let data: PageData;

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
				href: `/checkout/${plan.stripePriceId}`,
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
								<Card.Description>7 jours d'essai gratuit, puis facturation mensuelle</Card.Description>
							</Card.Header>

							<Card.Content class="flex flex-col gap-6">
								<div
									class="flex min-w-[280px] flex-col items-center justify-center gap-1"
								>
									<div class="text-center">
										<span class="text-xs font-semibold text-green-600">7 jours gratuits</span>
									</div>
									<div class="flex items-baseline justify-center gap-1">
										<span class="text-5xl font-bold tracking-tight">
											{plan.price}€
										</span>
										<span class="text-muted-foreground">/mois</span>
									</div>
									<div class="mt-2 text-center">
										<span class="text-xs text-muted-foreground">
											✔ Rentabilisé dès la première commande
										</span>
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
									<Button class={buttonConfig.class} href={buttonConfig.href}>
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
