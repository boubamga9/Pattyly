<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle } from 'lucide-svelte';
	import type { OrderLimitStats } from '$lib/utils/order-limits';

	export let orderLimitStats: OrderLimitStats | null;

	// Calculer si on doit afficher l'alerte
	$: showWarning = orderLimitStats && !orderLimitStats.isLimitReached && orderLimitStats.remaining <= 2 && orderLimitStats.plan !== 'premium' && orderLimitStats.plan !== 'exempt';
	$: showError = orderLimitStats && orderLimitStats.isLimitReached && orderLimitStats.plan !== 'premium' && orderLimitStats.plan !== 'exempt';
</script>

{#if showWarning}
	<div class="mb-4 w-full rounded-lg border border-amber-200 bg-amber-50 p-4">
		<div class="flex items-start gap-3">
			<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
			<div class="flex-1 space-y-2">
				<p class="text-sm text-amber-900">
					Vous avez reçu <span class="font-medium">{orderLimitStats?.orderCount}</span> / <span class="font-medium">{orderLimitStats?.orderLimit}</span> commandes ce mois-ci.
					Il vous reste <span class="font-medium">{orderLimitStats?.remaining}</span> commande{orderLimitStats?.remaining > 1 ? 's' : ''}.
				</p>
				<Button
					href="/subscription"
					variant="outline"
					size="sm"
					class="border-amber-300 text-amber-900 hover:bg-amber-100"
				>
					Passer au plan supérieur
				</Button>
			</div>
		</div>
	</div>
{:else if showError}
	<div class="mb-4 w-full rounded-lg border border-red-200 bg-red-50 p-4">
		<div class="flex items-start gap-3">
			<AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
			<div class="flex-1 space-y-2">
				<p class="text-sm text-red-900">
					Vous avez atteint votre limite de <span class="font-medium">{orderLimitStats?.orderLimit}</span> commandes ce mois-ci.
					Passez au plan supérieur pour continuer à recevoir des commandes.
				</p>
				<Button
					href="/subscription"
					variant="outline"
					size="sm"
					class="border-red-300 text-red-900 hover:bg-red-100"
				>
					Passer au plan supérieur
				</Button>
			</div>
		</div>
	</div>
{/if}

