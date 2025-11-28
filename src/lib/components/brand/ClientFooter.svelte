<script lang="ts">
	export let customizations:
		| {
				text_color: string;
				secondary_text_color: string;
				button_color?: string;
		  }
		| undefined = undefined;

	$: textStyle = customizations ? `color: ${customizations.text_color};` : '';
	$: secondaryTextStyle = customizations
		? `color: ${customizations.secondary_text_color};`
		: '';
	$: separatorColor = 'rgba(0, 0, 0, 0.3)';
</script>

<footer class="mt-auto px-4 py-6 text-center sm:py-8">
	<!-- Separator - Design moderne avec couleur bouton et opacité -->
	<div
		class="mx-auto mb-4 h-px max-w-7xl bg-gradient-to-r from-transparent to-transparent sm:mb-6"
		style={`background: linear-gradient(to right, transparent, ${separatorColor}, transparent);`}
	></div>
	<p class="text-xs sm:text-sm" style={secondaryTextStyle}>
		Créé avec
		<a href="/" class="font-medium hover:underline" style={textStyle}>
			Pattyly
		</a>
		🖤
	</p>
</footer>
