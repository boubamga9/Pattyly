<script lang="ts">
	import ShopForm from './shop-form.svelte';
	import CustomizationForm from './customization-form.svelte';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { formSchema } from './schema';
	import { customizationSchema } from './customization-schema';
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
		customizationForm: SuperValidated<Infer<typeof customizationSchema>>;
	};

	let error = '';
	let success = '';
</script>

<svelte:head>
	<title>Ma boutique - Pattyly</title>
</svelte:head>

<div class="container mx-auto space-y-8 p-4 md:p-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">
			Paramètres de la boutique
		</h1>
		<p class="mt-3 text-muted-foreground">
			Gérez les informations de votre boutique et sa personnalisation
		</p>
	</div>

	{#if error}
		<Alert class="mb-8">
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if success}
		<Alert class="mb-8">
			<AlertDescription class="text-green-600">{success}</AlertDescription>
		</Alert>
	{/if}

	<!-- Shop Information -->
	<Card class="shadow-sm">
		<CardHeader class="pb-6">
			<div class="flex items-center space-x-4">
				<Store class="h-7 w-7 text-primary" />
				<div>
					<CardTitle class="text-xl">Informations de la boutique</CardTitle>
					<CardDescription class="text-base">
						Modifiez les informations de votre boutique
					</CardDescription>
				</div>
			</div>
		</CardHeader>
		<CardContent class="pt-0">
			<ShopForm data={data.form} />
		</CardContent>
	</Card>

	<!-- Customization -->
	<CustomizationForm form={data.customizationForm} />
</div>
