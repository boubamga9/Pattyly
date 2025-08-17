<script lang="ts">
	import ShopForm from './shop-form.svelte';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { formSchema } from './schema';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Store } from 'lucide-svelte';

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
		form: SuperValidated<Infer<typeof formSchema>>;
	};

	let error = '';
	let success = '';
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
			<ShopForm data={data.form} />
		</CardContent>
	</Card>
</div>
