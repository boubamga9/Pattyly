<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Cake,
		ShoppingCart,
		Euro,
		TrendingUp,
		Plus,
		Calendar,
		FileText,
		ArrowUpRight,
		ArrowDownRight,
		Minus,
		Copy,
		Check,
		CreditCard,
		Crown,
		Sparkles,
	} from 'lucide-svelte';
	import { env } from '$env/dynamic/public';
	// Données de la page
	$: ({ shop, metrics, permissions, user, plans, currentPlan, isLifetimeAvailable, hasLifetimePlan } = $page.data);
	
	// ✅ Tracking: Page view côté client (session_id persistant)
	onMount(() => {
		if (shop?.id && user?.id) {
			import('$lib/utils/analytics').then(({ logPageView }) => {
				const { supabase } = $page.data;
				
				if (supabase) {
					logPageView(supabase, {
						page: '/dashboard',
						shop_id: shop.id
					}).catch((err: unknown) => {
						// Ne pas bloquer si le tracking échoue
						console.error('Error tracking page_view:', err);
					});
				}
			});
		}
	});

	// Calculer si la limite est atteinte
	$: isProductLimitReached =
		permissions.productLimit &&
		(permissions.productCount || 0) >= permissions.productLimit;

	// État pour le filtre de revenus
	let selectedRevenuePeriod: 'weekly' | 'monthly' | 'threeMonths' | 'yearly' =
		'monthly';

	// État pour le feedback de copie
	let copySuccess = false;

	// Compte à rebours pour l'offre limitée
	const deadline = new Date('2026-01-31T23:59:59').getTime();
	let timeLeft = {
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0
	};
	let intervalId: ReturnType<typeof setInterval> | null = null;

	function updateCountdown() {
		const now = new Date().getTime();
		const distance = deadline - now;

		if (distance < 0) {
			timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
			return;
		}

		timeLeft = {
			days: Math.floor(distance / (1000 * 60 * 60 * 24)),
			hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
			minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
			seconds: Math.floor((distance % (1000 * 60)) / 1000)
		};
	}

	// Démarrer le compte à rebours si l'offre est disponible
	$: if (isLifetimeAvailable && !hasLifetimePlan) {
		if (typeof window !== 'undefined') {
			updateCountdown();
			if (intervalId) {
				clearInterval(intervalId);
			}
			intervalId = setInterval(updateCountdown, 1000);
		}
	}

	onMount(() => {
		if (isLifetimeAvailable && !hasLifetimePlan) {
			updateCountdown();
			intervalId = setInterval(updateCountdown, 1000);
		}
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Fonction pour formater la date
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	// Fonction pour obtenir le statut de la commande
	function getOrderStatus(status: string): {
		label: string;
		variant: 'default' | 'secondary' | 'destructive' | 'outline';
	} {
		switch (status) {
			case 'pending':
				return { label: 'En attente', variant: 'secondary' };
			case 'confirmed':
				return { label: 'Confirmée', variant: 'default' };
			case 'completed':
				return { label: 'Terminée', variant: 'outline' };
			case 'cancelled':
				return { label: 'Annulée', variant: 'destructive' };
			case 'ready':
				return { label: 'Prête', variant: 'default' };
			case 'quoted':
				return { label: 'Devis envoyé', variant: 'outline' };
			case 'to_verify':
				return { label: 'À vérifier', variant: 'secondary' };
			case 'refused':
				return { label: 'Refusée', variant: 'outline' };
			default:
				return { label: status, variant: 'outline' };
		}
	}

	// Fonction pour obtenir le revenu actuel
	$: currentRevenue = metrics.revenue[selectedRevenuePeriod];

	// Fonction pour obtenir l'accompte actuel
	$: currentDeposit = metrics.deposit[selectedRevenuePeriod];

	// Fonction pour obtenir le nombre de commandes actuel
	$: currentOrdersCount = metrics.ordersCount[selectedRevenuePeriod];

	// Fonction pour calculer la variation (simulation)
	$: revenueVariation = 0; // À implémenter avec les données historiques

	// Actions rapides
	function goToAddProduct() {
		goto('/dashboard/products/new');
	}

	function goToOrders() {
		goto('/dashboard/orders');
	}

	function goToAvailability() {
		goto('/dashboard/availability');
	}

	function goToCustomForm() {
		goto('/dashboard/custom-form');
	}

	// Fonction pour copier l'URL du shop
	async function copyShopUrl() {
		const fullUrl = `${env.PUBLIC_SITE_URL}/${shop?.slug}`;

		await navigator.clipboard.writeText(fullUrl);
		copySuccess = true;
		// Reset after 2 seconds
		setTimeout(() => {
			copySuccess = false;
		}, 2000);
	}

</script>

<svelte:head>
	<title>Tableau de bord - Pattyly</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- Bande offre limitée -->
	{#if isLifetimeAvailable && !hasLifetimePlan && !permissions?.isExempt}
		<div class="mb-6 w-full rounded-lg bg-gradient-to-r from-[#FF6F61] to-[#FF8A7A] px-4 py-3 text-white shadow-md">
			<div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
				<div class="flex items-center gap-2">
					<Sparkles class="h-4 w-4" />
					<span class="font-semibold">Offre limitée • Paiement unique</span>
				</div>
				
				<!-- Compte à rebours -->
				<div class="flex items-center gap-1.5">
					<span class="text-[10px] text-white/80">Se termine dans :</span>
					<div class="flex gap-1">
						<div class="rounded bg-white/20 px-1.5 py-0.5 backdrop-blur-sm">
							<div class="text-xs font-bold">{timeLeft.days}</div>
							<div class="text-[10px] text-white/80">j</div>
						</div>
						<div class="rounded bg-white/20 px-1.5 py-0.5 backdrop-blur-sm">
							<div class="text-xs font-bold">{timeLeft.hours}</div>
							<div class="text-[10px] text-white/80">h</div>
						</div>
						<div class="rounded bg-white/20 px-1.5 py-0.5 backdrop-blur-sm">
							<div class="text-xs font-bold">{timeLeft.minutes}</div>
							<div class="text-[10px] text-white/80">m</div>
						</div>
						<div class="rounded bg-white/20 px-1.5 py-0.5 backdrop-blur-sm">
							<div class="text-xs font-bold">{timeLeft.seconds}</div>
							<div class="text-[10px] text-white/80">s</div>
						</div>
					</div>
					<Button
						href="/lifetime"
						variant="outline"
						size="sm"
						class="ml-2 border-white/30 bg-white/20 text-white hover:bg-white/30"
					>
						Découvrir
						<ArrowUpRight class="ml-1 h-3 w-3" />
					</Button>
				</div>
			</div>
		</div>
	{/if}

	<!-- En-tête -->
	<div class="mb-8">
		<div class="mb-2 flex items-center gap-3">
			<h1 class="text-3xl font-bold">Tableau de bord</h1>
			{#if hasLifetimePlan}
				<Badge
					variant="secondary"
					class="border-0 bg-primary text-white shadow-sm"
				>
					<Crown class="mr-1 h-3 w-3" />
					Plan à vie
				</Badge>
			{:else if permissions?.isExempt}
				<Badge
					variant="secondary"
					class="border-0 bg-[#FF6F61] text-white shadow-sm"
				>
					Ambassadeur
				</Badge>
			{/if}
		</div>
		<p class="mt-2 text-muted-foreground">
			Bienvenue {shop?.name || 'Pâtissier'}, voici un aperçu de votre activité
		</p>
	</div>

	<!-- ✅ Bannière d'essai gratuit déplacée dans (pastry)/+layout.svelte -->

	<!-- URL du shop -->
	{#if shop?.slug}
		<Card>
			<CardContent class="pt-6">
				<div
					class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<h3
							class="text-xs font-medium text-muted-foreground sm:text-sm md:text-base"
						>
							URL de votre boutique
						</h3>
						<p
							class="break-all font-mono text-sm text-foreground sm:text-base md:text-lg"
						>
							{env.PUBLIC_SITE_URL}/{shop.slug}
						</p>
					</div>
					<Button
						type="button"
						size="sm"
						on:click={copyShopUrl}
						title="Copier l'URL complète"
						disabled={!shop?.slug}
						class={copySuccess
							? 'border-[#FF6F61] bg-[#FF6F61] text-white hover:border-[#e85a4f] hover:bg-[#e85a4f]'
							: 'border border-input bg-background text-black hover:bg-accent hover:text-accent-foreground'}
					>
						{#if copySuccess}
							<Check class="mr-2 h-4 w-4" />
							Copiée
						{:else}
							<Copy class="mr-2 h-4 w-4" />
							Copier
						{/if}
					</Button>
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Métriques principales -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<!-- Nombre de gâteaux -->
		<Card>
			<CardHeader
				class="flex flex-row items-center justify-between space-y-0 pb-2"
			>
				<CardTitle class="text-sm font-medium">Gâteaux en vente</CardTitle>
				<Cake class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{metrics.productsCount}</div>
				<p class="text-xs text-muted-foreground">
					{metrics.productsCount === 0 ? 'Aucun gâteau' : 'gâteaux actifs'}
				</p>
			</CardContent>
		</Card>

		<!-- Total des commandes -->
		<Card>
			<CardHeader
				class="flex flex-row items-center justify-between space-y-0 pb-2"
			>
				<CardTitle class="text-sm font-medium">Total des commandes</CardTitle>
				<ShoppingCart class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{currentOrdersCount}</div>
				<p class="text-xs text-muted-foreground">
					{currentOrdersCount === 0
						? 'Aucune commande'
						: `commandes ${selectedRevenuePeriod === 'weekly' ? 'cette semaine' : selectedRevenuePeriod === 'monthly' ? 'ce mois' : selectedRevenuePeriod === 'threeMonths' ? 'ces 3 mois' : 'cette année'}`}
				</p>
			</CardContent>
		</Card>

		<!-- Chiffre d'affaires -->
		<Card>
			<CardHeader
				class="flex flex-row items-center justify-between space-y-0 pb-2"
			>
				<CardTitle class="text-sm font-medium">Chiffre d'affaires</CardTitle>
				<Euro class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div>
					<div class="flex items-baseline gap-2">
						<div class="text-2xl font-bold">{formatPrice(currentRevenue)}</div>
						<div class="text-sm text-muted-foreground">
							({formatPrice(currentDeposit)} accompte)
						</div>
					</div>
				</div>
				<div class="mt-2 flex items-center text-xs text-muted-foreground">
					{#if revenueVariation > 0}
						<ArrowUpRight class="mr-1 h-3 w-3 text-green-500" />
						<span class="text-green-500">+{revenueVariation}%</span>
					{:else if revenueVariation < 0}
						<ArrowDownRight class="mr-1 h-3 w-3 text-red-500" />
						<span class="text-red-500">{revenueVariation}%</span>
					{:else}
						<Minus class="mr-1 h-3 w-3 text-muted-foreground" />
						<span>0%</span>
					{/if}
					<span class="ml-1">vs période précédente</span>
				</div>
			</CardContent>
		</Card>

		<!-- Gâteaux populaires -->
		<Card>
			<CardHeader
				class="flex flex-row items-center justify-between space-y-0 pb-2"
			>
				<CardTitle class="text-sm font-medium">Gâteaux populaires</CardTitle>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				<div class="text-2xl font-bold">{metrics.popularProducts.length}</div>
				<p class="text-xs text-muted-foreground">
					{metrics.popularProducts.length === 0
						? 'Aucune vente'
						: 'gâteaux vendus'}
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Filtres de revenus -->
	<div class="flex justify-center">
		<div class="flex space-x-1 rounded-lg bg-muted p-1">
			<Button
				variant={selectedRevenuePeriod === 'weekly' ? 'default' : 'ghost'}
				size="sm"
				on:click={() => (selectedRevenuePeriod = 'weekly')}
			>
				Semaine
			</Button>
			<Button
				variant={selectedRevenuePeriod === 'monthly' ? 'default' : 'ghost'}
				size="sm"
				on:click={() => (selectedRevenuePeriod = 'monthly')}
			>
				Mois
			</Button>
			<Button
				variant={selectedRevenuePeriod === 'threeMonths' ? 'default' : 'ghost'}
				size="sm"
				on:click={() => (selectedRevenuePeriod = 'threeMonths')}
			>
				3 mois
			</Button>
			<Button
				variant={selectedRevenuePeriod === 'yearly' ? 'default' : 'ghost'}
				size="sm"
				on:click={() => (selectedRevenuePeriod = 'yearly')}
			>
				Année
			</Button>
		</div>
	</div>

	<!-- Section Plans (masquée si utilisateur a un plan lifetime ou est exempt) -->
	{#if !hasLifetimePlan && !permissions?.isExempt}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CreditCard class="h-5 w-5" />
					Votre abonnement
				</CardTitle>
				<CardDescription>
					{#if currentPlan}
						{@const currentPlanData = plans.find(p => p.id === currentPlan)}
						{#if currentPlanData}
							Plan {currentPlanData.name} - {currentPlanData.price}€/mois
						{/if}
					{:else}
						Aucun abonnement actif
					{/if}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{#if currentPlan}
					{@const currentPlanData = plans.find(p => p.id === currentPlan)}
					{#if currentPlanData}
						<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="flex items-center gap-3">
								<Badge class="bg-[#FF6F61] text-white">
									Plan actuel
								</Badge>
								<div>
									<p class="font-semibold">{currentPlanData.name}</p>
									<p class="text-sm text-muted-foreground">
										{currentPlanData.price}€/mois
									</p>
								</div>
							</div>
							<Button href="/subscription" class="w-full sm:w-auto">
								Gérer l'abonnement
								<ArrowUpRight class="ml-2 h-4 w-4" />
							</Button>
						</div>
					{/if}
				{:else}
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<p class="text-muted-foreground">
							Vous n'avez pas encore d'abonnement actif
						</p>
						<Button 
							href="/subscription"
							class="w-full sm:w-auto bg-[#FF6F61] text-white hover:bg-[#e85a4f]"
						>
							Souscrire
							<ArrowUpRight class="ml-2 h-4 w-4" />
						</Button>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/if}


	<!-- Actions rapides -->
	<Card>
		<CardHeader>
			<CardTitle>Actions rapides</CardTitle>
			<CardDescription>
				Accédez rapidement aux fonctionnalités principales
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Button
					variant="outline"
					class="h-auto flex-col space-y-2 p-4"
					on:click={goToAddProduct}
					disabled={isProductLimitReached}
					title={isProductLimitReached
						? 'Limite de gâteaux atteinte'
						: 'Ajouter un gâteau'}
				>
					<Plus class="h-6 w-6" />
					<span>Ajouter un gâteau</span>
				</Button>
				<Button
					variant="outline"
					class="h-auto flex-col space-y-2 p-4"
					on:click={goToOrders}
				>
					<ShoppingCart class="h-6 w-6" />
					<span>Voir les commandes</span>
				</Button>
				<Button
					variant="outline"
					class="h-auto flex-col space-y-2 p-4"
					on:click={goToAvailability}
				>
					<Calendar class="h-6 w-6" />
					<span>Gérer les disponibilités</span>
				</Button>
				<Button
					variant="outline"
					class="h-auto flex-col space-y-2 p-4"
					on:click={goToCustomForm}
				>
					<FileText class="h-6 w-6" />
					<span>Formulaire personnalisé</span>
				</Button>
			</div>
		</CardContent>
	</Card>

	<!-- Contenu principal -->
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Commandes récentes -->
		<Card>
			<CardHeader>
				<CardTitle>Commandes récentes</CardTitle>
				<CardDescription>Les dernières commandes reçues</CardDescription>
			</CardHeader>
			<CardContent>
				{#if metrics.recentOrders.length === 0}
					<div class="py-8 text-center text-muted-foreground">
						<ShoppingCart class="mx-auto mb-4 h-12 w-12 opacity-50" />
						<p>Aucune commande récente</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each metrics.recentOrders as order}
							<button
								class="w-full text-left"
								on:click={() => goto(`/dashboard/orders/${order.id}`)}
							>
								<div
									class="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-gray-50"
								>
									<div class="flex-1">
										<div class="flex items-center space-x-2">
											<p class="font-medium">
												{order.product_name || 'Commande personnalisée'}
											</p>
											<Badge variant={getOrderStatus(order.status).variant}>
												{getOrderStatus(order.status).label}
											</Badge>
										</div>
										<p class="text-sm text-muted-foreground">
											{order.customer_name || order.customer_email}
										</p>
										<p class="text-xs text-muted-foreground">
											{formatDate(order.created_at)}
										</p>
									</div>
									<div class="text-right">
										{#if (order.total_amount || 0) > 0}
											<p class="font-medium">
												{formatPrice(order.total_amount)}
											</p>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
					<div class="mt-4">
						<Button variant="outline" class="w-full" on:click={goToOrders}>
							Voir toutes les commandes
							<ArrowUpRight class="ml-2 h-4 w-4" />
						</Button>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Gâteaux populaires -->
		<Card>
			<CardHeader>
				<CardTitle>Gâteaux populaires</CardTitle>
				<CardDescription>Vos gâteaux les plus vendus</CardDescription>
			</CardHeader>
			<CardContent>
				{#if metrics.popularProducts.length === 0}
					<div class="py-8 text-center text-muted-foreground">
						<Cake class="mx-auto mb-4 h-12 w-12 opacity-50" />
						<p>Aucune vente enregistrée</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each metrics.popularProducts as item, index}
							<div class="flex items-center space-x-4 rounded-lg border p-3">
								<div
									class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10"
								>
									<span class="text-sm font-medium text-primary"
										>#{index + 1}</span
									>
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-medium">{item.product.name}</p>
									<p class="text-sm text-muted-foreground">
										{item.totalQuantity} vendu(s)
									</p>
								</div>
								<div class="text-right">
									<p class="font-medium">{formatPrice(item.totalRevenue)}</p>
								</div>
							</div>
						{/each}
					</div>
					<div class="mt-4">
						<Button
							variant="outline"
							class="w-full"
							on:click={() => goto('/dashboard/products')}
						>
							Voir tous les gâteaux
							<ArrowUpRight class="ml-2 h-4 w-4" />
						</Button>
					</div>
				{/if}
			</CardContent>
		</Card>
	</div>
</div>
