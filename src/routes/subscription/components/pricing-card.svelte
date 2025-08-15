<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, X, Star } from 'lucide-svelte';

	export let plan: {
		id: string;
		name: string;
		price: number;
		currency: string;
		stripePriceId: string;
		features: string[];
		limitations: string[];
		popular: boolean;
	};

	export let onSelect: (planId: string) => void;
	export let isLoading = false;
</script>

<Card
	class="relative {plan.popular
		? 'shadow-lg ring-2 ring-orange-500'
		: ''} transition-all duration-300 hover:shadow-xl"
>
	{#if plan.popular}
		<div class="absolute -top-4 left-1/2 -translate-x-1/2 transform">
			<Badge
				class="flex items-center gap-1 rounded-full bg-orange-500 px-4 py-1 text-white"
			>
				<Star class="h-4 w-4" />
				Le plus populaire
			</Badge>
		</div>
	{/if}

	<CardHeader class="pb-4 text-center">
		<CardTitle class="text-2xl font-bold text-gray-900">
			{plan.name}
		</CardTitle>
		<div class="flex items-baseline justify-center gap-1">
			<span class="text-4xl font-bold text-gray-900">
				{plan.price}€
			</span>
			<span class="text-gray-600">/mois</span>
		</div>
		<CardDescription class="text-gray-600">
			Facturation mensuelle, annulable à tout moment
		</CardDescription>
	</CardHeader>

	<CardContent class="space-y-4">
		<!-- Fonctionnalités incluses -->
		<div class="space-y-3">
			<h4 class="font-semibold text-gray-900">Inclus :</h4>
			{#each plan.features as feature}
				<div class="flex items-center gap-3">
					<Check class="h-5 w-5 flex-shrink-0 text-green-500" />
					<span class="text-gray-700">{feature}</span>
				</div>
			{/each}
		</div>

		<!-- Limitations -->
		{#if plan.limitations.length > 0}
			<div class="space-y-3 border-t border-gray-200 pt-4">
				<h4 class="font-semibold text-gray-900">Limitations :</h4>
				{#each plan.limitations as limitation}
					<div class="flex items-center gap-3">
						<X class="h-5 w-5 flex-shrink-0 text-red-500" />
						<span class="text-gray-600">{limitation}</span>
					</div>
				{/each}
			</div>
		{/if}
	</CardContent>

	<CardFooter class="pt-6">
		<Button
			class="w-full {plan.popular
				? 'bg-orange-500 hover:bg-orange-600'
				: 'bg-gray-900 hover:bg-gray-800'}"
			on:click={() => onSelect(plan.stripePriceId)}
			disabled={isLoading}
		>
			{#if isLoading}
				Chargement...
			{:else}
				Choisir {plan.name}
			{/if}
		</Button>
	</CardFooter>
</Card>
