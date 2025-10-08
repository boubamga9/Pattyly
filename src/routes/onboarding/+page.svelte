<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { CheckCircle, Store, Loader2 } from 'lucide-svelte';
	import OnboardingForm from './onboarding-form.svelte';
	import { PUBLIC_SITE_URL } from '$env/static/public';

	export let data: {
		step: number;
		shop: {
			id: string;
			name: string;
			bio: string;
			slug: string;
			logo_url: string;
		} | null;
		form: any;
		paypalPolling?: boolean;
		paypalStatus?: string;
	};

	export let form: any;

	let step = data.step;
	let shop = data.shop;
	let loading = false;
	let error = '';

	// 🔄 PayPal Polling
	let pollingInterval: NodeJS.Timeout | null = null;
	let paypalPolling = data.paypalPolling || false;
	let paypalStatus = data.paypalStatus || 'pending';
	let pollingCount = 0;
	const maxPolls = 18; // 3 minutes à 10 sec/poll

	$: if (paypalPolling) {
		step = 2;
	}
	// Watch for successful shop creation
	$: if (form?.success && form?.shop) {
		step = 2;
		shop = form.shop;
	}

	// Démarrer le polling PayPal si nécessaire
	onMount(() => {
		if (paypalPolling) {
			startPayPalPolling();
		}
	});

	onDestroy(() => {
		if (pollingInterval) {
			console.log('🧹 Cleaning up PayPal polling on component destroy');
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	});

	async function startPayPalPolling() {
		// ✅ Empêche les doublons d'intervalles
		if (pollingInterval) {
			console.log('🔄 PayPal polling already running, skipping...');
			return;
		}

		console.log('🔄 Starting PayPal polling...');
		pollingCount = 0;

		pollingInterval = setInterval(async () => {
			pollingCount++;

			// ✅ Stop polling après un certain temps
			if (pollingCount > maxPolls) {
				console.log('⏰ PayPal polling timeout reached');
				if (pollingInterval) clearInterval(pollingInterval);
				pollingInterval = null;
				error =
					'Le processus PayPal semble bloqué. Rechargez la page ou contactez le support.';
				return;
			}

			try {
				const response = await fetch('/api/check-paypal-status');
				const result = await response.json();

				console.log(`🔄 PayPal status check #${pollingCount}:`, result);

				// ✅ Mise à jour du statut pour l'utilisateur
				paypalStatus = result.status;

				if (result.completed) {
					console.log(
						'✅ PayPal onboarding completed! Redirecting to dashboard...',
					);
					if (pollingInterval) clearInterval(pollingInterval);
					pollingInterval = null;

					// ✅ Redirection douce avec pause
					paypalStatus = 'completed';
					await new Promise((resolve) => setTimeout(resolve, 1500));
					goto('/dashboard');
				} else if (result.status === 'failed') {
					console.log('❌ PayPal onboarding failed');
					if (pollingInterval) clearInterval(pollingInterval);
					pollingInterval = null;
					error = "L'onboarding PayPal a échoué. Veuillez réessayer.";
				}
			} catch (err) {
				console.error('❌ PayPal polling error:', err);
				// Continue le polling même en cas d'erreur réseau
			}
		}, 10000); // Toutes les 10 secondes
	}

	// Handle PayPal
	function handleConnectPayPal() {
		loading = true;
		error = '';
	}

	// Handle PayPal result
	function handlePayPalResult(result: any) {
		loading = false; // Always reset loading state

		if (result.type === 'success') {
			if (result.data?.url) {
				// Redirect to PayPal onboarding

				window.location.href = result.data.url;
			} else {
				// No URL, redirect to dashboard
				goto('/dashboard');
			}
		} else if (result.type === 'failure') {
			error = result.data?.error || 'Une erreur est survenue';
		}
	}
</script>

<svelte:head>
	<title>Onboarding - Pattyly</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-secondary to-background py-12">
	<div class="container mx-auto max-w-2xl px-4">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-6 text-3xl font-bold text-foreground">
				Configuration de votre boutique
			</h1>

			<!-- Steps indicator -->
			<div class="flex items-center justify-center space-x-4">
				<div class="flex items-center space-x-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full {step >=
						1
							? 'bg-primary text-primary-foreground'
							: 'bg-muted text-muted-foreground'} border-2 border-primary/20"
					>
						{#if step >= 1}
							<CheckCircle class="h-5 w-5" />
						{:else}
							<span class="text-sm font-medium">1</span>
						{/if}
					</div>
					<div class="text-left">
						<p class="text-sm font-medium text-foreground">Informations</p>
						<p class="text-xs text-muted-foreground">Nom, logo, description</p>
					</div>
				</div>

				<div class="h-px w-8 bg-border"></div>

				<div class="flex items-center space-x-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full {step >=
						2
							? 'bg-primary text-primary-foreground'
							: 'bg-muted text-muted-foreground'} border-2 border-primary/20"
					>
						{#if step >= 2}
							<CheckCircle class="h-5 w-5" />
						{:else}
							<span class="text-sm font-medium">2</span>
						{/if}
					</div>
					<div class="text-left">
						<p class="text-sm font-medium text-foreground">Paiements</p>
						<p class="text-xs text-muted-foreground">Connexion PayPal</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Error Alert -->
		{#if error}
			<Alert class="mb-6" variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		{/if}

		<!-- Step 1: Shop Creation -->
		{#if step === 1}
			<Card class="w-full">
				<CardHeader>
					<div class="flex items-center space-x-3">
						<Store class="h-6 w-6 text-primary" />
						<div>
							<CardTitle>Informations de votre boutique</CardTitle>
							<CardDescription>
								Configurez les informations de base de votre boutique de
								pâtisserie
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<OnboardingForm data={data.form} />
				</CardContent>
			</Card>
		{/if}

		<!-- Step 2: PayPal -->
		{#if step === 2}
			<Card class="w-full">
				<CardHeader>
					<div class="flex items-center space-x-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 512 512"
							class="mr-2 h-6 w-6"
						>
							<path
								fill="#002c8a"
								d="M377 184.8L180.7 399h-72c-5 0-9-5-8-10l48-304c1-7 7-12 14-12h122c84 3 107 46 92 112z"
							/>
							<path
								fill="#009be1"
								d="M380.2 165c30 16 37 46 27 86-13 59-52 84-109 85l-16 1c-6 0-10 4-11 10l-13 79c-1 7-7 12-14 12h-60c-5 0-9-5-8-10l22-143c1-5 182-120 182-120z"
							/>
							<path
								fill="#001f6b"
								d="M197 292l20-127a14 14 0 0 1 13-11h96c23 0 40 4 54 11-5 44-26 115-128 117h-44c-5 0-10 4-11 10z"
							/>
						</svg>
						<div>
							<CardTitle>Connexion PayPal</CardTitle>
							<CardDescription>
								Connectez votre compte PayPal pour recevoir les paiements
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{#if shop}
						<div
							class="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4"
						>
							<div class="flex items-center space-x-3">
								<CheckCircle class="h-5 w-5 text-primary" />
								<div>
									<h3 class="font-medium text-primary">Boutique créée !</h3>
									<p class="text-sm text-muted-foreground">
										{shop.name} - {PUBLIC_SITE_URL}/{shop.slug}
									</p>
								</div>
							</div>
						</div>
					{/if}

					<!-- Interface de polling PayPal -->
					{#if paypalPolling}
						<div
							class="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4"
						>
							<div class="flex items-center space-x-3">
								<Loader2 class="h-5 w-5 animate-spin text-orange-600" />
								<div>
									<h4 class="font-medium text-orange-800">
										{#if paypalStatus === 'completed'}
											✅ Compte PayPal vérifié !
										{:else}
											Vérification de votre compte PayPal...
										{/if}
									</h4>
									<p class="text-sm text-orange-700">
										{#if paypalStatus === 'completed'}
											Redirection vers votre tableau de bord...
										{/if}
									</p>
								</div>
							</div>
						</div>
					{:else}
						<div class="space-y-4">
							<div class="text-center">
								<p class="mb-4 text-muted-foreground">
									Pour recevoir les paiements de vos clients, vous devez
									connecter votre compte PayPal. Cette étape est obligatoire et
									sécurisée.
								</p>
							</div>

							<form
								method="POST"
								action="?/connectPayPal"
								use:enhance={() => {
									handleConnectPayPal();

									return async ({ result }) => {
										handlePayPalResult(result);
									};
								}}
							>
								<Button type="submit" class="w-full" disabled={loading}>
									{#if loading}
										Connexion en cours...
									{:else}
										<span class="inline-flex items-center">
											<svg
												class="mr-2 h-4 w-4"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<g>
													<path fill="none" d="M0 0h24v24H0z" />
													<path
														fill="#fff"
														fill-rule="nonzero"
														d="M8.495 20.667h1.551l.538-3.376a2.805 2.805 0 0 1 2.77-2.366h.5c2.677 0 4.06-.983 4.55-3.503.208-1.066.117-1.73-.171-2.102-1.207 3.054-3.79 4.16-6.962 4.16h-.884c-.384 0-.794.209-.852.58l-1.04 6.607zm-4.944-.294a.551.551 0 0 1-.544-.637L5.68 2.776A.92.92 0 0 1 6.59 2h6.424c2.212 0 3.942.467 4.899 1.558.87.99 1.123 2.084.871 3.692.36.191.668.425.916.706.818.933.978 2.26.668 3.85-.74 3.805-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.679l-.702 4.383a.804.804 0 0 1-.794.679H6.72a.483.483 0 0 1-.477-.558l.274-1.736H3.55zm6.836-8.894h.884c3.19 0 4.895-1.212 5.483-4.229.02-.101.037-.203.053-.309.166-1.06.05-1.553-.398-2.063-.465-.53-1.603-.878-3.396-.878h-5.5L5.246 18.373h1.561l.73-4.628.007.001a2.915 2.915 0 0 1 2.843-2.267z"
													/>
												</g>
											</svg>

											Se connecter à PayPal
										</span>
									{/if}
								</Button>
							</form>

							<div class="text-center">
								<p class="text-xs text-muted-foreground">
									En continuant, vous acceptez les conditions d'utilisation de
									PayPal
								</p>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
