<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { enhance } from '$app/forms';
	import * as Dialog from '$lib/components/ui/dialog';
	import DeleteAccountForm from './delete-account-form.svelte';
	import ChangePasswordForm from './change-password-form.svelte';
	import CreatePasswordForm from './create-password-form.svelte';
	import { Check, AlertCircle, Crown } from 'lucide-svelte';
	import LoaderCircle from '~icons/lucide/loader-circle';

	let stripeLoading = false;
	let billingLoading = false;
	let error = '';
	let success = '';

	// Handle PayPal result
	function handlePayPalResult(result: {
		type: string;
		data?: { error?: string; redirectUrl?: string; success?: boolean };
	}) {
		// Cas de succès avec redirection
		if (
			result.type === 'success' &&
			result.data?.success !== false &&
			result.data?.redirectUrl
		) {
			window.location.href = result.data.redirectUrl;
		}
		// Cas d'erreur explicite (success: false)
		else if (result.type === 'success' && result.data?.success === false) {
			error = result.data?.error || 'Une erreur est survenue';
			success = '';
		}
		// Cas de failure
		else if (result.type === 'failure') {
			error = result.data?.error || 'Une erreur est survenue';
			success = '';
		}
	}

	// Handle Stripe Billing result
	function handleBillingResult(result: {
		type: string;
		data?: { error?: string; redirectUrl?: string; success?: boolean };
	}) {
		// Vérifier si c'est un succès avec une URL de redirection
		if (
			result.type === 'success' &&
			result.data?.success === true &&
			result.data?.redirectUrl
		) {
			window.location.href = result.data.redirectUrl;
		}
		// Vérifier s'il y a une erreur (même avec type 'success' mais success: false)
		else if (result.data?.success === false || result.type === 'failure') {
			error = result.data?.error || 'Une erreur est survenue';
			success = '';
		}
	}

	export let data;
	export let form;
</script>

<svelte:head>
	<title>Paramètres - Pattyly</title>
</svelte:head>

{#if form?.success}
	<p class="text-green-700">{form.success}</p>
{/if}

{#if error}
	<div class="rounded-lg border border-red-200 bg-red-50 p-4">
		<p class="text-sm text-red-800">{error}</p>
	</div>
{/if}

{#if success}
	<div class="rounded-lg border border-green-200 bg-green-50 p-4">
		<p class="text-sm text-green-800">{success}</p>
	</div>
{/if}

<!-- Gestion de l'abonnement (masquée si utilisateur exempté, sans abonnement ou avec plan lifetime) -->
{#if !data.permissions?.isExempt && data.permissions?.plan !== 'free' && !data.isLifetime}
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<Crown class="h-6 w-6 text-primary" />
					<div>
						<Card.Title>Votre abonnement</Card.Title>
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
					Modifiez votre plan d'abonnement, gérez vos factures et accédez à
					toutes les fonctionnalités de votre compte.
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
							Gérer mon abonnement
						</Button>
					</form>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
{/if}

{#if false}
	<!-- PayPal -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
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
						<Card.Title>Paiements PayPal</Card.Title>
						<Card.Description>
							Configurez votre compte PayPal pour recevoir les paiements
						</Card.Description>
					</div>
				</div>
				{#if data.paypalAccount?.is_active}
					<div class="flex items-center space-x-2 text-green-600">
						<Check class="h-4 w-4" />
						<span class="text-sm font-medium">Compte activé</span>
					</div>
				{:else if data.paypalAccount}
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
					{#if data.paypalAccount?.is_active}
						Votre compte PayPal est activé et vous pouvez recevoir des
						paiements.
					{:else if data.paypalAccount}
						Votre compte PayPal est en cours de configuration. Complétez
						l'activation pour recevoir des paiements.
					{:else}
						Connectez votre compte PayPal pour recevoir les paiements de vos
						clients.
					{/if}
				</p>

				<form
					method="POST"
					action="?/connectPayPal"
					use:enhance={() => {
						stripeLoading = true;
						return async ({ result }) => {
							handlePayPalResult(result);
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
						{/if}
						{#if data.paypalAccount?.is_active}
							Changer de compte PayPal
						{:else if data.paypalAccount}
							Compléter l'activation
						{:else}
							Connecter PayPal
						{/if}
					</Button>
				</form>
			</div>
		</Card.Content>
	</Card.Root>
{/if}

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
