<script lang="ts">
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';

	export let href: string;
	export let class: string = '';
	export let external: boolean = false;

	function handleClick(event: MouseEvent) {
		// Si c'est un lien externe ou un clic avec modificateur, laisser le comportement par défaut
		if (external || event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) {
			return;
		}

		// Si c'est une URL externe (http/https), laisser le comportement par défaut
		if (href.startsWith('http://') || href.startsWith('https://')) {
			return;
		}

		// Empêcher le comportement par défaut et utiliser la navigation SvelteKit
		event.preventDefault();
		goto(href);
	}
</script>

<a
	{href}
	class={cn(class)}
	on:click={handleClick}
	data-sveltekit-preload-data="hover"
	{...$$restProps}
>
	<slot />
</a>
