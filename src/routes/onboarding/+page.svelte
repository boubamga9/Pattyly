<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Check, Store } from 'lucide-svelte';
	import OnboardingForm from './onboarding-form.svelte';
	import PaymentForm from './payment-form.svelte';
	import DirectoryForm from '$lib/components/directory/directory-form.svelte';

	export let data: {
		step: number;
		shop: {
			id: string;
			name: string;
			bio?: string;
			slug: string;
			logo_url: string | null;
			directory_city?: string | null;
			directory_actual_city?: string | null;
			directory_postal_code?: string | null;
			directory_cake_types?: string[] | null;
			directory_enabled?: boolean | null;
		} | null;
		form: any;
		paypalPolling?: boolean;
		paypalStatus?: string;
		stripeConnectAccount?: {
			id: string;
			is_active: boolean;
			charges_enabled: boolean;
			payouts_enabled: boolean;
			stripe_account_id: string;
		} | null;
	};

	// Supprimer l'export form qui n'est pas utilisé

	let error = '';

	// Variables réactives qui se mettent à jour avec data
	$: step = data.step;
	$: shop = data.shop;

	// ✅ Tracking: Page view côté client (onboarding page)
	onMount(() => {
		import('$lib/utils/analytics').then(({ logPageView }) => {
			const supabase = $page.data.supabase;
			if (supabase) {
				logPageView(supabase, {
					page: '/onboarding',
					step: data.step
				}).catch((err: unknown) => {
					console.error('Error tracking page_view:', err);
				});
			}
		});
	});
</script>

