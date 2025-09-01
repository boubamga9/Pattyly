<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import QuoteForm from './quote-form.svelte';
	import RejectForm from './reject-form.svelte';
	import PersonalNoteForm from './personal-note-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		ArrowLeft,
		Clock,
		CheckCircle,
		AlertCircle,
		XCircle,
		Package,
		CheckSquare,
		MessageSquare,
		Check,
		X,
		PackageCheck,
		StickyNote,
		Trash2,
	} from 'lucide-svelte';

	// Données de la page
	$: ({
		order,
		paidAmount,
		personalNote,
		makeQuoteForm,
		rejectOrderForm,
		personalNoteForm,
	} = $page.data);

	// État du formulaire pour les actions
	let showQuoteForm = false;
	let showRejectForm = false;

	// État pour la note personnelle
	let isEditingNote = false;
	let noteText = personalNote?.note || '';

	// État pour la confirmation de suppression
	let confirmingDeleteNote = false;

	// État pour la confirmation d'annulation de commande
	let confirmingCancelOrder = false;

	// Fonction pour formater le prix
	function formatPrice(price: number | null): string {
		if (!price) return 'Non défini';
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Fonction pour afficher les options de personnalisation
	function displayCustomizationOption(data: unknown): {
		text: string;
		price?: number;
	} {
		if (typeof data === 'string' || typeof data === 'number') {
			return { text: String(data) };
		}

		if (data && typeof data === 'object') {
			const obj = data as Record<string, unknown>;

			// Nouvelle structure avec type, label, price, values, value, etc.
			if (obj.type === 'multi-select' && Array.isArray(obj.values)) {
				// Multi-select : afficher toutes les options sur une ligne séparées par des virgules
				const optionsWithPrices = obj.values.map(
					(item: Record<string, unknown>) => {
						const itemLabel = item.label || item.value || 'Option';
						const itemPrice = (item.price as number) || 0;
						if (itemPrice === 0) {
							return itemLabel;
						}
						return `${itemLabel} (+${formatPrice(itemPrice)})`;
					},
				);
				return {
					text: optionsWithPrices.join(', '),
					price: (obj.price as number) || 0,
				};
			} else if (obj.type === 'single-select' && obj.value) {
				// Single-select : afficher la valeur avec le prix
				const value = obj.value as string;
				const price = (obj.price as number) || 0;
				return {
					text: price === 0 ? value : `${value} (+${formatPrice(price)})`,
					price: price,
				};
			} else if (
				obj.type === 'short-text' ||
				obj.type === 'long-text' ||
				obj.type === 'number'
			) {
				// Champs texte/nombre : afficher la valeur
				const value = obj.value || '';
				return { text: value ? String(value) : 'Non spécifié' };
			}

			// Fallback pour l'ancienne structure
			if (obj.value && typeof obj.price === 'number') {
				const price = obj.price;
				if (price === 0) {
					return { text: String(obj.value) };
				}
				return { text: `${obj.value} (+${formatPrice(price)})`, price: price };
			}
			if (Array.isArray(data)) {
				const options = data.map((item: Record<string, unknown>) => {
					if (item.value && typeof item.price === 'number') {
						const price = item.price;
						if (price === 0) {
							return String(item.value);
						}
						return `${item.value} (+${formatPrice(price)})`;
					}
					return String(item.value || item);
				});
				return { text: options.join(', ') };
			}
		}

		return { text: String(data) };
	}

	// Fonction pour formater la date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date);
	}

	// Fonction pour obtenir l'icône du statut
	function getStatusIcon(status: string) {
		switch (status) {
			case 'pending':
				return Clock;
			case 'quoted':
				return AlertCircle;
			case 'confirmed':
				return CheckCircle;
			case 'ready':
				return Package;
			case 'completed':
				return CheckSquare;
			case 'refused':
				return XCircle;
			default:
				return Clock;
		}
	}

	// Fonction pour obtenir la couleur du statut
	function getStatusColor(status: string): string {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'quoted':
				return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'confirmed':
				return 'bg-green-100 text-green-800 border-green-200';
			case 'ready':
				return 'bg-purple-100 text-purple-800 border-purple-200';
			case 'completed':
				return 'bg-gray-100 text-gray-800 border-gray-200';
			case 'refused':
				return 'bg-red-100 text-red-800 border-red-200';
			default:
				return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	// Fonction pour obtenir le texte du statut
	function getStatusText(status: string): string {
		switch (status) {
			case 'pending':
				return 'En attente';
			case 'quoted':
				return 'Devis envoyé';
			case 'confirmed':
				return 'Confirmée';
			case 'ready':
				return 'Prête';
			case 'completed':
				return 'Terminée';
			case 'refused':
				return 'Refusée';
			default:
				return status;
		}
	}

	// Fonction pour retourner à la liste
	function goBack() {
		goto('/dashboard/orders');
	}

	// Fonctions pour la gestion de la suppression
	function startDeleteConfirmation() {
		confirmingDeleteNote = true;
	}

	function cancelDeleteConfirmation() {
		confirmingDeleteNote = false;
	}

	// Fonction de suppression avec enhance
	async function handleDeleteNote() {
		try {
			const response = await fetch('?/deletePersonalNote', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});

			if (response.ok) {
				// Fermer la confirmation
				confirmingDeleteNote = false;
				// Mettre à jour l'interface localement
				personalNote = null;
			} else {
			}
		} catch (error) {
		}
	}

	// Fonctions pour la confirmation d'annulation de commande
	function startCancelConfirmation() {
		confirmingCancelOrder = true;
	}

	function cancelCancelConfirmation() {
		confirmingCancelOrder = false;
	}

	// Fonction pour obtenir le nom du produit ou "Commande personnalisée"
	function getProductName(): string {
		if (order.product_name) {
			return order.product_name;
		}
		if (order.products?.name) {
			return order.products.name;
		}
		return 'Commande personnalisée';
	}
