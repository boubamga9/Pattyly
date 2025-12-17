<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { AlertTriangle, ExternalLink, ChevronDown } from 'lucide-svelte';
	import { paymentConfigSchema } from './schema';
	import { createEventDispatcher } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	export let data: any;

	const dispatch = createEventDispatcher();

	// Create a form for payment configuration (PayPal and/or Revolut)
	const form = superForm(data, {
		validators: zodClient(paymentConfigSchema),
	});

	const { form: formData, enhance, submitting, message } = form;

	$: if (message) {
		dispatch('message', message);
	}

	let isPaypalGuideOpen = false;
</script>

<form
	method="POST"
	action="?/createPaymentLinks"
	use:enhance={{
		onResult: async ({ result }) => {
			if (result.type === 'success' && result.data?.success) {
				// Recharger la page pour que le serveur détecte le changement d'état
				await invalidateAll();
			}
		}
	}}
	class="space-y-6"
>
	<Form.Errors {form} />

	<!-- Information importante -->
	<Alert class="border-orange-200 bg-orange-50">
		<AlertTriangle class="h-4 w-4 !text-orange-600" />
		<AlertDescription class="text-orange-800">
			<strong>Important :</strong> Vous devez configurer au moins une méthode de paiement pour continuer.
			Vous pouvez configurer les deux si vous le souhaitez.
		</AlertDescription>
	</Alert>

	<!-- Section PayPal -->
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

	<!-- Section Revolut -->
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

	<Form.Button type="submit" class="w-full" disabled={$submitting}>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Enregistrement...
		{:else}
			Continuer
		{/if}
	</Form.Button>

	<div class="text-center">
		<p class="text-xs text-muted-foreground">
			En continuant, vous acceptez que vos identifiants de paiement soient utilisés pour
			recevoir les paiements
		</p>
	</div>
</form>

