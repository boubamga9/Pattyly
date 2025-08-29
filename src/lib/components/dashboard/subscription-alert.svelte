<script lang="ts">
	import {
		Alert,
		AlertDescription,
		AlertTitle,
	} from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { AlertTriangle, ExternalLink } from 'lucide-svelte';

	export let hasInactiveSubscription: boolean = false;
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
{/if}
