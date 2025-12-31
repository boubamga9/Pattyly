<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, Crown, Sparkles, CreditCard, Smartphone, Users, Zap, ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	// Compte à rebours
	const deadline = new Date('2026-01-31T23:59:59').getTime();
	let timeLeft = {
		days: 0,
		hours: 0,
		minutes: 0,
		seconds: 0
	};
	let intervalId: ReturnType<typeof setInterval> | null = null;

	function updateCountdown() {
		const now = new Date().getTime();
		const distance = deadline - now;

		if (distance < 0) {
			timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };
			return;
		}

		timeLeft = {
			days: Math.floor(distance / (1000 * 60 * 60 * 24)),
			hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
			minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
			seconds: Math.floor((distance % (1000 * 60)) / 1000)
		};
	}

	onMount(() => {
		updateCountdown();
		intervalId = setInterval(updateCountdown, 1000);
	});

	onDestroy(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}
	});
</script>

<svelte:head>
	<title>Accès à vie - Offre limitée | Pattyly</title>
	<meta
		name="description"
		content="Accédez à toutes les fonctionnalités Premium à vie avec notre accès à vie. Offre limitée jusqu'au 31 janvier 2026."
	/>
</svelte:head>

{#if data.hasLifetimePlan}
	<!-- Page pour utilisateurs qui ont déjà l'accès à vie -->
	<div class="flex min-h-screen items-center justify-center px-4 py-20">
		<div class="mx-auto max-w-2xl text-center">
			<div class="mb-6 inline-flex items-center gap-2 rounded-full bg-[#FF6F61] px-4 py-2 text-white">
				<Crown class="h-5 w-5" />
				<span class="font-semibold">Plan actif</span>
			</div>
			<h1 class="mb-4 text-4xl font-bold text-neutral-900 sm:text-5xl">
				Accès à vie activé 🎉
			</h1>
			<p class="mb-8 text-lg text-neutral-600">
				Félicitations ! Vous avez accès à toutes les fonctionnalités Premium à vie.
			</p>
			<Button variant="outline" href="/dashboard">
				Retour au dashboard
			</Button>
		</div>
	</div>
{:else}
	<!-- Page pour utilisateurs qui n'ont pas encore le plan - Design premium avec vh -->
	<div class="flex min-h-screen flex-col lg:h-screen lg:overflow-hidden">
		<section class="relative flex min-h-screen flex-col bg-[#FF6F61] lg:h-full lg:overflow-hidden">
			<div class="absolute inset-0 opacity-20" style="background-image: url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>
			
			<div class="relative z-10 flex h-full flex-col">
				<!-- Header avec badge centré -->
				<div class="mb-8 flex justify-center px-6 pt-8 sm:px-8 sm:pt-10">
					<div class="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-white backdrop-blur-sm">
						<Sparkles class="h-3.5 w-3.5" />
						<span class="text-xs font-semibold">Offre limitée</span>
					</div>
				</div>

				<!-- Contenu principal avec structure verticale -->
				<div class="flex flex-1 flex-col justify-between px-6 pb-8 sm:px-8 sm:pb-10">
					<div class="mx-auto w-full max-w-7xl">
						<!-- 1. Compte à rebours en haut -->
						<div class="mb-12 text-center">
							<p class="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/80">
								L'offre se termine dans
							</p>
							<div class="grid grid-cols-4 gap-1.5 max-w-md mx-auto">
								<div class="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
									<div class="text-lg font-bold text-white sm:text-xl">{timeLeft.days}</div>
									<div class="mt-0.5 text-xs text-white/80">Jours</div>
								</div>
								<div class="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
									<div class="text-lg font-bold text-white sm:text-xl">{timeLeft.hours}</div>
									<div class="mt-0.5 text-xs text-white/80">Heures</div>
								</div>
								<div class="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
									<div class="text-lg font-bold text-white sm:text-xl">{timeLeft.minutes}</div>
									<div class="mt-0.5 text-xs text-white/80">Min</div>
								</div>
								<div class="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
									<div class="text-lg font-bold text-white sm:text-xl">{timeLeft.seconds}</div>
									<div class="mt-0.5 text-xs text-white/80">Sec</div>
								</div>
							</div>
						</div>

						<!-- 2. Texte au milieu (titre, prix, CTA) -->
						<div class="mb-12 text-center">
							<h1 class="mb-1.5 text-2xl font-bold text-white sm:text-3xl lg:text-4xl" style='font-weight: 700; letter-spacing: -0.03em;'>
								Accès à vie
							</h1>
							<p class="mb-3 text-sm text-white/90 sm:text-base" style='font-weight: 300;'>
								Accédez à toutes les fonctionnalités Premium pour toujours
							</p>

							<!-- Prix -->
							<div class="mb-3">
								<div class="mb-0.5 text-3xl font-bold text-white sm:text-4xl">
									149€
								</div>
								<p class="text-xs text-white/80">
									Paiement unique • Pas d'abonnement
								</p>
							</div>

							<!-- CTA -->
							{#if data.stripePriceId}
								<Button
									href="/checkout/{data.stripePriceId}"
									class="mb-1.5 h-11 w-full max-w-xs rounded-xl bg-white px-4 text-sm font-semibold text-[#FF6F61] shadow-xl transition-all duration-300 hover:scale-105 hover:bg-white/95 sm:h-12"
								>
									<Crown class="mr-2 h-4 w-4" />
									Obtenir l'accès à vie
								</Button>
							{:else}
								<Button
									disabled
									class="mb-1.5 h-11 w-full max-w-xs rounded-xl bg-white/50 px-4 text-sm font-semibold text-white cursor-not-allowed sm:h-12"
								>
									Configuration en cours...
								</Button>
							{/if}
							
							<p class="text-xs text-white/70">
								✅ Annulation automatique de votre abonnement
							</p>
						</div>

						<!-- 3. Fonctionnalités à venir en horizontal -->
						<div class="text-center">
							<Badge class="mb-3 bg-white/20 text-white backdrop-blur-sm text-xs">
								<Zap class="mr-1 h-3 w-3" />
								À venir
							</Badge>
							<h3 class="mb-6 text-sm font-bold text-white">Fonctionnalités à venir</h3>
							
							<div class="grid gap-4 sm:grid-cols-3">
								<!-- Paiement Stripe -->
								<div class="group relative overflow-hidden rounded-xl border border-white/40 bg-white/25 p-4 backdrop-blur-md shadow-xl transition-all duration-300 hover:bg-white/35 hover:shadow-2xl">
									<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/30 mx-auto transition-transform duration-300 group-hover:scale-110">
										<CreditCard class="h-5 w-5 text-white" />
									</div>
									<h4 class="mb-1.5 text-center text-sm font-bold text-white drop-shadow-sm">Paiement Stripe</h4>
									<p class="text-center text-xs text-white/90 leading-relaxed drop-shadow-sm">
										Paiements en ligne sécurisés directement sur votre boutique
									</p>
									<div class="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/10 blur-xl transition-opacity duration-300 group-hover:opacity-0"></div>
								</div>

								<!-- Système d'affiliation -->
								<div class="group relative overflow-hidden rounded-xl border border-white/40 bg-white/25 p-4 backdrop-blur-md shadow-xl transition-all duration-300 hover:bg-white/35 hover:shadow-2xl">
									<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/30 mx-auto transition-transform duration-300 group-hover:scale-110">
										<Users class="h-5 w-5 text-white" />
									</div>
									<h4 class="mb-1.5 text-center text-sm font-bold text-white drop-shadow-sm">Système d'affiliation</h4>
									<p class="text-center text-xs text-white/90 leading-relaxed drop-shadow-sm">
										30% de l'abonnement mensuel de chaque personne que vous parrainez pendant 1 an
									</p>
									<div class="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/10 blur-xl transition-opacity duration-300 group-hover:opacity-0"></div>
								</div>

								<!-- Application mobile -->
								<div class="group relative overflow-hidden rounded-xl border border-white/40 bg-white/25 p-4 backdrop-blur-md shadow-xl transition-all duration-300 hover:bg-white/35 hover:shadow-2xl">
									<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/30 mx-auto transition-transform duration-300 group-hover:scale-110">
										<Smartphone class="h-5 w-5 text-white" />
									</div>
									<h4 class="mb-1.5 text-center text-sm font-bold text-white drop-shadow-sm">Application mobile</h4>
									<p class="text-center text-xs text-white/90 leading-relaxed drop-shadow-sm">
										App iOS et Android pour gérer votre activité depuis votre téléphone
									</p>
									<div class="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/10 blur-xl transition-opacity duration-300 group-hover:opacity-0"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
{/if}
