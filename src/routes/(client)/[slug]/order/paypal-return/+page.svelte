<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Confirmation du paiement...</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-background">
	<div class="text-center">
		<Loader2 class="mx-auto h-12 w-12 animate-spin text-primary" />
		<h1 class="mt-4 text-xl font-semibold">
			Confirmation de votre paiement...
		</h1>
		<p class="mt-2 text-muted-foreground">
			Merci ! Nous traitons votre commande, vous allez être redirigé.
		</p>
	</div>
</div>
