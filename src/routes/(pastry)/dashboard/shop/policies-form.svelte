<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		superForm,
		type Infer,
		type SuperValidated,
	} from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { FileText } from 'lucide-svelte';
	import { policiesSchema } from './policies-schema';
	import { page } from '$app/stores';

	export let data: SuperValidated<Infer<typeof policiesSchema>>;

	const form = superForm(data, {
		validators: zodClient(policiesSchema),
	});

	const { form: formData, enhance, submitting } = form;
	let submitted = false;
</script>

<Card class="shadow-sm">
	<CardHeader class="pb-6">
		<div class="flex items-center space-x-4">
			<FileText class="h-7 w-7 text-primary" />
			<div>
				<CardTitle class="text-xl">Politiques de ventes</CardTitle>
				<CardDescription class="text-base">
					Définissez vos conditions générales de vente, politiques de retour, livraison et paiement
				</CardDescription>
			</div>
		</div>
	</CardHeader>
	<CardContent class="pt-0">
		<form
			method="POST"
			action="?/updatePolicies"
			use:enhance={{
				onResult: ({ result }) => {
					if (result.type === 'success') {
						submitted = true;
						setTimeout(() => (submitted = false), 2000);
					}
				},
			}}
			class="space-y-8"
		>
			<input type="hidden" name="shopId" value={$page.data.shop.id} />
			<input type="hidden" name="shopSlug" value={$page.data.shop.slug} />

			<Form.Errors {form} />

			<!-- Section Conditions générales de vente -->
			<div class="space-y-6">
				<div class="space-y-3">
					<h3 class="text-lg font-semibold text-foreground">
						Conditions générales de vente
					</h3>
					<p class="text-sm text-muted-foreground">
						Définissez les conditions générales de vente de votre boutique
					</p>
				</div>

				<Form.Field {form} name="terms_and_conditions">
					<Form.Control let:attrs>
						<Form.Label>Conditions générales (optionnel)</Form.Label>
						<Textarea
							{...attrs}
							placeholder="Ex: Les commandes sont confirmées après validation du pâtissier. Les prix peuvent varier selon les personnalisations..."
							rows={8}
							bind:value={$formData.terms_and_conditions}
							class="resize-none"
						/>
					</Form.Control>
					<Form.FieldErrors />
					<Form.Description>
						Maximum 5000 caractères. Ces informations seront visibles sur votre page publique.
					</Form.Description>
				</Form.Field>
			</div>

			<!-- Section Politique de retour -->
			<div class="space-y-6">
				<div class="space-y-3">
					<h3 class="text-lg font-semibold text-foreground">
						Politique de retour et remboursement
					</h3>
					<p class="text-sm text-muted-foreground">
						Indiquez vos conditions de retour et remboursement
					</p>
				</div>

				<Form.Field {form} name="return_policy">
					<Form.Control let:attrs>
						<Form.Label>Politique de retour (optionnel)</Form.Label>
						<Textarea
							{...attrs}
							placeholder="Ex: Les produits pâtissiers ne peuvent pas être retournés pour des raisons d'hygiène. En cas de problème, contactez-nous dans les 24h..."
							rows={8}
							bind:value={$formData.return_policy}
							class="resize-none"
						/>
					</Form.Control>
					<Form.FieldErrors />
					<Form.Description>
						Maximum 5000 caractères.
					</Form.Description>
				</Form.Field>
			</div>

			<!-- Section Politique de livraison -->
			<div class="space-y-6">
				<div class="space-y-3">
					<h3 class="text-lg font-semibold text-foreground">
						Politique de livraison et retrait
					</h3>
					<p class="text-sm text-muted-foreground">
						Précisez vos modalités de livraison et retrait
					</p>
				</div>

				<Form.Field {form} name="delivery_policy">
					<Form.Control let:attrs>
						<Form.Label>Politique de livraison (optionnel)</Form.Label>
						<Textarea
							{...attrs}
							placeholder="Ex: Retrait uniquement en boutique. Horaires: du mardi au samedi de 9h à 18h. Livraison possible sur demande..."
							rows={8}
							bind:value={$formData.delivery_policy}
							class="resize-none"
						/>
					</Form.Control>
					<Form.FieldErrors />
					<Form.Description>
						Maximum 5000 caractères.
					</Form.Description>
				</Form.Field>
			</div>

			<!-- Section Conditions de paiement -->
			<div class="space-y-6">
				<div class="space-y-3">
					<h3 class="text-lg font-semibold text-foreground">
						Conditions de paiement
					</h3>
					<p class="text-sm text-muted-foreground">
						Indiquez vos modalités de paiement
					</p>
				</div>

				<Form.Field {form} name="payment_terms">
					<Form.Control let:attrs>
						<Form.Label>Conditions de paiement (optionnel)</Form.Label>
						<Textarea
							{...attrs}
							placeholder="Ex: Paiement par carte bancaire, espèces ou chèque. Un acompte peut être demandé pour les commandes importantes..."
							rows={8}
							bind:value={$formData.payment_terms}
							class="resize-none"
						/>
					</Form.Control>
					<Form.FieldErrors />
					<Form.Description>
						Maximum 5000 caractères.
					</Form.Description>
				</Form.Field>
			</div>

			<!-- Bouton de soumission -->
			<div class="pt-4">
				<Button
					type="submit"
					disabled={$submitting || submitted}
					class={`h-10 w-full text-sm font-medium text-white transition-all duration-200 disabled:cursor-not-allowed ${
						submitted
							? 'bg-[#FF6F61] hover:bg-[#e85a4f] disabled:opacity-100'
							: $submitting
								? 'bg-gray-600 hover:bg-gray-700 disabled:opacity-50'
								: 'bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md disabled:opacity-50'
					}`}
				>
					{#if submitted}
						<div class="flex items-center gap-2">
							<svg
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								></path>
							</svg>
							<span>Politiques sauvegardées</span>
						</div>
					{:else if $submitting}
						<div class="flex items-center gap-2">
							<svg
								class="h-5 w-5 animate-spin"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>Sauvegarde...</span>
						</div>
					{:else}
						Sauvegarder les politiques
					{/if}
				</Button>
			</div>
		</form>
	</CardContent>
</Card>

