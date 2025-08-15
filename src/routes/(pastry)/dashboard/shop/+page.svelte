<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		Store,
		CreditCard,
		Upload,
		X,
		CheckCircle,
		AlertCircle,
		Crown,
		Copy,
	} from 'lucide-svelte';

	export let data: {
		shop: {
			id: string;
			name: string;
			bio: string;
			slug: string;
			logo_url: string | null;
			instagram?: string | null;
			tiktok?: string | null;
			website?: string | null;
		};
		stripeAccount: {
			id: string;
			stripe_account_id: string;
			is_active: boolean;
		} | null;
	};

	let loading = false;
	let error = '';
	let success = '';

	// Form data
	let name = data.shop.name;
	let bio = data.shop.bio;
	let slug = data.shop.slug;
	let logoPreview: string | null = data.shop.logo_url;
	let instagram = data.shop.instagram || '';
	let tiktok = data.shop.tiktok || '';
	let website = data.shop.website || '';

	// Handle file selection
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			// Validate file type
			if (!file.type.startsWith('image/')) {
				error = 'Veuillez sélectionner une image';
				return;
			}

			// Validate file size (1MB)
			if (file.size > 1 * 1024 * 1024) {
				error = "L'image ne doit pas dépasser 1MB";
				return;
			}

			error = '';

			// Create preview
			const reader = new FileReader();
			reader.onload = (e) => {
				logoPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	// Remove logo
	function removeLogo() {
		logoPreview = null;
	}

	// Copy shop URL to clipboard
	async function copyShopUrl() {
		const fullUrl = `https://pattyly.com/${slug}`;
		try {
			await navigator.clipboard.writeText(fullUrl);
			success = 'URL copiée dans le presse-papiers !';
			setTimeout(() => {
				success = '';
			}, 3000);
		} catch (err) {
			error = "Erreur lors de la copie de l'URL";
			setTimeout(() => {
				error = '';
			}, 3000);
		}
	}

	// Handle form result
	function handleResult(result: { type: string; data?: { error?: string } }) {
		if (result.type === 'success') {
			success = 'Mise à jour réussie';
			error = '';
			setTimeout(() => {
				success = '';
			}, 3000);
		} else if (result.type === 'failure') {
			error = result.data?.error || 'Une erreur est survenue';
			success = '';
		}
	}

	// Handle Stripe Connect result
	function handleStripeResult(result: {
		type: string;
		data?: { error?: string; redirectUrl?: string };
	}) {
		if (result.type === 'success' && result.data?.redirectUrl) {
			window.location.href = result.data.redirectUrl;
		} else if (result.type === 'failure') {
			error = result.data?.error || 'Une erreur est survenue';
		}
	}

	// Handle Stripe Billing result
	function handleBillingResult(result: {
		type: string;
		data?: { error?: string; redirectUrl?: string; success?: boolean };
	}) {
		console.log('📋 Résultat billing:', result);

		// Vérifier si c'est un succès avec une URL de redirection
		if (
			result.type === 'success' &&
			result.data?.success === true &&
			result.data?.redirectUrl
		) {
			console.log('🔄 Redirection vers:', result.data.redirectUrl);
			window.location.href = result.data.redirectUrl;
		}
		// Vérifier s'il y a une erreur (même avec type 'success' mais success: false)
		else if (result.data?.success === false || result.type === 'failure') {
			console.log('❌ Erreur billing:', result.data?.error);
			error = result.data?.error || 'Une erreur est survenue';
			success = '';
		}
	}
</script>

<svelte:head>
	<title>Paramètres de la boutique - Pattyly</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-3 md:p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-foreground">
			Paramètres de la boutique
		</h1>
		<p class="mt-2 text-muted-foreground">
			Gérez les informations de votre boutique et vos paramètres de paiement
		</p>
	</div>

	{#if error}
		<Alert class="mb-6">
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if success}
		<Alert class="mb-6">
			<AlertDescription class="text-green-600">{success}</AlertDescription>
		</Alert>
	{/if}

	<!-- Shop Information -->
	<Card>
		<CardHeader>
			<div class="flex items-center space-x-3">
				<Store class="h-6 w-6 text-primary" />
				<div>
					<CardTitle>Informations de la boutique</CardTitle>
					<CardDescription>
						Modifiez les informations de votre boutique
					</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<form
				method="POST"
				action="?/updateShop"
				use:enhance={() => {
					return async ({ result }) => {
						handleResult(result);
					};
				}}
				enctype="multipart/form-data"
			>
				<div class="space-y-6">
					<!-- Logo Upload -->
					<div class="space-y-2">
						<Label for="logo">Logo de la boutique</Label>

						{#if logoPreview}
							<!-- Logo preview -->
							<div class="mb-4 flex justify-center">
								<div class="relative">
									<img
										src={logoPreview}
										alt="Aperçu du logo"
										class="h-32 w-32 rounded-lg border-2 border-border object-cover"
									/>
									<button
										type="button"
										on:click={removeLogo}
										class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
									>
										<X class="h-4 w-4" />
									</button>
								</div>
							</div>
						{:else}
							<!-- File upload area -->
							<div class="mb-4 flex justify-center">
								<div
									class="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 transition-colors hover:border-primary"
									on:click={() => document.getElementById('logo')?.click()}
								>
									<Upload class="mb-2 h-8 w-8 text-muted-foreground" />
									<p class="text-center text-xs text-muted-foreground">
										Cliquez pour sélectionner votre logo
									</p>
								</div>
							</div>
						{/if}

						<input
							id="logo"
							name="logo"
							type="file"
							accept="image/*"
							on:change={handleFileSelect}
							class="hidden"
							disabled={loading}
						/>
						<input type="hidden" name="logoUrl" value={logoPreview || ''} />
					</div>

					<!-- Shop Name -->
					<div class="space-y-2">
						<Label for="name">Nom de la boutique</Label>
						<Input
							id="name"
							name="name"
							bind:value={name}
							placeholder="Ma Pâtisserie"
							required
						/>
					</div>

					<!-- Shop Slug -->
					<div class="space-y-2">
						<Label for="slug">URL de la boutique</Label>
						<div class="flex items-center space-x-2">
							<span class="text-sm text-muted-foreground">pattyly.com/</span>
							<Input
								id="slug"
								name="slug"
								bind:value={slug}
								placeholder="ma-patisserie"
								required
								class="flex-1"
							/>
							<Button
								type="button"
								variant="outline"
								size="icon"
								on:click={copyShopUrl}
								title="Copier l'URL complète"
								disabled={!slug}
							>
								<Copy class="h-4 w-4" />
							</Button>
						</div>
						<p class="mt-1 text-sm text-muted-foreground">
							L'URL de votre boutique publique
						</p>
					</div>

					<!-- Shop Description -->
					<div class="space-y-2">
						<Label for="bio">Description (optionnel)</Label>
						<Textarea
							id="bio"
							name="bio"
							bind:value={bio}
							placeholder="Décrivez votre boutique, vos spécialités..."
							rows={4}
						/>
					</div>

					<Separator />

					<!-- Social Media -->
					<div class="space-y-4">
						<h4 class="text-lg font-medium text-foreground">Réseaux sociaux</h4>

						<div class="space-y-2">
							<Label for="instagram">Instagram (optionnel)</Label>
							<Input
								id="instagram"
								name="instagram"
								bind:value={instagram}
								placeholder="@votre_compte"
							/>
						</div>

						<div class="space-y-2">
							<Label for="tiktok">TikTok (optionnel)</Label>
							<Input
								id="tiktok"
								name="tiktok"
								bind:value={tiktok}
								placeholder="@votre_compte"
							/>
						</div>

						<div class="space-y-2">
							<Label for="website">Site internet (optionnel)</Label>
							<Input
								id="website"
								name="website"
								bind:value={website}
								placeholder="https://votre-site.com"
								type="url"
							/>
						</div>
					</div>

					<Button type="submit" disabled={loading}>
						{loading ? 'Mise à jour...' : 'Mettre à jour la boutique'}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<!-- Stripe Connect -->
	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<CreditCard class="h-6 w-6 text-primary" />
					<div>
						<CardTitle>Paiements Stripe</CardTitle>
						<CardDescription>
							Configurez votre compte Stripe pour recevoir les paiements
						</CardDescription>
					</div>
				</div>
				{#if data.stripeAccount?.is_active}
					<div class="flex items-center space-x-2 text-green-600">
						<CheckCircle class="h-4 w-4" />
						<span class="text-sm font-medium">Compte activé</span>
					</div>
				{:else if data.stripeAccount}
					<div class="flex items-center space-x-2 text-orange-600">
						<AlertCircle class="h-4 w-4" />
						<span class="text-sm font-medium">En attente d'activation</span>
					</div>
				{/if}
			</div>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					{#if data.stripeAccount?.is_active}
						Votre compte Stripe est activé et vous pouvez recevoir des
						paiements.
					{:else if data.stripeAccount}
						Votre compte Stripe est en cours de configuration. Complétez
						l'activation pour recevoir des paiements.
					{:else}
						Connectez votre compte Stripe pour recevoir les paiements de vos
						clients.
					{/if}
				</p>

				<form
					method="POST"
					action="?/connectStripe"
					use:enhance={() => {
						return async ({ result }) => {
							handleStripeResult(result);
						};
					}}
				>
					<Button type="submit" variant="outline" disabled={loading}>
						<CreditCard class="mr-2 h-4 w-4" />
						{data.stripeAccount?.is_active
							? 'Gérer mon compte Stripe'
							: data.stripeAccount
								? "Compléter l'activation"
								: 'Connecter Stripe'}
					</Button>
				</form>
			</div>
		</CardContent>
	</Card>

	<!-- Gestion de l'abonnement -->
	<Card>
		<CardHeader>
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<Crown class="h-6 w-6 text-primary" />
					<div>
						<CardTitle>Gérer votre abonnement</CardTitle>
						<CardDescription>
							Accédez à votre espace abonnement pour modifier votre plan
						</CardDescription>
					</div>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<div class="space-y-4">
				<p class="text-sm text-muted-foreground">
					Modifiez votre plan d'abonnement, gérez vos factures et accédez à
					toutes les fonctionnalités de votre compte.
				</p>

				<div class="flex gap-2">
					<form
						method="POST"
						action="?/accessStripeBilling"
						use:enhance={() => {
							return async ({ result }) => {
								handleBillingResult(result);
							};
						}}
					>
						<Button type="submit" variant="outline" disabled={loading}>
							<Crown class="mr-2 h-4 w-4" />
							Gérer votre abonnement
						</Button>
					</form>
				</div>
			</div>
		</CardContent>
	</Card>
</div>
