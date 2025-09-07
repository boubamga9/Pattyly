<script lang="ts">
	type $$Props = {
		level?: 2 | 3 | 4 | 5 | 6;
		anchor?: string;
	};

	export let level: 2 | 3 | 4 | 5 | 6 = 2;

	const elements = ['h2', 'h3', 'h4', 'h5', 'h6'];
</script>

<svelte:element
	this={elements[level - 2]}
	{...$$restProps}
	class="text-center text-3xl font-bold md:text-4xl lg:text-5xl"
>
	<slot />
</svelte:element>
