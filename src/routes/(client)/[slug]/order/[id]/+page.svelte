<script lang="ts">
	import { goto } from '$app/navigation';

	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowLeft,
		Mail,
		Phone,
		User,
		Instagram,
		Check,
		X,
	} from 'lucide-svelte';
	import { ClientFooter } from '$lib/components/brand';
	import type { PageData } from './$types';

	export let data: PageData;

	const { order, orderType } = data;

	// Reactive variables for the order properties
	$: hasChefDate = order && (order as any).chef_pickup_date; // Afficher pour tous les types de commandes
	$: chefPickupDate = order ? (order as any).chef_pickup_date : null;
	$: chefMessage = order ? (order as any).chef_message : null;
	$: productName = order ? (order as any).product_name : null;
	$: additionalInfo = order ? (order as any).additional_information : null;
	$: customerPhone = order ? (order as any).customer_phone : null;
	$: customerInstagram = order ? (order as any).customer_instagram : null;
	$: productBasePrice = order ? (order as any).product_base_price : null;
	$: totalAmount = order ? (order as any).total_amount : null;

	// Function to format the price
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Function to format the date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	// Function to display the customization options
	function displayCustomizationOption(
		label: string,
		data: unknown,
	): string | string[] {
		if (typeof data === 'string' || typeof data === 'number') {
			return `${data}`;
		}
		if (data && typeof data === 'object') {
			const obj = data as Record<string, unknown>;

			// New structure with type, label, price, values, value, etc.
			if (obj.type === 'multi-select' && Array.isArray(obj.values)) {
				// Multi-select : return array for line-by-line display
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
				return optionsWithPrices;
			} else if (obj.type === 'single-select' && obj.value) {
				// Single-select : display the value with the price
				const value = obj.value as string;
				const price = (obj.price as number) || 0;
				if (price === 0) {
					return value;
				}
				return `${value} (+${formatPrice(price)})`;
			} else if (
				obj.type === 'short-text' ||
				obj.type === 'long-text' ||
				obj.type === 'number'
			) {
				// Text/number fields : display the value
				const value = obj.value || '';
				return value ? String(value) : 'Non spécifié';
			}

			// Fallback for the old structure
			if (obj.value && typeof obj.price === 'number') {
				if (obj.price === 0) {
					return `${obj.value}`;
				}
				return `${obj.value} (+${formatPrice(obj.price)})`;
			}
			if (Array.isArray(data)) {
				return data.map((item: Record<string, unknown>) => {
					if (item.value && typeof item.price === 'number') {
						if (item.price === 0) {
							return `${item.value}`;
						}
						return `${item.value} (+${formatPrice(item.price)})`;
					}
					return `${item.value || item}`;
				});
			}
		}
		return `${data}`;
	}

	// Function to go back to the shop
	function goBack() {
		if (order?.shops?.slug) {
			goto(`/${order.shops.slug}`);
		}
	}

	// Function to accept the quote and go to checkout
	function acceptQuote() {
		if (!order?.id || !order?.order_ref) {
			alert('Erreur: Référence de commande manquante');
			return;
		}

		console.log(
			'🚀 acceptQuote called, redirecting to checkout with order_ref:',
			order.order_ref,
		);

		// Rediriger vers la page de checkout pour commande personnalisée
		goto(`/${order.shops.slug}/custom/checkout/${order.order_ref}`);
	}

	// Fonction pour refuser le devis
	async function rejectQuote() {
		if (!order?.id) return;

		if (
			confirm(
				'Êtes-vous sûr de vouloir refuser ce devis ? Cette action ne peut pas être annulée.',
			)
		) {
			try {
				const response = await fetch('/api/reject-quote', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						orderId: order.id,
					}),
				});

				if (response.ok) {
					// Recharger la page pour voir le nouveau statut
					window.location.reload();
				}
			} catch (error) {}
		}
	}
</script>

