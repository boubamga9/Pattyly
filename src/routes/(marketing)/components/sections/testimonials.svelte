<script lang="ts">
	// Témoignages data - facile à modifier et ajouter
	const testimonials = [
		{
			name: 'Claire',
			location: 'Pâtissière à Lyon',
			initial: 'C',
			quote:
				'Avant je passais mes soirées à répondre aux messages Insta. Maintenant mes clients commandent seuls, et moi je peux enfin souffler un peu !',
		},
		{
			name: 'Marie',
			location: 'Pâtissière à Paris',
			initial: 'M',
			quote:
				"J'ai gagné 3h par jour ! Plus besoin de répéter 50 fois les mêmes informations. Mes clients trouvent tout seuls sur ma boutique en ligne.",
		},
		{
			name: 'Sophie',
			location: 'Pâtissière à Marseille',
			initial: 'S',
			quote:
				"Mon planning est enfin organisé ! Je sais exactement ce que je dois faire chaque jour, et mes clients peuvent réserver en avance. C'est révolutionnaire !",
		},
	];
</script>

<section class="bg-[#FFE8D6] py-16 sm:py-20 md:py-24">
	<div class="mx-auto max-w-7xl px-6">
		<!-- Header -->
		<div class="mb-16 text-center">
			<h2
				class="mb-4 text-2xl font-normal leading-[120%] tracking-tight text-neutral-800 lg:text-3xl xl:text-4xl"
			>
				Oui, ça change vraiment la vie !
			</h2>
		</div>

		<!-- Testimonials Grid -->
		<div class="grid gap-8 md:grid-cols-3 lg:gap-12">
			{#each testimonials as testimonial}
				<div
					class="group rounded-2xl bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-lg"
				>
					<div class="mb-6 flex items-center gap-4">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6F61] text-lg font-semibold text-white"
						>
							{testimonial.initial}
						</div>
						<div>
							<h4 class="font-medium text-neutral-800">{testimonial.name}</h4>
							<p class="text-sm text-neutral-600">{testimonial.location}</p>
						</div>
					</div>
					<blockquote
						class="text-base leading-relaxed text-neutral-700 lg:text-lg"
					>
						"{testimonial.quote}"
					</blockquote>
				</div>
			{/each}
		</div>

		<!-- Call to action sous les témoignages -->
		<div class="mt-16 text-center">
			<p class="mb-6 text-lg font-medium text-neutral-700 lg:text-xl">
				Rejoins ces pâtissières qui ont déjà transformé leur quotidien !
			</p>
			<a
				href="/register"
				class="inline-flex items-center justify-center rounded-xl bg-[#FF6F61] px-8 py-4 text-base font-medium text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-[#e85a4f] focus:outline-none focus:ring-2 focus:ring-[#FF6F61] focus:ring-offset-2"
			>
				Commencer
			</a>
		</div>
	</div>
</section>
