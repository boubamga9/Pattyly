<script lang="ts">
	// Benefits data - facile à modifier et ajouter
	const benefits = [
		{
			emoji: '⏰',
			bgColor: 'bg-[#FFE8D6]',
			iconColor: 'text-[#FF6F61]',
			title: "Libère jusqu'à 2h par jour",
			description:
				'En automatisant la prise de commande en ligne et la gestion de tes devis, tu récupères du temps précieux chaque jour. Plus besoin de répondre aux mêmes questions 50 fois : tout est dans ta boutique en ligne.',
		},
		{
			emoji: '💼',
			bgColor: 'bg-[#FFE0D6]',
			iconColor: 'text-neutral-800',
			title: 'Ne laisse plus filer tes clients',
			description:
				'Avec un formulaire de commande accessible 24/7, tes clients peuvent passer commande même quand tu dors. Plus de clients perdus parce que tu n\'as pas répondu assez vite à leur message Instagram.',
		},
		{
			emoji: '✨',
			bgColor: 'bg-[#FFF1D6]',
			iconColor: 'text-[#FF6F61]',
			title: 'Montre une image pro',
			description:
				'Ta boutique en ligne professionnelle donne confiance à tes clients. Ils voient tes créations, peuvent personnaliser leurs gâteaux, et payer en ligne de manière sécurisée. Une image de marque qui te démarque.',
		},
	];
</script>

<section class="bg-white py-16 sm:py-20 md:py-24">
	<div class="mx-auto max-w-7xl px-6">
		<!-- Header -->
		<div class="mb-12 text-center md:mb-16">
			<h2
				class="mb-4 text-2xl font-semibold leading-[120%] tracking-tight text-neutral-800 lg:text-3xl xl:text-4xl"
			>
				Pourquoi choisir Pattyly ?
			</h2>
			<p
				class="mx-auto max-w-3xl text-base leading-relaxed text-neutral-700 md:text-lg lg:text-xl"
			>
				En automatisant tes tâches répétitives et en centralisant tes commandes,
				Pattyly te redonne le temps précieux dont tu as besoin pour te concentrer
				sur ce qui compte vraiment : créer des pâtisseries exceptionnelles et faire
				grandir ton activité.
			</p>
		</div>

		<!-- Benefits Cards -->
		<div class="grid gap-6 md:grid-cols-3 lg:gap-8">
			{#each benefits as benefit, index}
				<div
					class="group rounded-2xl {benefit.bgColor} p-8 text-left transition-all duration-300 hover:shadow-lg sm:p-10"
				>
					<!-- Icon -->
					<div class="mb-6">
						<div
							class="flex h-14 w-14 items-center justify-center text-3xl {benefit.iconColor} transition-all duration-300 group-hover:scale-110"
						>
							{benefit.emoji}
						</div>
					</div>

					<!-- Title -->
					<h3
						class="mb-4 text-xl font-bold leading-[120%] text-neutral-800 lg:text-2xl"
					>
						{benefit.title}
					</h3>

					<!-- Separator line -->
					<div
						class="mb-6 h-0.5 w-16 {index === 1 ? 'bg-neutral-800' : 'bg-[#FF6F61]'}"
					></div>

					<!-- Description -->
					<p
						class="text-sm leading-relaxed text-neutral-700 lg:text-base"
					>
						{benefit.description}
					</p>
				</div>
			{/each}
		</div>
	</div>
</section>
