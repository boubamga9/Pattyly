<script lang="ts">
	export let customizations:
		| {
				text_color: string;
				secondary_text_color: string;
				button_color?: string;
		  }
		| undefined = undefined;
	export let shopSlug: string | undefined = undefined;
	export let hasPolicies: boolean = false;

	$: textStyle = customizations ? `color: ${customizations.text_color};` : '';
	$: secondaryTextStyle = customizations
		? `color: ${customizations.secondary_text_color};`
		: '';
</script>

<footer class="mt-auto px-4 py-6 text-center sm:py-8">
	<!-- Separator -->
	<div class="mx-auto mb-4 max-w-7xl sm:mb-6">
		<div class="border-t" style="border-color: rgba(0, 0, 0, 0.1);"></div>
	</div>
	<div class="space-y-4">
		{#if shopSlug && hasPolicies}
			<p class="text-xs sm:text-sm" style={secondaryTextStyle}>
				<a href="/{shopSlug}/policies" class="font-medium hover:underline" style={textStyle}>
					Conditions de vente
				</a>
			</p>
		{/if}
		<p class="text-xs sm:text-sm" style={secondaryTextStyle}>
			Créé avec
			<a href="/" class="font-medium hover:underline" style={textStyle}>
				Pattyly
			</a>
			🖤
		</p>
	</div>
</footer>
