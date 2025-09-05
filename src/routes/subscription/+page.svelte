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

	// État pour le feedback "Essayer gratuitement"
	let trialLoading = false;
	let trialSuccess = false;
	let deviceFingerprint: string | null = null;
	let fingerprintLoading = true;

	// Charger FingerprintJS au montage du composant
	onMount(async () => {
		try {
			const FingerprintJS = await import('@fingerprintjs/fingerprintjs');
			const fp = await FingerprintJS.default.load();
			const result = await fp.get();
			deviceFingerprint = result.visitorId;
		} catch (error) {
			// En cas d'erreur, on continue sans fingerprint
		} finally {
			fingerprintLoading = false;
		}
	});

	async function startTrial(planType: string) {
		if (trialLoading) return; // Éviter les clics multiples

		// Vérifier que le fingerprint est chargé
		if (fingerprintLoading) {
			alert('Veuillez attendre que le système soit prêt...');
			return;
		}

		trialLoading = true;
		trialSuccess = false;

		try {
			const response = await fetch('/api/start-trial', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					planType,
					fingerprint: deviceFingerprint, // ✅ Envoyer le fingerprint
				}),
			});

			if (response.ok) {
				trialSuccess = true;

				// Attendre 3 secondes puis rediriger
				setTimeout(() => {
					window.location.href = '/dashboard';
				}, 1000);
			} else {
				const error = await response.json();

				// ✅ NOUVEAU : Gérer la redirection vers checkout
				if (error.redirectToCheckout && error.priceId) {
					window.location.href = `/checkout/${error.priceId}`;
				} else {
					alert("Erreur lors du démarrage de l'essai gratuit");
				}
			}
		} catch (error) {
			alert("Erreur lors du démarrage de l'essai gratuit");
		} finally {
			trialLoading = false;
		}
	}

	// Fonction pour déterminer le texte et l'action du bouton selon le contexte
	function getButtonConfig(plan: (typeof data.plans)[0]) {
		const isCurrentPlan = data.currentPlan === plan.id;
		const isPopular = plan.popular;

		switch (data.buttonType) {
			case 'current':
				if (isCurrentPlan) {
					return {
						text: 'Plan actuel',
						action: 'disabled',
						class: 'w-full cursor-not-allowed bg-gray-500',
						disabled: true,
					};
				} else {
					return {
						text: `Changer vers ${plan.name}`,
						action: 'checkout',
						class: `w-full ${isPopular ? 'bg-[#FF6F61] hover:bg-[#e85a4f]' : 'bg-neutral-800 hover:bg-neutral-700'}`,
						href: `/checkout/${plan.stripePriceId}`,
					};
				}

			case 'choose':
				return {
					text: `Choisir ${plan.name}`,
					action: 'checkout',
					class: `w-full ${isPopular ? 'bg-[#FF6F61] hover:bg-[#e85a4f]' : 'bg-neutral-800 hover:bg-neutral-700'}`,
					href: `/checkout/${plan.stripePriceId}`,
				};

			case 'trial':
				return {
					text: 'Essayer gratuitement 7 jours',
					action: 'trial',
					class: `w-full ${isPopular ? 'bg-[#FF6F61] hover:bg-[#e85a4f]' : 'bg-neutral-800 hover:bg-neutral-700'}`,
					onClick: () => startTrial(plan.id),
				};

			default:
				return {
					text: `Choisir ${plan.name}`,
					action: 'checkout',
					class: `w-full ${isPopular ? 'bg-[#FF6F61] hover:bg-[#e85a4f]' : 'bg-neutral-800 hover:bg-neutral-700'}`,
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
					? `Vous avez actuellement le plan ${data.currentPlan === 'basic' ? 'Basic' : 'Premium'}. Vous pouvez changer de plan à tout moment.`
					: data.buttonType === 'trial'
						? 'Démarrez votre activité de pâtissier en ligne avec nos plans flexibles. Créez votre boutique, gérez vos commandes et développez votre activité.'
						: 'Démarrez votre activité de pâtissier en ligne avec nos plans flexibles. Un essai gratuit a déjà été utilisé avec ce compte.'}
			</Section.Description>
		</Section.Header>

		<div
			class="grid gap-12 pt-12 md:mx-auto md:max-w-4xl md:grid-cols-2 md:gap-8"
		>
			{#each data.plans as plan}
				<div class="flex justify-center">
					<Pricing.Plan emphasized={plan.popular}>
						<Card.Root class="relative">
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
									{data.buttonType === 'trial'
										? "7 jours d'essai gratuit, puis facturation mensuelle"
										: 'Facturation mensuelle'}
								</Card.Description>
							</Card.Header>

							<Card.Content class="flex flex-col gap-6">
								<div
									class="flex min-w-[280px] flex-col items-center justify-center gap-1"
								>
									{#if data.buttonType === 'trial'}
										<div class="text-center">
											<span class="text-sm font-semibold text-green-600"
												>7 jours gratuits</span
											>
										</div>
									{:else}
										<!-- Espaceur pour maintenir la hauteur -->
										<div class="h-5"></div>
									{/if}
									<div class="flex items-baseline justify-center gap-1">
										<span class="text-5xl font-bold tracking-tight">
											{plan.price}€
										</span>
										<span class="text-muted-foreground">/mois</span>
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
								{:else if buttonConfig.action === 'trial'}
									<!-- Bouton essai gratuit avec feedback -->
									<Button
										class={buttonConfig.class}
										on:click={buttonConfig.onClick}
										disabled={trialLoading || fingerprintLoading}
									>
										{#if fingerprintLoading}
											<div class="flex items-center gap-2">
												<div
													class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
												></div>
												Préparation...
											</div>
										{:else if trialLoading}
											<div class="flex items-center gap-2">
												<div
													class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
												></div>
												Chargement...
											</div>
										{:else if trialSuccess}
											<div class="flex items-center gap-2">
												<Check class="h-4 w-4" />
												Essai démarré !
											</div>
										{:else}
											{buttonConfig.text}
										{/if}
									</Button>
								{/if}
							</Card.Content>

							<Card.Footer>
								<Pricing.PlanFeatures>
									{#each plan.features as feature}
										<Pricing.FeatureItem>
											{feature}
										</Pricing.FeatureItem>
									{/each}
									{#each plan.limitations as limitation}
										<Pricing.FeatureItem class="text-muted-foreground">
											{limitation}
										</Pricing.FeatureItem>
									{/each}
								</Pricing.PlanFeatures>
							</Card.Footer>
						</Card.Root>
					</Pricing.Plan>
				</div>
			{/each}
		</div>
	</Section.Root>

	<!-- Bouton retour pour les utilisateurs avec abonnement -->
	{#if data.hasHadSubscription || data.currentPlan}
		<div class="mx-auto max-w-4xl px-4">
			<Button
				variant="outline"
				href="/dashboard"
				class="mt-8 flex items-center gap-2"
			>
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
			</Button>
		</div>
	{/if}
</div>
