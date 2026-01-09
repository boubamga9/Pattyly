<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Copy,
		Check,
		Users,
		TrendingUp,
		Euro,
		UserPlus,
		AlertCircle,
		ArrowUpRight,
		Crown,
		Link2,
	} from 'lucide-svelte';

	export let data;

	let copied = false;
	let isGenerating = false;

	// Calculateur d'affiliation
	let starterCount = 5;
	let premiumCount = 5;

	// Prix des abonnements
	const starterPrice = 14.99;
	const premiumPrice = 19.99;
	const commissionRate = data.isAmbassador ? 0.5 : 0.3;

	// Calculs réactifs
	$: totalStarter = starterCount * starterPrice;
	$: totalPremium = premiumCount * premiumPrice;
	$: totalSubscriptions = totalStarter + totalPremium;
	$: monthlyCommission = totalSubscriptions * commissionRate;
	$: sixMonthsCommission = monthlyCommission * 6;
	$: yearlyCommission = monthlyCommission * 12;

	function copyLink() {
		navigator.clipboard.writeText(data.affiliateLink);
		copied = true;
		setTimeout(() => {
			copied = false;
		}, 2000);
	}

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		});
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'active':
				return { label: 'Abonné actif', variant: 'default' as const, class: 'bg-green-500' };
			case 'pending':
				return { label: 'En attente', variant: 'secondary' as const, class: 'bg-yellow-500' };
			case 'expired':
				return { label: 'Expiré', variant: 'outline' as const, class: '' };
			case 'cancelled':
				return { label: 'Annulé', variant: 'destructive' as const, class: '' };
			default:
				return { label: status, variant: 'outline' as const, class: '' };
		}
	}

	function getSubscriptionStatusBadge(status: 'active' | 'inactive' | null) {
		switch (status) {
			case 'active':
				return { label: 'Actif', variant: 'default' as const, class: 'bg-green-500' };
			case 'inactive':
				return { label: 'Inactif', variant: 'secondary' as const, class: 'bg-gray-500' };
			default:
				return { label: 'Aucun abonnement', variant: 'outline' as const, class: '' };
		}
	}

	// ✅ Tracking: Page view côté client
	onMount(() => {
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const { supabase } = $page.data;
			if (supabase) {
				logPageView(supabase, {
					page: '/dashboard/affiliation',
				}).catch((err: unknown) => {
					console.error('Error tracking page_view:', err);
				});
			}
		});
	});
</script>

