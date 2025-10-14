<script lang="ts">
	import {
		Alert,
		AlertDescription,
		AlertTitle,
	} from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle, ExternalLink } from 'lucide-svelte';

	export let hasInactiveSubscription: boolean = false;
	export let trialEnding: string | null = null;
	export let isTrialActive: boolean = false;

	// Calculer les jours restants
	$: daysRemaining = trialEnding
		? Math.ceil(
				(new Date(trialEnding).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
			)
		: 0;

	// La bannière d'essai s'affiche si isTrialActive = true (calculé côté serveur)
	$: showTrialBanner = isTrialActive && daysRemaining > 0;
</script>

{#if hasInactiveSubscription}
	<Alert class="mb-6 border-[#FF6F61] bg-[#FFF1F0] text-[#8B1A1A]">
		<AlertTriangle class="h-4 w-4 text-[#FF6F61]" />
		<AlertTitle>Boutique temporairement désactivée</AlertTitle>
		<AlertDescription class="mt-2">
			<p class="mb-3">
				Votre boutique n'est plus visible par les clients. Pour la réactiver et
				continuer à recevoir des commandes, vous devez souscrire à un plan
				d'abonnement.
			</p>
			<Button
				href="/subscription"
				class="bg-[#FF6F61] text-white transition-colors duration-200 hover:bg-[#e85a4f]"
			>
				<ExternalLink class="mr-2 h-4 w-4" />
				Réactiver ma boutique
			</Button>
		</AlertDescription>
	</Alert>
{:else if showTrialBanner}
	<Alert class="mb-6 border-[#4A90E2] bg-[#EBF5FF] text-[#1E3A5F]">
		<AlertTriangle class="h-4 w-4 text-[#4A90E2]" />
		<AlertTitle
			>Essai gratuit : {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining >
			1
				? 's'
				: ''}</AlertTitle
		>
		<AlertDescription class="mt-2">
			<p class="mb-3">
				Profitez de toutes les fonctionnalités Premium sans limite ! Pour
				continuer après votre période d'essai, choisissez un plan adapté à vos
				besoins.
			</p>
			<Button
				href="/subscription"
				class="bg-[#4A90E2] text-white transition-colors duration-200 hover:bg-[#357ABD]"
			>
				<ExternalLink class="mr-2 h-4 w-4" />
				Choisir mon plan
			</Button>
		</AlertDescription>
	</Alert>
{/if}