<svelte:head>
	<title>Onboarding - Pattyly</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-secondary to-background py-12">
	<div class="container mx-auto max-w-2xl px-4">
		<!-- Header -->
		<div class="mb-8">
			<h1 class="mb-8 text-center text-3xl font-bold text-foreground sm:mb-10 sm:text-4xl">
				Configuration de votre boutique
			</h1>

			<!-- Steps indicator - Design moderne et responsive -->
			<div class="relative px-2 sm:px-0">
				<!-- Progress bar -->
				<div class="absolute left-2 right-2 top-5 h-0.5 bg-neutral-200 sm:left-6 sm:right-6 sm:top-6">
					<div
						class="h-full bg-[#FF6F61] transition-all duration-500 ease-out"
						style="width: {((step - 1) / 2) * 100}%"
					></div>
				</div>

				<!-- Steps -->
				<div class="relative flex items-start justify-between gap-2 sm:gap-4">
					<!-- Step 1 -->
					<div class="flex flex-1 flex-col items-center">
					<div
							class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-12 sm:w-12 {step >=
						1
								? 'border-[#FF6F61] bg-[#FF6F61] text-white shadow-lg shadow-[#FF6F61]/20'
								: step === 1
									? 'border-[#FF6F61] bg-white text-[#FF6F61]'
									: 'border-neutral-300 bg-white text-neutral-400'}"
					>
							{#if step > 1}
								<Check class="h-5 w-5 sm:h-6 sm:w-6" />
						{:else}
								<span class="text-sm font-semibold sm:text-base">1</span>
						{/if}
					</div>
						<!-- Labels mobiles -->
						<div class="mt-2 text-center sm:hidden">
							<p class="text-xs font-medium {step >= 1 ? 'text-[#FF6F61]' : 'text-neutral-500'}">
								Informations
							</p>
						</div>
						<!-- Labels desktop -->
						<div class="mt-3 hidden text-center sm:block">
							<p class="text-sm font-semibold {step >= 1 ? 'text-[#FF6F61]' : 'text-neutral-600'}">
								Informations
							</p>
							<p class="mt-1 text-xs text-neutral-500">Nom, logo, description</p>
					</div>
				</div>

					<!-- Step 2 -->
					<div class="flex flex-1 flex-col items-center">
					<div
							class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-12 sm:w-12 {step >=
						2
								? 'border-[#FF6F61] bg-[#FF6F61] text-white shadow-lg shadow-[#FF6F61]/20'
								: step === 2
									? 'border-[#FF6F61] bg-white text-[#FF6F61]'
									: 'border-neutral-300 bg-white text-neutral-400'}"
					>
							{#if step > 2}
								<Check class="h-5 w-5 sm:h-6 sm:w-6" />
						{:else}
								<span class="text-sm font-semibold sm:text-base">2</span>
						{/if}
					</div>
						<!-- Labels mobiles -->
						<div class="mt-2 text-center sm:hidden">
							<p class="text-xs font-medium {step >= 2 ? 'text-[#FF6F61]' : 'text-neutral-500'}">
								Paiement
							</p>
						</div>
						<!-- Labels desktop -->
						<div class="mt-3 hidden text-center sm:block">
							<p class="text-sm font-semibold {step >= 2 ? 'text-[#FF6F61]' : 'text-neutral-600'}">
								Paiement
							</p>
							<p class="mt-1 text-xs text-neutral-500">Méthodes de paiement</p>
					</div>
				</div>

					<!-- Step 3 -->
					<div class="flex flex-1 flex-col items-center">
					<div
							class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-12 sm:w-12 {step >=
						3
								? 'border-[#FF6F61] bg-[#FF6F61] text-white shadow-lg shadow-[#FF6F61]/20'
								: step === 3
									? 'border-[#FF6F61] bg-white text-[#FF6F61]'
									: 'border-neutral-300 bg-white text-neutral-400'}"
					>
							{#if step > 3}
								<Check class="h-5 w-5 sm:h-6 sm:w-6" />
						{:else}
								<span class="text-sm font-semibold sm:text-base">3</span>
						{/if}
					</div>
						<!-- Labels mobiles -->
						<div class="mt-2 text-center sm:hidden">
							<p class="text-xs font-medium {step >= 3 ? 'text-[#FF6F61]' : 'text-neutral-500'}">
								Annuaire
							</p>
						</div>
						<!-- Labels desktop -->
						<div class="mt-3 hidden text-center sm:block">
							<p class="text-sm font-semibold {step >= 3 ? 'text-[#FF6F61]' : 'text-neutral-600'}">
								Annuaire
							</p>
							<p class="mt-1 text-xs text-neutral-500">Inscription à l'annuaire</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Error Alert -->
		{#if error}
			<Alert class="mb-6" variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		{/if}

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
					<OnboardingForm data={data.form} />
				</CardContent>
			</Card>
		{/if}

		<!-- Step 2: Payment Methods -->
		{#if step === 2}
			<Card class="w-full">
				<CardHeader>
					<div class="flex items-center space-x-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="mr-2 h-8 w-8 text-[#FF6F61]"
						>
							<rect width="20" height="14" x="2" y="5" rx="2" />
							<line x1="2" x2="22" y1="10" y2="10" />
						</svg>
						<div>
							<CardTitle>Configuration des méthodes de paiement</CardTitle>
							<CardDescription>
								Configurez une méthode de paiement pour recevoir les paiements. Vous pouvez configurer PayPal, Revolut, Wero ou Stripe. Vous pourrez configurer les autres dans votre espace.
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<!-- Formulaire de configuration des méthodes de paiement -->
					<PaymentForm data={data.form} stripeConnectAccount={data.stripeConnectAccount} />
				</CardContent>
			</Card>
		{/if}

		<!-- Step 3: Annuaire -->
		{#if step === 3}
			<Card class="w-full">
				<CardHeader>
					<div class="flex items-center space-x-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="h-6 w-6 text-primary"
						>
							<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
							<circle cx="12" cy="10" r="3" />
						</svg>
						<div>
							<CardTitle>Inscription à l'annuaire</CardTitle>
							<CardDescription>
								Renseignez vos informations pour apparaître dans l'annuaire des pâtissiers
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<DirectoryForm data={data.form} shop={shop} showSkipButton={true} />
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