</script>

<svelte:head>
	<title>Commande {order.id.slice(0, 8)} - Dashboard</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête avec bouton retour -->
	<div class="flex items-center justify-between gap-4">
		<Button variant="ghost" on:click={goBack} class="gap-2">
			<ArrowLeft class="h-4 w-4" />
			Retour aux commandes
		</Button>
		<h1 class="text-3xl font-bold">
			Détails de la commande {order.id.slice(0, 8)}
		</h1>
		<Badge class={getStatusColor(order.status)}>
			<svelte:component
				this={getStatusIcon(order.status)}
				class="mr-2 h-4 w-4"
			/>
			{getStatusText(order.status)}
		</Badge>
	</div>

	<!-- Messages d'erreur/succès -->
	{#if $page.form?.error}
		<Alert variant="destructive">
			<AlertDescription>{$page.form.error}</AlertDescription>
		</Alert>
	{/if}

	{#if $page.form?.message}
		<Alert>
			<AlertDescription>{$page.form.message}</AlertDescription>
		</Alert>
	{/if}

	<!-- Layout en 2 colonnes -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Colonne gauche : Détails de la commande -->
		<div class="space-y-6">
			<!-- Informations générales -->
			<Card>
				<CardHeader>
					<CardTitle>Informations générales</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<!-- Détails du produit si c'est une commande de gâteau -->
					{#if order.products && order.products.name}
						<div class="border-b pb-4">
							<div class="flex gap-4">
								{#if order.products.image_url}
									<img
										src={order.products.image_url}
										alt={order.products.name}
										class="h-32 w-32 rounded-lg object-cover"
									/>
								{/if}
								<div class="flex-1 space-y-2">
									<h3 class="text-lg font-semibold">{order.products.name}</h3>
									{#if order.products.description}
										<p class="text-sm text-muted-foreground">
											{order.products.description.length > 100
												? order.products.description.slice(0, 100) + '...'
												: order.products.description}
										</p>
									{/if}
									<div class="flex items-center gap-4 text-sm">
										{#if order.products.base_price}
											<span class="font-medium text-green-600">
												Prix de base : {formatPrice(order.products.base_price)}
											</span>
										{/if}
									</div>
								</div>
							</div>
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<div>
							<Label class="text-sm font-medium text-muted-foreground"
								>Produit</Label
							>
							<p class="text-sm">{getProductName()}</p>
						</div>
						<div>
							<Label class="text-sm font-medium text-muted-foreground"
								>Prix final</Label
							>
							<p class="text-sm font-medium">
								{formatPrice(order.total_amount)}
							</p>
						</div>
						<div>
							<Label class="text-sm font-medium text-muted-foreground"
								>Créée le</Label
							>
							<p class="text-sm">{formatDate(order.created_at)}</p>
						</div>
						<div>
							<Label class="text-sm font-medium text-muted-foreground"
								>Date de récupération</Label
							>
							<p class="text-sm">{formatDate(order.pickup_date)}</p>
						</div>
						<div>
							<Label class="text-sm font-medium text-muted-foreground"
								>Statut du paiement</Label
							>
							<p class="text-sm">
								{#if order.stripe_payment_intent_id}
									<span class="font-medium text-green-600">Payé</span>
									{#if paidAmount}
										<br />
										<span class="text-xs text-muted-foreground">
											Montant payé : {formatPrice(paidAmount)}
										</span>
									{/if}
								{:else if order.stripe_session_id}
									<span class="font-medium text-yellow-600"
										>En attente de paiement</span
									>
								{:else}
									<span class="text-gray-600">Non payé</span>
								{/if}
							</p>
						</div>
						{#if order.chef_pickup_date}
							<div class="col-span-2">
								<Label class="text-sm font-medium text-muted-foreground"
									>Date proposée</Label
								>
								<p class="text-sm text-blue-600">
									{formatDate(order.chef_pickup_date)}
								</p>
							</div>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Notes personnelles -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<StickyNote class="h-4 w-4" />
						Notes personnelles
					</CardTitle>
				</CardHeader>
				<CardContent>
					{#if isEditingNote}
						<PersonalNoteForm
							data={$page.data.personalNoteForm}
							onCancel={() => {
								isEditingNote = false;
								noteText = personalNote?.note || '';
							}}
						/>
					{:else}
						<div class="space-y-3">
							{#if personalNote?.note}
								<div class="rounded-lg bg-muted/50 p-3">
									<p class="whitespace-pre-wrap text-sm">{personalNote.note}</p>
									<p class="mt-2 text-xs text-muted-foreground">
										Modifiée le {formatDate(personalNote.updated_at)}
									</p>
								</div>
							{:else}
								<p class="text-sm italic text-muted-foreground">
									Aucune note personnelle
								</p>
							{/if}
							<div class="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									on:click={() => {
										isEditingNote = true;
										noteText = personalNote?.note || '';
									}}
								>
									{#if personalNote?.note}
										Modifier la note
									{:else}
										Ajouter une note
									{/if}
								</Button>

								{#if personalNote?.note}
									{#if confirmingDeleteNote}
										<Button
											type="button"
											variant="ghost"
											size="sm"
											class="bg-red-600 text-white hover:bg-red-700 hover:text-white"
											title="Confirmer la suppression"
											on:click={handleDeleteNote}
										>
											<Check class="h-4 w-4" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											on:click={cancelDeleteConfirmation}
											title="Annuler la suppression"
										>
											<X class="h-4 w-4" />
										</Button>
									{:else}
										<Button
											type="button"
											variant="outline"
											size="sm"
											class="text-red-600 hover:bg-red-50 hover:text-red-700"
											on:click={startDeleteConfirmation}
											title="Supprimer la note"
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									{/if}
								{/if}
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Personnalisation -->
			{#if order.customization_data && Object.keys(order.customization_data).length > 0}
				<Card>
					<CardHeader>
						<CardTitle>Personnalisation</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						{#each Object.entries(order.customization_data) as [key, value]}
							<div class="space-y-2">
								<h4
									class="text-sm font-medium capitalize text-muted-foreground"
								>
									{key}
								</h4>

								<div
									class="flex items-center justify-between rounded-lg bg-muted/50 p-3"
								>
									<span class="text-sm">
										{displayCustomizationOption(value).text}
									</span>
									{#if displayCustomizationOption(value).price !== undefined && displayCustomizationOption(value).price > 0}
										<span class="text-sm font-medium text-green-600">
											+{formatPrice(displayCustomizationOption(value).price)}
										</span>
									{/if}
								</div>
							</div>
						{/each}
					</CardContent>
				</Card>
			{/if}

			<!-- Message client -->
			{#if order.additional_information}
				<Card>
					<CardHeader>
						<CardTitle>Message du client</CardTitle>
					</CardHeader>
					<CardContent>
						<p class="text-sm">{order.additional_information}</p>
					</CardContent>
				</Card>
			{/if}
		</div>

		<!-- Colonne droite : Actions -->
		<div class="space-y-6">
			<!-- Informations client -->
			<Card>
				<CardHeader>
					<CardTitle>Informations client</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<Label class="text-sm font-medium text-muted-foreground"
								>Nom</Label
							>
							<p class="text-sm">{order.customer_name}</p>
						</div>
						<div>
							<Label class="text-sm font-medium text-muted-foreground"
								>Email</Label
							>
							<p class="text-sm">{order.customer_email}</p>
						</div>
						{#if order.customer_phone}
							<div>
								<Label class="text-sm font-medium text-muted-foreground"
									>Téléphone</Label
								>
								<p class="text-sm">{order.customer_phone}</p>
							</div>
						{/if}
						{#if order.customer_instagram}
							<div>
								<Label class="text-sm font-medium text-muted-foreground"
									>Instagram</Label
								>
								<p class="text-sm">{order.customer_instagram}</p>
							</div>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Message du pâtissier -->
			{#if order.chef_message}
				<Card>
					<CardHeader>
						<CardTitle>Votre message</CardTitle>
					</CardHeader>
					<CardContent>
						<p class="text-sm">{order.chef_message}</p>
					</CardContent>
				</Card>
			{/if}

			<!-- Actions selon le statut -->
			<Card>
				<CardHeader>
					<CardTitle>Actions</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if order.status === 'pending'}
						<!-- Actions pour les commandes en attente -->
						<div class="space-y-4">
							<Button
								on:click={() => (showQuoteForm = !showQuoteForm)}
								class="w-full gap-2"
							>
								<MessageSquare class="h-4 w-4" />
								Faire un devis
							</Button>

							{#if showQuoteForm}
								<QuoteForm
									data={$page.data.makeQuoteForm}
									onCancel={() => (showQuoteForm = false)}
									onSuccess={() => {
										showQuoteForm = false;
										goto('/dashboard/orders');
									}}
								/>
							{/if}

							<Button
								on:click={() => (showRejectForm = !showRejectForm)}
								variant="outline"
								class="w-full gap-2"
							>
								<XCircle class="h-4 w-4" />
								Refuser la commande
							</Button>

							{#if showRejectForm}
								<RejectForm
									data={$page.data.rejectOrderForm}
									onCancel={() => (showRejectForm = false)}
									onSuccess={() => {
										showRejectForm = false;
										goto('/dashboard/orders');
									}}
								/>
							{/if}
						</div>
					{:else if order.status === 'quoted'}
						<!-- Actions pour les commandes avec devis -->
						{#if confirmingCancelOrder}
							<!-- Mode confirmation -->
							<div class="space-y-4">
								<p class="text-center text-sm text-muted-foreground">
									Êtes-vous sûr de vouloir annuler cette commande ?
								</p>
								<div class="flex gap-2">
									<form
										method="POST"
										action="?/cancelOrder"
										use:enhance={() => {
											return async ({ result }) => {
												if (result.type === 'success') {
													goto('/dashboard/orders');
												}
											};
										}}
										class="flex-1"
									>
										<Button
											type="submit"
											variant="destructive"
											class="w-full gap-2"
										>
											<Check class="h-4 w-4" />
											Confirmer l'annulation
										</Button>
									</form>
									<Button
										type="button"
										variant="outline"
										class="flex-1 gap-2"
										on:click={cancelCancelConfirmation}
									>
										<X class="h-4 w-4" />
										Annuler
									</Button>
								</div>
							</div>
						{:else}
							<!-- Mode normal -->
							<Button
								type="button"
								variant="outline"
								class="w-full gap-2"
								on:click={startCancelConfirmation}
							>
								<XCircle class="h-4 w-4" />
								Annuler la commande
							</Button>
						{/if}
					{:else if order.status === 'confirmed'}
						<!-- Actions pour les commandes confirmées -->
						<form
							method="POST"
							action="?/makeOrderReady"
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										goto('/dashboard/orders');
									}
								};
							}}
						>
							<Button type="submit" class="w-full gap-2">
								<PackageCheck class="h-4 w-4" />
								Marquer comme prête
							</Button>
						</form>
					{:else if order.status === 'ready'}
						<!-- Actions pour les commandes prêtes -->
						<form
							method="POST"
							action="?/makeOrderCompleted"
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										goto('/dashboard/orders');
									}
								};
							}}
						>
							<Button type="submit" class="w-full gap-2">
								<CheckSquare class="h-4 w-4" />
								Marquer comme terminée
							</Button>
						</form>
					{:else}
						<!-- Aucune action disponible -->
						<p class="text-sm text-muted-foreground">
							Aucune action disponible pour ce statut.
						</p>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</div>
