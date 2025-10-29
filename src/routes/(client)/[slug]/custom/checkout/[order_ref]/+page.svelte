<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Separator } from '$lib/components/ui/separator';
	import { Button } from '$lib/components/ui/button';
	import { Copy, ExternalLink, Check } from 'lucide-svelte';
	import { ClientFooter } from '$lib/components/brand';
	export let data;

	$: customStyles = {
		background: data.customizations?.background_color || '#ffe8d6',
		backgroundImage: data.customizations?.background_image_url
			? `url(${data.customizations.background_image_url})`
			: 'none',
		buttonStyle: `background-color: ${data.customizations?.button_color || '#ff6f61'}; color: ${data.customizations?.button_text_color || '#ffffff'};`,
		textStyle: `color: ${data.customizations?.text_color || '#333333'};`,
		secondaryTextStyle: `color: ${data.customizations?.secondary_text_color || '#333333'};`,
	};

	// Calculer l'acompte (50% du total)
	$: depositAmount = data.order.total_amount / 2;

	let copySuccess = false;
	let confirmationForm: HTMLFormElement | null = null;

	async function handlePayPalClick() {
		// Ouvrir PayPal
		const paypalLink = `https://paypal.me/${data.paypalMe}/${depositAmount}`;
		window.open(paypalLink, '_blank');

		// Attendre 20 secondes puis soumettre le formulaire
		setTimeout(() => {
			console.log('🔄 Auto-submitting payment confirmation form...');
			confirmationForm?.requestSubmit();
		}, 20000);
	}

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
		}).format(price);
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString + 'T12:00:00Z');
		return new Intl.DateTimeFormat('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date);
	}

	async function copyOrderRef() {
		try {
			await navigator.clipboard.writeText(data.order.order_ref);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	function goBack() {
		goto(`/${data.shop.slug}/order/${data.order.id}`);
	}
</script>

<svelte:head>
	<title>Paiement du devis - {data.shop.name}</title>
</svelte:head>

<div
	class="flex min-h-screen flex-col"
	style="background-color: {customStyles.background}; background-image: {customStyles.backgroundImage}; background-size: cover; background-position: center; background-repeat: no-repeat;"
>
	<!-- Header -->
	<header class="px-4 py-6 text-center sm:py-8">
		<div class="mb-4 flex justify-center">
			{#if data.shop.logo_url}
				<img
					src={data.shop.logo_url}
					alt={data.shop.name}
					class="h-20 w-20 rounded-full border border-gray-300 object-cover sm:h-24 sm:w-24 md:h-28 md:w-28"
				/>
			{:else}
				<div
					class="flex h-20 w-20 items-center justify-center rounded-full border border-gray-300 bg-muted sm:h-24 sm:w-24 md:h-28 md:w-28"
				>
					<span
						class="text-2xl font-semibold text-muted-foreground sm:text-3xl md:text-4xl"
					>
						{data.shop.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}
		</div>

		<h1 class="mb-2 text-xl font-semibold" style={customStyles.textStyle}>
			{data.shop.name}
		</h1>

		<button
			on:click={goBack}
			class="text-xs italic underline transition-colors hover:opacity-80 sm:text-sm"
			style={customStyles.secondaryTextStyle}
		>
			← Retour au devis
		</button>
	</header>

	<div class="px-4">
		<Separator
			class="mb-6 sm:mb-8"
			style={`background-color: ${data.customizations?.secondary_text_color || '#333333'};`}
		/>
	</div>

	<!-- Contenu principal -->
	<div class="container mx-auto max-w-2xl flex-1 px-4 pb-8">
		<div class="mb-8 text-center">
			<h2 class="mb-2 text-2xl font-medium" style={customStyles.textStyle}>
				Paiement de votre devis
			</h2>
			<p style={customStyles.secondaryTextStyle}>
				Effectuez le paiement de l'acompte pour confirmer votre commande
			</p>
		</div>

		<div class="space-y-6">
			<!-- Informations client -->
			<div class="rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-xl font-semibold">Vos informations</h2>
				<div class="space-y-3">
					<div class="flex items-start gap-2">
						<span class="text-muted-foreground">Nom :</span>
						<span class="font-normal">{data.order.customer_name}</span>
					</div>
					<div class="flex items-start gap-2">
						<span class="text-muted-foreground">Email :</span>
						<span class="break-all font-normal"
							>{data.order.customer_email}</span
						>
					</div>
					{#if data.order.customer_phone}
						<div class="flex items-start gap-2">
							<span class="text-muted-foreground">Téléphone :</span>
							<span class="font-normal">{data.order.customer_phone}</span>
						</div>
					{/if}
					{#if data.order.customer_instagram}
						<div class="flex items-start gap-2">
							<span class="text-muted-foreground">Instagram :</span>
							<span class="font-normal">@{data.order.customer_instagram}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Récapitulatif du devis -->
			<div class="rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-xl font-semibold">Récapitulatif du devis</h2>

				<div class="space-y-4">
					<!-- Type de commande -->
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Type :</span>
						<span class="font-normal">Commande personnalisée</span>
					</div>

					<!-- Date de récupération -->
					{#if data.order.chef_pickup_date}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground"
								>Date de récupération souhaitée :</span
							>
							<span class="font-normal"
								>{formatDate(data.order.pickup_date)}
								{#if data.order.pickup_time}
									<span class="ml-1"
										>{data.order.pickup_time.substring(0, 5)}</span
									>
								{/if}</span
							>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground"
								>Date proposée par le pâtissier :</span
							>
							<span class="font-normal text-blue-600"
								>{formatDate(data.order.chef_pickup_date)}
								{#if data.order.chef_pickup_time}
									<span class="ml-1"
										>{data.order.chef_pickup_time.substring(0, 5)}</span
									>
								{/if}</span
							>
						</div>
					{:else}
						<div class="flex items-center justify-between">
							<span class="text-muted-foreground">Date de récupération :</span>
							<span class="font-normal"
								>{formatDate(data.order.pickup_date)}
								{#if data.order.pickup_time}
									<span class="ml-1"
										>{data.order.pickup_time.substring(0, 5)}</span
									>
								{/if}</span
							>
						</div>
					{/if}

					<!-- Message du pâtissier -->
					{#if data.order.chef_message}
						<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
							<span class="font-medium text-blue-900"
								>Message du pâtissier :</span
							>
							<p class="mt-2 text-sm text-blue-800">
								{data.order.chef_message}
							</p>
						</div>
					{/if}

					<!-- Message du client -->
					{#if data.order.additional_information}
						<div>
							<span class="text-muted-foreground">Votre message :</span>
							<p class="mt-1 text-sm italic text-muted-foreground">
								"{data.order.additional_information}"
							</p>
						</div>
					{/if}

					<!-- Photos d'inspiration -->
					{#if data.order.inspiration_photos && data.order.inspiration_photos.length > 0}
						<div class="space-y-2">
							<span class="text-muted-foreground">Photos d'inspiration :</span>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{#each data.order.inspiration_photos as photo, index}
									<img
										src={photo}
										alt="Photo d'inspiration {index + 1}"
										class="aspect-square w-full rounded-lg border border-border object-cover"
									/>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Séparateur -->
					<div class="border-t pt-4">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-muted-foreground">Total :</span>
							<span class="font-normal"
								>{formatPrice(data.order.total_amount)}</span
							>
						</div>

						<div
							class="flex items-center justify-between font-medium text-blue-600"
						>
							<span>Acompte à payer maintenant :</span>
							<span>{formatPrice(depositAmount)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Paiement -->
			<div class="rounded-lg border bg-card p-6">
				<h2 class="mb-4 text-xl font-semibold">Paiement</h2>

				<div class="space-y-4">
					<!-- Référence de commande -->
					<div class="rounded-lg border border-orange-200 bg-orange-50 p-4">
						<p class="mb-2 text-sm font-medium text-orange-900">
							Référence à inclure dans le paiement :
						</p>
						<div class="flex items-center gap-2">
							<code
								class="flex-1 rounded bg-white px-3 py-2 text-center font-mono text-lg font-bold text-orange-900"
							>
								{data.order.order_ref}
							</code>
							<Button
								type="button"
								variant="outline"
								size="sm"
								on:click={copyOrderRef}
								class={`shrink-0 transition-all duration-200 ${
									copySuccess
										? 'border-green-300 bg-green-100 text-green-700'
										: ''
								}`}
							>
								{#if copySuccess}
									<Check class="h-4 w-4" />
								{:else}
									<Copy class="h-4 w-4" />
								{/if}
							</Button>
						</div>
						<p class="mt-2 text-xs text-orange-700">
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
						class="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0070ba] px-6 py-3 font-medium text-white transition-colors hover:bg-[#005ea6]"
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
					></form>
				</div>
			</div>
		</div>
	</div>

	<ClientFooter customizations={data.customizations} />
</div>
