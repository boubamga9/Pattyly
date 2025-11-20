<script lang="ts">
	import { WebsiteName } from '../../../config';
	import * as Section from '$lib/components/landing/section';
	import * as Pricing from '$lib/components/landing/pricing';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Star } from 'lucide-svelte';
	import { revealElement, revealStagger } from '$lib/utils/animations';
	import { onMount } from 'svelte';

	export let data;
	const { plans } = data;

	let headerTitle: HTMLElement;
	let headerDescription: HTMLElement;
	let plansContainer: HTMLElement;

	onMount(async () => {
		if (headerTitle) await revealElement(headerTitle, { delay: 0, duration: 0.6 });
		if (headerDescription) await revealElement(headerDescription, { delay: 0.1, duration: 0.6 });
		if (plansContainer) await revealStagger(plansContainer, ':scope > div', { delay: 0.2, stagger: 0.1 });
	});
</script>

<svelte:head>
	<title>Tarifs et abonnements - Logiciel gestion pâtisserie | {WebsiteName}</title>
	<meta
		name="description"
		content="Tarifs transparents pour logiciel gestion cake designers. Abonnements flexibles dès [prix]€/mois. Essai gratuit 7 jours sans CB. Crée ta boutique sans engagement."
	/>
	<meta
		name="keywords"
		content="tarifs pattyly, prix logiciel pâtisserie, abonnement cake designer, logiciel gestion pâtissier prix, tarif boutique en ligne pâtisserie, essai gratuit logiciel pâtisserie"
	/>
</svelte:head>

<div class="flex flex-col">
	<!-- Hero Section avec style premium -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<div class="text-center mb-20">
				<p class="text-sm font-semibold uppercase tracking-[0.3em] text-[#FF6F61]">
					Tarifs transparents
				</p>
				<h1 
					bind:this={headerTitle}
					class="mt-4 text-4xl font-semibold leading-[110%] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl xl:text-7xl"
					style="font-weight: 600; letter-spacing: -0.03em;"
				>
					Choisis ton <span class="text-[#FF6F61]">forfait</span>
				</h1>
				<p 
					bind:this={headerDescription}
					class="mt-6 mx-auto max-w-2xl text-lg leading-[180%] text-neutral-600 sm:text-xl md:text-2xl"
					style="font-weight: 300; letter-spacing: -0.01em;"
				>
					Démarre ton activité de pâtissier en ligne avec nos plans flexibles.
					Crée ta boutique, gère tes commandes et développe ton activité.
				</p>
				<div class="mt-8 flex items-center justify-center gap-4">
					<div class="h-px w-16 bg-neutral-300"></div>
					<div class="h-1.5 w-1.5 rounded-full bg-[#FF6F61]"></div>
					<div class="h-px w-16 bg-neutral-300"></div>
				</div>
			</div>
		</div>
	</section>

	<!-- Plans Section -->
	<section class="relative overflow-hidden bg-white py-24 sm:py-32 md:py-40">
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#FFE8D6]/5 to-transparent"></div>
		
		<div class="relative mx-auto max-w-6xl px-6 sm:px-8 lg:px-12">
			<Section.Root>

				<div
					bind:this={plansContainer}
					class="grid gap-12 md:mx-auto md:max-w-5xl md:grid-cols-2 md:gap-8"
				>
					{#each plans as plan}
						<div class="flex justify-center">
							<Pricing.Plan emphasized={plan.popular}>
								<Card.Root class="relative h-full rounded-3xl border-2 transition-all duration-300 hover:shadow-xl {plan.popular ? 'border-[#FF6F61] bg-gradient-to-br from-white via-[#FFE8D6]/20 to-white' : 'border-neutral-200 bg-white'}">
									{#if plan.popular}
										<div
											class="absolute -top-5 left-1/2 -translate-x-1/2 transform"
										>
											<Badge
												class="flex items-center gap-1 rounded-full bg-[#FF6F61] px-5 py-2 text-sm font-semibold text-white shadow-lg"
											>
												<Star class="h-4 w-4" />
												Le plus populaire
											</Badge>
										</div>
									{/if}

									<Card.Header class="pb-6">
										<Card.Title class="text-2xl font-semibold text-neutral-900">{plan.name}</Card.Title>
										<Card.Description class="mt-2 text-base text-neutral-600">
											7 jours d'essai gratuit, puis facturation mensuelle
										</Card.Description>
									</Card.Header>

									<Card.Content class="flex flex-col gap-8 pb-6">
										<div class="flex flex-col items-center gap-2">
											<div class="text-center">
												<span class="text-sm font-semibold text-green-600"
													>7 jours gratuits</span
												>
											</div>
											<div class="flex items-baseline justify-center gap-2">
												<span class="text-6xl font-bold tracking-tight text-neutral-900">
													{plan.price}€
												</span>
												<span class="text-lg text-neutral-600">/mois</span>
											</div>
										</div>

										<Button
											class="w-full h-14 text-base font-semibold transition-all duration-300 hover:scale-[1.02] {plan.popular
												? 'bg-[#FF6F61] hover:bg-[#e85a4f] shadow-lg hover:shadow-xl'
												: 'bg-neutral-800 hover:bg-neutral-700 shadow-lg hover:shadow-xl'}"
											href="/register"
										>
											Essayer gratuitement
										</Button>
									</Card.Content>

									<Card.Footer class="pt-6">
										<Pricing.PlanFeatures>
											{#each plan.features as feature}
												<Pricing.FeatureItem
													class="text-base {feature.includes('💬 Envoi de devis')
														? 'font-semibold text-[#FF6F61]'
														: 'text-neutral-700'}"
												>
													{feature}
												</Pricing.FeatureItem>
											{/each}
											{#each plan.limitations as limitation}
												<Pricing.FeatureItem class="text-base text-neutral-500">
													{limitation}
												</Pricing.FeatureItem>
											{/each}
										</Pricing.PlanFeatures>
									</Card.Footer>
								</Card.Root>
							</Pricing.Plan>
						</div>
					{/each}
				</div>
			</Section.Root>
		</div>
	</section>
</div>
