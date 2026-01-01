<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { AlertTriangle, ExternalLink, ChevronDown, Check, AlertCircle } from 'lucide-svelte';
	import { paymentConfigSchema } from './schema';
	import { createEventDispatcher } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	export let data: any;
	export let stripeConnectAccount: {
		id: string;
		is_active: boolean;
		charges_enabled: boolean;
		payouts_enabled: boolean;
		stripe_account_id: string;
	} | null | undefined = null;

	const dispatch = createEventDispatcher();

	let stripeLoading = false;
	let showPaypalForm = false;
	let showRevolutForm = false;
	let showStripeInfo = false;
	let paypalSubmitting = false;
	let paypalSubmitted = false;
	let revolutSubmitting = false;
	let revolutSubmitted = false;

	// Create a form for payment configuration (PayPal and/or Revolut)
	const form = superForm(data, {
		validators: zodClient(paymentConfigSchema),
	});

	const { form: formData, enhance, submitting, message } = form;

	$: if (message) {
		dispatch('message', message);
	}

	let isPaypalGuideOpen = false;

	async function handleConnectStripe() {
		stripeLoading = true;
		try {
			const formData = new FormData();
			const response = await fetch('?/connectStripe', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			
			// SvelteKit actions return data in a specific format
			// result.data can be a string that needs to be parsed
			let actionResult: unknown;
			if (typeof result.data === 'string') {
				try {
					actionResult = JSON.parse(result.data);
				} catch {
					actionResult = result.data;
				}
			} else {
				actionResult = result.data;
			}
			
			// Extract URL from the response
			// Format can be: [{success: 1, url: 2}, true, "https://..."] or {success: true, url: "https://..."}
			let url: string | null = null;
			if (Array.isArray(actionResult)) {
				// If it's an array, the URL is typically the last string element
				const urlCandidate = actionResult.find((item): item is string => typeof item === 'string' && item.startsWith('http'));
				if (urlCandidate) {
					url = urlCandidate;
				} else if (actionResult[0] && typeof actionResult[0] === 'object' && 'url' in actionResult[0]) {
					url = (actionResult[0] as { url: string }).url;
				}
			} else if (actionResult && typeof actionResult === 'object' && 'url' in actionResult) {
				url = (actionResult as { url: string }).url;
			}
			
			if (url && url.startsWith('http')) {
				window.location.href = url;
			} else {
				console.error('Error connecting Stripe: URL not found in response', result);
				stripeLoading = false;
			}
		} catch (err) {
			console.error('Error connecting Stripe:', err);
			stripeLoading = false;
		}
	}
</script>

<div class="space-y-6">
	<Form.Errors {form} />

	<!-- Information importante -->
	<Alert class="border-orange-200 bg-orange-50">
		<AlertTriangle class="h-4 w-4 !text-orange-600" />
		<AlertDescription class="text-orange-800">
			<strong>Important :</strong> Configurez au moins une méthode de paiement pour continuer.
			Vous pourrez en ajouter d'autres plus tard depuis les paramètres de votre boutique.
		</AlertDescription>
	</Alert>

	<!-- Section cartes sur desktop, cartes + formulaires sur mobile -->
	<div class="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-4">
		<!-- Carte PayPal -->
		<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:col-span-1" style="order: 1;">
			<!-- Logo PayPal -->
			<div class="mb-4">
				<div class="flex items-center justify-between">
					<svg width="780px" height="780px" viewBox="0 -140 780 780" enable-background="new 0 0 780 500" version="1.1" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" class="h-12 w-auto">
					<path d="m168.38 169.35c-8.399-5.774-19.359-8.668-32.88-8.668h-52.346c-4.145 0-6.435 2.073-6.87 6.215l-21.264 133.48c-0.221 1.311 0.107 2.51 0.981 3.6 0.869 1.092 1.962 1.635 3.271 1.635h24.864c4.361 0 6.758-2.068 7.198-6.215l5.888-35.986c0.215-1.744 0.982-3.162 2.291-4.254 1.308-1.09 2.944-1.803 4.907-2.129 1.963-0.324 3.814-0.488 5.562-0.488 1.743 0 3.814 0.111 6.217 0.328 2.397 0.217 3.925 0.324 4.58 0.324 18.756 0 33.478-5.285 44.167-15.867 10.684-10.576 16.032-25.242 16.032-44.004 0-12.868-4.203-22.191-12.598-27.974zm-26.989 40.08c-1.094 7.635-3.926 12.649-8.506 15.049-4.581 2.403-11.124 3.599-19.629 3.599l-10.797 0.326 5.563-35.007c0.434-2.397 1.851-3.597 4.252-3.597h6.218c8.72 0 15.049 1.257 18.975 3.761 3.924 2.51 5.233 7.801 3.924 15.869z" fill="#003087"/>
					<path d="m720.79 160.68h-24.207c-2.406 0-3.822 1.2-4.254 3.601l-21.266 136.1-0.328 0.654c0 1.096 0.436 2.127 1.311 3.109 0.867 0.98 1.963 1.471 3.27 1.471h21.596c4.137 0 6.428-2.068 6.871-6.215l21.264-133.81v-0.325c-1e-3 -3.055-1.423-4.581-4.257-4.581z" fill="#009CDE"/>
					<path d="m428.31 213.36c0-1.088-0.438-2.126-1.305-3.105-0.875-0.981-1.857-1.475-2.945-1.475h-25.191c-2.404 0-4.367 1.096-5.891 3.271l-34.678 51.039-14.395-49.074c-1.096-3.487-3.492-5.236-7.197-5.236h-24.541c-1.093 0-2.074 0.492-2.941 1.475-0.875 0.979-1.309 2.019-1.309 3.105 0 0.439 2.127 6.871 6.379 19.303 4.252 12.436 8.832 25.85 13.74 40.246 4.908 14.393 7.469 22.031 7.688 22.896-17.886 24.432-26.825 37.518-26.825 39.26 0 2.838 1.415 4.254 4.253 4.254h25.191c2.398 0 4.36-1.088 5.89-3.27l83.427-120.4c0.433-0.432 0.65-1.192 0.65-2.29z" fill="#003087"/>
					<path d="m662.89 208.78h-24.865c-3.057 0-4.904 3.6-5.559 10.799-5.678-8.722-16.031-13.089-31.084-13.089-15.703 0-29.064 5.89-40.076 17.668-11.016 11.778-16.521 25.632-16.521 41.552 0 12.871 3.762 23.121 11.285 30.752 7.525 7.639 17.611 11.451 30.266 11.451 6.324 0 12.758-1.311 19.301-3.926 6.543-2.617 11.664-6.105 15.379-10.469 0 0.219-0.223 1.197-0.654 2.941-0.441 1.748-0.656 3.061-0.656 3.926 0 3.494 1.414 5.234 4.254 5.234h22.576c4.139 0 6.541-2.068 7.193-6.215l13.416-85.39c0.215-1.31-0.111-2.507-0.982-3.599-0.877-1.088-1.965-1.635-3.273-1.635zm-42.694 64.454c-5.562 5.453-12.27 8.178-20.121 8.178-6.328 0-11.449-1.742-15.377-5.234-3.928-3.482-5.891-8.281-5.891-14.395 0-8.064 2.727-14.886 8.182-20.447 5.445-5.562 12.213-8.342 20.283-8.342 6.102 0 11.174 1.799 15.213 5.396 4.031 3.6 6.055 8.562 6.055 14.889-2e-3 7.851-2.783 14.505-8.344 19.955z" fill="#009CDE"/>
					<path d="m291.23 208.78h-24.865c-3.058 0-4.908 3.6-5.563 10.799-5.889-8.722-16.25-13.089-31.081-13.089-15.704 0-29.065 5.89-40.078 17.668-11.016 11.778-16.521 25.632-16.521 41.552 0 12.871 3.763 23.121 11.288 30.752 7.525 7.639 17.61 11.451 30.262 11.451 6.104 0 12.433-1.311 18.975-3.926 6.543-2.617 11.778-6.105 15.704-10.469-0.875 2.615-1.309 4.906-1.309 6.867 0 3.494 1.417 5.234 4.253 5.234h22.574c4.141 0 6.543-2.068 7.198-6.215l13.413-85.39c0.215-1.31-0.111-2.507-0.981-3.599-0.873-1.088-1.962-1.635-3.269-1.635zm-42.695 64.616c-5.563 5.35-12.382 8.016-20.447 8.016-6.329 0-11.4-1.742-15.214-5.234-3.819-3.482-5.726-8.281-5.726-14.395 0-8.064 2.725-14.886 8.18-20.447 5.449-5.562 12.211-8.343 20.284-8.343 6.104 0 11.175 1.8 15.214 5.397 4.032 3.6 6.052 8.562 6.052 14.889-1e-3 8.07-2.781 14.779-8.343 20.117z" fill="#003087"/>
					<path d="m540.04 169.35c-8.398-5.774-19.355-8.668-32.879-8.668h-52.02c-4.363 0-6.764 2.073-7.197 6.215l-21.266 133.48c-0.221 1.311 0.107 2.51 0.982 3.6 0.865 1.092 1.961 1.635 3.27 1.635h26.826c2.617 0 4.361-1.416 5.236-4.252l5.889-37.949c0.217-1.744 0.98-3.162 2.291-4.254 1.309-1.09 2.943-1.803 4.908-2.129 1.961-0.324 3.812-0.488 5.561-0.488 1.744 0 3.814 0.111 6.215 0.328 2.398 0.217 3.93 0.324 4.58 0.324 18.76 0 33.479-5.285 44.168-15.867 10.688-10.576 16.031-25.242 16.031-44.004 1e-3 -12.868-4.2-22.192-12.595-27.974zm-33.533 53.819c-4.799 3.271-11.998 4.906-21.592 4.906l-10.471 0.328 5.562-35.008c0.432-2.396 1.85-3.598 4.252-3.598h5.887c4.799 0 8.615 0.219 11.455 0.654 2.83 0.438 5.561 1.799 8.178 4.088 2.619 2.291 3.926 5.619 3.926 9.979 0 9.164-2.402 15.377-7.197 18.651z" fill="#009CDE"/>
					</svg>
					<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
						Manuel
					</span>
				</div>
			</div>

			<!-- Description -->
			<p class="mb-6 flex-grow text-sm text-gray-600">
				Recevez les paiements via PayPal.me. Les clients peuvent vous payer rapidement et facilement.
			</p>

			<!-- Bouton Connecter -->
			<Button
				type="button"
				on:click={() => {
					showRevolutForm = false; // Fermer Revolut
					showStripeInfo = false; // Fermer Stripe
					showPaypalForm = !showPaypalForm; // Toggle PayPal
				}}
				class="mb-2 w-full bg-gray-600 hover:bg-gray-700 text-white"
			>
				Configurer
			</Button>
		</div>

		<!-- Formulaire PayPal Mobile (dans le même conteneur, juste après la carte PayPal) -->
		<div class="md:hidden" style="order: {showPaypalForm ? 2 : 999};">
			<Collapsible.Root bind:open={showPaypalForm}>
				<Collapsible.Content class="mt-0">
	<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
		<div class="flex items-center justify-between">
			<h3 class="font-semibold text-gray-900">PayPal.me</h3>
			<span class="text-xs text-gray-500">Optionnel</span>
		</div>

		<!-- Guide PayPal.me (Collapsible) -->
		<Collapsible.Root bind:open={isPaypalGuideOpen}>
			<Collapsible.Trigger
				class="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-100"
			>
				<h4 class="text-sm font-medium text-gray-900">
					Comment trouver votre nom PayPal.me ?
				</h4>
				<ChevronDown
					class="h-4 w-4 text-gray-600 transition-transform duration-200"
					style="transform: rotate({isPaypalGuideOpen ? 180 : 0}deg)"
				/>
			</Collapsible.Trigger>
			<Collapsible.Content
				class="mt-2 rounded-lg border border-gray-200 bg-white p-4"
			>
				<div class="space-y-3 text-sm text-gray-700">
					<div>
						<p class="mb-2 font-medium text-gray-900">
							Si vous n'avez pas encore de lien PayPal.me :
						</p>
						<p>
							1. Créez votre lien sur <a
								href="https://www.paypal.com/paypalme/"
								target="_blank"
								class="inline-flex items-center font-medium text-blue-600 hover:text-blue-800"
							>
								paypal.com/paypalme <ExternalLink class="ml-1 h-3 w-3" />
							</a>
						</p>
						<p class="mt-1">2. Choisissez votre nom unique (ex: @monnom)</p>
					</div>

					<div class="border-t border-gray-300 pt-3">
						<p class="mb-2 font-medium text-gray-900">
							Si vous avez déjà un lien PayPal.me :
						</p>
						<p>
							1. Connectez-vous sur <a
								href="https://paypal.com"
								target="_blank"
								class="inline-flex items-center text-blue-600 hover:text-blue-800"
							>
								paypal.com <ExternalLink class="ml-1 h-3 w-3" />
							</a>
						</p>
						<p class="mt-1">
							2. Allez dans <strong>Paramètres du compte</strong> →
							<strong>Informations de l'entreprise</strong>
						</p>
						<p class="mt-1">3. Trouvez votre <strong>Nom PayPal.me</strong></p>
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		<Form.Field {form} name="paypal_me">
			<Form.Control let:attrs>
				<Form.Label>Votre nom PayPal.me</Form.Label>
				<div class="flex items-center space-x-2">
					<span class="text-sm text-muted-foreground">@</span>
					<Input
						{...attrs}
						type="text"
						placeholder="votre-nom"
						bind:value={$formData.paypal_me}
						class="flex-1"
					/>
				</div>
			</Form.Control>
			<Form.FieldErrors />
			<Form.Description>
				Entrez votre nom PayPal.me sans le @. Exemple: si votre lien est @monnom,
				tapez "monnom"
			</Form.Description>
		</Form.Field>

		<!-- Aperçu du lien PayPal -->
		{#if $formData.paypal_me && $formData.paypal_me.trim() !== ''}
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
				<h4 class="mb-2 text-sm font-medium text-blue-900">Aperçu de votre lien :</h4>
				<a
					href="https://paypal.me/{$formData.paypal_me}"
					target="_blank"
					rel="noopener noreferrer"
					class="block rounded bg-white px-3 py-2 font-mono text-sm text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-900"
				>
					paypal.me/{$formData.paypal_me}
					<ExternalLink class="ml-1 inline h-3 w-3" />
				</a>
				<p class="mt-2 text-xs text-blue-700">
					👆 Cliquez sur le lien pour vérifier qu'il fonctionne avant de continuer
				</p>
			</div>
						{/if}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>

		<!-- Carte Revolut -->
		<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:col-span-1" style="order: 3;">
			<!-- Logo Revolut -->
			<div class="mb-4">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<div class="flex h-6 w-6 items-center justify-center rounded bg-black">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 800 800"
								class="h-4 w-4"
								fill="white"
							>
								<rect x="209.051" y="262.097" width="101.445" height="410.21"/>
								<path d="M628.623,285.554c0-87.043-70.882-157.86-158.011-157.86H209.051v87.603h249.125c39.43,0,72.093,30.978,72.814,69.051
									c0.361,19.064-6.794,37.056-20.146,50.66c-13.357,13.61-31.204,21.109-50.251,21.109h-97.046c-3.446,0-6.25,2.8-6.25,6.245v77.859
									c0,1.324,0.409,2.59,1.179,3.656l164.655,228.43h120.53L478.623,443.253C561.736,439.08,628.623,369.248,628.623,285.554z"/>
							</svg>
						</div>
						<span class="text-sm font-semibold text-gray-900">Revolut</span>
					</div>
					<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
						Manuel
					</span>
				</div>
			</div>

			<!-- Description -->
			<p class="mb-6 flex-grow text-sm text-gray-600">
				Acceptez les paiements via Revolut.me. Solution simple et rapide pour recevoir vos paiements.
			</p>

			<!-- Bouton Connecter ou état connecté -->
			{#if $formData.revolut_me && $formData.revolut_me.trim() !== ''}
				<Button
					type="button"
					variant="outline"
					on:click={() => {
						showPaypalForm = false; // Fermer PayPal
						showStripeInfo = false; // Fermer Stripe
						showRevolutForm = !showRevolutForm; // Toggle Revolut
					}}
					class="mb-2 w-full"
				>
					<Check class="mr-2 h-4 w-4 text-green-600" />
					Configuré
				</Button>
			{:else}
				<Button
					type="button"
					on:click={() => {
						showPaypalForm = false; // Fermer PayPal
						showStripeInfo = false; // Fermer Stripe
						showRevolutForm = true; // Ouvrir Revolut
					}}
					class="mb-2 w-full bg-gray-600 hover:bg-gray-700 text-white"
				>
					Configurer
				</Button>
		{/if}
	</div>

		<!-- Formulaire Revolut Mobile (dans le même conteneur, juste après la carte Revolut) -->
		<div class="md:hidden" style="order: {showRevolutForm ? 4 : 999};">
			<Collapsible.Root bind:open={showRevolutForm}>
				<Collapsible.Content class="mt-0">
	<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
		<div class="flex items-center justify-between">
			<h3 class="font-semibold text-gray-900">Revolut</h3>
			<span class="text-xs text-gray-500">Optionnel</span>
		</div>

		<Form.Field {form} name="revolut_me">
			<Form.Control let:attrs>
				<Form.Label>Votre identifiant Revolut</Form.Label>
				<div class="flex items-center space-x-2">
					<span class="text-sm text-muted-foreground">@</span>
					<Input
						{...attrs}
						type="text"
						placeholder="votre-identifiant"
						bind:value={$formData.revolut_me}
						class="flex-1"
					/>
				</div>
			</Form.Control>
			<Form.FieldErrors />
			<Form.Description>
				Entrez votre identifiant Revolut (ex: @votre-nom). Vous pouvez le trouver dans l'application Revolut.
			</Form.Description>
		</Form.Field>

		<!-- Aperçu du lien Revolut -->
		{#if $formData.revolut_me && $formData.revolut_me.trim() !== ''}
			<div class="rounded-lg border border-purple-200 bg-purple-50 p-3">
				<h4 class="mb-2 text-sm font-medium text-purple-900">Aperçu de votre lien :</h4>
				<a
					href="https://revolut.me/{$formData.revolut_me}"
					target="_blank"
					rel="noopener noreferrer"
					class="block rounded bg-white px-3 py-2 font-mono text-sm text-purple-600 transition-colors hover:bg-purple-100 hover:text-purple-900"
				>
					revolut.me/{$formData.revolut_me}
					<ExternalLink class="ml-1 inline h-3 w-3" />
				</a>
				<p class="mt-2 text-xs text-purple-700">
					👆 Cliquez sur le lien pour vérifier qu'il fonctionne avant de continuer
				</p>
			</div>
		{/if}
	</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>

		<!-- Carte Stripe -->
		<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:col-span-1" style="order: 5;">
			<!-- Logo Stripe -->
			<div class="mb-4">
				<div class="flex items-center justify-between">
					<svg width="512px" height="512px" viewBox="0 -149 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid" class="h-10 w-auto">
						<g>
							<path d="M35.9822222,83.4844444 C35.9822222,77.9377778 40.5333333,75.8044444 48.0711111,75.8044444 C58.88,75.8044444 72.5333333,79.0755556 83.3422222,84.9066667 L83.3422222,51.4844444 C71.5377778,46.7911111 59.8755556,44.9422222 48.0711111,44.9422222 C19.2,44.9422222 0,60.0177778 0,85.1911111 C0,124.444444 54.0444444,118.186667 54.0444444,135.111111 C54.0444444,141.653333 48.3555556,143.786667 40.3911111,143.786667 C28.5866667,143.786667 13.5111111,138.951111 1.56444444,132.408889 L1.56444444,166.257778 C14.7911111,171.946667 28.16,174.364444 40.3911111,174.364444 C69.9733333,174.364444 90.3111111,159.715556 90.3111111,134.257778 C90.1688889,91.8755556 35.9822222,99.4133333 35.9822222,83.4844444 Z M132.124444,16.4977778 L97.4222222,23.8933333 L97.28,137.813333 C97.28,158.862222 113.066667,174.364444 134.115556,174.364444 C145.777778,174.364444 154.311111,172.231111 159.004444,169.671111 L159.004444,140.8 C154.453333,142.648889 131.982222,149.191111 131.982222,128.142222 L131.982222,77.6533333 L159.004444,77.6533333 L159.004444,47.36 L131.982222,47.36 L132.124444,16.4977778 Z M203.235556,57.8844444 L200.96,47.36 L170.24,47.36 L170.24,171.804444 L205.795556,171.804444 L205.795556,87.4666667 C214.186667,76.5155556 228.408889,78.5066667 232.817778,80.0711111 L232.817778,47.36 C228.266667,45.6533333 211.626667,42.5244444 203.235556,57.8844444 Z M241.493333,47.36 L277.191111,47.36 L277.191111,171.804444 L241.493333,171.804444 L241.493333,47.36 Z M241.493333,36.5511111 L277.191111,28.8711111 L277.191111,0 L241.493333,7.53777778 L241.493333,36.5511111 Z M351.431111,44.9422222 C337.493333,44.9422222 328.533333,51.4844444 323.555556,56.0355556 L321.706667,47.2177778 L290.417778,47.2177778 L290.417778,213.048889 L325.973333,205.511111 L326.115556,165.262222 C331.235556,168.96 338.773333,174.222222 351.288889,174.222222 C376.746667,174.222222 399.928889,153.742222 399.928889,108.657778 C399.786667,67.4133333 376.32,44.9422222 351.431111,44.9422222 Z M342.897778,142.933333 C334.506667,142.933333 329.528889,139.946667 326.115556,136.248889 L325.973333,83.4844444 C329.671111,79.36 334.791111,76.5155556 342.897778,76.5155556 C355.84,76.5155556 364.8,91.0222222 364.8,109.653333 C364.8,128.711111 355.982222,142.933333 342.897778,142.933333 Z M512,110.08 C512,73.6711111 494.364444,44.9422222 460.657778,44.9422222 C426.808889,44.9422222 406.328889,73.6711111 406.328889,109.795556 C406.328889,152.604444 430.506667,174.222222 465.208889,174.222222 C482.133333,174.222222 494.933333,170.382222 504.604444,164.977778 L504.604444,136.533333 C494.933333,141.368889 483.84,144.355556 469.76,144.355556 C455.964444,144.355556 443.733333,139.52 442.168889,122.737778 L511.715556,122.737778 C511.715556,120.888889 512,113.493333 512,110.08 Z M441.742222,96.5688889 C441.742222,80.4977778 451.555556,73.8133333 460.515556,73.8133333 C469.191111,73.8133333 478.435556,80.4977778 478.435556,96.5688889 L441.742222,96.5688889 L441.742222,96.5688889 Z" fill="#6772E5"/>
						</g>
					</svg>
					<span class="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
						Automatique
					</span>
				</div>
			</div>

			<!-- Description -->
			<p class="mb-6 flex-grow text-sm text-gray-600">
				Paiements automatiques avec Stripe Connect. Les commandes sont confirmées automatiquement dès le paiement.
			</p>

			<!-- Bouton Connecter ou état connecté -->
			{#if stripeConnectAccount?.is_active && stripeConnectAccount?.charges_enabled}
				<Button
					type="button"
					variant="outline"
					class="mb-2 w-full"
				>
					<Check class="mr-2 h-4 w-4 text-indigo-600" />
					Configuré
				</Button>
			{:else}
				<Button
					type="button"
					on:click={() => {
						showPaypalForm = false; // Fermer PayPal
						showRevolutForm = false; // Fermer Revolut
						showStripeInfo = !showStripeInfo; // Toggle Stripe
					}}
					class="mb-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white"
				>
					Configurer
				</Button>
			{/if}
		</div>

		<!-- Formulaire Stripe Mobile (dans le même conteneur, juste après la carte Stripe) -->
		<div class="md:hidden" style="order: {showStripeInfo ? 6 : 999};">
			<Collapsible.Root bind:open={showStripeInfo}>
				<Collapsible.Content class="mt-0">
					<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold text-gray-900">Stripe</h3>
							<span class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
								Automatique
							</span>
						</div>

						{#if stripeConnectAccount?.is_active && stripeConnectAccount?.charges_enabled}
							<div class="rounded-lg border border-green-200 bg-green-50 p-3">
								<div class="flex items-start gap-2">
									<Check class="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
									<div class="flex-1">
										<p class="text-sm font-medium text-green-800">
											Votre compte Stripe est connecté et actif
										</p>
										<p class="mt-1 text-xs text-green-700">
											Les paiements sont traités automatiquement
										</p>
									</div>
								</div>
							</div>
						{:else}
							<!-- Informations importantes sur Stripe -->
							<Alert class="border-indigo-200 bg-white">
								<AlertCircle class="h-4 w-4 text-indigo-600" />
								<AlertDescription class="text-sm text-indigo-900">
									<div class="space-y-2">
										<p class="font-medium">⚡ Paiement automatique</p>
										<p>
											Avec Stripe, les commandes sont confirmées automatiquement dès le paiement.
											Plus besoin de vérifier manuellement les paiements PayPal/Revolut.
										</p>
										<div class="rounded-lg bg-indigo-50 p-2 text-xs">
											<p class="font-medium text-indigo-900 mb-1">📋 À savoir :</p>
											<ul class="list-disc list-inside space-y-1 text-indigo-800">
												<li>Les fonds arrivent sur votre compte bancaire sous 3-7 jours ouvrables (jusqu'à 10 jours pour le premier paiement)</li>
												<li>Frais de transaction : 1,4% + 0,25€ par paiement</li>
												<li>Vous pouvez utiliser Stripe en complément de PayPal/Revolut</li>
											</ul>
										</div>
									</div>
								</AlertDescription>
							</Alert>

							<Button 
								type="button"
								on:click={handleConnectStripe}
								disabled={stripeLoading}
								class="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
							>
								{#if stripeLoading}
									<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
									Connexion en cours...
								{:else}
									Connecter mon compte Stripe
								{/if}
							</Button>
						{/if}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>
	</div>

	<!-- Section formulaires Desktop (visible uniquement sur desktop) -->
	<div class="hidden md:block md:mt-4 md:space-y-4">
		<!-- Formulaire PayPal Desktop -->
		<Collapsible.Root bind:open={showPaypalForm}>
			<Collapsible.Content>
				<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-gray-900">PayPal.me</h3>
						<span class="text-xs text-gray-500">Optionnel</span>
					</div>

					<!-- Guide PayPal.me (Collapsible) -->
					<Collapsible.Root bind:open={isPaypalGuideOpen}>
						<Collapsible.Trigger
							class="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-100"
						>
							<h4 class="text-sm font-medium text-gray-900">
								Comment trouver votre nom PayPal.me ?
							</h4>
							<ChevronDown
								class="h-4 w-4 text-gray-600 transition-transform duration-200"
								style="transform: rotate({isPaypalGuideOpen ? 180 : 0}deg)"
							/>
						</Collapsible.Trigger>
						<Collapsible.Content
							class="mt-2 rounded-lg border border-gray-200 bg-white p-4"
						>
							<div class="space-y-3 text-sm text-gray-700">
								<div>
									<p class="mb-2 font-medium text-gray-900">
										Si vous n'avez pas encore de lien PayPal.me :
									</p>
									<p>
										1. Créez votre lien sur <a
											href="https://www.paypal.com/paypalme/"
											target="_blank"
											class="inline-flex items-center font-medium text-blue-600 hover:text-blue-800"
										>
											paypal.com/paypalme <ExternalLink class="ml-1 h-3 w-3" />
										</a>
									</p>
									<p class="mt-1">2. Choisissez votre nom unique (ex: @monnom)</p>
								</div>

								<div class="border-t border-gray-300 pt-3">
									<p class="mb-2 font-medium text-gray-900">
										Si vous avez déjà un lien PayPal.me :
									</p>
									<p>
										1. Connectez-vous sur <a
											href="https://paypal.com"
											target="_blank"
											class="inline-flex items-center text-blue-600 hover:text-blue-800"
										>
											paypal.com <ExternalLink class="ml-1 h-3 w-3" />
										</a>
									</p>
									<p class="mt-1">
										2. Allez dans <strong>Paramètres du compte</strong> →
										<strong>Informations de l'entreprise</strong>
									</p>
									<p class="mt-1">3. Trouvez votre <strong>Nom PayPal.me</strong></p>
								</div>
							</div>
						</Collapsible.Content>
					</Collapsible.Root>

					<Form.Field {form} name="paypal_me">
						<Form.Control let:attrs>
							<Form.Label>Votre nom PayPal.me</Form.Label>
							<div class="flex items-center space-x-2">
								<span class="text-sm text-muted-foreground">@</span>
								<Input
									{...attrs}
									type="text"
									placeholder="votre-nom"
									bind:value={$formData.paypal_me}
									class="flex-1"
								/>
							</div>
						</Form.Control>
						<Form.FieldErrors />
						<Form.Description>
							Entrez votre nom PayPal.me sans le @. Exemple: si votre lien est @monnom,
							tapez "monnom"
						</Form.Description>
					</Form.Field>

					<!-- Aperçu du lien PayPal -->
					{#if $formData.paypal_me && $formData.paypal_me.trim() !== ''}
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
							<h4 class="mb-2 text-sm font-medium text-blue-900">Aperçu de votre lien :</h4>
							<a
								href="https://paypal.me/{$formData.paypal_me}"
								target="_blank"
								rel="noopener noreferrer"
								class="block rounded bg-white px-3 py-2 font-mono text-sm text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-900"
							>
								paypal.me/{$formData.paypal_me}
								<ExternalLink class="ml-1 inline h-3 w-3" />
							</a>
							<p class="mt-2 text-xs text-blue-700">
								👆 Cliquez sur le lien pour vérifier qu'il fonctionne avant de continuer
							</p>
						</div>
					{/if}

					<!-- Bouton Enregistrer PayPal -->
					<form
						method="POST"
						action="?/updatePaypal"
						use:enhance={({ formData: _formData, cancel: _cancel }) => {
							paypalSubmitting = true;
							return async ({ result, update }) => {
								paypalSubmitting = false;
								if (result.type === 'success') {
									paypalSubmitted = true;
									setTimeout(() => {
										paypalSubmitted = false;
									}, 2000);
									await invalidateAll();
								}
								await update();
							};
						}}
					>
						<input type="hidden" name="paypal_me" value={$formData.paypal_me || ''} />
						<Button
							type="submit"
							disabled={paypalSubmitting || paypalSubmitted}
							class={`mt-4 h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
								paypalSubmitted
									? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
									: paypalSubmitting
										? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
										: 'bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50'
							}`}
						>
							{#if paypalSubmitting}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								Enregistrement...
							{:else if paypalSubmitted}
								<Check class="mr-2 h-4 w-4" />
								Sauvegardé !
							{:else}
								Enregistrer PayPal
							{/if}
						</Button>
					</form>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		<!-- Formulaire Revolut Desktop -->
		<Collapsible.Root bind:open={showRevolutForm}>
			<Collapsible.Content>
				<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-gray-900">Revolut</h3>
						<span class="text-xs text-gray-500">Optionnel</span>
					</div>

					<Form.Field {form} name="revolut_me">
						<Form.Control let:attrs>
							<Form.Label>Votre identifiant Revolut</Form.Label>
							<div class="flex items-center space-x-2">
								<span class="text-sm text-muted-foreground">@</span>
								<Input
									{...attrs}
									type="text"
									placeholder="votre-identifiant"
									bind:value={$formData.revolut_me}
									class="flex-1"
								/>
							</div>
						</Form.Control>
						<Form.FieldErrors />
						<Form.Description>
							Entrez votre identifiant Revolut (ex: @votre-nom). Vous pouvez le trouver dans l'application Revolut.
						</Form.Description>
					</Form.Field>

					<!-- Aperçu du lien Revolut -->
					{#if $formData.revolut_me && $formData.revolut_me.trim() !== ''}
						<div class="rounded-lg border border-purple-200 bg-purple-50 p-3">
							<h4 class="mb-2 text-sm font-medium text-purple-900">Aperçu de votre lien :</h4>
							<a
								href="https://revolut.me/{$formData.revolut_me}"
								target="_blank"
								rel="noopener noreferrer"
								class="block rounded bg-white px-3 py-2 font-mono text-sm text-purple-600 transition-colors hover:bg-purple-100 hover:text-purple-900"
							>
								revolut.me/{$formData.revolut_me}
								<ExternalLink class="ml-1 inline h-3 w-3" />
							</a>
							<p class="mt-2 text-xs text-purple-700">
								👆 Cliquez sur le lien pour vérifier qu'il fonctionne avant de continuer
							</p>
						</div>
					{/if}

					<!-- Bouton Enregistrer Revolut -->
					<form
						method="POST"
						action="?/updateRevolut"
						use:enhance={({ formData: _formData, cancel: _cancel }) => {
							revolutSubmitting = true;
							return async ({ result, update }) => {
								revolutSubmitting = false;
								if (result.type === 'success') {
									revolutSubmitted = true;
									setTimeout(() => {
										revolutSubmitted = false;
									}, 2000);
									await invalidateAll();
								}
								await update();
							};
						}}
					>
						<input type="hidden" name="revolut_me" value={$formData.revolut_me || ''} />
						<Button
							type="submit"
							disabled={revolutSubmitting || revolutSubmitted}
							class={`mt-4 h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
								revolutSubmitted
									? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
									: revolutSubmitting
										? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
										: 'bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50'
							}`}
						>
							{#if revolutSubmitting}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								Enregistrement...
							{:else if revolutSubmitted}
								<Check class="mr-2 h-4 w-4" />
								Sauvegardé !
							{:else}
								Enregistrer Revolut
							{/if}
						</Button>
					</form>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		<!-- Informations Stripe Desktop (Collapsible) -->
		<Collapsible.Root bind:open={showStripeInfo}>
			<Collapsible.Content>
				<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-gray-900">Stripe</h3>
						<span class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
							Automatique
						</span>
					</div>

					{#if stripeConnectAccount?.is_active && stripeConnectAccount?.charges_enabled}
						<div class="rounded-lg border border-green-200 bg-green-50 p-3">
							<div class="flex items-start gap-2">
								<Check class="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
								<div class="flex-1">
									<p class="text-sm font-medium text-green-800">
										Votre compte Stripe est connecté et actif
									</p>
									<p class="mt-1 text-xs text-green-700">
										Les paiements sont traités automatiquement
									</p>
								</div>
							</div>
						</div>
					{:else}
						<!-- Informations importantes sur Stripe -->
						<Alert class="border-indigo-200 bg-white">
							<AlertCircle class="h-4 w-4 text-indigo-600" />
							<AlertDescription class="text-sm text-indigo-900">
								<div class="space-y-2">
									<p class="font-medium">⚡ Paiement automatique</p>
									<p>
										Avec Stripe, les commandes sont confirmées automatiquement dès le paiement.
										Plus besoin de vérifier manuellement les paiements PayPal/Revolut.
									</p>
									<div class="rounded-lg bg-indigo-50 p-2 text-xs">
										<p class="font-medium text-indigo-900 mb-1">📋 À savoir :</p>
										<ul class="list-disc list-inside space-y-1 text-indigo-800">
											<li>Les fonds arrivent sur votre compte bancaire sous 3-7 jours ouvrables (jusqu'à 10 jours pour le premier paiement)</li>
											<li>Frais de transaction : 1,4% + 0,25€ par paiement</li>
											<li>Vous pouvez utiliser Stripe en complément de PayPal/Revolut</li>
										</ul>
									</div>
								</div>
							</AlertDescription>
						</Alert>

						<Button 
							type="button"
							on:click={handleConnectStripe}
							disabled={stripeLoading}
							class="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
						>
							{#if stripeLoading}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								Connexion en cours...
							{:else}
								Connecter mon compte Stripe
							{/if}
						</Button>
					{/if}
				</div>
			</Collapsible.Content>
		</Collapsible.Root>
	</div>

</div>
