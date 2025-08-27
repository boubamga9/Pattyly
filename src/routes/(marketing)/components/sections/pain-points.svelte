<script lang="ts">
	// Pain points data - facile à modifier et ajouter
	const painPoints = [
		{
			bgColor: '#FFF1D6',
			rotation: '-5deg',
			text: '⏳ Tu réponds au client quelques heures<br />après son message<br />→ et hop, il part ailleurs 😢',
		},
		{
			bgColor: '#FFD6D6',
			rotation: '5deg',
			text: '❌ Répéter mille fois<br />les mêmes infos<br />→ ça use la patience',
		},
		{
			bgColor: '#D6E8FF',
			rotation: '-5deg',
			text: '📅 Jongler entre<br />commandes, planning et imprévus<br />→ casse-tête assuré',
		},
		{
			bgColor: '#D9FFD6',
			rotation: '5deg',
			text: '🛒 courses, colis, matériel<br />→ ça prend une énergie folle',
		},
	];
</script>

<section class="w-full bg-white">
	<div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
		<!-- Left side - Sticky title -->
		<div
			class="sticky top-0 flex h-screen items-center justify-center p-4 text-center lg:justify-start lg:p-8 lg:pl-16 lg:text-left"
		>
			<h2
				class="text-2xl font-normal leading-[120%] tracking-tight lg:text-3xl xl:text-4xl"
				style="color: #333333;"
			>
				Soyons honnêtes :<br />
				Tu passes plus de temps à gérer <br />qu'à
				<span class="font-bold text-[#FF6F61]">pâtisser</span>, non ?
			</h2>
		</div>

		<!-- Right side - Scrolling cards -->
		<div class="grid gap-4 p-2 sm:gap-6 sm:p-4 lg:gap-8 lg:p-6 lg:pl-2">
			<!-- Card 1 -->
			<figure class="grid h-screen place-content-center">
				<div
					class="flex h-[280px] w-[320px] items-center justify-center rounded-[12px] p-6 text-center transition-all duration-300 sm:h-[300px] sm:w-[350px] sm:rounded-[25px] sm:p-7 lg:h-[340px] lg:w-[430px] lg:rounded-[30px] lg:p-8"
					style="background-color: #FFF1D6; transform: rotate(-5deg);"
				>
					<p
						class="text-base font-light leading-tight sm:text-lg lg:text-lg xl:text-xl"
						style="color: #333333; font-size: 28px; line-height: 120%;"
					>
						⏳ Tu réponds au client quelques heures<br />
						après son message<br />
						→ et hop, il part ailleurs 😢
					</p>
				</div>
			</figure>

			<!-- Card 2 -->
			<figure class="grid h-screen place-content-center">
				<div
					class="flex h-[280px] w-[320px] items-center justify-center rounded-[12px] p-6 text-center transition-all duration-300 sm:h-[300px] sm:w-[350px] sm:rounded-[25px] sm:p-7 lg:h-[340px] lg:w-[430px] lg:rounded-[30px] lg:p-8"
					style="background-color: #FFD6D6; transform: rotate(5deg);"
				>
					<p
						class="text-base font-light leading-tight sm:text-lg lg:text-lg xl:text-xl"
						style="color: #333333; font-size: 28px; line-height: 120%;"
					>
						❌ Répéter mille fois<br />
						les mêmes infos<br />
						→ ça use la patience
					</p>
				</div>
			</figure>

			<!-- Card 3 -->
			<figure class="grid h-screen place-content-center">
				<div
					class="flex h-[280px] w-[320px] items-center justify-center rounded-[12px] p-6 text-center transition-all duration-300 sm:h-[300px] sm:w-[350px] sm:rounded-[25px] sm:p-7 lg:h-[340px] lg:w-[430px] lg:rounded-[30px] lg:p-8"
					style="background-color: #D6E8FF; transform: rotate(-5deg);"
				>
					<p
						class="text-base font-light leading-tight sm:text-lg lg:text-lg xl:text-xl"
						style="color: #333333; font-size: 28px; line-height: 120%;"
					>
						📅 Jongler entre<br />
						commandes, planning et imprévus<br />
						→ casse-tête assuré
					</p>
				</div>
			</figure>

			<!-- Card 4 -->
			<figure class="grid h-screen place-content-center">
				<div
					class="flex h-[280px] w-[320px] items-center justify-center rounded-[12px] p-6 text-center transition-all duration-300 sm:h-[300px] sm:w-[350px] sm:rounded-[25px] sm:p-7 lg:h-[340px] lg:w-[430px] lg:rounded-[30px] lg:p-8"
					style="background-color: #D9FFD6; transform: rotate(5deg);"
				>
					<p
						class="text-base font-light leading-tight sm:text-lg lg:text-lg xl:text-xl"
						style="color: #333333; font-size: 28px; line-height: 120%;"
					>
						🛒 courses, colis, matériel<br />
						→ ça prend une énergie folle
					</p>
				</div>
			</figure>

			<!-- Reassuring message at the end -->
			<figure class="grid h-[70vh] place-content-center">
				<div class="flex items-center justify-center text-center">
					<p
						class="text-xl font-normal sm:text-2xl lg:text-3xl"
						style="color: #333333;"
					>
						T'inquiète pas, il y a une solution.. 😊
					</p>
				</div>
			</figure>
		</div>
	</div>
</section>
