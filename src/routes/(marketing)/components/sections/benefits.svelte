<script lang="ts">
	// Benefits data - facile à modifier et ajouter
	const benefits = [
		{
			emoji: '⏰',
			bgColor: 'bg-[#FFE8D6]',
			title: "Libère jusqu'à 2h par jour",
			description: 'Rien que pour toi (ou pour un café tranquille ☕)',
		},
		{
			emoji: '💼',
			bgColor: 'bg-[#FFE0D6]',
			title: 'Ne laisse plus filer tes clients',
			description: 'Ils commandent même quand tu es occupée',
		},
		{
			emoji: '✨',
			bgColor: 'bg-[#FFF1D6]',
			title: 'Montre une image pro',
			description: 'Avec une boutique chic sans effort',
		},
	];
</script>

<section class="bg-white py-16 sm:py-20 md:py-24">
	<div class="mx-auto max-w-7xl px-6">
		<!-- Header -->
		<div class="mb-16 text-center">
			<h2
				class="mb-4 text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl xl:text-4xl"
			>
				Le vrai bénéfice ?
			</h2>
			<h3 class="text-xl font-medium leading-[120%] text-[#333] lg:text-2xl">
				Tu retrouves du temps (et du plaisir) pour <span
					class="font-bold text-[#FF6F61]">pâtisser</span
				>.
			</h3>
		</div>

		<!-- Benefits Cards -->
		<div class="grid gap-8 md:grid-cols-3 lg:gap-12">
			{#each benefits as benefit}
				<div
					class="group rounded-2xl border border-neutral-100 bg-white p-8 text-center shadow-sm transition-all duration-300 hover:border-neutral-200 hover:shadow-lg"
				>
					<div class="mb-6 flex justify-center">
						<div
							class="flex h-16 w-16 items-center justify-center rounded-full {benefit.bgColor} text-2xl transition-all duration-300 group-hover:scale-110"
						>
							{benefit.emoji}
						</div>
					</div>
					<h4 class="mb-4 text-lg font-medium text-neutral-800 lg:text-xl">
						{benefit.title}
					</h4>
					<p class="text-sm leading-relaxed text-neutral-600 lg:text-base">
						{benefit.description}
					</p>
				</div>
			{/each}
		</div>

		<!-- Description sous les bénéfices -->
		<div class="mt-16 text-center">
			<p
				class="mx-auto max-w-3xl text-base leading-relaxed text-neutral-600 lg:text-lg"
			>
				En automatisant tes tâches répétitives et en centralisant tes commandes,
				Pattyly te redonne le temps précieux dont tu as besoin pour te
				concentrer sur ce qui compte vraiment : créer des pâtisseries
				exceptionnelles et faire grandir ton activité.
			</p>
		</div>
	</div>
</section>
