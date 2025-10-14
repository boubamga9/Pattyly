<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { AlertTriangle, ExternalLink, ChevronDown } from 'lucide-svelte';
	import { paypalConfigSchema } from './schema';
	import { createEventDispatcher } from 'svelte';

	export let data: any; // We'll handle the form data manually for step 2

	const dispatch = createEventDispatcher();

	// Create a form for PayPal configuration only
	const form = superForm(data, {
		validators: zodClient(paypalConfigSchema),
	});

	const { form: formData, enhance, submitting, message } = form;

	$: if (message) {
		dispatch('message', message);
	}

	let isGuideOpen = false;
</script>

<form method="POST" action="?/createPaymentLink" use:enhance class="space-y-6">
	<Form.Errors {form} />

	<!-- Information importante -->
	<Alert class="border-orange-200 bg-orange-50">
		<AlertTriangle class="h-4 w-4 !text-orange-600" />
		<AlertDescription class="text-orange-800">
			<strong>Important :</strong> Votre nom PayPal.me sera utilisé pour recevoir
			les paiements. Assurez-vous qu'il soit correct car il ne pourra pas être modifié
			après validation.
		</AlertDescription>
	</Alert>

	<!-- Guide PayPal.me (Collapsible) -->
	<Collapsible.Root bind:open={isGuideOpen}>
		<Collapsible.Trigger
			class="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 transition-colors hover:bg-gray-100"
		>
			<h3 class="font-medium text-gray-900">
				Comment trouver votre nom PayPal.me ?
			</h3>
			<ChevronDown
				class="h-4 w-4 text-gray-600 transition-transform duration-200"
				style="transform: rotate({isGuideOpen ? 180 : 0}deg)"
			/>
		</Collapsible.Trigger>
		<Collapsible.Content
			class="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4"
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
					required
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

	<!-- Aperçu du lien -->
	{#if $formData.paypal_me}
		<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
			<h4 class="mb-2 font-medium text-blue-900">Aperçu de votre lien :</h4>
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

	<Form.Button type="submit" class="w-full" disabled={$submitting}>
		{#if $submitting}
			<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
			Création du lien de paiement...
		{:else}
			Finaliser la configuration
		{/if}
	</Form.Button>

	<div class="text-center">
		<p class="text-xs text-muted-foreground">
			En continuant, vous acceptez que votre nom PayPal.me soit utilisé pour
			recevoir les paiements
		</p>
	</div>
</form>
