<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
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
	import { Textarea } from '$lib/components/ui/textarea';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import {
		CheckCircle,
		Store,
		CreditCard,
		ArrowRight,
		Upload,
		X,
	} from 'lucide-svelte';

	export let data: {
		step: number;
		shop: {
			id: string;
			name: string;
			bio: string;
			slug: string;
			logo_url: string;
		} | null;
	};

	let step = data.step;
	let shop = data.shop;
	let loading = false;
	let error = '';

	// Form data for step 1
	let name = '';
	let bio = '';
	let slug = '';
	let logoFile: File | null = null;
	let logoPreview: string | null = null;

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

			logoFile = file;
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
		logoFile = null;
		logoPreview = null;
	}

	// Handle form submission for step 1
	function handleCreateShop() {
		loading = true;
		error = '';
	}

	// Handle Stripe Connect
	function handleConnectStripe() {
		loading = true;
		error = '';
	}

	// Handle form result
	function handleResult(result: {
		type: string;
		data?: {
			shop?: {
				id: string;
				name: string;
				bio: string;
				slug: string;
				logo_url: string;
			};
			url?: string;
			error?: string;
		};
	}) {
		loading = false;

		if (result.type === 'success') {
			if (result.data?.shop) {
				// Shop created successfully, move to step 2
				step = 2;
				shop = result.data.shop;
			} else if (result.data?.url) {
				// Redirect to Stripe Connect
				console.log('🔄 Redirecting to Stripe Connect:', result.data.url);
				window.location.href = result.data.url;
			}
		} else if (result.type === 'failure') {
			error = result.data?.error || 'Une erreur est survenue';
		}
	}

	// Check URL parameters for Stripe return
	onMount(() => {
		if ($page.url.searchParams.get('success') === 'true') {
			// Stripe Connect completed successfully
			goto('/dashboard');
		}
	});
</script>

<svelte:head>
	<title>Configuration de votre boutique - Pattyly</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-secondary to-background py-12">
	<div class="container mx-auto max-w-2xl px-4">
		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="mb-6 text-3xl font-bold text-foreground">
				Configuration de votre boutique
			</h1>

			<!-- Steps indicator -->
			<div class="flex items-center justify-center space-x-4">
				<div class="flex items-center space-x-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full {step >=
						1
							? 'bg-primary text-primary-foreground'
							: 'bg-muted text-muted-foreground'} border-2 border-primary/20"
					>
						{#if step >= 1}
							<CheckCircle class="h-5 w-5" />
						{:else}
							<span class="text-sm font-medium">1</span>
						{/if}
					</div>
					<div class="text-left">
						<p class="text-sm font-medium text-foreground">Informations</p>
						<p class="text-xs text-muted-foreground">Nom, logo, description</p>
					</div>
				</div>

				<div class="h-px w-8 bg-border"></div>

				<div class="flex items-center space-x-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full {step >=
						2
							? 'bg-primary text-primary-foreground'
							: 'bg-muted text-muted-foreground'} border-2 border-primary/20"
					>
						{#if step >= 2}
							<CheckCircle class="h-5 w-5" />
						{:else}
							<span class="text-sm font-medium">2</span>
						{/if}
					</div>
					<div class="text-left">
						<p class="text-sm font-medium text-foreground">Paiements</p>
						<p class="text-xs text-muted-foreground">Connexion Stripe</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Step 1: Shop Creation -->
		{#if step === 1}
			<Card class="w-full">
				<CardHeader>
					<div class="flex items-center space-x-3">
						<Store class="h-6 w-6 text-primary" />
						<div>
							<CardTitle>Informations de votre boutique</CardTitle>
							<CardDescription>
								Configurez les informations de base de votre boutique de
								pâtisserie
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{#if error}
						<Alert class="mb-4">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					{/if}

					<form
						method="POST"
						action="?/createShop"
						use:enhance={() => {
							handleCreateShop();
							return async ({ result }) => {
								handleResult(result);
							};
						}}
						enctype="multipart/form-data"
					>
						<div class="space-y-4">
							<div>
								<Label for="logo">Logo</Label>

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
							</div>

							<div>
								<Label for="name">Nom de la boutique *</Label>
								<Input
									id="name"
									name="name"
									bind:value={name}
									placeholder="Ex: Pâtisserie du Bonheur"
									required
									disabled={loading}
								/>
							</div>

							<div>
								<Label for="slug">URL de votre boutique *</Label>
								<div class="flex items-center space-x-2">
									<span class="text-muted-foreground">pattyly.com/</span>
									<Input
										id="slug"
										name="slug"
										bind:value={slug}
										placeholder="ma-boutique"
										required
										disabled={loading}
										class="flex-1"
									/>
								</div>
								<p class="mt-1 text-sm text-muted-foreground">
									Seulement des lettres minuscules, chiffres et tirets
								</p>
							</div>

							<div>
								<Label for="bio">Description</Label>
								<Textarea
									id="bio"
									name="bio"
									bind:value={bio}
									placeholder="Décrivez votre boutique, vos spécialités..."
									rows={3}
									disabled={loading}
								/>
							</div>

							<Button type="submit" class="w-full" disabled={loading}>
								{#if loading}
									Configuration...
								{:else}
									Créer ma boutique
								{/if}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		{/if}

		<!-- Step 2: Stripe Connect -->
		{#if step === 2}
			<Card class="w-full">
				<CardHeader>
					<div class="flex items-center space-x-3">
						<CreditCard class="h-6 w-6 text-primary" />
						<div>
							<CardTitle>Connexion Stripe</CardTitle>
							<CardDescription>
								Connectez votre compte Stripe pour recevoir les paiements
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{#if shop}
						<div
							class="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4"
						>
							<div class="flex items-center space-x-3">
								<CheckCircle class="h-5 w-5 text-primary" />
								<div>
									<h3 class="font-medium text-primary">Boutique créée !</h3>
									<p class="text-sm text-muted-foreground">
										{shop.name} - pattyly.com/{shop.slug}
									</p>
								</div>
							</div>
						</div>
					{/if}

					{#if error}
						<Alert class="mb-4">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					{/if}

					<div class="space-y-4">
						<div class="text-center">
							<p class="mb-4 text-muted-foreground">
								Pour recevoir les paiements de vos clients, vous devez connecter
								votre compte Stripe. Cette étape est obligatoire et sécurisée.
							</p>
						</div>

						<form
							method="POST"
							action="?/connectStripe"
							use:enhance={() => {
								handleConnectStripe();
								return async ({ result }) => {
									handleResult(result);
								};
							}}
						>
							<Button type="submit" class="w-full" disabled={loading}>
								{#if loading}
									Connexion en cours...
								{:else}
									<CreditCard class="mr-2 h-4 w-4" />
									Se connecter à Stripe
								{/if}
							</Button>
						</form>

						<div class="text-center">
							<p class="text-xs text-muted-foreground">
								En continuant, vous acceptez les conditions d'utilisation de
								Stripe
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
