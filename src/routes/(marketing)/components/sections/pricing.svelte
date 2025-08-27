<script lang="ts">
	import * as Pricing from '$lib/components/landing/pricing';
	import * as Card from '$lib/components/ui/card';
	import Stripe from 'stripe';
	import * as Price from '../../../../lib/components/price/index.js';

	type Price = Stripe.Price & {
		product: Stripe.Product;
	};
	export let prices: readonly Price[];
</script>

{#if prices.length === 0}
	<div class="py-12 text-center">
		<p class="text-neutral-700">
			Les forfaits sont en cours de configuration. Reviens bientôt !
		</p>
	</div>
{:else}
	<Pricing.Root>
		{#if prices[0]}
			<Pricing.Plan>
				<Card.Root class="relative">
					<div class="absolute right-5 top-1.5">
						<Price.Badges price={prices[0]} />
					</div>
					<Card.Header>
						<Card.Title>{prices[0].product.name}</Card.Title>
						<Card.Description>
							{prices[0].product.description ?? ''}
						</Card.Description>
					</Card.Header>
					<Price.Core price={prices[0]}>
						<Card.Content class="flex flex-col gap-6">
							<Price.Amount price={prices[0]} />
							<Price.Button price={prices[0]}>Commencer</Price.Button>
						</Card.Content>
					</Price.Core>
					<Card.Footer>
						<Pricing.PlanFeatures>
							<Pricing.FeatureItem>Tout inclus</Pricing.FeatureItem>
							<Pricing.FeatureItem>
								Un bon démarrage pour ton activité
							</Pricing.FeatureItem>
						</Pricing.PlanFeatures>
					</Card.Footer>
				</Card.Root>
			</Pricing.Plan>
		{/if}
		{#if prices[1]}
			<Pricing.Plan emphasized>
				<Card.Root class="relative">
					<div class="absolute right-2 top-1.5">
						<Price.Badges price={prices[1]} />
					</div>
					<Card.Header>
						<Card.Title>{prices[1].product.name}</Card.Title>
						<Card.Description>
							{prices[1].product.description ?? ''}
						</Card.Description>
					</Card.Header>
					<Price.Core price={prices[1]}>
						<Card.Content class="flex flex-col gap-6">
							<Price.Amount price={prices[1]} />
							<Price.Button price={prices[1]}>Commencer</Price.Button>
						</Card.Content>
					</Price.Core>
					<Card.Footer>
						<Pricing.PlanFeatures>
							<Pricing.FeatureItem>Tout depuis le gratuit</Pricing.FeatureItem>
							<Pricing.FeatureItem>
								Une belle sensation pour nous deux
							</Pricing.FeatureItem>
						</Pricing.PlanFeatures>
					</Card.Footer>
				</Card.Root>
			</Pricing.Plan>
		{/if}
	</Pricing.Root>
{/if}
