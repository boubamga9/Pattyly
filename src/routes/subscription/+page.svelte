<script lang="ts">
	import * as Section from '$lib/components/landing/section';
	import * as Pricing from '$lib/components/landing/pricing';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Star } from 'lucide-svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	async function startTrial(planType: string) {
		try {
			const response = await fetch('/api/start-trial', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ planType }),
			});

			if (response.ok) {
				// Rediriger vers le dashboard
				window.location.href = '/dashboard';
			} else {
				const error = await response.json();
				console.error('Erreur:', error);
				alert("Erreur lors du démarrage de l'essai gratuit");
			}
		} catch (error) {
			console.error('Erreur démarrage essai:', error);
			alert("Erreur lors du démarrage de l'essai gratuit");
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
					: 'Démarrez votre activité de pâtissier en ligne avec nos plans flexibles. Créez votre boutique, gérez vos commandes et développez votre activité.'}
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
									7 jours d'essai gratuit, puis facturation mensuelle
								</Card.Description>
							</Card.Header>

							<Card.Content class="flex flex-col gap-6">
								<div class="flex flex-col items-center gap-1">
									<div class="text-center">
										<span class="text-sm font-semibold text-green-600"
											>7 jours gratuits</span
										>
									</div>
									<div class="flex items-baseline justify-center gap-1">
										<span class="text-5xl font-bold tracking-tight">
											{plan.price}€
										</span>
										<span class="text-muted-foreground">/mois</span>
									</div>
								</div>

								{#if data.currentPlan === plan.id}
									<!-- Plan actuel - bouton désactivé -->
									<Button
										class="w-full cursor-not-allowed bg-gray-500"
										disabled
									>
										Plan actuel
									</Button>
								{:else if data.currentPlan}
									<!-- Utilisateur avec plan actif - checkout Stripe pour changer -->
									<Button
										class="w-full {plan.popular
											? 'bg-[#FF6F61] hover:bg-[#e85a4f]'
											: 'bg-neutral-800 hover:bg-neutral-700'}"
										href="/checkout/{plan.stripePriceId}"
									>
										Changer vers {plan.name}
									</Button>
								{:else if data.hasHadSubscription}
									<!-- Utilisateur avec historique - checkout Stripe -->
									<Button
										class="w-full {plan.popular
											? 'bg-[#FF6F61] hover:bg-[#e85a4f]'
											: 'bg-neutral-800 hover:bg-neutral-700'}"
										href="/checkout/{plan.stripePriceId}"
									>
										Choisir {plan.name}
									</Button>
								{:else}
									<!-- Nouvel utilisateur - essai gratuit -->
									<Button
										class="w-full {plan.popular
											? 'bg-[#FF6F61] hover:bg-[#e85a4f]'
											: 'bg-neutral-800 hover:bg-neutral-700'}"
										on:click={() => startTrial(plan.id)}
									>
										Essayer gratuitement 7 jours
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
</div>
