<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { CheckCircle, Store, CreditCard } from 'lucide-svelte';
	import OnboardingForm from './onboarding-form.svelte';

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
	};

	export let form: any;

	let step = data.step;
	let shop = data.shop;
	let loading = false;
	let error = '';

	// Watch for successful shop creation
	$: if (form?.success && form?.shop) {
		step = 2;
		shop = form.shop;
	}

	// Handle Stripe Connect
	function handleConnectStripe() {
		loading = true;
		error = '';
	}

	// Handle Stripe Connect result
	function handleStripeResult(result: any) {
		loading = false; // Always reset loading state

		if (result.type === 'success') {
			if (result.data?.url) {
				// Redirect to Stripe Connect onboarding
				console.log('🔄 Redirecting to Stripe Connect:', result.data.url);
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
						<p class="text-xs text-muted-foreground">Connexion Stripe</p>
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

		<!-- Step 2: Stripe Connect -->
		{#if step === 2}
			<Card class="w-full">
				<CardHeader>
					<div class="flex items-center space-x-3">
						<CreditCard class="h-6 w-6 text-primary" />
						<div>
							<CardTitle>Connexion Stripe</CardTitle>
							<CardDescription>
								Connectez votre compte Stripe pour recevoir les paiements
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
										{shop.name} - pattyly.com/{shop.slug}
									</p>
								</div>
							</div>
						</div>
					{/if}

					<div class="space-y-4">
						<div class="text-center">
							<p class="mb-4 text-muted-foreground">
								Pour recevoir les paiements de vos clients, vous devez connecter
								votre compte Stripe. Cette étape est obligatoire et sécurisée.
							</p>
						</div>

						<form
							method="POST"
							action="?/connectStripe"
							use:enhance={() => {
								handleConnectStripe();

								return async ({ result }) => {
									handleStripeResult(result);
								};
							}}
						>
							<Button type="submit" class="w-full" disabled={loading}>
								{#if loading}
									Connexion en cours...
								{:else}
									<CreditCard class="mr-2 h-4 w-4" />
									Se connecter à Stripe
								{/if}
							</Button>
						</form>

						<div class="text-center">
							<p class="text-xs text-muted-foreground">
								En continuant, vous acceptez les conditions d'utilisation de
								Stripe
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
