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
		Check,
		AlertCircle,
		XCircle,
		Package,
		CheckSquare,
		MessageSquare,
		X,
		PackageCheck,
		StickyNote,
		Trash2,
	} from 'lucide-svelte';

	// Données de la page
	$: ({
		order,
		shop,
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
			case 'to_verify':
				return AlertCircle;
			case 'pending':
				return Clock;
			case 'quoted':
				return AlertCircle;
			case 'confirmed':
				return Check;
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
			case 'to_verify':
				return 'bg-orange-100 text-orange-800 border-orange-200';
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
			case 'to_verify':
				return 'Paiement à confirmer';
			case 'pending':
				return 'Devis à faire';
			case 'quoted':
				return 'Devis envoyé';
			case 'confirmed':
				return 'En cours';
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
			const formData = new FormData();
			// ✅ OPTIMISÉ : Passer shopId pour éviter getUser + requête shop
			formData.append('shopId', shop.id);

			const response = await fetch('?/deletePersonalNote', {
				method: 'POST',
				body: formData,
			});

			if (response.ok) {
				// Fermer la confirmation
				confirmingDeleteNote = false;
				// Mettre à jour l'interface localement
				personalNote = null;
			}
		} catch (error) {}
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

	// Fonction pour obtenir le nom du provider de paiement
	function getPaymentProviderName(): string {
		if (order.payment_provider === 'paypal') return 'PayPal';
		if (order.payment_provider === 'revolut') return 'Revolut';
		return 'méthode de paiement';
	}

	// Fonction pour obtenir le message personnalisé selon le provider
	function getPaymentMessage(): string {
		if (order.payment_provider === 'paypal') {
			return 'Le client a indiqué avoir effectué le paiement via PayPal. Vérifiez votre compte PayPal puis confirmez la réception du paiement.';
		}
		if (order.payment_provider === 'revolut') {
			return 'Le client a indiqué avoir effectué le paiement via Revolut. Vérifiez votre compte Revolut puis confirmez la réception du paiement.';
		}
		return 'Le client a indiqué avoir effectué le paiement. Vérifiez votre compte (PayPal, Revolut, etc.) puis confirmez la réception du paiement.';
	}

	// Fonction pour obtenir le message de référence personnalisé selon le provider
	function getReferenceMessage(): string {
		if (order.payment_provider === 'paypal') {
			return 'Le client doit inclure cette référence lors du paiement PayPal';
		}
		if (order.payment_provider === 'revolut') {
			return 'Le client doit inclure cette référence lors du paiement Revolut';
		}
		return 'Le client doit inclure cette référence lors du paiement (PayPal, Revolut, etc.)';
	}
</script>

<svelte:head>
	<title>Commande {order.id.slice(0, 8)} - Dashboard</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<!-- En-tête avec bouton retour -->
	<div
		class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<!-- Bouton retour - toujours en premier -->
		<Button variant="ghost" on:click={goBack} class="gap-2 self-start">
			<ArrowLeft class="h-4 w-4" />
			Retour aux commandes
		</Button>

		<!-- Titre et statut - sur la même ligne sur desktop, empilés sur mobile -->
		<div
			class="flex flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
		>
			<h1 class="text-center text-2xl font-bold sm:text-left sm:text-3xl">
				Détails de la commande {order.id.slice(0, 8)}
			</h1>
			<div class="flex justify-center sm:justify-start">
				<Badge class={getStatusColor(order.status)}>
					<svelte:component
						this={getStatusIcon(order.status)}
						class="mr-2 h-4 w-4"
					/>
					{getStatusText(order.status)}
				</Badge>
			</div>
		</div>
	</div>

	<!-- Messages d'erreur/succès -->
	{#if page.form?.error}
		<Alert variant="destructive">
			<AlertDescription>{page.form.error}</AlertDescription>
		</Alert>
	{/if}

	{#if page.form?.message}
		<Alert>
			<AlertDescription>{page.form.message}</AlertDescription>
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
							<p class="text-sm">
								{formatDate(order.pickup_date)}
								{#if order.pickup_time}
									<span class="ml-1 text-gray-900"
										>{order.pickup_time.substring(0, 5)}</span
									>
								{/if}
							</p>
						</div>
						<div>
							<Label class="text-sm font-medium text-muted-foreground"
								>Statut du paiement</Label
							>
							<p class="text-sm">
								{#if order.status === 'to_verify'}
									<span class="font-medium text-orange-600"
										>En attente de vérification</span
									>
								{:else if order.status === 'confirmed' || order.status === 'ready' || order.status === 'completed'}
									<span class="font-medium text-green-600"
										>Payé {paidAmount
											? `(${formatPrice(paidAmount)})`
											: ''}</span
									>
								{:else}
									<span class="text-gray-600">En attente</span>
								{/if}
							</p>
						</div>
						{#if order.order_ref}
							<div class="col-span-2">
								<Label class="text-sm font-medium text-muted-foreground"
									>Référence de commande</Label
								>
								<div class="flex items-center gap-2">
									<code
										class="rounded bg-muted px-2 py-1 font-mono text-sm font-semibold"
									>
										{order.order_ref}
									</code>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										on:click={() => {
											navigator.clipboard.writeText(order.order_ref);
										}}
										class="h-8 w-8 p-0"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><rect
												width="14"
												height="14"
												x="8"
												y="8"
												rx="2"
												ry="2"
											/><path
												d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
											/></svg
										>
									</Button>
								</div>
								<p class="mt-1 text-xs text-muted-foreground">
									{getReferenceMessage()}
								</p>
								{#if order.payment_provider}
									<p class="mt-1 text-xs text-muted-foreground">
										Méthode de paiement utilisée : <strong>{getPaymentProviderName()}</strong>
									</p>
								{/if}
							</div>
						{/if}
						{#if order.chef_pickup_date}
							<div class="col-span-2">
								<Label class="text-sm font-medium text-muted-foreground"
									>Date proposée</Label
								>
								<p class="text-sm text-blue-600">
									{formatDate(order.chef_pickup_date)}
									{#if order.chef_pickup_time}
										<span class="ml-1"
											>{order.chef_pickup_time.substring(0, 5)}</span
										>
									{/if}
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

			<!-- Photos d'inspiration -->
			{#if order.inspiration_photos && order.inspiration_photos.length > 0}
				<Card>
					<CardHeader>
						<CardTitle>Photos d'inspiration</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
							{#each order.inspiration_photos as photo, index}
								<div class="group relative">
									<img
										src={photo}
										alt="Photo d'inspiration {index + 1}"
										class="aspect-square w-full rounded-lg border border-border object-cover"
									/>
									<div
										class="absolute inset-0 rounded-lg bg-black/0 transition-colors group-hover:bg-black/20"
									>
										<div
											class="flex h-full items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
										>
											<button
												on:click={() => window.open(photo, '_blank')}
												class="rounded-full bg-white/90 p-2 text-gray-700 shadow-lg hover:bg-white"
												title="Voir en grand"
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
														d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
													/>
												</svg>
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
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
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div class="min-w-0">
							<Label class="text-sm font-medium text-muted-foreground"
								>Nom</Label
							>
							<p class="truncate text-sm">{order.customer_name}</p>
						</div>
						<div class="min-w-0">
							<Label class="text-sm font-medium text-muted-foreground"
								>Email</Label
							>
							<p class="break-all text-sm">{order.customer_email}</p>
						</div>
						{#if order.customer_phone}
							<div class="min-w-0">
								<Label class="text-sm font-medium text-muted-foreground"
									>Téléphone</Label
								>
								<p class="truncate text-sm">{order.customer_phone}</p>
							</div>
						{/if}
						{#if order.customer_instagram}
							<div class="min-w-0">
								<Label class="text-sm font-medium text-muted-foreground"
									>Instagram</Label
								>
								<a
									href="https://instagram.com/{order.customer_instagram.replace(
										'@',
										'',
									)}"
									target="_blank"
									rel="noopener noreferrer"
									class="truncate text-sm text-blue-600 hover:text-blue-800 hover:underline"
								>
									{order.customer_instagram}
								</a>
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
										<!-- ✅ OPTIMISÉ : Passer shopId et shopSlug pour éviter getUser + requête shop -->
										<input type="hidden" name="shopId" value={shop.id} />
										<input type="hidden" name="shopSlug" value={shop.slug} />
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
					{:else if order.status === 'to_verify'}
						<!-- Actions pour les commandes à vérifier (paiement externe) -->
						<div class="space-y-4">
							<Alert>
								<AlertCircle class="h-4 w-4" />
								<AlertDescription>
									{getPaymentMessage()}
								</AlertDescription>
							</Alert>
							<form
								method="POST"
								action="?/confirmPayment"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											goto('/dashboard/orders');
										}
									};
								}}
							>
								<!-- ✅ OPTIMISÉ : Passer shopId pour éviter getUserPermissions -->
								<input type="hidden" name="shopId" value={shop.id} />
								<Button type="submit" class="h-10 w-full gap-2">
									<Check class="h-4 w-4" />
									J'ai reçu le paiement
								</Button>
							</form>
						</div>
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
							<!-- ✅ OPTIMISÉ : Passer shopId pour éviter getUser + requête shop -->
							<input type="hidden" name="shopId" value={shop.id} />
							<Button type="submit" class="h-10 w-full gap-2">
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
							<!-- ✅ OPTIMISÉ : Passer shopId pour éviter getUser + requête shop -->
							<input type="hidden" name="shopId" value={shop.id} />
							<Button type="submit" class="h-10 w-full gap-2">
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
