<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Copy, ExternalLink, Check, ArrowLeft } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components/brand';

	export let data;

	$: customStyles = {
		background: data.customizations?.background_color || '#fafafa',
		backgroundImage: data.customizations?.background_image_url
			? `url(${data.customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${data.customizations?.button_color || '#ff6f61'}; color: ${data.customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${data.customizations?.text_color || '#333333'};`,
		secondaryTextStyle: `color: ${data.customizations?.secondary_text_color || '#333333'};`,
		separatorColor: 'rgba(0, 0, 0, 0.3)',
	};

	// Calculer l'acompte (50% du total)
	$: depositAmount = data.orderData.total_amount / 2;

	let copySuccess = false;
	let confirmationForm: HTMLFormElement | null = null;

	async function handlePayPalClick() {
		// Ouvrir PayPal
		const paypalLink = `https://paypal.me/${data.paypalMe}/${depositAmount}`;
		window.open(paypalLink, '_blank');

		// Soumettre directement le formulaire de confirmation
		console.log('🔄 Submitting payment confirmation form...');
		confirmationForm?.requestSubmit();
	}

	// Fonction pour formater le prix
	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	// Fonction pour formater la date
	function formatDate(dateString: string): string {
		const date = new Date(dateString + 'T12:00:00Z');
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date);
	}

	// Fonction pour copier la référence
	async function copyOrderRef() {
		try {
			await navigator.clipboard.writeText(data.orderData.order_ref);
			copySuccess = true;
			// Reset après 2 secondes
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	// Fonction pour retourner à la page produit
	function goBack() {
		goto(`/${data.shop.slug}/product/${data.product.id}`);
	}

	// Fonction pour afficher les options de personnalisation
	function displayCustomizationOption(
		fieldLabel: string,
		fieldData: any,
	): string | string[] {
		if (!fieldData) return '';

		// Pour les multi-select
		if (fieldData.type === 'multi-select' && Array.isArray(fieldData.values)) {
			return fieldData.values.map((item: any) => {
				const itemLabel = item.label || 'Option';
				const itemPrice = item.price || 0;
				return itemPrice === 0
					? itemLabel
					: `${itemLabel} (+${formatPrice(itemPrice)})`;
			});
		}

		// Pour les single-select
		if (fieldData.type === 'single-select' && fieldData.value) {
			const price = fieldData.price || 0;
			return price === 0
				? fieldData.value
				: `${fieldData.value} (+${formatPrice(price)})`;
		}

		// Pour les autres types (short-text, number, long-text)
		if (fieldData.value !== undefined && fieldData.value !== '') {
			return String(fieldData.value);
		}

		// Si pas de valeur ou valeur vide, ne pas afficher
		return '';
	}
</script>

<svelte:head>
	<title>Paiement - {data.shop.name}</title>
</svelte:head>

<div
	class="min-h-screen"
	style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Header avec logo et informations - Design moderne -->
	<header class="relative px-4 py-6 text-center sm:py-8 md:py-12">
		<!-- Bouton retour - Top left -->
		<button
			on:click={goBack}
			class="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/60 px-3 py-2 text-sm font-medium shadow-sm backdrop-blur-sm transition-all duration-300 hover:bg-white/80 hover:shadow-sm sm:left-6 sm:top-6"
			style={`color: ${data.customizations?.secondary_text_color || '#6b7280'}; font-weight: 500; letter-spacing: -0.01em;`}
		>
			<ArrowLeft class="h-4 w-4" />
			<span class="hidden sm:inline">Retour</span>
		</button>

		<!-- Logo - Design moderne sans bordure -->
		<div class="mb-4 flex justify-center">
			{#if data.shop.logo_url}
				<div
					class="relative h-20 w-20 overflow-hidden rounded-full bg-white p-2.5 shadow-sm transition-transform duration-300 hover:scale-105 sm:h-24 sm:w-24 sm:p-3 md:h-28 md:w-28"
				>
					<img
						src={data.shop.logo_url}
						alt={data.shop.name}
						class="h-full w-full object-contain"
					/>
				</div>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#FFE8D6]/30 to-white shadow-sm sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-neutral-700 sm:text-3xl md:text-4xl"
						style="font-weight: 600;"
					>
						{data.shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<!-- Nom de la boutique - Charte typographique -->
		<h1
			class="mb-3 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
			style="font-weight: 600; letter-spacing: -0.03em;"
		>
			{data.shop.name}
		</h1>
	</header>

	<!-- Separator - Design moderne avec couleur bouton et opacité -->
	<div class="px-4">
		<div
			class="mx-auto mb-6 h-px max-w-7xl bg-gradient-to-r from-transparent to-transparent sm:mb-8"
			style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
		></div>
	</div>

	<!-- Contenu principal -->
	<div class="px-4 pb-6 sm:pb-8">
		<div class="mx-auto max-w-2xl p-4 sm:p-8 lg:p-12">
			<!-- Titre - Charte typographique -->
			<div class="mb-8 text-center">
				<h2
					class="mb-3 text-2xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-3xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Finalisation de votre commande
				</h2>
				<p
					class="text-sm leading-[180%] text-neutral-600 sm:text-base"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Vérifiez les détails et effectuez le paiement de l'acompte
				</p>
			</div>

			<!-- Récapitulatif de la commande -->
			<div class="space-y-6">
				<!-- Informations client -->
				<div class="rounded-2xl border bg-white p-6 shadow-sm">
					<h2
						class="mb-4 text-lg font-semibold text-neutral-900"
						style="font-weight: 600; letter-spacing: -0.02em;"
					>
						Vos informations
					</h2>
				<div class="space-y-3">
					<div class="flex items-start justify-between gap-2">
						<span
							class="text-sm text-neutral-600"
							style="font-weight: 400;"
						>
							Nom :
						</span>
						<span
							class="text-sm text-neutral-900"
							style="font-weight: 400;"
						>
							{data.orderData.customer_name}
						</span>
					</div>
					<div class="flex items-start justify-between gap-2">
						<span
							class="text-sm text-neutral-600"
							style="font-weight: 400;"
						>
							Email :
						</span>
						<span
							class="break-all text-right text-sm text-neutral-900"
							style="font-weight: 400;"
						>
							{data.orderData.customer_email}
						</span>
					</div>
					{#if data.orderData.customer_phone}
						<div class="flex items-start justify-between gap-2">
							<span
								class="text-sm text-neutral-600"
								style="font-weight: 400;"
							>
								Téléphone :
							</span>
							<span
								class="text-sm text-neutral-900"
								style="font-weight: 400;"
							>
								{data.orderData.customer_phone}
							</span>
						</div>
					{/if}
					{#if data.orderData.customer_instagram}
						<div class="flex items-start justify-between gap-2">
							<span
								class="text-sm text-neutral-600"
								style="font-weight: 400;"
							>
								Instagram :
							</span>
							<span
								class="text-sm text-neutral-900"
								style="font-weight: 400;"
							>
								@{data.orderData.customer_instagram}
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Separator - Dégradé -->
			<div
				class="h-px bg-gradient-to-r from-transparent to-transparent"
				style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
			></div>

			<!-- Informations de la commande -->
			<div class="rounded-2xl border bg-white p-6 shadow-sm">
				<h2
					class="mb-4 text-lg font-semibold text-neutral-900"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Récapitulatif de la commande
				</h2>

				<div class="space-y-4">
					<!-- Gâteau -->
					<div class="flex items-center justify-between">
						<span
							class="text-sm text-neutral-600"
							style="font-weight: 400;"
						>
							Gâteau :
						</span>
						<span
							class="text-sm text-neutral-900"
							style="font-weight: 400;"
						>
							{data.product.name}
						</span>
					</div>

					<!-- Prix de base -->
					<div class="flex items-center justify-between">
						<span
							class="text-sm text-neutral-600"
							style="font-weight: 400;"
						>
							Prix de base :
						</span>
						<span
							class="text-sm text-neutral-900"
							style="font-weight: 400;"
						>
							{formatPrice(data.product.base_price)}
						</span>
					</div>

					<!-- Date de récupération -->
					<div class="flex items-center justify-between">
						<span
							class="text-sm text-neutral-600"
							style="font-weight: 400;"
						>
							Date de récupération :
						</span>
						<span
							class="text-sm text-neutral-900"
							style="font-weight: 400;"
						>
							{formatDate(data.orderData.pickup_date)}
							{#if data.orderData.pickup_time}
								<span class="ml-1"
									>{data.orderData.pickup_time.substring(0, 5)}</span
								>
							{/if}
						</span>
					</div>

					<!-- Options de personnalisation -->
					{#if data.orderData.customization_data && Object.keys(data.orderData.customization_data).length > 0}
						{#each Object.entries(data.orderData.customization_data) as [fieldLabel, fieldData]}
							{@const displayData = displayCustomizationOption(
								fieldLabel,
								fieldData,
							)}
							{#if Array.isArray(displayData)}
								<!-- Multi-select options: display line by line -->
								<div class="space-y-1">
									{#each displayData as option, index}
										{#if index === 0}
											<div class="flex items-center justify-between">
												<span
													class="text-sm text-neutral-600"
													style="font-weight: 400;"
												>
													{fieldLabel} :
												</span>
												<span
													class="text-sm text-neutral-900"
													style="font-weight: 400;"
												>
													{option}
												</span>
											</div>
										{:else}
											<div
												class="text-right text-sm text-neutral-900"
												style="font-weight: 400;"
											>
												{option}
											</div>
										{/if}
									{/each}
								</div>
							{:else if displayData}
								<div class="flex items-center justify-between">
									<span
										class="text-sm text-neutral-600"
										style="font-weight: 400;"
									>
										{fieldLabel} :
									</span>
									<span
										class="text-sm text-neutral-900"
										style="font-weight: 400;"
									>
										{displayData}
									</span>
								</div>
							{/if}
						{/each}
					{/if}

					<!-- Message supplémentaire -->
					{#if data.orderData.additional_information}
						<div>
							<span
								class="text-sm text-neutral-600"
								style="font-weight: 400;"
							>
								Message :
							</span>
							<p
								class="mt-1 text-sm italic text-neutral-600"
								style="font-weight: 300;"
							>
								"{data.orderData.additional_information}"
							</p>
						</div>
					{/if}

					<!-- Séparateur avant le total -->
					<div
						class="border-t pt-4"
						style={`border-color: ${customStyles.separatorColor};`}
					>
						<!-- Montant total -->
						<div class="mb-2 flex items-center justify-between">
							<span
								class="text-sm text-neutral-600"
								style="font-weight: 400;"
							>
								Total :
							</span>
							<span
								class="font-semibold text-neutral-900"
								style="font-weight: 600;"
							>
								{formatPrice(data.orderData.total_amount)}
							</span>
						</div>

						<!-- Acompte à payer -->
						<div
							class="flex items-center justify-between font-semibold"
							style={`color: ${data.customizations?.button_color || '#FF6F61'}; font-weight: 600;`}
						>
							<span>À payer aujourd'hui :</span>
							<span>{formatPrice(depositAmount)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Separator - Dégradé -->
			<div
				class="h-px bg-gradient-to-r from-transparent to-transparent"
				style={`background: linear-gradient(to right, transparent, ${customStyles.separatorColor}, transparent);`}
			></div>

			<!-- Paiement -->
			<div class="rounded-2xl border bg-white p-6 shadow-sm">
				<h2
					class="mb-4 text-lg font-semibold text-neutral-900"
					style="font-weight: 600; letter-spacing: -0.02em;"
				>
					Paiement
				</h2>

				<div class="space-y-4">
					<!-- Référence de commande -->
					<div class="rounded-xl border bg-white p-4 shadow-sm">
						<p
							class="mb-3 text-sm font-medium text-neutral-700"
							style="font-weight: 500;"
						>
							Référence à inclure dans le paiement :
						</p>
						<div class="flex items-center gap-2">
							<code
								class="flex-1 rounded-xl bg-neutral-50 px-4 py-3 text-center font-mono text-base font-semibold text-neutral-900"
								style="font-weight: 600;"
							>
								{data.orderData.order_ref}
							</code>
							<Button
								type="button"
								variant="outline"
								size="sm"
								on:click={copyOrderRef}
								class="h-11 shrink-0 rounded-xl transition-all duration-200"
								style={copySuccess ? customStyles.buttonStyle : ''}
							>
								{#if copySuccess}
									<Check class="h-4 w-4" />
								{:else}
									<Copy class="h-4 w-4" />
								{/if}
							</Button>
						</div>
						<p
							class="mt-3 text-xs text-neutral-600"
							style="font-weight: 400;"
						>
							⚠️ N'oubliez pas d'inclure cette référence dans la note du
							paiement PayPal
						</p>
					</div>

					<!-- Bouton PayPal -->
					<a
						href="https://paypal.me/{data.paypalMe}/{depositAmount}"
						target="_blank"
						rel="noopener noreferrer"
						on:click={handlePayPalClick}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0070ba] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#005ea6] hover:shadow-md"
						style="font-weight: 500;"
					>
						Payer l'acompte
						<ExternalLink class="h-4 w-4" />
					</a>

					<!-- Bouton de confirmation (caché mais nécessaire pour le submit automatique) -->
					<form
						method="POST"
						action="?/confirmPayment"
						use:enhance
						bind:this={confirmationForm}
					>
						<!-- ✅ OPTIMISÉ : Passer shopId, productId et orderRef via formData pour éviter requêtes redondantes -->
						<input type="hidden" name="shopId" value={data.orderData.shop_id} />
						<input type="hidden" name="productId" value={data.orderData.product_id} />
						<input type="hidden" name="orderRef" value={data.orderData.order_ref} />
					</form>
				</div>
			</div>
		</div>
	</div>
</div>

	<!-- Footer -->
	<ClientFooter customizations={data.customizations} />
</div>