<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import DeleteAccountForm from './delete-account-form.svelte';
	import ChangePasswordForm from './change-password-form.svelte';
	import CreatePasswordForm from './create-password-form.svelte';
	import { CreditCard, CheckCircle, AlertCircle, Crown } from 'lucide-svelte';
	import LoaderCircle from '~icons/lucide/loader-circle';

	let stripeLoading = false;
	let billingLoading = false;
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

	export let data;
	export let form;
</script>

<svelte:head>
	<title>Profil | Paramètres</title>
</svelte:head>

{#if form?.success}
	<p class="text-green-700">{form.success}</p>
{/if}

<!-- Stripe Connect -->
<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<CreditCard class="h-6 w-6 text-primary" />
				<div>
					<Card.Title>Paiements Stripe</Card.Title>
					<Card.Description>
						Configurez votre compte Stripe pour recevoir les paiements
					</Card.Description>
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
	</Card.Header>
	<Card.Content>
		<div class="space-y-4">
			<p class="text-sm text-muted-foreground">
				{#if data.stripeAccount?.is_active}
					Votre compte Stripe est activé et vous pouvez recevoir des paiements.
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
					stripeLoading = true;
					return async ({ result }) => {
						handleStripeResult(result);
						stripeLoading = false;
					};
				}}
			>
				<Button
					type="submit"
					disabled={stripeLoading}
					class={stripeLoading
						? 'bg-gray-400 hover:bg-gray-500'
						: 'bg-black text-white hover:bg-gray-800'}
				>
					{#if stripeLoading}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<CreditCard class="mr-2 h-4 w-4" />
					{/if}
					{data.stripeAccount?.is_active
						? 'Gérer mon compte Stripe'
						: data.stripeAccount
							? "Compléter l'activation"
							: 'Connecter Stripe'}
				</Button>
			</form>
		</div>
	</Card.Content>
</Card.Root>

<!-- Gestion de l'abonnement -->
<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-3">
				<Crown class="h-6 w-6 text-primary" />
				<div>
					<Card.Title>Gérer votre abonnement</Card.Title>
					<Card.Description>
						Accédez à votre espace abonnement pour modifier votre plan
					</Card.Description>
				</div>
			</div>
		</div>
	</Card.Header>
	<Card.Content>
		<div class="space-y-4">
			<p class="text-sm text-muted-foreground">
				Modifiez votre plan d'abonnement, gérez vos factures et accédez à toutes
				les fonctionnalités de votre compte.
			</p>

			<div class="flex gap-2">
				<form
					method="POST"
					action="?/accessStripeBilling"
					use:enhance={() => {
						billingLoading = true;
						return async ({ result }) => {
							handleBillingResult(result);
							billingLoading = false;
						};
					}}
				>
					<Button
						type="submit"
						disabled={billingLoading}
						class={billingLoading
							? 'bg-gray-400 hover:bg-gray-500'
							: 'bg-black text-white hover:bg-gray-800'}
					>
						{#if billingLoading}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						{:else}
							<Crown class="mr-2 h-4 w-4" />
						{/if}
						Gérer votre abonnement
					</Button>
				</form>
			</div>
		</div>
	</Card.Content>
</Card.Root>

{#if data.createPassword || data.recoverySession}
	<CreatePasswordForm
		data={data.createPasswordForm}
		user={data.user}
		recoverySession={data.recoverySession}
	/>
{:else}
	<ChangePasswordForm data={data.changePasswordForm} user={data.user} />
{/if}

<!-- Section séparée pour la déconnexion et suppression de compte -->
<div class="mt-8 border-t pt-8">
	<!-- Bouton Se déconnecter -->
	<div class="mb-6">
		<form method="POST" action="?/logout">
			<Button
				type="submit"
				variant="outline"
				size="sm"
				class="flex w-full flex-nowrap items-center justify-center gap-2"
			>
				<svg
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
					/>
				</svg>
				Se déconnecter
			</Button>
		</form>
	</div>

	<!-- Section suppression de compte -->
	{#if data.deleteAccountForm}
		<Dialog.Root>
			<Dialog.Trigger asChild let:builder>
				<Button
					variant="ghost"
					size="sm"
					class="mx-auto mt-12 block text-xs text-muted-foreground/40"
					builders={[builder]}
				>
					Supprimer le compte
				</Button>
			</Dialog.Trigger>
			<Dialog.Content class="border-destructive">
				<Dialog.Header>
					<Dialog.Title>Êtes-vous absolument sûr ?</Dialog.Title>
					<Dialog.Description>
						Cette action ne peut pas être annulée. Cela supprimera
						définitivement votre compte et supprimera vos données de nos
						serveurs. Tous vos abonnements actifs seront annulés
						automatiquement.
					</Dialog.Description>
				</Dialog.Header>

				<DeleteAccountForm data={data.deleteAccountForm} />
			</Dialog.Content>
		</Dialog.Root>
	{:else}
		<p class="text-sm text-muted-foreground">
			Pour pouvoir supprimer votre compte, vous devez avoir un mot de passe
			configuré. Vous pouvez configurer votre mot de passe dans les paramètres
			de sécurité ci-dessus.
		</p>
	{/if}
</div>
