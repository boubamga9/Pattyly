<script lang="ts">
	// Time savings data - facile à modifier et ajouter
	const timeSavings = [
		{
			icon: '⏰',
			bgColor: '#FFF1D6',
			hoverColor: '#FFE8C7',
			title:
				"Libère jusqu'à<br />2h par jour<br />rien que pour toi<br />(ou pour un café ☕)",
		},
		{
			icon: '🛍️',
			bgColor: '#FFD6D6',
			hoverColor: '#FFCCCC',
			title:
				'Ne laisse plus filer<br />tes clients<br />→ ils commandent<br />même quand tu es occupée',
		},
		{
			icon: '✨',
			bgColor: '#D6E8FF',
			hoverColor: '#FFCCCC',
			title:
				'Montre une image pro,<br />avec une boutique chic<br />sans effort',
		},
	];
</script>

<section class="relative w-full bg-white py-20">
	<!-- Background overlay that will overlap the previous section -->
	<div class="absolute inset-0 bg-white"></div>

	<!-- Content with z-index to appear above the overlay -->
	<div class="relative z-10">
		<div class="container mx-auto px-8">
			<div class="flex flex-col items-center text-center">
				<!-- Main title -->
				<h2
					class="mb-20 text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl xl:text-5xl"
					style="color: #333333;"
				>
					Tu retrouves du temps (et du plaisir) pour créer.
				</h2>

				<!-- Cards dynamiques -->
				<div class="mb-20 grid w-full max-w-6xl gap-8 lg:grid-cols-3">
					{#each timeSavings as card}
						<div
							class="group rounded-2xl p-8 transition-all duration-300"
							style="background-color: {card.bgColor};"
							role="presentation"
							on:mouseenter={(e) => {
								e.currentTarget.style.backgroundColor = card.hoverColor;
							}}
							on:mouseleave={(e) => {
								e.currentTarget.style.backgroundColor = card.bgColor;
							}}
						>
							<div class="mb-6 text-5xl">{card.icon}</div>
							<h3
								class="text-base font-semibold leading-tight sm:text-lg lg:text-xl"
								style="color: #333333;"
							>
								{@html card.title}
							</h3>
						</div>
					{/each}
				</div>

				<!-- CTA -->
				<div class="text-center">
					<button
						class="transform rounded-full bg-[#FF6F61] px-12 py-4 text-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-[#e85a4f]"
					>
						Teste maintenant, ça ne prend que 2 minutes !
					</button>
				</div>
			</div>
		</div>
	</div>
</section>
