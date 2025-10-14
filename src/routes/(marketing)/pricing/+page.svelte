<script lang="ts">
	import { WebsiteName } from '../../../config';
	import * as Section from '$lib/components/landing/section';
	import * as Pricing from '$lib/components/landing/pricing';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Star } from 'lucide-svelte';

	export let data;
	const { plans } = data;
</script>

<svelte:head>
	<title>{WebsiteName} - Tarifs</title>
	<meta
		name="description"
		content="Découvrez nos tarifs flexibles pour la gestion de votre activité de pâtissier. Essai gratuit de 7 jours sans engagement."
	/>
	<meta
		name="keywords"
		content="tarifs, prix, abonnement, pâtisserie, gestion, essai gratuit"
	/>
</svelte:head>

<div class="mb-40 mt-20 flex flex-col gap-20 pt-20">
	<Section.Root>
		<Section.Header>
			<Section.Title>Choisis ton forfait</Section.Title>
			<Section.Description class="text-balance">
				Démarre ton activité de pâtissier en ligne avec nos plans flexibles.
				Crée ta boutique, gère tes commandes et développe ton activité.
			</Section.Description>
		</Section.Header>

		<div
			class="grid gap-12 pt-12 md:mx-auto md:max-w-4xl md:grid-cols-2 md:gap-8"
		>
			{#each plans as plan}
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

								<Button
									class="w-full {plan.popular
										? 'bg-[#FF6F61] hover:bg-[#e85a4f]'
										: 'bg-neutral-800 hover:bg-neutral-700'}"
									href="/register"
								>
									Essayer gratuitement
								</Button>
							</Card.Content>

							<Card.Footer>
								<Pricing.PlanFeatures>
									{#each plan.features as feature}
										<Pricing.FeatureItem
											class={feature.includes('💬 Envoi de devis')
												? 'font-semibold text-[#FF6F61]'
												: ''}
										>
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
</div>
