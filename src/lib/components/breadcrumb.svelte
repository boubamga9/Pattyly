<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	export let items: Array<{ name: string; url: string }> = [];

	let breadcrumbSchema: any = null;

	onMount(() => {
		// Schema.org BreadcrumbList
		breadcrumbSchema = {
			'@context': 'https://schema.org',
			'@type': 'BreadcrumbList',
			itemListElement: items.map((item, index) => ({
				'@type': 'ListItem',
				position: index + 1,
				name: item.name,
				item: `https://pattyly.com${item.url}`,
			})),
		};

		const script = document.createElement('script');
		script.type = 'application/ld+json';
		script.text = JSON.stringify(breadcrumbSchema);
		script.id = 'breadcrumb-schema';
		document.head.appendChild(script);

		return () => {
			const existingScript = document.getElementById('breadcrumb-schema');
			if (existingScript) {
				document.head.removeChild(existingScript);
			}
		};
	});
</script>

<nav aria-label="Fil d'Ariane" class="mb-6">
	<ol class="flex flex-wrap items-center gap-2 text-sm text-neutral-600">
		{#each items as item, index}
			<li class="flex items-center">
				{#if index < items.length - 1}
					<a
						href={item.url}
						class="hover:text-[#FF6F61] hover:underline transition-colors"
					>
						{item.name}
					</a>
					<span class="mx-2 text-neutral-400">/</span>
				{:else}
					<span class="text-neutral-800 font-medium">{item.name}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>


