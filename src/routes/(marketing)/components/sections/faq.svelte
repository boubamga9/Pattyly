<script lang="ts">
	import {
		Collapsible,
		CollapsibleContent,
		CollapsibleTrigger,
	} from '$lib/components/ui/collapsible';
	import { ChevronDown } from 'lucide-svelte';

	// FAQ data - facile à modifier et ajouter
	const faqItems = [
		{
			question: 'Combien de temps ça prend pour configurer ma boutique ?',
			answer:
				'Environ 5 minutes ! Tu peux créer ton compte, ajouter tes premiers produits et commencer à recevoir des commandes en moins de 10 minutes. Pas besoin de connaissances techniques.',
		},
		{
			question: 'Est-ce que je peux personnaliser mes gâteaux ?',
			answer:
				'Absolument ! Tu peux créer des formulaires de personnalisation pour chaque gâteau avec des options (couleurs, décorations, toppers) et même des suppléments payants.',
		},
		{
			question: 'Comment ça marche pour les paiements ?',
			answer:
				"PayPal gère tout ! Tes clients paient en ligne de manière sécurisée via ton lien PayPal.me, et l'argent arrive directement sur ton compte PayPal. Tu valides ensuite la réception sur la plateforme.",
		},
		{
			question: 'Est-ce que mes clients doivent créer un compte ?',
			answer:
				"Non, ils peuvent commander directement sans inscription compliquée. L'expérience est fluide et pensée pour éviter les abandons de commande.",
		},
		{
			question: 'Et si je veux arrêter ?',
			answer:
				"Tu es libre à 100% ! Pas d'engagement, pas de frais cachés. Tu peux arrêter quand tu veux, et tes données restent à toi. On croit à la liberté des entrepreneurs.",
		},
		{
			question: 'Est-ce que je peux gérer mes disponibilités ?',
			answer:
				'Oui ! Tu définis tes créneaux disponibles, tes jours de fermeture, et même tes délais de préparation par gâteau. Tes clients voient en temps réel ce qui est possible.',
		},
		{
			question: 'Mes clients vont-ils recevoir des confirmations ?',
			answer:
				'Oui, chaque commande envoie automatiquement un email de confirmation au client et à toi, pour éviter tout malentendu.',
		},
	];
</script>

<section class="bg-neutral-50 py-16 sm:py-20 md:py-24">
	<div class="mx-auto max-w-4xl px-6">
		<!-- Header -->
		<div class="mb-16 text-center">
			<h2
				class="mb-4 text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl xl:text-4xl"
			>
				Questions fréquentes
			</h2>
			<p class="text-lg text-neutral-600 lg:text-xl">
				Tout ce que tu veux savoir sur Pattyly
			</p>
		</div>

		<!-- FAQ Accordions -->
		<div class="space-y-4">
			{#each faqItems as faqItem}
				<Collapsible
					class="rounded-2xl border border-neutral-200 bg-white shadow-sm"
				>
					<CollapsibleTrigger
						class="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-neutral-50"
					>
						<h3
							class="flex-1 break-words pr-4 text-lg font-medium text-neutral-800 lg:text-xl"
						>
							{faqItem.question}
						</h3>
						<ChevronDown
							class="h-5 w-5 flex-shrink-0 text-neutral-500 transition-transform duration-200"
						/>
					</CollapsibleTrigger>
					<CollapsibleContent class="px-6 pb-6">
						<p class="text-base leading-relaxed text-neutral-600 lg:text-lg">
							{faqItem.answer}
						</p>
					</CollapsibleContent>
				</Collapsible>
			{/each}
		</div>

		<!-- CTA sous la FAQ -->
		<div class="mt-16 text-center">
			<p class="mb-6 text-lg font-medium text-neutral-700 lg:text-xl">
				Tu as d'autres questions ?
			</p>
			<a
				href="/contact"
				class="inline-flex items-center justify-center rounded-xl border-2 border-[#FF6F61] bg-transparent px-8 py-4 text-base font-medium text-[#FF6F61] transition-all duration-200 hover:bg-[#FF6F61] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2"
			>
				Contacte-nous
			</a>
		</div>
	</div>
</section>