<svelte:head>
	<title>Programme d'affiliation - Pattyly</title>
	<style>
		.calculator-slider {
			-webkit-appearance: none;
			appearance: none;
			width: 100%;
			height: 6px;
			border-radius: 3px;
			background: linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) var(--value, 50%), #e5e7eb var(--value, 50%), #e5e7eb 100%);
			outline: none;
			cursor: pointer;
		}
		.calculator-slider.accent-yellow {
			background: linear-gradient(to right, #eab308 0%, #eab308 var(--value, 50%), #e5e7eb var(--value, 50%), #e5e7eb 100%);
		}
		.calculator-slider::-webkit-slider-thumb {
			-webkit-appearance: none;
			appearance: none;
			width: 18px;
			height: 18px;
			border-radius: 50%;
			background: white;
			border: 2px solid hsl(var(--primary));
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
			cursor: pointer;
			transition: all 0.2s ease;
		}
		.calculator-slider.accent-yellow::-webkit-slider-thumb {
			border-color: #eab308;
		}
		.calculator-slider:hover::-webkit-slider-thumb {
			transform: scale(1.1);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
		}
		.calculator-slider::-moz-range-thumb {
			width: 18px;
			height: 18px;
			border-radius: 50%;
			background: white;
			border: 2px solid hsl(var(--primary));
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
			cursor: pointer;
			transition: all 0.2s ease;
		}
		.calculator-slider.accent-yellow::-moz-range-thumb {
			border-color: #eab308;
		}
		.calculator-slider::-moz-range-track {
			height: 6px;
			border-radius: 3px;
			background: #e5e7eb;
		}
	</style>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête épuré -->
	<div class="mb-6">
		<div class="flex items-center gap-3 mb-2">
			<h1 class="text-2xl font-semibold">Affiliation</h1>
			{#if data.isAmbassador}
				<Badge variant="outline" class="flex items-center gap-1.5 border-yellow-500/30 text-yellow-700 bg-yellow-50">
					<Crown class="h-3.5 w-3.5" />
					Ambassadeur
				</Badge>
			{/if}
		</div>
		<p class="text-sm text-muted-foreground">
			{#if data.isAmbassador}
				50% de commission à vie sur chaque abonnement parrainé
			{:else}
				30% de commission pendant 6 mois sur chaque abonnement parrainé
			{/if}
		</p>
	</div>

	<!-- Statistiques -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Inscrits</CardTitle>
				<UserPlus class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.totalInscrits}</div>
				<p class="text-xs text-muted-foreground">
					{data.stats.totalInscrits === 0
						? 'Aucun inscrit'
						: data.stats.totalInscrits === 1
							? 'personne inscrite'
							: 'personnes inscrites'}
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Abonnés</CardTitle>
				<Users class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{data.stats.totalAbonnes}</div>
				<p class="text-xs text-muted-foreground">
					{data.stats.totalAbonnes === 0
						? 'Aucun abonné'
						: data.stats.totalAbonnes === 1
							? 'personne abonnée'
							: 'personnes abonnées'}
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Revenu estimé/mois</CardTitle>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatPrice(data.stats.revenuEstimeMois)}</div>
				<p class="text-xs text-muted-foreground">
					Basé sur les abonnements actifs
				</p>
			</CardContent>
		</Card>

		<Card>
			<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle class="text-sm font-medium">Total gagné</CardTitle>
				<Euro class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{formatPrice(data.stats.totalCommissions)}</div>
				<p class="text-xs text-muted-foreground">
					Commissions payées
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Calculateur -->
	<Card class="overflow-hidden">
		<CardHeader>
			<CardTitle>Calculateur de revenus</CardTitle>
			<CardDescription>
				{#if data.isAmbassador}
					Estime tes revenus avec 50% de commission à vie
				{:else}
					Estime tes revenus avec 30% de commission sur 6 mois
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent class="p-0">
			<div class="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
				<!-- Starter -->
				<div class="p-4 space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-medium text-foreground">Starter</h3>
							<p class="text-xs text-muted-foreground mt-0.5">14,99€/mois</p>
						</div>
						<div class="text-right">
							<div class="text-xl font-normal tabular-nums font-sans {data.isAmbassador ? 'text-yellow-600' : 'text-primary'}">{starterCount}</div>
							<div class="text-xs text-muted-foreground">parrainages</div>
						</div>
					</div>
					<input
						id="starter-count"
						type="range"
						min="0"
						max="100"
						bind:value={starterCount}
						style="--value: {starterCount}%"
						class="calculator-slider {data.isAmbassador ? 'accent-yellow' : ''}"
					/>
					<div class="flex justify-between text-xs text-muted-foreground/60">
						<span>0</span>
						<span>100</span>
					</div>
				</div>

				<!-- Premium -->
				<div class="p-4 space-y-3">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-medium text-foreground">Premium</h3>
							<p class="text-xs text-muted-foreground mt-0.5">19,99€/mois</p>
						</div>
						<div class="text-right">
							<div class="text-xl font-normal tabular-nums font-sans {data.isAmbassador ? 'text-yellow-600' : 'text-primary'}">{premiumCount}</div>
							<div class="text-xs text-muted-foreground">parrainages</div>
						</div>
					</div>
					<input
						id="premium-count"
						type="range"
						min="0"
						max="100"
						bind:value={premiumCount}
						style="--value: {premiumCount}%"
						class="calculator-slider {data.isAmbassador ? 'accent-yellow' : ''}"
					/>
					<div class="flex justify-between text-xs text-muted-foreground/60">
						<span>0</span>
						<span>100</span>
					</div>
				</div>
			</div>

			<!-- Résultats -->
			<div class="border-t bg-muted/30">
				<div class="p-4">
					<div class="flex items-baseline justify-between mb-3">
						<span class="text-xs uppercase tracking-wider text-muted-foreground font-sans">Commission mensuelle</span>
						<span class="text-2xl font-normal tabular-nums font-sans {data.isAmbassador ? 'text-yellow-600' : 'text-primary'}">{formatPrice(monthlyCommission)}</span>
					</div>
					<div class="flex items-baseline justify-between pt-3 border-t">
						<span class="text-xs uppercase tracking-wider text-muted-foreground font-sans">
							{#if data.isAmbassador}
								Sur 1 an
							{:else}
								Sur 6 mois
							{/if}
						</span>
						<span class="text-lg font-normal tabular-nums font-sans text-foreground">
							{#if data.isAmbassador}
								{formatPrice(yearlyCommission)}
							{:else}
								{formatPrice(sixMonthsCommission)}
							{/if}
						</span>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Lien d'affiliation -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<Link2 class="h-5 w-5" />
				Lien d'affiliation
			</CardTitle>
			<CardDescription>
				{#if data.isAmbassador}
					Partage ce lien pour gagner 50% à vie
				{:else}
					Partage ce lien pour gagner 30% pendant 6 mois
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if !data.hasStripeConnect}
				<div class="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50/50 p-4">
					<AlertCircle class="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
					<div class="flex-1 space-y-2 min-w-0">
						<p class="text-sm font-medium text-yellow-900">
							Configuration requise
						</p>
						<p class="text-sm text-yellow-800">
							Configure ton compte Stripe Connect pour recevoir tes paiements.
						</p>
						<Button
							href="/dashboard/shop"
							size="sm"
							variant="outline"
							class="mt-2 border-yellow-300 text-yellow-900 hover:bg-yellow-100"
						>
							Configurer Stripe Connect
							<ArrowUpRight class="ml-2 h-4 w-4" />
						</Button>
					</div>
				</div>
			{:else if !data.affiliateCode}
				<form method="POST" action="?/generateAffiliateCode" use:enhance={() => {
					isGenerating = true;
					return async ({ result, update }) => {
						isGenerating = false;
						await update();
						if (result.type === 'success') {
							await invalidateAll();
						}
					};
				}}>
					<Button
						type="submit"
						disabled={isGenerating}
						class="w-full sm:w-auto"
					>
						{#if isGenerating}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
							Génération...
						{:else}
							Générer mon lien
						{/if}
					</Button>
				</form>
			{:else}
				<div class="flex flex-col sm:flex-row gap-2">
					<input
						type="text"
						value={data.affiliateLink}
						readonly
						class="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-mono min-w-0"
					/>
					<Button
						type="button"
						variant="outline"
						on:click={copyLink}
						disabled={!data.affiliateLink}
						class="w-full sm:w-auto flex-shrink-0"
					>
						{#if copied}
							<Check class="mr-2 h-4 w-4" />
							Copiée
						{:else}
							<Copy class="mr-2 h-4 w-4" />
							Copier
						{/if}
					</Button>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Liste des personnes parrainées -->
	<Card>
		<CardHeader>
			<CardTitle>Personnes parrainées</CardTitle>
			<CardDescription>
				{#if data.affiliations.length === 0}
					Personnes qui se sont inscrites grâce à ton lien
				{:else}
					{data.affiliations.length} {data.affiliations.length === 1 ? 'personne' : 'personnes'} parrainée{data.affiliations.length > 1 ? 's' : ''}
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.affiliations.length === 0}
				<div class="py-12 text-center">
					<Users class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
					<p class="text-sm text-muted-foreground">Aucune personne parrainée pour le moment.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b">
								<th class="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</th>
								<th class="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Inscription</th>
								<th class="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Abonnement</th>
								<th class="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
								<th class="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Mois</th>
								<th class="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</th>
							</tr>
						</thead>
						<tbody>
							{#each data.affiliations as aff}
								{@const subscriptionStatusBadge = getSubscriptionStatusBadge(aff.subscriptionStatus)}
								<tr class="border-b hover:bg-muted/30 transition-colors">
									<td class="p-3 text-sm text-muted-foreground">
										#{aff.index}
									</td>
									<td class="p-3 text-sm">
										{formatDate(aff.created_at)}
									</td>
									<td class="p-3 text-sm">
										{#if aff.subscriptionType}
											<span class="font-medium">{aff.subscriptionType}</span>
										{:else}
											<span class="text-muted-foreground">-</span>
										{/if}
									</td>
									<td class="p-3">
										<Badge variant={subscriptionStatusBadge.variant} class={subscriptionStatusBadge.class + ' text-xs'}>
											{subscriptionStatusBadge.label}
										</Badge>
									</td>
									<td class="p-3 text-sm text-muted-foreground">
										{aff.nombreMois} {aff.nombreMois <= 1 ? 'mois' : 'mois'}
									</td>
									<td class="p-3 text-sm text-right font-medium">
										{formatPrice(aff.montantTotalGagne)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Historique des paiements -->
	<Card>
		<CardHeader>
			<CardTitle>Historique des paiements</CardTitle>
			<CardDescription>
				Paiements reçus chaque mois
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.payments.length === 0}
				<div class="py-12 text-center">
					<Euro class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
					<p class="text-sm text-muted-foreground">Aucun paiement pour le moment.</p>
					<p class="text-xs text-muted-foreground mt-1">Les paiements sont effectués le 5 de chaque mois.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b">
								<th class="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
								<th class="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Période</th>
								<th class="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Commissions</th>
								<th class="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Montant</th>
							</tr>
						</thead>
						<tbody>
							{#each data.payments as payment}
								<tr class="border-b hover:bg-muted/30 transition-colors">
									<td class="p-3 text-sm">
										{formatDate(payment.paid_at)}
									</td>
									<td class="p-3 text-sm text-muted-foreground">
										{new Date(payment.period_start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
									</td>
									<td class="p-3 text-sm text-muted-foreground">
										{payment.commission_count} commission{payment.commission_count > 1 ? 's' : ''}
									</td>
									<td class="p-3 text-sm text-right font-medium">
										{formatPrice(parseFloat(payment.amount.toString()))}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>
