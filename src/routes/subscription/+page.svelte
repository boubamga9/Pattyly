<script lang="ts">
	import * as Section from '$lib/components/landing/section';
	import * as Pricing from '$lib/components/landing/pricing';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, X, Star, Shield } from 'lucide-svelte';
	import type { PageData } from './$types';

	export let data: PageData;
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

		<div class="grid gap-8 pt-12 md:mx-auto md:max-w-4xl md:grid-cols-2">
			{#each data.plans as plan}
				<div class="flex justify-center">
					<Pricing.Plan emphasized={plan.popular}>
						<Card.Root class="relative">
							{#if plan.popular}
								<div
									class="absolute -top-4 left-1/2 -translate-x-1/2 transform"
								>
									<Badge
										class="flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1 text-white"
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
										<span class="text-5xl font-black tracking-tight">
											{plan.price}€
										</span>
										<span class="text-muted-foreground">/mois</span>
									</div>
								</div>

								{#if data.currentPlan === plan.id}
									<Button
										class="w-full cursor-not-allowed bg-gray-500"
										disabled
									>
										Plan actuel
									</Button>
								{:else}
									<Button
										class="w-full {plan.popular
											? 'bg-blue-600 hover:bg-blue-700'
											: ''}"
										href="/checkout/{plan.stripePriceId}"
									>
										{data.currentPlan
											? 'Changer vers ' + plan.name
											: 'Choisir ' + plan.name}
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
											<X class="mr-2 h-4 w-4 text-red-500" />
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
</div>
