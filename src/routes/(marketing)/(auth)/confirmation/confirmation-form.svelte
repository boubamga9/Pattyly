<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import * as Form from '$lib/components/ui/form';
	import { Button } from '$lib/components/ui/button';
	import InputOtp from '$lib/components/ui/input-otp.svelte';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { otpSchema, type OtpSchema } from './schema';

	export let data: SuperValidated<Infer<OtpSchema>>;
	export let email: string;

	const form = superForm(data, {
		validators: zodClient(otpSchema),
	});

	const { form: formData, enhance, submitting, message } = form;

	$: if ($message?.redirectTo) {
		const url = $message.redirectTo;
		message.set(null); // reset to avoid loop
		goto(url);
	}

	//let otpValue = '';

	// État du bouton renvoyer
	let resendSuccess = false;
	let resendLoading = false;
	let resendError = false;
	let resendCountdown = 0;

	function handleOtpChange(event: CustomEvent<{ value: string }>) {
		//otpValue = event.detail.value;
		//$formData.code = otpValue;
		$formData.code = event.detail.value;
		console.log('form', $formData);
	}

	// Fonction pour renvoyer le code OTP
	async function handleResendCode() {
		if (resendLoading || resendCountdown > 0) return; // Éviter les clics multiples

		resendLoading = true;
		resendError = false;
		try {
			const response = await fetch('/api/resend-confirmation', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email }),
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
		} catch {
			resendError = true;
			setTimeout(() => {
				resendError = false;
			}, 3000);
		} finally {
			resendLoading = false;
		}
	}
</script>

<form method="POST" action="?/verifyOtp" use:enhance class="space-y-6">
	<Form.Errors {form} />

	<!-- Instructions -->
	<div class="text-center">
		<h2 class="mb-2 text-xl font-semibold text-gray-900">
			Vérification par code
		</h2>
		<p class="text-gray-600">
			Entrez le code de vérification à 6 chiffres envoyé à
		</p>
		<p class="font-medium text-gray-900">{email}</p>
	</div>

	<!-- Input email caché -->
	<Form.Field {form} name="email">
		<Form.Control let:attrs>
			<input {...attrs} type="hidden" bind:value={$formData.email} />
		</Form.Control>
	</Form.Field>

	<!-- Input OTP -->
	<div class="flex justify-center">
		<Form.Field {form} name="code">
			<Form.Control let:attrs>
				<!-- Input caché pour la soumission du formulaire -->
				<input {...attrs} type="hidden" bind:value={$formData.code} />
				<InputOtp
					value={$formData.code}
					length={6}
					disabled={$submitting}
					error={!!$page.url.searchParams.get('error')}
					on:change={handleOtpChange}
				/>
			</Form.Control>
			<Form.FieldErrors />
		</Form.Field>
	</div>

	<!-- Bouton de soumission -->
	<Button
		type="submit"
		class="w-full"
		disabled={$submitting || $formData.code.length !== 6}
	>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Vérification en cours...
		{:else}
			Vérifier le code
		{/if}
	</Button>

	<!-- Bouton pour renvoyer le code -->
	<div class="text-center">
		<button
			type="button"
			on:click={handleResendCode}
			class="text-sm text-[#FF6F61] underline hover:text-[#e85a4f] disabled:cursor-not-allowed disabled:opacity-50"
			disabled={$submitting || resendLoading || resendCountdown > 0}
		>
			{#if resendSuccess}
				✅ Code renvoyé !
			{:else if resendLoading}
				⏳ Envoi en cours...
			{:else if resendCountdown > 0}
				⏰ Réessayer dans {resendCountdown}s
			{:else if resendError}
				❌ Erreur, réessayer
			{:else}
				Renvoyer le code
			{/if}
		</button>
	</div>
</form>
