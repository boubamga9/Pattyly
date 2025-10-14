<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Sparkles, Users, Lightbulb, Lock, ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	export let data: PageData;

	const savingsPercent = Math.round(
		((data.normalPrice - data.earlyAdopterPrice) / data.normalPrice) * 100,
	);
</script>

<svelte:head>
	<title>Offre Early Adopter - Pattyly</title>
	<meta
		name="description"
		content="Rejoignez les 30 premiers pâtissiers sur Pattyly et bénéficiez d'un tarif exclusif à vie."
	/>
</svelte:head>

<div
	class="flex min-h-screen w-full flex-col justify-center bg-gradient-to-br from-[#FFE8D6] via-[#FFF5E1] to-[#FFE8D6] px-6 py-12"
>
	<div class="mx-auto max-w-2xl text-center">
		<!-- Badge Offre limitée -->
		<div class="mb-6 flex justify-center">
			<Badge
				class="flex items-center gap-2 rounded-full bg-[#FF6F61] px-4 py-1.5 text-sm text-white shadow-md"
			>
				<Sparkles class="h-4 w-4" />
				Offre réservée aux 30 premiers utilisateurs
			</Badge>
		</div>

		<!-- Titre principal -->
		<h1
			class="mb-4 text-3xl font-bold leading-tight text-neutral-800 md:text-4xl"
		>
			🎉 Bienvenue parmi les premiers pâtissiers de Pattyly !
		</h1>

		<!-- Sous-titre -->
		<p class="mb-8 text-base leading-relaxed text-neutral-700">
			Vous accédez dès maintenant au plan Premium à prix réduit et à vie 🍰<br
			/>
			Cette opportunité est réservée aux pionniers qui construisent la communauté
			Pattyly.
		</p>

		<!-- Bloc Prix -->
		<div class="mb-8">
			<div class="mb-2 flex items-center justify-center gap-2">
				<span class="text-xl font-semibold text-neutral-500 line-through"
					>{data.normalPrice}€</span
				>
				<Badge class="bg-[#FFB6A3] text-sm text-neutral-800"
					>-{savingsPercent}%</Badge
				>
			</div>

			<div class="flex items-baseline justify-center gap-2">
				<span class="text-5xl font-bold tracking-tight text-[#FF6F61]"
					>{data.earlyAdopterPrice}€</span
				>
				<span class="text-xl text-neutral-600">/mois</span>
			</div>

			<p class="mt-2 text-base font-semibold text-[#FF6F61]">
				🔒 Prix garanti à vie — même si les tarifs évoluent
			</p>
		</div>

		<!-- Bénéfices -->
		<div class="mb-6 space-y-4 text-left">
			<div class="flex items-start gap-3">
				<div class="flex-shrink-0 rounded-full bg-[#FF6F61] p-1.5">
					<Lock class="h-4 w-4 text-white" />
				</div>
				<div>
					<h3 class="text-sm font-semibold text-neutral-800">
						Aucun changement de prix
					</h3>
					<p class="text-xs text-neutral-600">
						Votre abonnement restera toujours à <strong
							>{data.earlyAdopterPrice}€/mois</strong
						>, même quand les tarifs évolueront.
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="flex-shrink-0 rounded-full bg-[#FF6F61] p-1.5">
					<Users class="h-4 w-4 text-white" />
				</div>
				<div>
					<h3 class="text-sm font-semibold text-neutral-800">
						Rejoignez un groupe privé de 30 pâtissiers
					</h3>
					<p class="text-xs text-neutral-600">
						Échangez, partagez vos expériences et grandissez ensemble dans une
						communauté exclusive.
					</p>
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="flex-shrink-0 rounded-full bg-[#FF6F61] p-1.5">
					<Lightbulb class="h-4 w-4 text-white" />
				</div>
				<div>
					<h3 class="text-sm font-semibold text-neutral-800">
						Donnez votre avis sur les prochaines fonctionnalités
					</h3>
					<p class="text-xs text-neutral-600">
						En tant que membre fondateur, vos suggestions seront <strong
							>écoutées en priorité</strong
						>.
					</p>
				</div>
			</div>
		</div>

		<!-- Avertissement -->
		<div class="mb-6 rounded-lg p-3 text-center">
			<p class="text-xs font-medium text-[#E85A4F]">
				⚠️ Cette offre exceptionnelle de lancement ne sera plus jamais
				disponible.
			</p>
		</div>

		<!-- Bouton principal -->
		<div class="mb-8">
			<Button
				href="/checkout/{data.stripePriceId}"
				class="h-14 w-full rounded-xl bg-[#FF6F61] text-base font-semibold text-white shadow-md transition-transform duration-200 hover:scale-105 hover:bg-[#e85a4f]"
			>
				🎂 Je profite de l'offre
				<ArrowRight class="ml-2 h-5 w-5" />
			</Button>
		</div>

		<!-- Séparateur -->
		<div class="mb-8">
			<Separator class="bg-neutral-300" />
		</div>

		<!-- Texte rassurant -->
		<p class="mb-4 text-center text-base leading-relaxed text-neutral-700">
			Pas prêt à souscrire ? Aucun souci. <br />
			Vous pouvez toujours profiter de l'essai gratuit et découvrir Pattyly à votre
			rythme.
		</p>

		<!-- Bouton secondaire (après le texte rassurant) -->
		<form method="POST" action="?/skipOffer" use:enhance>
			<Button
				type="submit"
				variant="outline"
				class="w-full border-neutral-300 bg-white text-sm text-neutral-700 hover:bg-neutral-50"
			>
				Continuer avec l'essai gratuit de 7 jours
			</Button>
		</form>
	</div>
</div>
