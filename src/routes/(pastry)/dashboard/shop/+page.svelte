<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import ShopForm from './shop-form.svelte';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { formSchema } from './schema';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Store,
		CreditCard,
		CheckCircle,
		AlertCircle,
		Crown,
	} from 'lucide-svelte';

	export let data: {
		shop: {
			id: string;
			name: string;
			bio: string;
			slug: string;
			logo_url: string | null;
			instagram?: string | null;
			tiktok?: string | null;
			website?: string | null;
		};
		stripeAccount: {
			id: string;
			stripe_account_id: string;
			is_active: boolean;
		} | null;
		form: SuperValidated<Infer<typeof formSchema>>;
	};

	let loading = false;
	let error = '';
	let success = '';

	// Handle Stripe Connect result
	function handleStripeResult(result: {
		type: string;
		data?: { error?: string; redirectUrl?: string };
	}) {
		if (result.type === 'success' && result.data?.redirectUrl) {
			window.location.href = result.data.redirectUrl;
		} else if (result.type === 'failure') {
			error = result.data?.error || 'Une erreur est survenue';
		}
	}

	// Handle Stripe Billing result
	function handleBillingResult(result: {
		type: string;
		data?: { error?: string; redirectUrl?: string; success?: boolean };
	}) {
		console.log('📋 Résultat billing:', result);

		// Vérifier si c'est un succès avec une URL de redirection
		if (
			result.type === 'success' &&
			result.data?.success === true &&
			result.data?.redirectUrl
		) {
			console.log('🔄 Redirection vers:', result.data.redirectUrl);
			window.location.href = result.data.redirectUrl;
		}
		// Vérifier s'il y a une erreur (même avec type 'success' mais success: false)
		else if (result.data?.success === false || result.type === 'failure') {
			console.log('❌ Erreur billing:', result.data?.error);
			error = result.data?.error || 'Une erreur est survenue';
			success = '';
		}
	}
</script>

<svelte:head>
	<title>Paramètres de la boutique - Pattyly</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-foreground">
			Paramètres de la boutique
		</h1>
		<p class="mt-2 text-muted-foreground">
			Gérez les informations de votre boutique et vos paramètres de paiement
		</p>
	</div>

	{#if error}
		<Alert class="mb-6">
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if success}
		<Alert class="mb-6">
			<AlertDescription class="text-green-600">{success}</AlertDescription>
		</Alert>
	{/if}

	<!-- Shop Information -->
	<Card>
		<CardHeader>
			<div class="flex items-center space-x-3">
				<Store class="h-6 w-6 text-primary" />
				<div>
					<CardTitle>Informations de la boutique</CardTitle>
					<CardDescription>
						Modifiez les informations de votre boutique
					</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<ShopForm data={data.form} />
		</CardContent>
	</Card>

	<!-- Stripe Connect -->
	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<CreditCard class="h-6 w-6 text-primary" />
					<div>
						<CardTitle>Paiements Stripe</CardTitle>
						<CardDescription>
							Configurez votre compte Stripe pour recevoir les paiements
						</CardDescription>
					</div>
				</div>
				{#if data.stripeAccount?.is_active}
					<div class="flex items-center space-x-2 text-green-600">
						<CheckCircle class="h-4 w-4" />
						<span class="text-sm font-medium">Compte activé</span>
					</div>
				{:else if data.stripeAccount}
					<div class="flex items-center space-x-2 text-orange-600">
						<AlertCircle class="h-4 w-4" />
						<span class="text-sm font-medium">En attente d'activation</span>
					</div>
				{/if}
			</div>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					{#if data.stripeAccount?.is_active}
						Votre compte Stripe est activé et vous pouvez recevoir des
						paiements.
					{:else if data.stripeAccount}
						Votre compte Stripe est en cours de configuration. Complétez
						l'activation pour recevoir des paiements.
					{:else}
						Connectez votre compte Stripe pour recevoir les paiements de vos
						clients.
					{/if}
				</p>

				<form
					method="POST"
					action="?/connectStripe"
					use:enhance={() => {
						return async ({ result }) => {
							handleStripeResult(result);
						};
					}}
				>
					<Button type="submit" variant="outline" disabled={loading}>
						<CreditCard class="mr-2 h-4 w-4" />
						{data.stripeAccount?.is_active
							? 'Gérer mon compte Stripe'
							: data.stripeAccount
								? "Compléter l'activation"
								: 'Connecter Stripe'}
					</Button>
				</form>
			</div>
		</CardContent>
	</Card>

	<!-- Gestion de l'abonnement -->
	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<Crown class="h-6 w-6 text-primary" />
					<div>
						<CardTitle>Gérer votre abonnement</CardTitle>
						<CardDescription>
							Accédez à votre espace abonnement pour modifier votre plan
						</CardDescription>
					</div>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Modifiez votre plan d'abonnement, gérez vos factures et accédez à
					toutes les fonctionnalités de votre compte.
				</p>

				<div class="flex gap-2">
					<form
						method="POST"
						action="?/accessStripeBilling"
						use:enhance={() => {
							return async ({ result }) => {
								handleBillingResult(result);
							};
						}}
					>
						<Button type="submit" variant="outline" disabled={loading}>
							<Crown class="mr-2 h-4 w-4" />
							Gérer votre abonnement
						</Button>
					</form>
				</div>
			</div>
		</CardContent>
	</Card>
</div>
