<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import type { Builder } from 'bits-ui';

	export let href: string;
	export let activeClass: string;
	export let exact: boolean = false;
	export let builder: Builder | undefined = undefined;
	let cls: string = '';
	export { cls as class };

	$: active = exact
		? $page.url.pathname === href
		: $page.url.pathname.startsWith(href);

	function handleClick(event: MouseEvent) {
		// Si c'est un clic avec modificateur (Ctrl, Cmd, etc.), laisser le comportement par défaut
		if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0) {
			return;
		}
		
		// Empêcher le comportement par défaut et utiliser la navigation SvelteKit
		event.preventDefault();
		goto(href);
	}
</script>

{#if builder}
	<a
		{href}
		class={cn(cls, active && activeClass)}
		{...$$restProps}
		use:builder.action
		{...builder}
		on:click={handleClick}
	>
		<slot />
	</a>
{:else}
	<a 
		{href} 
		class={cn(cls, active && activeClass)} 
		{...$$restProps}
		on:click={handleClick}
		data-sveltekit-preload-data="hover"
	>
		<slot />
	</a>
{/if}
