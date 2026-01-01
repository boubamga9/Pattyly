<script lang="ts">
	import { goto } from '$app/navigation';

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
	import SocialMediaIcons from '$lib/components/client/social-media-icons.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	$: customStyles = {
		background: data.customizations?.background_color || '#fafafa',
		backgroundImage: data.customizations?.background_image_url
			? `url(${data.customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${data.customizations?.button_color || '#ff6f61'}; color: ${data.customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${data.customizations?.text_color || '#333333'};`,
		iconStyle: `color: ${data.customizations?.icon_color || '#6b7280'};`,
		secondaryTextStyle: `color: ${data.customizations?.secondary_text_color || '#333333'};`,
		separatorColor: 'rgba(0, 0, 0, 0.3)',
	};

	$: shop = data.order?.shops;

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
	// Calculer le pourcentage d'acompte (depuis le produit pour les commandes produit, 50% par défaut pour les commandes personnalisées)
	$: depositPercentage = orderType === 'product_order' && data.product?.deposit_percentage 
		? data.product.deposit_percentage 
		: 50;
	$: depositAmount = totalAmount ? (totalAmount * depositPercentage) / 100 : 0;

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

<div
	class="min-h-screen"
	style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Header avec logo, nom et bouton retour sur la même ligne -->
	<header class="relative border-b bg-white px-4 py-4 sm:px-6 sm:py-5">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
			<!-- Logo et nom de la boutique -->
			<div class="flex items-center gap-3">
			{#if order?.shops?.logo_url}
				<div
						class="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white p-1.5 shadow-sm sm:h-12 sm:w-12"
				>
					<img
						src={order.shops.logo_url}
						alt={order.shops.name}
						class="h-full w-full object-contain"
					/>
				</div>
			{:else}
				<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE8D6]/30 to-white shadow-sm sm:h-12 sm:w-12"
				>
					<span
							class="text-lg font-semibold text-neutral-700 sm:text-xl"
						style="font-weight: 600;"
					>
						{order?.shops?.name?.charAt(0).toUpperCase() || 'P'}
					</span>
				</div>
			{/if}
		<h1
					class="text-lg font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-xl"
					style="font-weight: 600; letter-spacing: -0.02em;"
		>
			{order?.shops?.name || 'Boutique'}
		</h1>
			</div>

			<!-- Réseaux sociaux -->
			{#if shop && (shop.instagram || shop.tiktok || shop.website)}
				<SocialMediaIcons {shop} iconStyle={customStyles.iconStyle} />
			{/if}
		</div>
	</header>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-2xl pt-6 sm:pt-0 p-4 sm:p-8 lg:p-12">
			<!-- Titre de confirmation - Charte typographique -->
			<div class="mb-8 text-center">
				<h2
					class="mb-3 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
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
				<p
					class="text-sm leading-[180%] text-neutral-600 sm:text-base"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
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

			<!-- Sections principales -->
			<div class="space-y-6">
				<!-- Informations de contact -->
				<div class="rounded-2xl border bg-white p-6 shadow-sm">
					<h2
						class="mb-4 text-lg font-semibold text-neutral-900"
						style="font-weight: 600; letter-spacing: -0.02em;"
					>
						Informations de contact
					</h2>

					<div class="space-y-3">
						<div class="flex items-center gap-3">
							<User
								class="h-4 w-4"
								style={`color: ${data.customizations?.secondary_text_color || '#6b7280'};`}
							/>
							<span
								class="text-sm text-neutral-900"
								style="font-weight: 400;"
							>
								{order.customer_name}
							</span>
						</div>

						<div class="flex items-center gap-3">
							<Mail
								class="h-4 w-4"
								style={`color: ${data.customizations?.secondary_text_color || '#6b7280'};`}
							/>
							<span
								class="text-sm text-neutral-900"
								style="font-weight: 400;"
							>
								{order.customer_email}
							</span>
						</div>

						{#if customerPhone}
							<div class="flex items-center gap-3">
								<Phone
									class="h-4 w-4"
									style={`color: ${data.customizations?.secondary_text_color || '#6b7280'};`}
								/>
								<span
									class="text-sm text-neutral-900"
									style="font-weight: 400;"
								>
									{customerPhone}
								</span>
							</div>
						{/if}

						{#if customerInstagram}
							<div class="flex items-center gap-3">
								<Instagram
									class="h-4 w-4"
									style={`color: ${data.customizations?.secondary_text_color || '#6b7280'};`}
								/>
								<span
									class="text-sm text-neutral-900"
									style="font-weight: 400;"
								>
									@{customerInstagram}
								</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Récapitulatif de la commande -->
				<!-- Informations de la commande -->
				<div class="rounded-2xl border bg-white p-6 shadow-sm">
					<h2
						class="mb-4 text-lg font-semibold text-neutral-900"
						style="font-weight: 600; letter-spacing: -0.02em;"
					>
						Récapitulatif de la commande
					</h2>

				<div class="space-y-3">
					<!-- Numéro de commande -->
					<div class="flex items-center justify-between gap-2">
						<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
							Numéro de commande :
						</span>
						<span class="text-sm text-neutral-900 whitespace-nowrap" style="font-weight: 400;">
							{order?.id?.slice(0, 8) || ''}
						</span>
					</div>

					<!-- Gâteau -->
					{#if orderType === 'product_order'}
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
								Gâteau :
							</span>
							<span class="text-sm text-neutral-900 text-right sm:ml-auto" style="font-weight: 400;">
								{productName || 'Gâteau personnalisé'}
							</span>
						</div>
						<!-- Prix de base du gâteau -->
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
								Prix de base :
							</span>
							<span class="text-sm text-neutral-900 whitespace-nowrap" style="font-weight: 400;">
								{productBasePrice ? formatPrice(productBasePrice) : '0,00€'}
							</span>
						</div>
					{/if}

					<!-- Date de récupération -->
					{#if hasChefDate}
						<!-- Date souhaitée par le client -->
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
								Date de récupération souhaitée :
							</span>
							<span class="text-sm text-neutral-900 text-right sm:ml-auto whitespace-nowrap" style="font-weight: 400;">
								{order?.pickup_date ? formatDate(order.pickup_date) : ''}
								{#if order?.pickup_time}
									<span class="ml-1">{order.pickup_time.substring(0, 5)}</span>
								{/if}
							</span>
						</div>
						<!-- Date proposée par le pâtissier -->
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
								{order?.status === 'quoted'
									? 'Date de livraison possible :'
									: 'Date de récupération finale :'}
							</span>
							<span
								class="text-sm text-right sm:ml-auto whitespace-nowrap"
								style={`color: ${data.customizations?.button_color || '#FF6F61'}; font-weight: 400;`}
							>
								{chefPickupDate ? formatDate(chefPickupDate) : ''}
								{#if order?.chef_pickup_time}
									<span class="ml-1">{order.chef_pickup_time.substring(0, 5)}</span>
								{/if}
							</span>
						</div>
					{:else}
						<!-- Date de récupération (normale) -->
						<div class="flex items-center justify-between gap-2">
							<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
								Date de récupération :
							</span>
							<span class="text-sm text-neutral-900 text-right sm:ml-auto whitespace-nowrap" style="font-weight: 400;">
								{order?.pickup_date ? formatDate(order.pickup_date) : ''}
								{#if order?.pickup_time}
									<span class="ml-1">{order.pickup_time.substring(0, 5)}</span>
								{/if}
							</span>
						</div>
					{/if}

					<!-- Options de personnalisation -->
					{#if order?.customization_data}
						{#each Object.entries(order.customization_data) as [label, data]}
							{@const displayData = displayCustomizationOption(label, data)}
							{#if Array.isArray(displayData)}
								<!-- Multi-select: Structure avec badges -->
								<div class="rounded-lg bg-neutral-50 p-3">
									<div class="mb-2">
										<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
											{label}
										</span>
									</div>
									<div class="flex flex-wrap gap-2">
										{#each displayData as option}
											<span class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm">
												<span class="break-words text-neutral-900" style={customStyles.textStyle}>
													{option}
												</span>
											</span>
										{/each}
									</div>
								</div>
							{:else}
								<!-- Single-select ou texte: Structure avec fond -->
								<div class="rounded-lg bg-neutral-50 p-3">
									<div class="mb-1">
										<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
											{label}
										</span>
									</div>
									<div class="flex items-start justify-between gap-2">
										<span class="min-w-0 flex-1 break-words text-sm text-neutral-900" style={customStyles.textStyle}>
											{displayData}
										</span>
									</div>
								</div>
							{/if}
						{/each}
					{/if}

					<!-- Photos d'inspiration -->
					{#if order?.inspiration_photos && order.inspiration_photos.length > 0}
						<div class="rounded-lg bg-neutral-50 p-3">
							<div class="mb-2">
								<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
									Photos d'inspiration
								</span>
							</div>
							<div class="grid grid-cols-3 gap-2">
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
						<div class="rounded-lg bg-neutral-50 p-3">
							<div class="mb-1">
								<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
									Message
								</span>
							</div>
							<p class="text-sm italic text-neutral-600" style="font-weight: 300;">
								"{additionalInfo}"
							</p>
						</div>
					{/if}

					<!-- Message du pâtissier -->
					{#if chefMessage}
						<div class="rounded-lg bg-neutral-50 p-3">
							<div class="mb-1">
								<span class="break-words text-xs font-semibold uppercase tracking-wide text-neutral-500" style="font-weight: 600;">
									Message du pâtissier
								</span>
							</div>
							<p class="text-sm text-neutral-600" style="font-weight: 400;">
								{chefMessage}
							</p>
						</div>
					{/if}

					<!-- Séparateur avant le total -->
					<div class="pt-4">
						<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
					</div>
					<div class="pt-4">
						{#if orderType === 'product_order'}
							<!-- Montant total -->
							<div class="mb-2 flex items-center justify-between gap-2">
								<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
									Total :
								</span>
								<span class="font-semibold text-neutral-900 whitespace-nowrap" style="font-weight: 600;">
									{formatPrice(totalAmount)}
								</span>
							</div>

							<!-- Acompte payé -->
							<div
								class="flex items-center justify-between gap-2 font-semibold"
								style={`color: ${data.customizations?.button_color || '#FF6F61'}; font-weight: 600;`}
							>
								<span>Payé aujourd'hui :</span>
								<span class="whitespace-nowrap">{formatPrice(depositAmount)}</span>
							</div>
						{:else}
							<!-- Pour les demandes custom -->
							<div class="mb-2 flex items-center justify-between gap-2">
								<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
									Statut :
								</span>
								{#if order?.status === 'to_verify'}
									<span
										class="text-sm font-normal text-right sm:ml-auto"
										style={`color: ${data.customizations?.button_color || '#FF6F61'}; font-weight: 400;`}
									>
										Paiement en cours de vérification
									</span>
								{:else if order?.status === 'quoted'}
									<span
										class="text-sm font-normal text-right text-neutral-900 sm:ml-auto"
										style="font-weight: 400;"
									>
										Devis envoyé
									</span>
								{:else if order?.status === 'confirmed'}
									<span
										class="text-sm font-normal text-right sm:ml-auto"
										style="color: #10b981; font-weight: 400;"
									>
										Confirmée
									</span>
								{:else if order?.status === 'ready'}
									<span
										class="text-sm font-normal text-right sm:ml-auto"
										style="color: #8b5cf6; font-weight: 400;"
									>
										Prêt
									</span>
								{:else if order?.status === 'completed'}
									<span
										class="text-sm font-normal text-right text-neutral-600 sm:ml-auto"
										style="font-weight: 400;"
									>
										Terminée
									</span>
								{:else if order?.status === 'refused'}
									<span
										class="text-sm font-normal text-right sm:ml-auto"
										style="color: #ef4444; font-weight: 400;"
									>
										Refusée
									</span>
								{:else}
									<span
										class="text-sm font-normal text-right sm:ml-auto"
										style={`color: ${data.customizations?.button_color || '#FF6F61'}; font-weight: 400;`}
									>
										En attente de devis
									</span>
								{/if}
							</div>

							<!-- Prix pour les commandes custom -->
							{#if totalAmount}
								<!-- Montant total -->
								<div class="mb-2 flex items-center justify-between gap-2">
									<span class="text-sm font-semibold text-neutral-700" style="font-weight: 600;">
										Total :
									</span>
									<span class="font-semibold text-neutral-900 whitespace-nowrap" style="font-weight: 600;">
										{formatPrice(totalAmount)}
									</span>
								</div>

								{#if order?.status === 'quoted'}
									<!-- Acompte à payer pour les devis -->
									<div
										class="flex items-center justify-between gap-2 font-semibold"
										style={`color: ${data.customizations?.button_color || '#FF6F61'}; font-weight: 600;`}
									>
										<span>À payer aujourd'hui :</span>
										<span class="whitespace-nowrap">{formatPrice(depositAmount)}</span>
									</div>
								{:else if order?.status === 'to_verify' || order?.status === 'confirmed' || order?.status === 'ready' || order?.status === 'completed'}
									<!-- Acompte -->
									<div
										class="flex items-center justify-between gap-2 font-semibold"
										style={`color: ${order?.status === 'to_verify' ? (data.customizations?.button_color || '#FF6F61') : '#10b981'}; font-weight: 600;`}
									>
										<span>Acompte :</span>
										<span class="whitespace-nowrap">{formatPrice(depositAmount)}</span>
									</div>
								{:else}
									<!-- Prix total pour les autres statuts -->
									<div
										class="flex items-center justify-between gap-2 font-semibold text-neutral-600"
										style="font-weight: 600;"
									>
										<span>Prix total :</span>
										<span class="whitespace-nowrap">{formatPrice(totalAmount)}</span>
									</div>
								{/if}
							{/if}
						{/if}
					</div>
				</div>
			</div>

			<!-- Message de confirmation -->
				<div class="text-center">
					<p
						class="text-sm text-neutral-600"
						style="font-weight: 300; letter-spacing: -0.01em;"
					>
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
								class="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md sm:w-1/2"
								style="background-color: #10b981; font-weight: 500;"
							>
								<Check class="h-4 w-4" />
								Accepter et payer l'accompte
							</Button>
							<Button
								on:click={rejectQuote}
								variant="outline"
								class="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md sm:w-1/2"
								style="font-weight: 500;"
							>
								<X class="h-4 w-4" />
								Refuser et annuler
							</Button>
						</div>
					{:else}
						<!-- Bouton retour normal -->
						<Button
							on:click={goBack}
							class="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium shadow-sm transition-all duration-200 hover:shadow-md"
							style={customStyles.buttonStyle + ' font-weight: 500;'}
						>
							<ArrowLeft class="h-4 w-4" />
							Retour à la boutique
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Footer minimaliste style Airbnb -->
	{#if data.hasPolicies}
		<footer class="mt-12 border-t border-neutral-200 bg-white px-4 py-6">
			<div class="mx-auto max-w-7xl">
				<div class="flex items-center justify-center">
					<a
						href="/{order?.shops?.slug}/policies"
						class="text-xs text-neutral-600 transition-colors hover:text-neutral-900 sm:text-sm"
						style="font-weight: 400;"
					>
						Conditions de vente
					</a>
				</div>
			</div>
		</footer>
	{/if}
</div>