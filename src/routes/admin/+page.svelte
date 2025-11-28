<script context="module" lang="ts">
	// Type definition for analytics to help TypeScript
	export type AnalyticsData = {
		totalUsers?: number;
		activeShops?: number;
		activeSubscriptions?: number;
		totalOrders?: number;
		signups7d?: number;
		signups1m?: number;
		signups3m?: number;
		orders7d?: number;
		orders1m?: number;
		activeProducts?: number;
		churnRates?: {
			churn7d?: string;
			churn30d?: string;
			churn90d?: string;
			cancellations7d?: number;
			cancellations30d?: number;
			cancellations90d?: number;
			subscriptions7d?: number;
			subscriptions30d?: number;
			subscriptions90d?: number;
		};
		ordersByStatus?: {
			pending?: number;
			quoted?: number;
			to_verify?: number;
			confirmed?: number;
			ready?: number;
			completed?: number;
			cancelled?: number;
			refused?: number;
		};
		pageViews?: number;
		uniqueVisits?: number;
		visitsByType?: {
			pastry?: { pageViews?: number; uniqueSessions?: number };
			client?: { pageViews?: number; uniqueSessions?: number };
			visitor?: { pageViews?: number; uniqueSessions?: number };
		};
		signupEvents?: number;
		shopCreatedEvents?: number;
		paymentEnabledEvents?: number;
		subscriptionCancelledEvents?: number;
		topPages?: Array<{ page: string; count: number }>;
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import {
		LoaderCircle,
		LogOut,
		TrendingUp,
		Users,
		ShoppingCart,
		Store,
		CreditCard,
		Eye,
		Package,
		Activity,
		ArrowUpRight,
		ArrowDownRight,
		Cake,
		ChefHat,
	} from 'lucide-svelte';

	export let data;

	let sendingOTP = false;
	let verifyingOTP = false;
	let otpSent = false;
	let errorMessage = '';
	let successMessage = '';
	let emailInput = data.email || '';

	$: authenticated = data.authenticated;
	$: analytics = (data.analytics || {}) as AnalyticsData;
	$: if (data.email && !otpSent) {
		otpSent = true;
		emailInput = data.email;
	}

	function formatNumber(num: number): string {
		return new Intl.NumberFormat('fr-FR').format(num);
	}

	function calculateConversionRate(
		numerator: number,
		denominator: number,
	): string {
		if (denominator === 0) {
			// Si le dénominateur est 0 mais le numérateur > 0, afficher "N/A" ou "∞"
			if (numerator > 0) return 'N/A';
			return '0%';
		}
		return ((numerator / denominator) * 100).toFixed(1) + '%';
	}
</script>

<svelte:head>
	<title>Admin - Analytics | Pattyly</title>
</svelte:head>

<div
	class="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-50"
>
	<div class="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
		{#if !authenticated}
			<!-- Formulaire d'authentification -->
			<div class="flex min-h-[80vh] items-center justify-center">
				<Card class="w-full max-w-md shadow-lg">
					<CardHeader class="text-center">
						<div
							class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"
						>
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

										if (result.type === 'success' && 'data' in result) {
											const resultData = result.data;
											if (
												resultData &&
												typeof resultData === 'object' &&
												'success' in resultData &&
												resultData.success
											) {
												otpSent = true;
												if (
													'email' in resultData &&
													typeof resultData.email === 'string'
												) {
													emailInput = resultData.email;
												}
												successMessage =
													('message' in resultData &&
													typeof resultData.message === 'string'
														? resultData.message
														: '') || 'Code envoyé';
											} else {
												errorMessage =
													(resultData &&
													typeof resultData === 'object' &&
													'error' in resultData &&
													typeof resultData.error === 'string'
														? resultData.error
														: '') || "Erreur lors de l'envoi";
											}
										} else if ('data' in result) {
											const resultData = result.data;
											errorMessage =
												(resultData &&
												typeof resultData === 'object' &&
												'error' in resultData &&
												typeof resultData.error === 'string'
													? resultData.error
													: '') || "Erreur lors de l'envoi";
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
										<div
											class="rounded-md bg-green-50 p-3 text-sm text-green-800"
										>
											{successMessage}
										</div>
									{/if}

									<Button type="submit" disabled={sendingOTP} class="w-full">
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

										if (result.type === 'success' && 'data' in result) {
											const resultData = result.data;
											if (
												resultData &&
												typeof resultData === 'object' &&
												'success' in resultData &&
												resultData.success
											) {
												// Redirection gérée par le serveur
											} else {
												errorMessage =
													(resultData &&
													typeof resultData === 'object' &&
													'error' in resultData &&
													typeof resultData.error === 'string'
														? resultData.error
														: '') || 'Code invalide';
												verifyingOTP = false;
											}
										} else if ('data' in result) {
											const resultData = result.data;
											errorMessage =
												(resultData &&
												typeof resultData === 'object' &&
												'error' in resultData &&
												typeof resultData.error === 'string'
													? resultData.error
													: '') || 'Code invalide';
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
											maxlength={6}
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
			<div class="space-y-8">
				<!-- Header avec design premium -->
				<div
					class="flex flex-col gap-4 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<h1
							class="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl"
							style="font-weight: 600; letter-spacing: -0.02em;"
						>
							Dashboard Admin
						</h1>
						<p class="mt-2 text-sm text-neutral-600 sm:text-base">
							Analytics et métriques de la plateforme
						</p>
					</div>
					<form method="POST" action="?/logout">
						<Button
							type="submit"
							variant="outline"
							class="w-full border-neutral-300 text-neutral-700 transition-all hover:border-[#FF6F61] hover:bg-[#FF6F61] hover:text-white sm:w-auto"
						>
							<LogOut class="mr-2 h-4 w-4" />
							Déconnexion
						</Button>
					</form>
				</div>

				<!-- KPIs Principaux avec design amélioré -->
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<Card
						class="group relative overflow-hidden border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
					>
						<div
							class="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
						></div>
						<CardHeader
							class="relative flex flex-row items-center justify-between space-y-0 pb-3"
						>
							<CardTitle class="text-sm font-medium text-neutral-600"
								>Utilisateurs total</CardTitle
							>
							<div
								class="rounded-xl bg-blue-100 p-2.5 transition-transform duration-300 group-hover:scale-110"
							>
								<Users class="h-4 w-4 text-blue-600" />
							</div>
						</CardHeader>
						<CardContent class="relative">
							<div class="text-3xl font-bold tracking-tight text-neutral-900">
								{formatNumber(analytics?.totalUsers || 0)}
							</div>
						</CardContent>
					</Card>

					<Card
						class="group relative overflow-hidden border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
					>
						<div
							class="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
						></div>
						<CardHeader
							class="relative flex flex-row items-center justify-between space-y-0 pb-3"
						>
							<CardTitle class="text-sm font-medium text-neutral-600"
								>Boutiques actives</CardTitle
							>
							<div
								class="rounded-xl bg-green-100 p-2.5 transition-transform duration-300 group-hover:scale-110"
							>
								<Store class="h-4 w-4 text-green-600" />
							</div>
						</CardHeader>
						<CardContent class="relative">
							<div class="text-3xl font-bold tracking-tight text-neutral-900">
								{formatNumber(analytics?.activeShops || 0)}
							</div>
						</CardContent>
					</Card>

					<Card
						class="group relative overflow-hidden border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
					>
						<div
							class="absolute inset-0 bg-gradient-to-br from-[#FF6F61]/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
						></div>
						<CardHeader
							class="relative flex flex-row items-center justify-between space-y-0 pb-3"
						>
							<CardTitle class="text-sm font-medium text-neutral-600"
								>Abonnements actifs</CardTitle
							>
							<div
								class="rounded-xl bg-[#FF6F61]/10 p-2.5 transition-transform duration-300 group-hover:scale-110"
							>
								<CreditCard class="h-4 w-4 text-[#FF6F61]" />
							</div>
						</CardHeader>
						<CardContent class="relative">
							<div class="text-3xl font-bold tracking-tight text-neutral-900">
								{formatNumber(analytics?.activeSubscriptions || 0)}
							</div>
						</CardContent>
					</Card>

					<Card
						class="group relative overflow-hidden border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
					>
						<div
							class="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
						></div>
						<CardHeader
							class="relative flex flex-row items-center justify-between space-y-0 pb-3"
						>
							<CardTitle class="text-sm font-medium text-neutral-600"
								>Commandes totales</CardTitle
							>
							<div
								class="rounded-xl bg-orange-100 p-2.5 transition-transform duration-300 group-hover:scale-110"
							>
								<ShoppingCart class="h-4 w-4 text-orange-600" />
							</div>
						</CardHeader>
						<CardContent class="relative">
							<div class="text-3xl font-bold tracking-tight text-neutral-900">
								{formatNumber(analytics?.totalOrders || 0)}
							</div>
						</CardContent>
					</Card>
				</div>

				<!-- Section: Croissance -->
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<!-- Nouveaux inscrits -->
					<Card
						class="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
					>
						<CardHeader>
							<div class="flex items-center gap-2">
								<div class="rounded-lg bg-blue-100 p-2">
									<TrendingUp class="h-5 w-5 text-blue-600" />
								</div>
								<div>
									<CardTitle class="text-lg">Nouveaux inscrits</CardTitle>
									<CardDescription class="text-xs"
										>Évolution des inscriptions</CardDescription
									>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div class="grid grid-cols-3 gap-4">
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-blue-50/50 to-white p-4 text-center transition-all hover:scale-105"
								>
									<div class="mb-1 flex items-center justify-center gap-1">
										<div class="text-xs font-medium text-neutral-600">7j</div>
										<ArrowUpRight class="h-3 w-3 text-green-600" />
									</div>
									<div
										class="text-2xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.signups7d || 0)}
									</div>
								</div>
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-blue-50/50 to-white p-4 text-center transition-all hover:scale-105"
								>
									<div class="mb-1 flex items-center justify-center gap-1">
										<div class="text-xs font-medium text-neutral-600">1M</div>
										<ArrowUpRight class="h-3 w-3 text-green-600" />
									</div>
									<div
										class="text-2xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.signups1m || 0)}
									</div>
								</div>
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-blue-50/50 to-white p-4 text-center transition-all hover:scale-105"
								>
									<div class="mb-1 flex items-center justify-center gap-1">
										<div class="text-xs font-medium text-neutral-600">3M</div>
										<ArrowUpRight class="h-3 w-3 text-green-600" />
									</div>
									<div
										class="text-2xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.signups3m || 0)}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					<!-- Commandes récentes -->
					<Card
						class="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
					>
						<CardHeader>
							<div class="flex items-center gap-2">
								<div class="rounded-lg bg-orange-100 p-2">
									<ShoppingCart class="h-5 w-5 text-orange-600" />
								</div>
								<div>
									<CardTitle class="text-lg">Commandes récentes</CardTitle>
									<CardDescription class="text-xs"
										>Évolution des commandes</CardDescription
									>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div class="grid grid-cols-3 gap-4">
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-orange-50/50 to-white p-4 text-center transition-all hover:scale-105"
								>
									<div class="mb-1 flex items-center justify-center gap-1">
										<div class="text-xs font-medium text-neutral-600">7j</div>
										<ArrowUpRight class="h-3 w-3 text-green-600" />
									</div>
									<div
										class="text-2xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.orders7d || 0)}
									</div>
								</div>
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-orange-50/50 to-white p-4 text-center transition-all hover:scale-105"
								>
									<div class="mb-1 flex items-center justify-center gap-1">
										<div class="text-xs font-medium text-neutral-600">1M</div>
										<ArrowUpRight class="h-3 w-3 text-green-600" />
									</div>
									<div
										class="text-2xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.orders1m || 0)}
									</div>
								</div>
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-orange-50/50 to-white p-4 text-center transition-all hover:scale-105"
								>
									<div class="mb-1 text-xs font-medium text-neutral-600">
										Total
									</div>
									<div
										class="text-2xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.totalOrders || 0)}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<!-- Section: Taux de churn -->
				<div class="grid grid-cols-1 gap-6">
					<!-- Taux de churn par période -->
					<Card
						class="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
					>
						<CardHeader>
							<div class="flex items-center gap-2">
								<div class="rounded-lg bg-red-100 p-2">
									<ArrowDownRight class="h-5 w-5 text-red-600" />
								</div>
								<div>
									<CardTitle class="text-lg">Taux de churn</CardTitle>
									<CardDescription class="text-xs"
										>Annulations / Souscriptions par période</CardDescription
									>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div class="space-y-3">
								<!-- Churn 7 jours -->
								<div
									class="rounded-xl border border-red-100 bg-gradient-to-br from-red-50/30 to-white p-4 transition-all hover:scale-[1.02]"
								>
									<div class="mb-2 flex items-center justify-between">
										<div class="text-sm font-medium text-neutral-700">
											7 derniers jours
										</div>
										<div class="text-2xl font-bold tracking-tight text-red-600">
											{analytics?.churnRates?.churn7d || '0.0'}%
										</div>
									</div>
									<p class="text-xs text-neutral-600">
										{analytics?.churnRates?.cancellations7d || 0} annulations sur
										{analytics?.churnRates?.subscriptions7d || 0} souscriptions
									</p>
								</div>

								<!-- Churn 30 jours -->
								<div
									class="rounded-xl border border-red-100 bg-gradient-to-br from-red-50/30 to-white p-4 transition-all hover:scale-[1.02]"
								>
									<div class="mb-2 flex items-center justify-between">
										<div class="text-sm font-medium text-neutral-700">
											30 derniers jours
										</div>
										<div class="text-2xl font-bold tracking-tight text-red-600">
											{analytics?.churnRates?.churn30d || '0.0'}%
										</div>
									</div>
									<p class="text-xs text-neutral-600">
										{analytics?.churnRates?.cancellations30d || 0} annulations sur
										{analytics?.churnRates?.subscriptions30d || 0} souscriptions
									</p>
								</div>

								<!-- Churn 90 jours -->
								<div
									class="rounded-xl border border-red-100 bg-gradient-to-br from-red-50/30 to-white p-4 transition-all hover:scale-[1.02]"
								>
									<div class="mb-2 flex items-center justify-between">
										<div class="text-sm font-medium text-neutral-700">
											90 derniers jours
										</div>
										<div class="text-2xl font-bold tracking-tight text-red-600">
											{analytics?.churnRates?.churn90d || '0.0'}%
										</div>
									</div>
									<p class="text-xs text-neutral-600">
										{analytics?.churnRates?.cancellations90d || 0} annulations sur
										{analytics?.churnRates?.subscriptions90d || 0} souscriptions
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<!-- Commandes par statut -->
				<Card
					class="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
				>
					<CardHeader>
						<div class="flex items-center gap-2">
							<div class="rounded-lg bg-neutral-100 p-2">
								<Activity class="h-5 w-5 text-neutral-600" />
							</div>
							<div>
								<CardTitle class="text-lg">Commandes par statut</CardTitle>
								<CardDescription class="text-xs"
									>Répartition des commandes</CardDescription
								>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div
								class="rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-white p-3 transition-all hover:scale-105"
							>
								<div class="mb-1 text-xs font-medium text-yellow-700">
									En attente
								</div>
								<div class="text-2xl font-bold tracking-tight text-yellow-900">
									{formatNumber(analytics?.ordersByStatus?.pending || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-3 transition-all hover:scale-105"
							>
								<div class="mb-1 text-xs font-medium text-blue-700">
									Devis envoyé
								</div>
								<div class="text-2xl font-bold tracking-tight text-blue-900">
									{formatNumber(analytics?.ordersByStatus?.quoted || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-3 transition-all hover:scale-105"
							>
								<div class="mb-1 text-xs font-medium text-orange-700">
									À vérifier
								</div>
								<div class="text-2xl font-bold tracking-tight text-orange-900">
									{formatNumber(analytics?.ordersByStatus?.to_verify || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-green-200 bg-gradient-to-br from-green-50/50 to-white p-3 transition-all hover:scale-105"
							>
								<div class="mb-1 text-xs font-medium text-green-700">
									Confirmées
								</div>
								<div class="text-2xl font-bold tracking-tight text-green-900">
									{formatNumber(analytics?.ordersByStatus?.confirmed || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-white p-3 transition-all hover:scale-105"
							>
								<div class="mb-1 text-xs font-medium text-purple-700">
									Prêtes
								</div>
								<div class="text-2xl font-bold tracking-tight text-purple-900">
									{formatNumber(analytics?.ordersByStatus?.ready || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50/50 to-white p-3 transition-all hover:scale-105"
							>
								<div class="mb-1 text-xs font-medium text-neutral-700">
									Terminées
								</div>
								<div class="text-2xl font-bold tracking-tight text-neutral-900">
									{formatNumber(analytics?.ordersByStatus?.completed || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-red-200 bg-gradient-to-br from-red-50/50 to-white p-3 transition-all hover:scale-105"
							>
								<div class="mb-1 text-xs font-medium text-red-700">
									Annulées
								</div>
								<div class="text-2xl font-bold tracking-tight text-red-900">
									{formatNumber(analytics?.ordersByStatus?.cancelled || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-red-200 bg-gradient-to-br from-red-50/50 to-white p-3 transition-all hover:scale-105"
							>
								<div class="mb-1 text-xs font-medium text-red-700">
									Refusées
								</div>
								<div class="text-2xl font-bold tracking-tight text-red-900">
									{formatNumber(analytics?.ordersByStatus?.refused || 0)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Visites par type d'utilisateur -->
				<Card
					class="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
				>
					<CardHeader>
						<div class="flex items-center gap-2">
							<div class="rounded-lg bg-indigo-100 p-2">
								<Eye class="h-5 w-5 text-indigo-600" />
							</div>
							<div>
								<CardTitle class="text-lg"
									>Visites par type d'utilisateur</CardTitle
								>
								<CardDescription class="text-xs"
									>Pages vues et sessions uniques séparées par type</CardDescription
								>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div class="space-y-4">
							<!-- Total -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50/50 to-white p-4 transition-all hover:scale-[1.02]"
								>
									<div class="mb-2 text-sm font-medium text-neutral-600">
										Total pages vues
									</div>
									<div
										class="text-2xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.pageViews || 0)}
									</div>
								</div>
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50/50 to-white p-4 transition-all hover:scale-[1.02]"
								>
									<div class="mb-2 text-sm font-medium text-neutral-600">
										Total visites uniques
									</div>
									<div
										class="text-2xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.uniqueVisits || 0)}
									</div>
								</div>
							</div>

							<!-- Séparation par type -->
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
								<!-- Pâtissiers -->
								<div
									class="rounded-xl border border-green-200 bg-gradient-to-br from-green-50/50 to-white p-4 transition-all hover:scale-[1.02]"
								>
									<div class="mb-2 flex items-center gap-2">
										<ChefHat class="h-4 w-4 text-green-600" />
										<div class="text-xs font-medium text-green-700">
											Pâtissiers
										</div>
									</div>
									<div
										class="mb-1 text-lg font-bold tracking-tight text-green-900"
									>
										{formatNumber(
											analytics?.visitsByType?.pastry?.pageViews || 0,
										)}
									</div>
									<div class="text-xs text-green-600">
										{formatNumber(
											analytics?.visitsByType?.pastry?.uniqueSessions || 0,
										)} sessions
									</div>
								</div>

								<!-- Clients -->
								<div
									class="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-4 transition-all hover:scale-[1.02]"
								>
									<div class="mb-2 flex items-center gap-2">
										<Cake class="h-4 w-4 text-orange-600" />
										<div class="text-xs font-medium text-orange-700">
											Clients
										</div>
									</div>
									<div
										class="mb-1 text-lg font-bold tracking-tight text-orange-900"
									>
										{formatNumber(
											analytics?.visitsByType?.client?.pageViews || 0,
										)}
									</div>
									<div class="text-xs text-orange-600">
										{formatNumber(
											analytics?.visitsByType?.client?.uniqueSessions || 0,
										)} sessions
									</div>
								</div>

								<!-- Visiteurs -->
								<div
									class="rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50/50 to-white p-4 transition-all hover:scale-[1.02]"
								>
									<div class="mb-2 flex items-center gap-2">
										<Eye class="h-4 w-4 text-neutral-600" />
										<div class="text-xs font-medium text-neutral-700">
											Visiteurs
										</div>
									</div>
									<div
										class="mb-1 text-lg font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(
											analytics?.visitsByType?.visitor?.pageViews || 0,
										)}
									</div>
									<div class="text-xs text-neutral-600">
										{formatNumber(
											analytics?.visitsByType?.visitor?.uniqueSessions || 0,
										)} sessions
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Analytics Events -->
				<Card
					class="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
				>
					<CardHeader>
						<div class="flex items-center gap-2">
							<div class="rounded-lg bg-indigo-100 p-2">
								<Activity class="h-5 w-5 text-indigo-600" />
							</div>
							<div>
								<CardTitle class="text-lg">Analytics Events</CardTitle>
								<CardDescription class="text-xs"
									>Événements trackés depuis la table events</CardDescription
								>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
							<div
								class="rounded-xl border border-neutral-200 bg-gradient-to-br from-blue-50/50 to-white p-4 transition-all hover:scale-105"
							>
								<div class="mb-2 text-sm font-medium text-neutral-600">
									Inscriptions
								</div>
								<div class="text-2xl font-bold tracking-tight text-neutral-900">
									{formatNumber(analytics?.signupEvents || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-neutral-200 bg-gradient-to-br from-green-50/50 to-white p-4 transition-all hover:scale-105"
							>
								<div class="mb-2 text-sm font-medium text-neutral-600">
									Boutiques créées
								</div>
								<div class="text-2xl font-bold tracking-tight text-neutral-900">
									{formatNumber(analytics?.shopCreatedEvents || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-neutral-200 bg-gradient-to-br from-[#FF6F61]/5 to-white p-4 transition-all hover:scale-105"
							>
								<div class="mb-2 text-sm font-medium text-neutral-600">
									Paiements activés
								</div>
								<div class="text-2xl font-bold tracking-tight text-neutral-900">
									{formatNumber(analytics?.paymentEnabledEvents || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-neutral-200 bg-gradient-to-br from-indigo-50/50 to-white p-4 transition-all hover:scale-105"
							>
								<div class="mb-2 flex items-center gap-1.5">
									<Package class="h-3.5 w-3.5 text-indigo-600" />
									<div class="text-sm font-medium text-neutral-600">
										Produits actifs
									</div>
								</div>
								<div class="text-2xl font-bold tracking-tight text-neutral-900">
									{formatNumber(analytics?.activeProducts || 0)}
								</div>
							</div>
							<div
								class="rounded-xl border border-neutral-200 bg-gradient-to-br from-red-50/50 to-white p-4 transition-all hover:scale-105"
							>
								<div class="mb-2 text-sm font-medium text-neutral-600">
									Abonnements annulés
								</div>
								<div class="text-2xl font-bold tracking-tight text-neutral-900">
									{formatNumber(analytics?.subscriptionCancelledEvents || 0)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Pages visitées -->
				<Card
					class="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
				>
					<CardHeader>
						<div class="flex items-center gap-2">
							<div class="rounded-lg bg-indigo-100 p-2">
								<Eye class="h-5 w-5 text-indigo-600" />
							</div>
							<div>
								<CardTitle class="text-lg">Pages les plus visitées</CardTitle>
								<CardDescription class="text-xs"
									>Top 10 des pages les plus consultées</CardDescription
								>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{#if analytics?.topPages && analytics.topPages.length > 0}
							<div class="space-y-2">
								{#each analytics.topPages as { page, count }, index}
									<div
										class="group flex items-center justify-between rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50/30 to-white p-4 transition-all hover:scale-[1.02] hover:shadow-sm"
									>
										<div class="flex items-center gap-3">
											<div
												class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-600 transition-transform group-hover:scale-110"
											>
												{index + 1}
											</div>
											<div class="flex-1">
												<div class="text-sm font-medium text-neutral-900">
													{page || 'Page inconnue'}
												</div>
											</div>
										</div>
										<div class="text-right">
											<div
												class="text-lg font-bold tracking-tight text-neutral-900"
											>
												{formatNumber(count)}
											</div>
											<div class="text-xs text-neutral-500">
												vue{count !== 1 ? 's' : ''}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div
								class="rounded-lg border bg-gray-50 p-4 text-center text-sm text-gray-500"
							>
								Aucune page visitée pour le moment
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Funnel de conversion -->
				<Card
					class="border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md"
				>
					<CardHeader>
						<div class="flex items-center gap-2">
							<div class="rounded-lg bg-green-100 p-2">
								<TrendingUp class="h-5 w-5 text-green-600" />
							</div>
							<div>
								<CardTitle class="text-lg">Funnel de conversion</CardTitle>
								<CardDescription class="text-xs"
									>Analyse du parcours utilisateur</CardDescription
								>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div class="space-y-3">
							<div
								class="flex items-center justify-between rounded-xl border border-neutral-200 bg-gradient-to-br from-blue-50/30 to-white p-4 transition-all hover:scale-[1.01]"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100"
									>
										<Eye class="h-4 w-4 text-blue-600" />
									</div>
									<div>
										<div class="text-sm font-medium text-gray-900">Visites</div>
										<div class="text-xs text-gray-500">Point d'entrée</div>
									</div>
								</div>
								<div class="text-right">
									<div class="text-xl font-bold text-gray-900">
										{formatNumber(analytics?.uniqueVisits || 0)}
									</div>
								</div>
							</div>
							<div
								class="flex items-center justify-between rounded-xl border border-neutral-200 bg-gradient-to-br from-green-50/30 to-white p-4 transition-all hover:scale-[1.01]"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 transition-transform hover:scale-110"
									>
										<Users class="h-4 w-4 text-green-600" />
									</div>
									<div>
										<div class="text-sm font-medium text-neutral-900">
											Inscriptions
										</div>
										<div class="text-xs text-neutral-500">
											{calculateConversionRate(
												analytics?.signupEvents || 0,
												analytics?.uniqueVisits || 0,
											)} de conversion
										</div>
									</div>
								</div>
								<div class="text-right">
									<div
										class="text-xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.signupEvents || 0)}
									</div>
								</div>
							</div>
							<div
								class="flex items-center justify-between rounded-xl border border-neutral-200 bg-gradient-to-br from-purple-50/30 to-white p-4 transition-all hover:scale-[1.01]"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 transition-transform hover:scale-110"
									>
										<Store class="h-4 w-4 text-purple-600" />
									</div>
									<div>
										<div class="text-sm font-medium text-neutral-900">
											Boutiques créées
										</div>
										<div class="text-xs text-neutral-500">
											{calculateConversionRate(
												analytics?.shopCreatedEvents || 0,
												analytics?.signupEvents || 0,
											)} de conversion
										</div>
									</div>
								</div>
								<div class="text-right">
									<div
										class="text-xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.shopCreatedEvents || 0)}
									</div>
								</div>
							</div>
							<div
								class="flex items-center justify-between rounded-xl border border-neutral-200 bg-gradient-to-br from-[#FF6F61]/5 to-white p-4 transition-all hover:scale-[1.01]"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6F61]/10 transition-transform hover:scale-110"
									>
										<CreditCard class="h-4 w-4 text-[#FF6F61]" />
									</div>
									<div>
										<div class="text-sm font-medium text-neutral-900">
											Paiements activés
										</div>
										<div class="text-xs text-neutral-500">
											{#if (analytics?.shopCreatedEvents || 0) > 0}
												{calculateConversionRate(
													analytics?.paymentEnabledEvents || 0,
													analytics?.shopCreatedEvents || 0,
												)} de conversion
											{:else if (analytics?.signupEvents || 0) > 0}
												{calculateConversionRate(
													analytics?.paymentEnabledEvents || 0,
													analytics?.signupEvents || 1,
												)} de conversion (vs inscriptions)
											{:else}
												{analytics?.paymentEnabledEvents || 0} paiement{(analytics?.paymentEnabledEvents ||
													0) !== 1
													? 's'
													: ''} activé{(analytics?.paymentEnabledEvents ||
													0) !== 1
													? 's'
													: ''}
											{/if}
										</div>
									</div>
								</div>
								<div class="text-right">
									<div
										class="text-xl font-bold tracking-tight text-neutral-900"
									>
										{formatNumber(analytics?.paymentEnabledEvents || 0)}
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		{/if}
	</div>
</div>
