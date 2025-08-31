<script lang="ts">
	import { page } from '$app/stores';
	import * as Card from '$lib/components/ui/card';

	export let data;

	// Récupérer l'email depuis les paramètres d'URL ou les données
	$: userEmail =
		$page.url.searchParams.get('email') || data?.userEmail || 'votre email';

	// État du bouton renvoyer
	let resendSuccess = false;
	let resendLoading = false;
	let resendError = false;
	let resendCountdown = 0;

	// Fonction pour renvoyer l'email
	async function handleResendEmail() {
		if (resendLoading || resendCountdown > 0) return; // Éviter les clics multiples

		resendLoading = true;
		resendError = false;
		try {
			const response = await fetch('/api/resend-confirmation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email: userEmail }),
			});

			if (response.ok) {
				resendSuccess = true;
				// Reset après 3 secondes
				setTimeout(() => {
					resendSuccess = false;
				}, 3000);
			} else {
				if (response.status === 429) {
					// Rate limit atteint, démarrer le compte à rebours
					resendCountdown = 60;
					const timer = setInterval(() => {
						resendCountdown--;
						if (resendCountdown <= 0) {
							clearInterval(timer);
						}
					}, 1000);
				} else {
					resendError = true;
					setTimeout(() => {
						resendError = false;
					}, 3000);
				}
			}
		} catch (error) {
			console.error('Erreur:', error);
			resendError = true;
			setTimeout(() => {
				resendError = false;
			}, 3000);
		} finally {
			resendLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Confirmez votre email - Pattyly</title>
	<meta
		name="description"
		content="Confirmez votre adresse email pour continuer"
	/>
	<meta
		name="keywords"
		content="confirmation email, vérification, pâtisserie, gestion"
	/>
</svelte:head>

<div class="mb-24 mt-36">
	<Card.Root
		class="mx-auto max-w-sm rounded-2xl border-neutral-200 bg-white shadow-sm"
	>
		<Card.Header class="text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
			>
				<svg
					class="h-8 w-8 text-green-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<Card.Title
				tag="h1"
				class="text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl"
			>
				Confirmez votre email
			</Card.Title>
		</Card.Header>
		<Card.Content class="flex flex-col gap-4 text-center">
			<p class="text-neutral-700">
				Nous avons envoyé un email de confirmation à <strong
					class="text-neutral-900">{userEmail}</strong
				>.
			</p>
			<p class="text-sm text-neutral-600">
				Cliquez sur le lien dans l'email pour valider votre compte et continuer.
			</p>
			<div class="mt-4 rounded-lg bg-neutral-50 p-4">
				<p class="text-xs text-neutral-600">
					💡 <strong>Conseil :</strong> Vérifiez vos spams si vous ne recevez pas
					l'email dans les prochaines minutes.
				</p>
			</div>
			<div class="mt-4 text-center text-sm text-neutral-600">
				Vous avez déjà un compte ?
				<a
					href="/login"
					class="text-[#FF6F61] underline transition-colors hover:text-[#e85a4f]"
				>
					Se connecter
				</a>
			</div>

			<!-- Bouton renvoyer l'email -->
			<div class="mt-4 text-center">
				<button
					on:click={handleResendEmail}
					disabled={resendLoading || resendCountdown > 0}
					class="text-sm text-[#FF6F61] underline transition-colors hover:text-[#e85a4f] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if resendSuccess}
						✅ Email renvoyé !
					{:else if resendLoading}
						⏳ Envoi en cours...
					{:else if resendCountdown > 0}
						⏰ Réessayer dans {resendCountdown}s
					{:else if resendError}
						❌ Erreur, réessayer
					{:else}
						Renvoyer l'email de confirmation
					{/if}
				</button>
			</div>
		</Card.Content>
	</Card.Root>
</div>
