<script lang="ts">
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button/button.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	import type { Provider } from '@supabase/supabase-js';
	import LoaderCircle from '~icons/lucide/loader-circle';
	import { oAuthProviders } from '../../../../config';

	async function loadIcon(provider: Provider) {
		switch (provider) {
			case 'google':
				return (await import('virtual:icons/devicon-plain/google')).default;
			case 'facebook':
				return (await import('virtual:icons/devicon-plain/facebook')).default;
			case 'apple':
				return (await import('virtual:icons/simple-icons/apple')).default;
			case 'twitter':
				return (await import('virtual:icons/bi/twitter-x')).default;
			case 'github':
				return (await import('virtual:icons/simple-icons/github')).default;
			default:
				throw new Error(`Unknown provider: ${provider}`);
		}
	}

	$: redirectTo = `redirectTo=${encodeURIComponent(`${$page.url.origin}/auth/callback?${$page.url.search}`)}`;
</script>

{#if oAuthProviders.length > 0}
	<form method="POST" class="flex flex-col gap-4">
		<!-- TODO: I don't like this hidden field here too much. Change later. -->
		<input type="hidden" name="query" value={$page.url.search} />

		<ul class="flex flex-wrap justify-center gap-4">
			{#each oAuthProviders as provider}
				<li>
					{#await loadIcon(provider)}
						<Button
							formaction="/login?provider={provider}&{redirectTo}"
							variant="outline"
							type="submit"
							class="flex items-center gap-2 border-neutral-200 px-4 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
						>
							<LoaderCircle class="h-4 w-4 animate-spin" />
							<span
								>Continuer avec {provider.charAt(0).toUpperCase() +
									provider.slice(1)}</span
							>
						</Button>
					{:then Icon}
						<Button
							formaction="/login?provider={provider}&{redirectTo}"
							variant="outline"
							type="submit"
							class="flex items-center gap-2 border-neutral-200 px-4 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
						>
							<Icon class="size-4" />
							<span
								>Continuer avec {provider.charAt(0).toUpperCase() +
									provider.slice(1)}</span
							>
						</Button>
					{:catch _}
						<Button
							formaction="/login?provider={provider}&{redirectTo}"
							variant="outline"
							type="submit"
							class="flex items-center gap-2 border-neutral-200 px-4 py-2 text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
						>
							Continuer avec {provider.charAt(0).toUpperCase() +
								provider.slice(1)}
						</Button>
					{/await}
				</li>
			{/each}
		</ul>
		<div class="flex items-center gap-2 text-xs text-neutral-500">
			<Separator class="flex-1" />
			<span>ou</span>
			<Separator class="flex-1" />
		</div>
	</form>
{/if}
