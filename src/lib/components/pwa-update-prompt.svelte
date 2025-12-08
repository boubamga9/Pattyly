<script lang="ts">
	import { onMount } from 'svelte';

	let needRefresh = false;
	let updateServiceWorker: (() => Promise<void>) | undefined = undefined;

	onMount(async () => {
		if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
			try {
				const { registerSW } = await import('virtual:pwa-register');
				const updateSW = registerSW({
					immediate: true,
					onRegistered(r) {
						console.log('Service Worker registered', r);
					},
					onRegisterError(error) {
						console.error('Service Worker registration error', error);
					},
					onNeedRefresh() {
						needRefresh = true;
					},
					onOfflineReady() {
						console.log('App ready to work offline');
					}
				});

				updateServiceWorker = updateSW;
			} catch (error) {
				console.error('Failed to register service worker', error);
			}
		}
	});

	async function handleUpdate() {
		if (updateServiceWorker) {
			await updateServiceWorker(true);
		}
	}
</script>

{#if needRefresh}
	<div
		class="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg bg-white p-4 shadow-lg ring-1 ring-black ring-opacity-5 sm:left-auto"
		role="alert"
	>
		<div class="flex items-start">
			<div class="flex-shrink-0">
				<svg
					class="h-5 w-5 text-blue-400"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.179 1.035m.571 4.516A2 2 0 0013.828 15h2.344a2 2 0 001.414-1.149l.179-1.035a.25.25 0 01.244-.304H17.25A.75.75 0 0017 12h-.253a.25.25 0 01-.244-.304l.179-1.035A2 2 0 0016.172 9H13.828a2 2 0 00-1.414 1.149l-.179 1.035a.25.25 0 01-.244.304H11.75A.75.75 0 0111 12h.253a.25.25 0 01.244.304l-.179 1.035zM8 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.179 1.035m.571 4.516A2 2 0 0013.828 15h2.344a2 2 0 001.414-1.149l.179-1.035a.25.25 0 01.244-.304H17.25A.75.75 0 0017 12h-.253a.25.25 0 01-.244-.304l.179-1.035A2 2 0 0016.172 9H13.828a2 2 0 00-1.414 1.149l-.179 1.035a.25.25 0 01-.244.304H11.75A.75.75 0 0111 9h.253a.25.25 0 01.244.304l-.179 1.035z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class="ml-3 flex-1">
				<p class="text-sm font-medium text-gray-800">
					Une nouvelle version est disponible
				</p>
				<p class="mt-1 text-sm text-gray-500">
					Rechargez la page pour bénéficier des dernières améliorations.
				</p>
			</div>
			<div class="ml-4 flex flex-shrink-0">
				<button
					type="button"
					on:click={handleUpdate}
					class="inline-flex rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
				>
					Mettre à jour
				</button>
			</div>
		</div>
	</div>
{/if}

