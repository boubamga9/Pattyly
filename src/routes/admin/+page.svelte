<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { LoaderCircle, LogOut, TrendingUp, Users, ShoppingCart, Store, CreditCard, Eye, Package, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-svelte';

	export let data;

	let sendingOTP = false;
	let verifyingOTP = false;
	let otpSent = false;
	let errorMessage = '';
	let successMessage = '';
	let emailInput = data.email || '';

	$: authenticated = data.authenticated;
	$: analytics = data.analytics;
	$: if (data.email && !otpSent) {
		otpSent = true;
		emailInput = data.email;
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat('fr-FR').format(num);
	}

	function calculateConversionRate(numerator: number, denominator: number): string {
		if (denominator === 0) return '0%';
		return ((numerator / denominator) * 100).toFixed(1) + '%';
	}
</script>

<svelte:head>
	<title>Admin - Analytics | Pattyly</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-8">
	<div class="mx-auto max-w-7xl">
		{#if !authenticated}
			<!-- Formulaire d'authentification -->
			<div class="flex min-h-[80vh] items-center justify-center">
				<Card class="w-full max-w-md shadow-lg">
					<CardHeader class="text-center">
						<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<Activity class="h-6 w-6 text-primary" />
						</div>
						<CardTitle class="text-2xl">Connexion Admin</CardTitle>
						<CardDescription class="mt-2">
							Entrez votre email pour recevoir un code de connexion
						</CardDescription>
					</CardHeader>
					<CardContent>
						{#if !otpSent}
							<!-- Formulaire email -->
							<form
								method="POST"
								action="?/sendOTP"
								use:enhance={() => {
									return async ({ result, update }) => {
										sendingOTP = true;
										errorMessage = '';
										successMessage = '';

										await update();

										if (result.type === 'success' && result.data?.success) {
											otpSent = true;
											if (result.data.email) {
												emailInput = result.data.email;
											}
											successMessage = result.data.message || 'Code envoyé';
										} else {
											errorMessage = result.data?.error || 'Erreur lors de l\'envoi';
										}

										sendingOTP = false;
									};
								}}
							>
								<div class="space-y-4">
									<div>
										<Label for="email">Email</Label>
										<Input
											id="email"
											name="email"
											type="email"
											placeholder="admin@example.com"
											required
											disabled={sendingOTP}
											class="mt-1"
											bind:value={emailInput}
										/>
									</div>

									{#if errorMessage}
										<div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
											{errorMessage}
										</div>
									{/if}

									{#if successMessage}
										<div class="rounded-md bg-green-50 p-3 text-sm text-green-800">
											{successMessage}
										</div>
									{/if}

									<Button
										type="submit"
										disabled={sendingOTP}
										class="w-full"
									>
										{#if sendingOTP}
											<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
											Envoi en cours...
										{:else}
											Envoyer le code
										{/if}
									</Button>
								</div>
							</form>
						{:else}
							<!-- Formulaire code OTP -->
							<form
								method="POST"
								action="?/verifyOTP"
								use:enhance={() => {
									return async ({ result, update }) => {
										verifyingOTP = true;
										errorMessage = '';
										successMessage = '';

										await update();

										if (result.type === 'success' && result.data?.success) {
											// Redirection gérée par le serveur
										} else {
											errorMessage = result.data?.error || 'Code invalide';
											verifyingOTP = false;
										}
									};
								}}
							>
								<div class="space-y-4">
									<div>
										<Label for="code">Code de vérification</Label>
										<Input
											id="code"
											name="code"
											type="text"
											placeholder="123456"
											maxlength="6"
											inputmode="numeric"
											required
											disabled={verifyingOTP}
											class="mt-1 text-center text-2xl tracking-widest"
											on:input={(e) => {
												// Ne garder que les chiffres
												const value = e.currentTarget.value.replace(/\D/g, '');
												e.currentTarget.value = value;
											}}
										/>
										<p class="mt-1 text-xs text-gray-500">
											Entrez le code à 6 chiffres reçu par email
										</p>
									</div>

									<input type="hidden" name="email" value={emailInput} />

									{#if errorMessage}
										<div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
											{errorMessage}
										</div>
									{/if}

									<div class="flex gap-2">
										<Button
											type="button"
											variant="outline"
											on:click={() => {
												otpSent = false;
												errorMessage = '';
												successMessage = '';
											}}
											class="flex-1"
										>
											Retour
										</Button>
										<Button
											type="submit"
											disabled={verifyingOTP}
											class="flex-1"
										>
											{#if verifyingOTP}
												<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
												Vérification...
											{:else}
												Se connecter
											{/if}
										</Button>
									</div>
								</div>
							</form>
						{/if}
					</CardContent>
				</Card>
			</div>
		{:else}
			<!-- Dashboard Analytics -->
			<div class="space-y-6">
				<!-- Header -->
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 class="text-3xl font-bold tracking-tight text-gray-900">Dashboard Admin</h1>
						<p class="mt-1.5 text-sm text-gray-600">Analytics et métriques de la plateforme</p>
					</div>
					<form method="POST" action="?/logout">
						<Button type="submit" variant="outline" class="w-full sm:w-auto">
							<LogOut class="mr-2 h-4 w-4" />
							Déconnexion
						</Button>
					</form>
				</div>

				<!-- KPIs Principaux -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card class="border-l-4 border-l-blue-500 shadow-sm transition-shadow hover:shadow-md">
						<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle class="text-sm font-medium text-gray-600">Utilisateurs total</CardTitle>
							<div class="rounded-full bg-blue-100 p-2">
								<Users class="h-4 w-4 text-blue-600" />
							</div>
						</CardHeader>
						<CardContent>
							<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalUsers)}</div>
						</CardContent>
					</Card>

					<Card class="border-l-4 border-l-green-500 shadow-sm transition-shadow hover:shadow-md">
						<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle class="text-sm font-medium text-gray-600">Boutiques actives</CardTitle>
							<div class="rounded-full bg-green-100 p-2">
								<Store class="h-4 w-4 text-green-600" />
							</div>
						</CardHeader>
						<CardContent>
							<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.activeShops)}</div>
						</CardContent>
					</Card>

					<Card class="border-l-4 border-l-purple-500 shadow-sm transition-shadow hover:shadow-md">
						<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle class="text-sm font-medium text-gray-600">Abonnements actifs</CardTitle>
							<div class="rounded-full bg-purple-100 p-2">
								<CreditCard class="h-4 w-4 text-purple-600" />
							</div>
						</CardHeader>
						<CardContent>
							<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.activeSubscriptions)}</div>
						</CardContent>
					</Card>

					<Card class="border-l-4 border-l-orange-500 shadow-sm transition-shadow hover:shadow-md">
						<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle class="text-sm font-medium text-gray-600">Commandes totales</CardTitle>
							<div class="rounded-full bg-orange-100 p-2">
								<ShoppingCart class="h-4 w-4 text-orange-600" />
							</div>
						</CardHeader>
						<CardContent>
							<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalOrders)}</div>
						</CardContent>
					</Card>
				</div>

				<!-- Nouveaux inscrits -->
				<Card class="shadow-sm">
					<CardHeader>
						<div class="flex items-center gap-2">
							<TrendingUp class="h-5 w-5 text-blue-600" />
							<CardTitle>Nouveaux inscrits</CardTitle>
						</div>
						<CardDescription>Évolution des inscriptions</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 flex items-center gap-2">
									<div class="text-xs font-medium text-gray-500">7 derniers jours</div>
									<ArrowUpRight class="h-3 w-3 text-green-600" />
								</div>
								<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.signups7d)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 flex items-center gap-2">
									<div class="text-xs font-medium text-gray-500">1 mois</div>
									<ArrowUpRight class="h-3 w-3 text-green-600" />
								</div>
								<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.signups1m)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 flex items-center gap-2">
									<div class="text-xs font-medium text-gray-500">3 mois</div>
									<ArrowUpRight class="h-3 w-3 text-green-600" />
								</div>
								<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.signups3m)}</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Commandes récentes -->
				<Card class="shadow-sm">
					<CardHeader>
						<div class="flex items-center gap-2">
							<ShoppingCart class="h-5 w-5 text-orange-600" />
							<CardTitle>Commandes récentes</CardTitle>
						</div>
						<CardDescription>Évolution des commandes</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 flex items-center gap-2">
									<div class="text-xs font-medium text-gray-500">7 derniers jours</div>
									<ArrowUpRight class="h-3 w-3 text-green-600" />
								</div>
								<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.orders7d || 0)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 flex items-center gap-2">
									<div class="text-xs font-medium text-gray-500">1 mois</div>
									<ArrowUpRight class="h-3 w-3 text-green-600" />
								</div>
								<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.orders1m || 0)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 text-xs font-medium text-gray-500">Total</div>
								<div class="text-3xl font-bold text-gray-900">{formatNumber(analytics.totalOrders)}</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Produits et Churn -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Card class="shadow-sm">
						<CardHeader>
							<div class="flex items-center gap-2">
								<Package class="h-5 w-5 text-indigo-600" />
								<CardTitle>Produits actifs</CardTitle>
							</div>
							<CardDescription>Nombre de produits disponibles</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="text-4xl font-bold text-gray-900">{formatNumber(analytics.activeProducts || 0)}</div>
						</CardContent>
					</Card>

					<Card class="shadow-sm">
						<CardHeader>
							<div class="flex items-center gap-2">
								<ArrowDownRight class="h-5 w-5 text-red-600" />
								<CardTitle>Taux de churn</CardTitle>
							</div>
							<CardDescription>Abonnements annulés / Abonnements actifs</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="text-4xl font-bold text-red-600">{analytics.churnRate || '0.0'}%</div>
							<p class="mt-3 text-sm text-gray-600">
								{analytics.subscriptionCancelledEvents || 0} annulations sur {analytics.activeSubscriptions || 0} actifs
							</p>
						</CardContent>
					</Card>
				</div>

				<!-- Commandes par statut -->
				<Card class="shadow-sm">
					<CardHeader>
						<div class="flex items-center gap-2">
							<Activity class="h-5 w-5 text-gray-600" />
							<CardTitle>Commandes par statut</CardTitle>
						</div>
						<CardDescription>Répartition des commandes</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div class="rounded-lg border bg-yellow-50 p-3">
								<div class="mb-1 text-xs font-medium text-yellow-700">En attente</div>
								<div class="text-2xl font-bold text-yellow-900">{formatNumber(analytics.ordersByStatus?.pending || 0)}</div>
							</div>
							<div class="rounded-lg border bg-blue-50 p-3">
								<div class="mb-1 text-xs font-medium text-blue-700">Devis envoyé</div>
								<div class="text-2xl font-bold text-blue-900">{formatNumber(analytics.ordersByStatus?.quoted || 0)}</div>
							</div>
							<div class="rounded-lg border bg-orange-50 p-3">
								<div class="mb-1 text-xs font-medium text-orange-700">À vérifier</div>
								<div class="text-2xl font-bold text-orange-900">{formatNumber(analytics.ordersByStatus?.to_verify || 0)}</div>
							</div>
							<div class="rounded-lg border bg-green-50 p-3">
								<div class="mb-1 text-xs font-medium text-green-700">Confirmées</div>
								<div class="text-2xl font-bold text-green-900">{formatNumber(analytics.ordersByStatus?.confirmed || 0)}</div>
							</div>
							<div class="rounded-lg border bg-purple-50 p-3">
								<div class="mb-1 text-xs font-medium text-purple-700">Prêtes</div>
								<div class="text-2xl font-bold text-purple-900">{formatNumber(analytics.ordersByStatus?.ready || 0)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-3">
								<div class="mb-1 text-xs font-medium text-gray-700">Terminées</div>
								<div class="text-2xl font-bold text-gray-900">{formatNumber(analytics.ordersByStatus?.completed || 0)}</div>
							</div>
							<div class="rounded-lg border bg-red-50 p-3">
								<div class="mb-1 text-xs font-medium text-red-700">Annulées</div>
								<div class="text-2xl font-bold text-red-900">{formatNumber(analytics.ordersByStatus?.cancelled || 0)}</div>
							</div>
							<div class="rounded-lg border bg-red-50 p-3">
								<div class="mb-1 text-xs font-medium text-red-700">Refusées</div>
								<div class="text-2xl font-bold text-red-900">{formatNumber(analytics.ordersByStatus?.refused || 0)}</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Analytics Events -->
				<Card class="shadow-sm">
					<CardHeader>
						<div class="flex items-center gap-2">
							<Eye class="h-5 w-5 text-indigo-600" />
							<CardTitle>Analytics Events</CardTitle>
						</div>
						<CardDescription>Événements trackés depuis la table events</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 text-sm font-medium text-gray-600">Pages vues</div>
								<div class="text-2xl font-bold text-gray-900">{formatNumber(analytics.pageViews)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 text-sm font-medium text-gray-600">Visites uniques</div>
								<div class="text-2xl font-bold text-gray-900">{formatNumber(analytics.uniqueVisits)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 text-sm font-medium text-gray-600">Inscriptions</div>
								<div class="text-2xl font-bold text-gray-900">{formatNumber(analytics.signupEvents)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 text-sm font-medium text-gray-600">Boutiques créées</div>
								<div class="text-2xl font-bold text-gray-900">{formatNumber(analytics.shopCreatedEvents)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 text-sm font-medium text-gray-600">Paiements activés</div>
								<div class="text-2xl font-bold text-gray-900">{formatNumber(analytics.paymentEnabledEvents)}</div>
							</div>
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-2 text-sm font-medium text-gray-600">Abonnements annulés</div>
								<div class="text-2xl font-bold text-gray-900">{formatNumber(analytics.subscriptionCancelledEvents)}</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Funnel de conversion -->
				<Card class="shadow-sm">
					<CardHeader>
						<div class="flex items-center gap-2">
							<TrendingUp class="h-5 w-5 text-green-600" />
							<CardTitle>Funnel de conversion</CardTitle>
						</div>
						<CardDescription>Analyse du parcours utilisateur</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="space-y-3">
							<div class="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
								<div class="flex items-center gap-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
										<Eye class="h-4 w-4 text-blue-600" />
									</div>
									<div>
										<div class="text-sm font-medium text-gray-900">Visites</div>
										<div class="text-xs text-gray-500">Point d'entrée</div>
									</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold text-gray-900">{formatNumber(analytics.uniqueVisits)}</div>
								</div>
							</div>
							<div class="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
								<div class="flex items-center gap-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
										<Users class="h-4 w-4 text-green-600" />
									</div>
									<div>
										<div class="text-sm font-medium text-gray-900">Inscriptions</div>
										<div class="text-xs text-gray-500">
											{calculateConversionRate(analytics.signupEvents, analytics.uniqueVisits)} de conversion
										</div>
									</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold text-gray-900">{formatNumber(analytics.signupEvents)}</div>
								</div>
							</div>
							<div class="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
								<div class="flex items-center gap-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
										<Store class="h-4 w-4 text-purple-600" />
									</div>
									<div>
										<div class="text-sm font-medium text-gray-900">Boutiques créées</div>
										<div class="text-xs text-gray-500">
											{calculateConversionRate(analytics.shopCreatedEvents, analytics.signupEvents)} de conversion
										</div>
									</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold text-gray-900">{formatNumber(analytics.shopCreatedEvents)}</div>
								</div>
							</div>
							<div class="flex items-center justify-between rounded-lg border bg-gray-50 p-4">
								<div class="flex items-center gap-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
										<CreditCard class="h-4 w-4 text-orange-600" />
									</div>
									<div>
										<div class="text-sm font-medium text-gray-900">Paiements activés</div>
										<div class="text-xs text-gray-500">
											{calculateConversionRate(analytics.paymentEnabledEvents, analytics.shopCreatedEvents)} de conversion
										</div>
									</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold text-gray-900">{formatNumber(analytics.paymentEnabledEvents)}</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		{/if}
	</div>
</div>

