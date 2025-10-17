<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';

	export let customizations:
		| {
				text_color: string;
				secondary_text_color: string;
		  }
		| undefined = undefined;

	$: textStyle = customizations ? `color: ${customizations.text_color};` : '';
	$: secondaryTextStyle = customizations
		? `color: ${customizations.secondary_text_color};`
		: '';
</script>

<footer class="mt-auto px-4 py-6 text-center sm:py-8">
	<Separator
		class="mb-4 sm:mb-6"
		style={customizations
			? `background-color: ${customizations.secondary_text_color};`
			: ''}
	/>
	<p class="text-xs sm:text-sm" style={secondaryTextStyle}>
		Créé avec
		<a href="/" class="font-medium hover:underline" style={textStyle}>
			Pattyly
		</a>
		🖤
	</p>
</footer>
