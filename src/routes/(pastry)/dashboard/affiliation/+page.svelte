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
		Sparkles,
	} from 'lucide-svelte';

	export let data;

	let copied = false;
	let isGenerating = false;

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
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête -->
	<div class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<h1 class="text-3xl font-bold">Programme d'affiliation</h1>
			{#if data.isAmbassador}
				<Badge class="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 px-3 py-1">
					<Crown class="h-4 w-4" />
					Ambassadeur
				</Badge>
			{/if}
		</div>
		<p class="mt-2 text-muted-foreground">
			{#if data.isAmbassador}
				Partage ton lien et gagne 50% de l'abonnement de chaque personne parrainée à vie
			{:else}
				Partage ton lien et gagne 30% de l'abonnement de chaque personne parrainée pendant 6 mois
			{/if}
		</p>
	</div>

	<!-- Section Avantages - Affichage conditionnel selon le statut -->
	{#if data.isAmbassador}
		<!-- Section pour les Ambassadeurs -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Sparkles class="h-5 w-5" />
					Avantages du programme Ambassadeur
				</CardTitle>
				<CardDescription>
					Tu bénéficies du statut Ambassadeur avec des avantages exclusifs
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="rounded-lg border p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400 ring-2 ring-yellow-200">
					<div class="mb-3">
						<h3 class="font-semibold flex items-center gap-2">
							<Crown class="h-4 w-4 text-yellow-600" />
							Programme Ambassadeur
						</h3>
					</div>
					<ul class="space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<Sparkles class="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
							<span><strong>50%</strong> de commission sur chaque abonnement</span>
						</li>
						<li class="flex items-start gap-2">
							<Sparkles class="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
							<span>Durée : <strong>À vie</strong></span>
						</li>
						<li class="flex items-start gap-2">
							<Sparkles class="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
							<span>Paiements mensuels le 5 de chaque mois</span>
						</li>
					</ul>
				</div>
			</CardContent>
		</Card>
	{:else}
		<!-- Section pour les non-Ambassadeurs (programme standard uniquement) -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Sparkles class="h-5 w-5" />
					Avantages du programme d'affiliation
				</CardTitle>
				<CardDescription>
					Informations sur ton programme d'affiliation
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="rounded-lg border p-4 border-primary">
					<div class="mb-3">
						<h3 class="font-semibold">Programme d'affiliation</h3>
					</div>
					<ul class="space-y-2 text-sm">
						<li class="flex items-start gap-2">
							<Check class="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
							<span><strong>30%</strong> de commission sur chaque abonnement</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
							<span>Durée : <strong>6 mois</strong> après l'inscription</span>
						</li>
						<li class="flex items-start gap-2">
							<Check class="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
							<span>Paiements mensuels le 5 de chaque mois</span>
						</li>
					</ul>
				</div>
			</CardContent>
		</Card>
	{/if}

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

	<!-- Lien d'affiliation -->
	<Card>
		<CardHeader>
			<CardTitle>Ton lien d'affiliation</CardTitle>
			<CardDescription>
				{#if data.isAmbassador}
					Partage ce lien pour gagner 50% de l'abonnement de chaque personne parrainée à vie
				{:else}
					Partage ce lien pour gagner 30% de l'abonnement de chaque personne parrainée pendant 6 mois
				{/if}
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if !data.hasStripeConnect}
				<!-- Alerte Stripe Connect non configuré -->
				<div class="flex flex-col sm:flex-row items-start gap-3 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-3 sm:p-4">
					<AlertCircle class="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
					<div class="flex-1 space-y-3 min-w-0">
						<div>
							<p class="text-sm font-semibold text-yellow-900">
								⚠️ Configuration requise
							</p>
							<p class="text-sm text-yellow-800 break-words">
								Pour accéder à ton lien d'affiliation et recevoir tes paiements chaque mois directement sur ton compte bancaire, tu dois configurer ton compte Stripe Connect dans les paramètres de paiement.
							</p>
						</div>
						<Button
							href="/dashboard/shop"
							size="sm"
							class="w-full sm:w-auto bg-yellow-600 text-white hover:bg-yellow-700"
						>
							<span class="hidden sm:inline">Configurer mon compte Stripe Connect</span>
							<span class="sm:hidden">Configurer Stripe Connect</span>
							<ArrowUpRight class="ml-2 h-4 w-4" />
						</Button>
					</div>
				</div>
			{:else if !data.affiliateCode}
				<!-- Bouton pour générer le code -->
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
							Génération...
						{:else}
							Générer mon lien d'affiliation
						{/if}
					</Button>
				</form>
			{:else}
				<!-- Lien d'affiliation existant -->
				<div class="space-y-4">
					<div class="flex flex-col sm:flex-row gap-2">
						<input
							type="text"
							value={data.affiliateLink}
							readonly
							class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-w-0"
						/>
						<Button
							type="button"
							size="sm"
							on:click={copyLink}
							title="Copier le lien d'affiliation"
							disabled={!data.affiliateLink}
							class={copied
								? 'border-[#FF6F61] bg-[#FF6F61] text-white hover:border-[#e85a4f] hover:bg-[#e85a4f] w-full sm:w-auto flex-shrink-0'
								: 'border border-input bg-background text-black hover:bg-accent hover:text-accent-foreground w-full sm:w-auto flex-shrink-0'}
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
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Liste des personnes parrainées -->
	<Card>
		<CardHeader>
			<CardTitle>Mes personnes parrainées</CardTitle>
			<CardDescription>
				Personnes qui se sont inscrites grâce à ton lien
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if data.affiliations.length === 0}
				<div class="py-8 text-center text-muted-foreground">
					<Users class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>Aucune personne parrainée pour le moment.</p>
					<p class="text-sm mt-2">Partage ton lien pour commencer à gagner des commissions !</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b">
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">ID</th>
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">Date d'inscription</th>
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">Abonnement</th>
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">Date abonnement</th>
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">Statut</th>
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">Mois</th>
								<th class="text-right p-3 text-sm font-medium text-muted-foreground">Total gagné</th>
							</tr>
						</thead>
						<tbody>
							{#each data.affiliations as aff}
								{@const subscriptionStatusBadge = getSubscriptionStatusBadge(aff.subscriptionStatus)}
								<tr class="border-b hover:bg-muted/50">
									<td class="p-3 text-sm font-medium text-muted-foreground">
										#{aff.index}
									</td>
									<td class="p-3 text-sm">
										{formatDate(aff.created_at)}
									</td>
									<td class="p-3 text-sm">
										{#if aff.subscriptionType}
											<span class="font-medium">{aff.subscriptionType}</span>
										{:else}
											<span class="text-muted-foreground">Aucun abonnement</span>
										{/if}
									</td>
									<td class="p-3 text-sm">
										{#if aff.subscription_started_at}
											{formatDate(aff.subscription_started_at)}
										{:else}
											<span class="text-muted-foreground">-</span>
										{/if}
									</td>
									<td class="p-3">
										<Badge variant={subscriptionStatusBadge.variant} class={subscriptionStatusBadge.class}>
											{subscriptionStatusBadge.label}
										</Badge>
									</td>
									<td class="p-3 text-sm">
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
				<div class="py-8 text-center text-muted-foreground">
					<Euro class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>Aucun paiement pour le moment.</p>
					<p class="text-sm mt-2">Les paiements sont effectués le 5 de chaque mois.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b">
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">Date de paiement</th>
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">Période</th>
								<th class="text-left p-3 text-sm font-medium text-muted-foreground">Commissions</th>
								<th class="text-right p-3 text-sm font-medium text-muted-foreground">Montant</th>
							</tr>
						</thead>
						<tbody>
							{#each data.payments as payment}
								<tr class="border-b hover:bg-muted/50">
									<td class="p-3 text-sm">
										{formatDate(payment.paid_at)}
									</td>
									<td class="p-3 text-sm text-muted-foreground">
										{new Date(payment.period_start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
									</td>
									<td class="p-3 text-sm">
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

