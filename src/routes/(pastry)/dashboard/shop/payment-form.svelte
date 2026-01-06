<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { ExternalLink, ChevronDown, Check, AlertCircle, Trash2, X } from 'lucide-svelte';
	import { paymentConfigSchema } from '../../../onboarding/schema';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export let data: any;
	export let stripeConnectAccount: {
		id: string;
		is_active: boolean;
		charges_enabled: boolean;
		payouts_enabled: boolean;
		stripe_account_id: string;
	} | null | undefined = null;

	// Créer 3 formulaires indépendants avec des IDs uniques pour éviter les effets de bord
	// Chaque formulaire est isolé et ne met à jour que son propre état
	// Note: data est déjà data.paymentForm (passé depuis +page.svelte)
	// Désactiver la validation en temps réel pour éviter que les boutons changent d'état pendant la saisie
	// Utiliser validators pour permettre l'affichage des erreurs (comme shop-form.svelte)
	const paypalForm = superForm(data, {
		id: 'paypal-payment-form',
		validators: zodClient(paymentConfigSchema),
	});

	const revolutForm = superForm(data, {
		id: 'revolut-payment-form',
		validators: zodClient(paymentConfigSchema),
	});

	const weroForm = superForm(data, {
		id: 'wero-payment-form',
		validators: zodClient(paymentConfigSchema),
	});

	// Extraire les données et enhance de chaque formulaire
	const { form: paypalFormData, enhance: paypalEnhance } = paypalForm;
	const { form: revolutFormData, enhance: revolutEnhance } = revolutForm;
	const { form: weroFormData, enhance: weroEnhance } = weroForm;

	// Pour l'affichage des erreurs globales, utiliser le premier formulaire
	const form = paypalForm;

	// Stocker les valeurs initiales depuis le serveur pour déterminer si c'est "Configuré"
	// Ces valeurs viennent de la base de données et indiquent si le moyen de paiement est réellement sauvegardé
	// Variables locales pour éviter de recharger toute la page (performance)
	let initialPaypal = data.data?.paypal_me || '';
	let initialRevolut = data.data?.revolut_me || '';
	let initialWero = data.data?.wero_me || '';

	let isPaypalGuideOpen = false;
	let paypalSubmitted = false;
	let paypalSubmitting = false;
	let revolutSubmitted = false;
	let revolutSubmitting = false;
	let weroSubmitted = false;
	let weroSubmitting = false;
	let stripeLoading = false;
	let stripeUpdateLoading = false;
	let showPaypalForm = false;
	let showRevolutForm = false;
	let showWeroForm = false;
	let showStripeInfo = false;
	let confirmingDeleteProvider: string | null = null;

	function startDeleteConfirmation(provider: string) {
		confirmingDeleteProvider = provider;
	}

	function cancelDeleteConfirmation() {
		confirmingDeleteProvider = null;
	}

	// Helper function to parse SvelteKit action response
	// SvelteKit uses a special serialization format: [{"key":index}, value1, value2, ...]
	function parseSvelteKitActionResponse(data: unknown): { success?: boolean; url?: string; error?: string } | null {
		if (!data) return null;
		
		// If it's already a plain object, return it
		if (typeof data === 'object' && !Array.isArray(data) && 'success' in data) {
			return data as { success?: boolean; url?: string; error?: string };
		}
		
		// If it's an array with the SvelteKit format: [{"success":1,"url":2}, true, "https://..."]
		if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
			const refObj = data[0] as Record<string, number>;
			const result: { success?: boolean; url?: string; error?: string } = {};
			
			// Extract values using the indices
			if ('success' in refObj && typeof refObj.success === 'number') {
				result.success = data[refObj.success] as boolean;
			}
			if ('url' in refObj && typeof refObj.url === 'number') {
				result.url = data[refObj.url] as string;
			}
			if ('error' in refObj && typeof refObj.error === 'number') {
				result.error = data[refObj.error] as string;
			}
			
			return result;
		}
		
		return null;
	}

	async function handleConnectStripe() {
		stripeLoading = true;
		try {
			const formData = new FormData();
			const response = await fetch('?/connectStripe', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			
			// result.data might be a JSON string, parse it first
			let parsedData = result.data;
			if (typeof parsedData === 'string') {
				try {
					parsedData = JSON.parse(parsedData);
				} catch {
					// If parsing fails, use the string as-is
				}
			}
			
			// Parse SvelteKit action response (handles both plain objects and serialized format)
			const actionData = parseSvelteKitActionResponse(parsedData);
			
			if (actionData?.success && actionData?.url && typeof actionData.url === 'string' && actionData.url.startsWith('http')) {
				window.location.href = actionData.url;
			} else {
				const errorMessage = actionData?.error || 'Erreur lors de la connexion Stripe';
				console.error('Error connecting Stripe:', errorMessage, result);
				alert(errorMessage);
				stripeLoading = false;
			}
		} catch (err) {
			console.error('Error connecting Stripe:', err);
			alert('Erreur lors de la connexion Stripe. Veuillez réessayer.');
			stripeLoading = false;
		}
	}

	async function handleUpdateStripeAccount() {
		stripeUpdateLoading = true;
		try {
			const formData = new FormData();
			const response = await fetch('?/updateStripeAccount', {
				method: 'POST',
				body: formData
			});
			const result = await response.json();
			
			// result.data might be a JSON string, parse it first
			let parsedData = result.data;
			if (typeof parsedData === 'string') {
				try {
					parsedData = JSON.parse(parsedData);
				} catch {
					// If parsing fails, use the string as-is
				}
			}
			
			// Parse SvelteKit action response (handles both plain objects and serialized format)
			const actionData = parseSvelteKitActionResponse(parsedData);
			
			if (actionData?.success && actionData?.url && typeof actionData.url === 'string' && actionData.url.startsWith('http')) {
				window.location.href = actionData.url;
			} else {
				const errorMessage = actionData?.error || 'Erreur lors de la mise à jour du compte Stripe';
				console.error('Error updating Stripe account:', errorMessage, result);
					alert(errorMessage);
					stripeUpdateLoading = false;
			}
		} catch (err) {
			console.error('Error updating Stripe account:', err);
			alert('Une erreur est survenue lors de la mise à jour du compte Stripe. Veuillez réessayer.');
			stripeUpdateLoading = false;
		}
	}
</script>


<div class="space-y-6">
	<Form.Errors {form} />

	<!-- Information importante -->
	<Alert class="border-blue-200 bg-blue-50">
		<AlertDescription class="text-blue-800">
			<strong>Astuce :</strong> Configurez au moins une méthode de paiement. Vous pouvez configurer les deux si vous le souhaitez.
		</AlertDescription>
	</Alert>

	<!-- Section cartes sur desktop, cartes + formulaires sur mobile -->
	<div class="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-4">
		<!-- Carte PayPal -->
		<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:col-span-1" style="order: 1;">
			<!-- Logo PayPal -->
			<div class="mb-4">
				<div class="flex items-center justify-between">
					<img src="/payments_logo/paypal_logo.svg" alt="PayPal" class="h-5 w-auto" />
					<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
						Manuel
					</span>
				</div>
			</div>

			<!-- Description -->
			<p class="mb-6 flex-grow text-sm text-gray-600">
				Recevez les paiements via PayPal.me. Les clients peuvent vous payer rapidement et facilement.
			</p>

			<!-- Bouton Connecter ou état connecté -->
			{#if initialPaypal && initialPaypal.trim() !== ''}
				<Button
					type="button"
					variant="outline"
					on:click={() => {
						showRevolutForm = false; // Fermer Revolut
						showWeroForm = false; // Fermer Wero
						showStripeInfo = false; // Fermer Stripe
						showPaypalForm = !showPaypalForm; // Toggle PayPal
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
					showRevolutForm = false; // Fermer Revolut
					showWeroForm = false; // Fermer Wero
					showStripeInfo = false; // Fermer Stripe
					showPaypalForm = true; // Ouvrir PayPal
				}}
				class="mb-2 w-full bg-gray-600 hover:bg-gray-700 text-white"
			>
				Connecter
			</Button>
			{/if}
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

						<Form.Field form={paypalForm} name="paypal_me">
							<Form.Control let:attrs>
								<Form.Label>Votre nom PayPal.me</Form.Label>
								<div class="flex items-center space-x-2">
									<span class="text-sm text-muted-foreground">@</span>
									<Input
										{...attrs}
										type="text"
										placeholder="votre-nom"
										bind:value={$paypalFormData.paypal_me}
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
						{#if $paypalFormData.paypal_me && $paypalFormData.paypal_me.trim() !== ''}
							<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
								<h4 class="mb-2 text-sm font-medium text-blue-900">Aperçu de votre lien :</h4>
								<a
									href="https://paypal.me/{$paypalFormData.paypal_me.replace(/^@/, '')}"
									target="_blank"
									rel="noopener noreferrer"
									class="block rounded bg-white px-3 py-2 font-mono text-sm text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-900"
								>
									paypal.me/{$paypalFormData.paypal_me.replace(/^@/, '')}
									<ExternalLink class="ml-1 inline h-3 w-3" />
								</a>
								<p class="mt-2 text-xs text-blue-700">
									👆 Cliquez sur le lien pour vérifier qu'il fonctionne
								</p>
							</div>
						{/if}

						<!-- Boutons Enregistrer et Supprimer PayPal -->
						<div class="flex gap-2">
						<form
							method="POST"
							action="?/updatePaypal"
							use:paypalEnhance={{
								onResult: ({ result }) => {
									paypalSubmitting = false;
									// Ne fermer le formulaire QUE si la validation a réussi ET qu'il y a un message de succès
									if (result.type === 'success' && result.data?.form?.message) {
										// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
										initialPaypal = result.data.form.data?.paypal_me || '';
										paypalSubmitted = true;
										showPaypalForm = false; // Fermer le formulaire après succès
										setTimeout(() => {
											paypalSubmitted = false;
										}, 2000);
									}
									// En cas d'erreur (pas de message), le formulaire reste ouvert pour afficher les erreurs
								},
								onUpdate: ({ form: _form }) => {
									// Superforms met automatiquement à jour les erreurs ici
									// Les erreurs sont disponibles dans _form.errors
								},
								onSubmit: () => {
									paypalSubmitting = true;
								}
							}}
								class="flex-1"
						>
								<input type="hidden" name="paypal_me" value={$paypalFormData.paypal_me || ''} />
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
							{#if initialPaypal && initialPaypal.trim() !== ''}
								{#if confirmingDeleteProvider === 'paypal'}
									<div class="flex gap-2">
										<form
											method="POST"
											action="?/updatePaypal"
											use:paypalEnhance={{
												onResult: ({ result }) => {
													paypalSubmitting = false;
													if (result.type === 'success') {
														// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
														initialPaypal = '';
														confirmingDeleteProvider = null;
														showPaypalForm = false; // Fermer le formulaire après suppression
													}
												},
												onUpdate: ({ form: _form }) => {
													// Superforms met automatiquement à jour les erreurs ici
												},
												onSubmit: () => {
													paypalSubmitting = true;
												}
											}}
										>
											<input type="hidden" name="paypal_me" value="" />
											<Button
												type="submit"
												disabled={paypalSubmitting || paypalSubmitted}
												variant="ghost"
												size="sm"
												class="mt-4 bg-red-600 text-white hover:bg-red-700 hover:text-white disabled:opacity-50"
												title="Confirmer la suppression"
											>
												<Check class="h-4 w-4" />
											</Button>
										</form>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											on:click={cancelDeleteConfirmation}
											class="mt-4"
											title="Annuler la suppression"
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								{:else}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700"
										on:click={() => startDeleteConfirmation('paypal')}
										title="Supprimer PayPal"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							{/if}
						</div>
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>

		<!-- Carte Revolut -->
		<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:col-span-1" style="order: 3;">
			<!-- Logo Revolut -->
			<div class="mb-4">
				<div class="flex items-center justify-between">
					<img src="/payments_logo/revolut_logo.svg" alt="Revolut" class="h-4 w-auto" />
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
			{#if initialRevolut && initialRevolut.trim() !== ''}
				<Button
					type="button"
					variant="outline"
					on:click={() => {
						if (showRevolutForm) {
							showRevolutForm = false; // Fermer si ouvert
						} else {
						showPaypalForm = false; // Fermer PayPal
							showWeroForm = false; // Fermer Wero
						showStripeInfo = false; // Fermer Stripe
							showRevolutForm = true; // Ouvrir Revolut
						}
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
					showWeroForm = false; // Fermer Wero
					showStripeInfo = false; // Fermer Stripe
					showRevolutForm = true; // Ouvrir Revolut
				}}
				class="mb-2 w-full bg-gray-600 hover:bg-gray-700 text-white"
			>
				Connecter
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

						<Form.Field form={revolutForm} name="revolut_me">
							<Form.Control let:attrs>
								<Form.Label>Votre identifiant Revolut</Form.Label>
								<div class="flex items-center space-x-2">
									<span class="text-sm text-muted-foreground">@</span>
									<Input
										{...attrs}
										type="text"
										placeholder="votre-identifiant"
										bind:value={$revolutFormData.revolut_me}
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
						{#if $revolutFormData.revolut_me && $revolutFormData.revolut_me.trim() !== ''}
							<div class="rounded-lg border border-purple-200 bg-purple-50 p-3">
								<h4 class="mb-2 text-sm font-medium text-purple-900">Aperçu de votre lien :</h4>
								<a
									href="https://revolut.me/{$revolutFormData.revolut_me.replace(/^@/, '')}"
									target="_blank"
									rel="noopener noreferrer"
									class="block rounded bg-white px-3 py-2 font-mono text-sm text-purple-600 transition-colors hover:bg-purple-100 hover:text-purple-900"
								>
									revolut.me/{$revolutFormData.revolut_me.replace(/^@/, '')}
									<ExternalLink class="ml-1 inline h-3 w-3" />
								</a>
								<p class="mt-2 text-xs text-purple-700">
									👆 Cliquez sur le lien pour vérifier qu'il fonctionne
								</p>
							</div>
						{/if}

						<!-- Boutons Enregistrer et Supprimer Revolut -->
						<div class="flex gap-2">
							<form
								method="POST"
								action="?/updateRevolut"
								use:revolutEnhance={{
									onResult: ({ result }) => {
										revolutSubmitting = false;
										// Ne fermer le formulaire QUE si la validation a réussi ET qu'il y a un message de succès
										if (result.type === 'success' && result.data?.form?.message) {
											// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
											initialRevolut = result.data.form.data?.revolut_me || '';
											revolutSubmitted = true;
											showRevolutForm = false; // Fermer le formulaire après succès
											setTimeout(() => {
												revolutSubmitted = false;
											}, 2000);
										}
										// En cas d'erreur (pas de message), le formulaire reste ouvert pour afficher les erreurs
									},
								onUpdate: ({ form: _form }) => {
									// Superforms met automatiquement à jour les erreurs ici
								},
									onSubmit: () => {
										revolutSubmitting = true;
									}
								}}
								class="flex-1"
							>
								<input type="hidden" name="revolut_me" value={$revolutFormData.revolut_me || ''} />
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
							{#if initialRevolut && initialRevolut.trim() !== ''}
								{#if confirmingDeleteProvider === 'revolut'}
									<div class="flex gap-2">
										<form
											method="POST"
											action="?/updateRevolut"
											use:revolutEnhance={{
												onResult: ({ result }) => {
													revolutSubmitting = false;
													if (result.type === 'success') {
														// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
														initialRevolut = '';
														confirmingDeleteProvider = null;
														showRevolutForm = false; // Fermer le formulaire après suppression
													}
												},
								onUpdate: ({ form: _form }) => {
									// Superforms met automatiquement à jour les erreurs ici
								},
												onSubmit: () => {
													revolutSubmitting = true;
												}
											}}
										>
											<input type="hidden" name="revolut_me" value="" />
											<Button
												type="submit"
												disabled={revolutSubmitting || revolutSubmitted}
												variant="ghost"
												size="sm"
												class="mt-4 bg-red-600 text-white hover:bg-red-700 hover:text-white disabled:opacity-50"
												title="Confirmer la suppression"
											>
												<Check class="h-4 w-4" />
											</Button>
										</form>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											on:click={cancelDeleteConfirmation}
											class="mt-4"
											title="Annuler la suppression"
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								{:else}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700"
										on:click={() => startDeleteConfirmation('revolut')}
										title="Supprimer Revolut"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							{/if}
						</div>
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>

		<!-- Carte Wero -->
		<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:col-span-1" style="order: 4;">
			<!-- Logo Wero -->
			<div class="mb-4">
				<div class="flex items-center justify-between">
					<img src="/payments_logo/wero_logo.svg" alt="Wero" class="h-5 w-auto" />
					<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
						Manuel
					</span>
				</div>
			</div>

			<!-- Description -->
			<p class="mb-6 flex-grow text-sm text-gray-600">
				Acceptez les paiements instantanés via Wero. Paiement sécurisé en quelques secondes.
			</p>

			<!-- Bouton Connecter ou état connecté -->
			{#if initialWero && initialWero.trim() !== ''}
				<Button
					type="button"
					variant="outline"
					on:click={() => {
						if (showWeroForm) {
							showWeroForm = false; // Fermer si ouvert
						} else {
							showPaypalForm = false;
							showRevolutForm = false;
							showStripeInfo = false;
							showWeroForm = true; // Ouvrir Wero
						}
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
					showPaypalForm = false;
					showRevolutForm = false;
					showStripeInfo = false;
					showWeroForm = true;
				}}
				class="mb-2 w-full bg-gray-600 hover:bg-gray-700 text-white"
			>
				Connecter
			</Button>
			{/if}
		</div>

		<!-- Formulaire Wero Mobile -->
		<div class="md:hidden" style="order: {showWeroForm ? 5 : 999};">
			<Collapsible.Root bind:open={showWeroForm}>
				<Collapsible.Content class="mt-0">
					<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
						<div class="flex items-center justify-between">
							<h3 class="font-semibold text-gray-900">Wero</h3>
							<span class="text-xs text-gray-500">Optionnel</span>
						</div>
						<Form.Field form={weroForm} name="wero_me">
							<Form.Control let:attrs>
								<Form.Label>Votre identifiant Wero</Form.Label>
								<Input
									{...attrs}
									type="text"
									placeholder="email@example.com ou +33612345678"
									bind:value={$weroFormData.wero_me}
									class="h-10"
								/>
							</Form.Control>
							<Form.FieldErrors />
							<Form.Description>
								Entrez votre email ou numéro de téléphone associé à Wero.
							</Form.Description>
						</Form.Field>
						<!-- Boutons Enregistrer et Supprimer Wero -->
						<div class="flex gap-2">
							<form
								method="POST"
								action="?/updateWero"
								use:weroEnhance={{
									onResult: ({ result }) => {
										weroSubmitting = false;
										// Ne fermer le formulaire QUE si la validation a réussi ET qu'il y a un message de succès
										if (result.type === 'success' && result.data?.form?.message) {
											// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
											initialWero = result.data.form.data?.wero_me || '';
											weroSubmitted = true;
											showWeroForm = false; // Fermer le formulaire après succès
											setTimeout(() => {
												weroSubmitted = false;
											}, 2000);
										}
										// En cas d'erreur (pas de message), le formulaire reste ouvert pour afficher les erreurs
									},
								onUpdate: ({ form: _form }) => {
									// Superforms met automatiquement à jour les erreurs ici
								},
									onSubmit: () => {
										weroSubmitting = true;
									}
								}}
								class="flex-1"
							>
								<input type="hidden" name="wero_me" value={$weroFormData.wero_me || ''} />
								<Button
									type="submit"
									disabled={weroSubmitting || weroSubmitted}
									class={`mt-4 h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
										weroSubmitted
											? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
											: weroSubmitting
												? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
												: 'bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50'
									}`}
								>
									{#if weroSubmitting}
										<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
										Enregistrement...
									{:else if weroSubmitted}
										<Check class="mr-2 h-4 w-4" />
										Sauvegardé !
									{:else}
										Enregistrer Wero
									{/if}
								</Button>
							</form>
							{#if initialWero && initialWero.trim() !== ''}
								{#if confirmingDeleteProvider === 'wero'}
									<div class="flex gap-2">
										<form
											method="POST"
											action="?/updateWero"
											use:weroEnhance={{
												onResult: ({ result }) => {
													weroSubmitting = false;
													if (result.type === 'success') {
														// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
														initialWero = '';
														confirmingDeleteProvider = null;
														showWeroForm = false; // Fermer le formulaire après suppression
													}
												},
								onUpdate: ({ form: _form }) => {
									// Superforms met automatiquement à jour les erreurs ici
								},
												onSubmit: () => {
													weroSubmitting = true;
												}
											}}
										>
											<input type="hidden" name="wero_me" value="" />
											<Button
												type="submit"
												disabled={weroSubmitting || weroSubmitted}
												variant="ghost"
												size="sm"
												class="mt-4 bg-red-600 text-white hover:bg-red-700 hover:text-white disabled:opacity-50"
												title="Confirmer la suppression"
											>
												<Check class="h-4 w-4" />
											</Button>
										</form>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											on:click={cancelDeleteConfirmation}
											class="mt-4"
											title="Annuler la suppression"
										>
											<X class="h-4 w-4" />
										</Button>
									</div>
								{:else}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										class="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700"
										on:click={() => startDeleteConfirmation('wero')}
										title="Supprimer Wero"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							{/if}
						</div>
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>

		<!-- Carte Stripe -->
		<div class="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:col-span-1" style="order: 5;">
			<!-- Logo Stripe -->
			<div class="mb-4">
				<div class="flex items-center justify-between">
					<img src="/payments_logo/stripe_logo.svg" alt="Stripe" class="h-5 w-auto" />
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
			{#if stripeConnectAccount?.is_active}
				<Button
					type="button"
					variant="outline"
					on:click={() => {
						showPaypalForm = false; // Fermer PayPal
						showRevolutForm = false; // Fermer Revolut
						showWeroForm = false; // Fermer Wero
						showStripeInfo = !showStripeInfo; // Toggle Stripe
					}}
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
						showStripeInfo = true; // Ouvrir Stripe
					}}
					class="mb-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white"
				>
					Connecter
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

						{#if stripeConnectAccount?.is_active}
							<div class="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
								<div class="flex items-start gap-2">
									<Check class="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
									<div class="flex-1">
										<p class="text-sm font-medium text-indigo-800">
											Compte Stripe connecté
										</p>
										<p class="mt-1 text-xs text-indigo-700">
											Les paiements sont traités automatiquement
										</p>
									</div>
								</div>
							</div>

							<Button
								type="button"
								on:click={handleUpdateStripeAccount}
								disabled={stripeUpdateLoading}
								class="mt-4 h-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
							>
								{#if stripeUpdateLoading}
									<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
									Chargement...
								{:else}
									Gérer mon compte Stripe
								{/if}
							</Button>
						{:else}
							<Alert class="border-indigo-200 bg-white">
								<AlertCircle class="h-4 w-4 text-indigo-600" />
								<AlertDescription class="text-sm text-indigo-900">
									<div class="space-y-2">
										<p class="font-medium">⚡ Paiement automatique</p>
										<p>
											Les commandes sont confirmées automatiquement dès le paiement, sans vérification manuelle.
										</p>
										<div class="rounded-lg bg-indigo-50 p-2 text-xs">
											<p class="font-medium text-indigo-900 mb-1">📋 À savoir :</p>
											<ul class="list-disc list-inside space-y-1 text-indigo-800">
												<li>Les fonds arrivent sur votre compte bancaire sous 3-7 jours ouvrables (jusqu'à 10 jours pour le premier paiement)</li>
												<li>Frais de transaction : 1,4% + 0,25€ par paiement</li>
												<li>Utilisable en complément de PayPal/Revolut</li>
											</ul>
										</div>
									</div>
								</AlertDescription>
							</Alert>

							<Button
								type="button"
								on:click={handleConnectStripe}
								disabled={stripeLoading}
								class="mt-4 h-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
							>
								{#if stripeLoading}
									<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
									Connexion...
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

		<Form.Field form={paypalForm} name="paypal_me">
			<Form.Control let:attrs>
				<Form.Label>Votre nom PayPal.me</Form.Label>
				<div class="flex items-center space-x-2">
					<span class="text-sm text-muted-foreground">@</span>
					<Input
						{...attrs}
						type="text"
						placeholder="votre-nom"
						bind:value={$paypalFormData.paypal_me}
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
		{#if $paypalFormData.paypal_me && $paypalFormData.paypal_me.trim() !== ''}
			<div class="rounded-lg border border-blue-200 bg-blue-50 p-3">
				<h4 class="mb-2 text-sm font-medium text-blue-900">Aperçu de votre lien :</h4>
				<a
					href="https://paypal.me/{$paypalFormData.paypal_me.replace(/^@/, '')}"
					target="_blank"
					rel="noopener noreferrer"
					class="block rounded bg-white px-3 py-2 font-mono text-sm text-blue-600 transition-colors hover:bg-blue-100 hover:text-blue-900"
				>
					paypal.me/{$paypalFormData.paypal_me.replace(/^@/, '')}
					<ExternalLink class="ml-1 inline h-3 w-3" />
				</a>
				<p class="mt-2 text-xs text-blue-700">
					👆 Cliquez sur le lien pour vérifier qu'il fonctionne
				</p>
			</div>
		{/if}

		<!-- Boutons Enregistrer et Supprimer PayPal -->
		<div class="flex gap-2">
		<form
			method="POST"
			action="?/updatePaypal"
			use:paypalEnhance={{
				onResult: ({ result }) => {
					paypalSubmitting = false;
					// Ne fermer le formulaire QUE si la validation a réussi ET qu'il y a un message de succès
					if (result.type === 'success' && result.data?.form?.message) {
						// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
						initialPaypal = result.data.form.data?.paypal_me || '';
						paypalSubmitted = true;
						showPaypalForm = false; // Fermer le formulaire après succès
						setTimeout(() => {
							paypalSubmitted = false;
						}, 2000);
					}
					// En cas d'erreur (pas de message), le formulaire reste ouvert pour afficher les erreurs
				},
				onUpdate: ({ form: _form }) => {
					// Superforms met automatiquement à jour les erreurs ici
				},
				onSubmit: () => {
					paypalSubmitting = true;
				}
			}}
				class="flex-1"
		>
				<input type="hidden" name="paypal_me" value={$paypalFormData.paypal_me || ''} />
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
			{#if $paypalFormData.paypal_me && $paypalFormData.paypal_me.trim() !== ''}
				{#if confirmingDeleteProvider === 'paypal'}
					<div class="flex gap-2">
						<form
							method="POST"
							action="?/updatePaypal"
							use:paypalEnhance={{
								onResult: ({ result }) => {
									paypalSubmitting = false;
									if (result.type === 'success') {
										// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
										initialPaypal = '';
										confirmingDeleteProvider = null;
										showPaypalForm = false; // Fermer le formulaire après suppression
									}
								},
								onUpdate: ({ form: _form }) => {
									// Superforms met automatiquement à jour les erreurs ici
								},
								onSubmit: () => {
									paypalSubmitting = true;
								}
							}}
						>
							<input type="hidden" name="paypal_me" value="" />
							<Button
								type="submit"
								disabled={paypalSubmitting || paypalSubmitted}
								variant="ghost"
								size="sm"
								class="mt-4 bg-red-600 text-white hover:bg-red-700 hover:text-white disabled:opacity-50"
								title="Confirmer la suppression"
							>
								<Check class="h-4 w-4" />
							</Button>
						</form>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							on:click={cancelDeleteConfirmation}
							class="mt-4"
							title="Annuler la suppression"
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
				{:else}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700"
						on:click={() => startDeleteConfirmation('paypal')}
						title="Supprimer PayPal"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				{/if}
			{/if}
		</div>
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

		<Form.Field form={revolutForm} name="revolut_me">
			<Form.Control let:attrs>
				<Form.Label>Votre identifiant Revolut</Form.Label>
				<div class="flex items-center space-x-2">
					<span class="text-sm text-muted-foreground">@</span>
					<Input
						{...attrs}
						type="text"
						placeholder="votre-identifiant"
						bind:value={$revolutFormData.revolut_me}
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
		{#if $revolutFormData.revolut_me && $revolutFormData.revolut_me.trim() !== ''}
			<div class="rounded-lg border border-purple-200 bg-purple-50 p-3">
				<h4 class="mb-2 text-sm font-medium text-purple-900">Aperçu de votre lien :</h4>
				<a
					href="https://revolut.me/{$revolutFormData.revolut_me.replace(/^@/, '')}"
					target="_blank"
					rel="noopener noreferrer"
					class="block rounded bg-white px-3 py-2 font-mono text-sm text-purple-600 transition-colors hover:bg-purple-100 hover:text-purple-900"
				>
					revolut.me/{$revolutFormData.revolut_me.replace(/^@/, '')}
					<ExternalLink class="ml-1 inline h-3 w-3" />
				</a>
				<p class="mt-2 text-xs text-purple-700">
					👆 Cliquez sur le lien pour vérifier qu'il fonctionne
				</p>
			</div>
		{/if}

					<!-- Boutons Enregistrer et Supprimer Revolut -->
					<div class="flex gap-2">
						<form
							method="POST"
							action="?/updateRevolut"
							use:revolutEnhance={{
								onResult: ({ result }) => {
									revolutSubmitting = false;
									// Ne fermer le formulaire QUE si la validation a réussi ET qu'il y a un message de succès
									if (result.type === 'success' && result.data?.form?.message) {
										// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
										initialRevolut = result.data.form.data?.revolut_me || '';
										revolutSubmitted = true;
										showRevolutForm = false; // Fermer le formulaire après succès
										setTimeout(() => {
											revolutSubmitted = false;
										}, 2000);
									}
									// En cas d'erreur (pas de message), le formulaire reste ouvert pour afficher les erreurs
								},
								onUpdate: ({ form: _form }) => {
									// Superforms met automatiquement à jour les erreurs ici
								},
								onSubmit: () => {
									revolutSubmitting = true;
								}
							}}
							class="flex-1"
						>
							<input type="hidden" name="revolut_me" value={$revolutFormData.revolut_me || ''} />
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
						{#if $revolutFormData.revolut_me && $revolutFormData.revolut_me.trim() !== ''}
							{#if confirmingDeleteProvider === 'revolut'}
								<div class="flex gap-2">
									<form
										method="POST"
										action="?/updateRevolut"
										use:revolutEnhance={{
											onResult: ({ result }) => {
												revolutSubmitting = false;
												if (result.type === 'success') {
													// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
													initialRevolut = '';
													confirmingDeleteProvider = null;
													showRevolutForm = false; // Fermer le formulaire après suppression
												}
											},
											onUpdate: ({ form: _form }) => {
												// Superforms met automatiquement à jour les erreurs ici
											},
											onSubmit: () => {
												revolutSubmitting = true;
											}
										}}
									>
										<input type="hidden" name="revolut_me" value="" />
										<Button
											type="submit"
											disabled={revolutSubmitting || revolutSubmitted}
											variant="ghost"
											size="sm"
											class="mt-4 bg-red-600 text-white hover:bg-red-700 hover:text-white disabled:opacity-50"
											title="Confirmer la suppression"
										>
											<Check class="h-4 w-4" />
										</Button>
									</form>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										on:click={cancelDeleteConfirmation}
										class="mt-4"
										title="Annuler la suppression"
									>
										<X class="h-4 w-4" />
									</Button>
								</div>
							{:else}
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700"
									on:click={() => startDeleteConfirmation('revolut')}
									title="Supprimer Revolut"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							{/if}
						{/if}
					</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		<!-- Formulaire Wero Desktop -->
		<Collapsible.Root bind:open={showWeroForm}>
			<Collapsible.Content>
	<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
		<div class="flex items-center justify-between">
			<h3 class="font-semibold text-gray-900">Wero</h3>
			<span class="text-xs text-gray-500">Optionnel</span>
		</div>

		<Form.Field form={weroForm} name="wero_me">
			<Form.Control let:attrs>
				<Form.Label>Votre identifiant Wero</Form.Label>
				<Input
					{...attrs}
					type="text"
					placeholder="email@example.com ou +33612345678"
					bind:value={$weroFormData.wero_me}
					class="h-10"
				/>
			</Form.Control>
			<Form.FieldErrors />
			<Form.Description>
				Entrez votre email ou numéro de téléphone associé à Wero.
			</Form.Description>
		</Form.Field>

		<!-- Boutons Enregistrer et Supprimer Wero -->
		<div class="flex gap-2">
			<form
				method="POST"
				action="?/updateWero"
				use:weroEnhance={{
					onResult: ({ result }) => {
						weroSubmitting = false;
						// Ne fermer le formulaire QUE si la validation a réussi ET qu'il y a un message de succès
						if (result.type === 'success' && result.data?.form?.message) {
							// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
							initialWero = result.data.form.data?.wero_me || '';
							weroSubmitted = true;
							showWeroForm = false; // Fermer le formulaire après succès
							setTimeout(() => {
								weroSubmitted = false;
							}, 2000);
						}
						// En cas d'erreur (pas de message), le formulaire reste ouvert pour afficher les erreurs
					},
					onUpdate: ({ form: _form }) => {
						// Superforms met automatiquement à jour les erreurs ici
					},
					onSubmit: () => {
						weroSubmitting = true;
					}
				}}
				class="flex-1"
			>
				<input type="hidden" name="wero_me" value={$weroFormData.wero_me || ''} />
				<Button
					type="submit"
					disabled={weroSubmitting || weroSubmitted}
					class={`mt-4 h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
						weroSubmitted
							? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
							: weroSubmitting
								? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
								: 'bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50'
					}`}
				>
					{#if weroSubmitting}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						Enregistrement...
					{:else if weroSubmitted}
						<Check class="mr-2 h-4 w-4" />
						Sauvegardé !
					{:else}
						Enregistrer Wero
					{/if}
				</Button>
			</form>
			{#if $weroFormData.wero_me && $weroFormData.wero_me.trim() !== ''}
				{#if confirmingDeleteProvider === 'wero'}
					<div class="flex gap-2">
						<form
							method="POST"
							action="?/updateWero"
							use:weroEnhance={{
								onResult: ({ result }) => {
									weroSubmitting = false;
									if (result.type === 'success') {
										// Mettre à jour localement la valeur initiale (évite de recharger toute la page)
										initialWero = '';
										confirmingDeleteProvider = null;
										showWeroForm = false; // Fermer le formulaire après suppression
									}
								},
								onUpdate: ({ form: _form }) => {
									// Superforms met automatiquement à jour les erreurs ici
								},
								onSubmit: () => {
									weroSubmitting = true;
								}
							}}
						>
							<input type="hidden" name="wero_me" value="" />
							<Button
								type="submit"
								disabled={weroSubmitting || weroSubmitted}
								variant="ghost"
								size="sm"
								class="mt-4 bg-red-600 text-white hover:bg-red-700 hover:text-white disabled:opacity-50"
								title="Confirmer la suppression"
							>
								<Check class="h-4 w-4" />
							</Button>
						</form>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							on:click={cancelDeleteConfirmation}
							class="mt-4"
							title="Annuler la suppression"
						>
							<X class="h-4 w-4" />
						</Button>
					</div>
				{:else}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="mt-4 text-red-600 hover:bg-red-50 hover:text-red-700"
						on:click={() => startDeleteConfirmation('wero')}
						title="Supprimer Wero"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				{/if}
			{/if}
		</div>
				</div>
			</Collapsible.Content>
		</Collapsible.Root>

		<!-- Formulaire Stripe Desktop -->
		<Collapsible.Root bind:open={showStripeInfo}>
			<Collapsible.Content>
				<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold text-gray-900">Stripe</h3>
						<span class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
							Automatique
						</span>
					</div>

					{#if stripeConnectAccount?.is_active}
						<div class="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
							<div class="flex items-start gap-2">
								<Check class="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
								<div class="flex-1">
									<p class="text-sm font-medium text-indigo-800">
										Compte Stripe connecté
									</p>
									<p class="mt-1 text-xs text-indigo-700">
										Les paiements sont traités automatiquement
									</p>
								</div>
							</div>
						</div>

						<Button
							type="button"
							on:click={handleUpdateStripeAccount}
							disabled={stripeUpdateLoading}
							class="mt-4 h-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
						>
							{#if stripeUpdateLoading}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								Chargement...
							{:else}
								Gérer mon compte Stripe
							{/if}
						</Button>
					{:else}
						<Alert class="border-indigo-200 bg-white">
							<AlertCircle class="h-4 w-4 text-indigo-600" />
							<AlertDescription class="text-sm text-indigo-900">
								<div class="space-y-2">
									<p class="font-medium">⚡ Paiement automatique</p>
									<p>
										Les commandes sont confirmées automatiquement dès le paiement, sans vérification manuelle.
									</p>
									<div class="rounded-lg bg-indigo-50 p-2 text-xs">
										<p class="font-medium text-indigo-900 mb-1">📋 À savoir :</p>
										<ul class="list-disc list-inside space-y-1 text-indigo-800">
											<li>Les fonds arrivent sur votre compte bancaire sous 3-7 jours ouvrables (jusqu'à 10 jours pour le premier paiement)</li>
											<li>Frais de transaction : 1,4% + 0,25€ par paiement</li>
											<li>Utilisable en complément de PayPal/Revolut</li>
										</ul>
									</div>
								</div>
							</AlertDescription>
						</Alert>

						<Button
							type="button"
							on:click={handleConnectStripe}
							disabled={stripeLoading}
							class="mt-4 h-10 w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
						>
							{#if stripeLoading}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								Connexion...
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