<svelte:head>
	<title>Commande confirmée - Pattyly</title>
</svelte:head>

<div class="flex min-h-screen flex-col bg-background">
	<!-- Header avec logo et informations -->
	<header class="px-4 py-6 text-center sm:py-8">
		<!-- Logo -->
		<div class="mb-4 flex justify-center">
			{#if order?.shops?.logo_url}
				<img
					src={order.shops.logo_url}
					alt={order.shops.name}
					class="h-20 w-20 rounded-full border border-gray-300 object-cover sm:h-24 sm:w-24 md:h-28 md:w-28"
				/>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-muted sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-muted-foreground sm:text-3xl md:text-4xl"
					>
						{order?.shops?.name?.charAt(0).toUpperCase() || 'P'}
					</span>
				</div>
			{/if}
		</div>

		<!-- Nom de la boutique -->
		<h1 class="mb-2 text-xl font-semibold text-foreground">
			{order?.shops?.name || 'Boutique'}
		</h1>
	</header>

	<!-- Separator -->
	<div class="px-4">
		<Separator class="mb-6 sm:mb-8" />
	</div>

	<!-- Contenu principal -->
	<div class="container mx-auto max-w-2xl flex-1 px-4 pb-8">
		<!-- Titre de confirmation -->
		<div class="mb-8 text-center">
			<h2 class="mb-2 text-2xl font-medium text-foreground">
				{#if order?.status === 'to_verify'}
					Commande enregistrée !
				{:else if orderType === 'product_order'}
					Commande confirmée !
				{:else if order?.status === 'quoted'}
					Devis envoyé !
				{:else if order?.status === 'confirmed'}
					Commande confirmée !
				{:else if order?.status === 'ready'}
					Prêt pour récupération !
				{:else if order?.status === 'completed'}
					Commande terminée !
				{:else if order?.status === 'refused'}
					Devis refusé
				{:else}
					Demande envoyée !
				{/if}
			</h2>
			<p class="text-muted-foreground">
				{#if order?.status === 'to_verify'}
					Le pâtissier va vérifier votre paiement et commencer la préparation de
					votre commande.
				{:else if orderType === 'product_order'}
					Votre commande a été confirmée et votre acompte de 50% a été prélevé.
				{:else if order?.status === 'quoted'}
					Le pâtissier vous a envoyé un devis pour votre demande.
				{:else if order?.status === 'confirmed'}
					Votre commande a été confirmée.
				{:else if order?.status === 'ready'}
					Votre commande est prête à être récupérée.
				{:else if order?.status === 'completed'}
					Votre commande a été livrée avec succès.
				{:else if order?.status === 'refused'}
					Vous avez refusé ce devis. La commande a été annulée.
				{:else}
					Votre demande personnalisée a été envoyée au pâtissier.
				{/if}
			</p>
		</div>

		<!-- Récapitulatif de la commande -->
		<div class="space-y-6">
			<!-- Informations de la commande -->
			<div class="rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-xl font-semibold">Récapitulatif de la commande</h2>

				<div class="space-y-4">
					<!-- Numéro de commande -->
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Numéro de commande :</span>
						<span class="font-normal">{order?.id?.slice(0, 8) || ''}</span>
					</div>

					<!-- Gâteau -->
					{#if orderType === 'product_order'}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Gâteau :</span>
							<span class="font-normal"
								>{productName || 'Gâteau personnalisé'}</span
							>
						</div>
						<!-- Prix de base du gâteau -->
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Prix de base :</span>
							<span class="font-normal"
								>{productBasePrice
									? formatPrice(productBasePrice)
									: '0,00€'}</span
							>
						</div>
					{/if}

					<!-- Date de récupération -->
					{#if hasChefDate}
						<!-- Date souhaitée par le client -->
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground"
								>Date de récupération souhaitée :</span
							>
							<span class="font-normal"
								>{order?.pickup_date ? formatDate(order.pickup_date) : ''}</span
							>
						</div>
						<!-- Date proposée par le pâtissier -->
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground"
								>{order?.status === 'quoted'
									? 'Date de livraison possible :'
									: 'Date de récupération finale :'}</span
							>
							<span class="font-normal text-blue-600"
								>{chefPickupDate ? formatDate(chefPickupDate) : ''}</span
							>
						</div>
					{:else}
						<!-- Date de récupération (normale) -->
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Date de récupération :</span>
							<span class="font-normal"
								>{order?.pickup_date ? formatDate(order.pickup_date) : ''}</span
							>
						</div>
					{/if}

					<!-- Options de personnalisation -->
					{#if order?.customization_data}
						{#each Object.entries(order.customization_data) as [label, data]}
							{@const displayData = displayCustomizationOption(label, data)}
							{#if Array.isArray(displayData)}
								<!-- Multi-select options: display line by line -->
								<div class="space-y-1">
									{#each displayData as option, index}
										{#if index === 0}
											<!-- First option: label and option on same line -->
											<div class="flex items-center justify-between">
												<span class="text-muted-foreground">{label} :</span>
												<span class="font-normal">{option}</span>
											</div>
										{:else}
											<!-- Other options: only option aligned to the right -->
											<div class="text-right font-normal">{option}</div>
										{/if}
									{/each}
								</div>
							{:else}
								<!-- Single value: display normally -->
								<div class="flex items-center justify-between">
									<span class="text-muted-foreground">{label} :</span>
									<span class="font-normal">{displayData}</span>
								</div>
							{/if}
						{/each}
					{/if}

					<!-- Photos d'inspiration -->
					{#if order?.inspiration_photos && order.inspiration_photos.length > 0}
						<div class="space-y-2">
							<span class="text-muted-foreground">Photos d'inspiration :</span>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{#each order.inspiration_photos as photo, index}
									<img
										src={photo}
										alt="Photo d'inspiration {index + 1}"
										class="aspect-square w-full rounded-lg border border-border object-cover"
									/>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Message supplémentaire -->
					{#if additionalInfo}
						<div class="border-t pt-2">
							<span class="text-muted-foreground">Message :</span>
							<p class="mt-1 text-sm">{additionalInfo}</p>
						</div>
					{/if}

					<!-- Message du pâtissier -->
					{#if chefMessage}
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
							<span class="font-medium text-blue-900"
								>Message du pâtissier :</span
							>
							<p class="mt-2 text-sm text-blue-800">{chefMessage}</p>
						</div>
					{/if}

					<!-- Séparateur -->
					<div class="border-t pt-4">
						{#if orderType === 'product_order'}
							<!-- Montant total -->
							<div class="mb-2 flex items-center justify-between">
								<span class="text-muted-foreground">Total :</span>
								<span class="font-normal">{formatPrice(totalAmount)}</span>
							</div>

							<!-- Acompte payé -->
							<div
								class="flex items-center justify-between font-medium text-blue-600"
							>
								<span>Payé aujourd'hui :</span>
								<span
									>{totalAmount
										? formatPrice(totalAmount * 0.5)
										: '0,00€'}</span
								>
							</div>
						{:else}
							<!-- Pour les demandes custom -->
							<div class="mb-2 flex items-center justify-between">
								<span class="text-muted-foreground">Statut :</span>
								{#if order?.status === 'to_verify'}
									<span class="font-normal text-orange-600"
										>Paiement en cours de vérification</span
									>
								{:else if order?.status === 'quoted'}
									<span class="font-normal text-blue-600">Devis envoyé</span>
								{:else if order?.status === 'confirmed'}
									<span class="font-normal text-green-600">Confirmée</span>
								{:else if order?.status === 'ready'}
									<span class="font-normal text-purple-600">Prêt</span>
								{:else if order?.status === 'completed'}
									<span class="font-normal text-gray-600">Terminée</span>
								{:else if order?.status === 'refused'}
									<span class="font-normal text-red-600">Refusée</span>
								{:else}
									<span class="font-normal text-orange-600"
										>En attente de devis</span
									>
								{/if}
							</div>

							<!-- Prix pour les commandes custom -->
							{#if totalAmount}
								<!-- Montant total -->
								<div class="mb-2 flex items-center justify-between">
									<span class="text-muted-foreground">Total :</span>
									<span class="font-normal">{formatPrice(totalAmount)}</span>
								</div>

								{#if order?.status === 'quoted'}
									<!-- Acompte à payer pour les devis -->
									<div
										class="flex items-center justify-between font-medium text-blue-600"
									>
										<span>À payer aujourd'hui :</span>
										<span>{formatPrice(totalAmount * 0.5)}</span>
									</div>
								{:else if order?.status === 'to_verify' || order?.status === 'confirmed' || order?.status === 'ready' || order?.status === 'completed'}
									<!-- Acompte -->
									<div
										class="flex items-center justify-between font-medium {order?.status ===
										'to_verify'
											? 'text-blue-600'
											: 'text-green-600'}"
									>
										<span>Acompte :</span>
										<span>{formatPrice(totalAmount * 0.5)}</span>
									</div>
								{:else}
									<!-- Prix total pour les autres statuts -->
									<div
										class="flex items-center justify-between font-medium text-gray-600"
									>
										<span>Prix total :</span>
										<span>{formatPrice(totalAmount)}</span>
									</div>
								{/if}
							{/if}
						{/if}
					</div>
				</div>
			</div>

			<!-- Informations de contact -->
			<div class="rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-xl font-semibold">Informations de contact</h2>

				<div class="space-y-3">
					<div class="flex items-center gap-3">
						<User class="h-4 w-4 text-muted-foreground" />
						<span class="font-normal">{order.customer_name}</span>
					</div>

					<div class="flex items-center gap-3">
						<Mail class="h-4 w-4 text-muted-foreground" />
						<span class="font-normal">{order.customer_email}</span>
					</div>

					{#if customerPhone}
						<div class="flex items-center gap-3">
							<Phone class="h-4 w-4 text-muted-foreground" />
							<span class="font-normal">{customerPhone}</span>
						</div>
					{/if}

					{#if customerInstagram}
						<div class="flex items-center gap-3">
							<Instagram class="h-4 w-4 text-muted-foreground" />
							<span class="font-normal">@{customerInstagram}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Message de confirmation -->
			<div class="text-center text-sm text-muted-foreground">
				<p>
					{#if orderType === 'product_order'}
						Vous recevrez un email de confirmation avec tous les détails de
						votre commande.
					{:else}
						Vous recevrez un email de confirmation et le pâtissier vous
						contactera pour établir un devis.
					{/if}
				</p>
			</div>

			<!-- Boutons d'action -->
			<div class="flex w-full flex-col gap-3">
				{#if orderType === 'custom_order' && order?.status === 'quoted'}
					<!-- Boutons pour les commandes custom avec devis -->
					<div class="flex w-full flex-col gap-3 sm:flex-row">
						<Button
							on:click={acceptQuote}
							class="flex w-full items-center justify-center gap-2 bg-green-600 hover:bg-green-700 sm:w-1/2"
						>
							<Check class="h-4 w-4" />
							Accepter et payer l'accompte
						</Button>
						<Button
							on:click={rejectQuote}
							variant="outline"
							class="flex w-full items-center justify-center gap-2 sm:w-1/2"
						>
							<X class="h-4 w-4" />
							Refuser et annuler
						</Button>
					</div>
				{:else}
					<!-- Bouton retour normal -->
					<Button
						on:click={goBack}
						class="flex w-full items-center justify-center gap-2"
					>
						<ArrowLeft class="h-4 w-4" />
						Retour à la boutique
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Footer -->
	<ClientFooter />
</div>
