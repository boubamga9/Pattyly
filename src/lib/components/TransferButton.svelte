<script>
	import { enhance } from '$app/forms';
	import { isTransferEmail } from '$lib/utils/transfer-utils';

	export let userEmail;
	export let shopId;

	let showModal = false;
	let isSubmitting = false;
	let formData = {};
</script>

{#if isTransferEmail(userEmail)}
	<button
		on:click={() => (showModal = true)}
		class="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-white transition-colors hover:bg-orange-600"
	>
		<span>🔄</span>
		<span>Transférer cette boutique</span>
	</button>
{/if}

<!-- Modal de transfert -->
{#if showModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold text-gray-900">
					🔄 Transférer cette boutique
				</h2>
				<button
					on:click={() => (showModal = false)}
					class="text-gray-400 transition-colors hover:text-gray-600"
					disabled={isSubmitting}
				>
					<svg
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<p class="mb-6 text-gray-600">
				Créez un transfert pour permettre à une pâtissière de récupérer cette
				boutique lors de son inscription.
			</p>

			<form
				method="POST"
				action="?/createTransfer"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update, result }) => {
						await update();
						isSubmitting = false;

						if (result.type === 'success') {
							showModal = false;
						}
					};
				}}
			>
				<input name="shop_id" type="hidden" value={shopId} />

				<div class="mb-4">
					<label class="mb-2 block text-sm font-medium text-gray-700">
						Email de la pâtissière *
					</label>
					<input
						name="target_email"
						type="email"
						placeholder="patissiere@example.com"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
						required
						disabled={isSubmitting}
					/>
					<p class="mt-1 text-xs text-gray-500">
						La pâtissière devra s'inscrire avec exactement cet email
					</p>
				</div>

				<div class="mb-6">
					<label class="mb-2 block text-sm font-medium text-gray-700">
						PayPal.me de la pâtissière *
					</label>
					<div class="flex items-center">
						<span class="mr-2 text-gray-500">paypal.me/</span>
						<input
							name="paypal_me"
							placeholder="patissiere"
							class="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
							required
							disabled={isSubmitting}
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500">
						3-20 caractères, lettres, chiffres, tirets et underscores uniquement
					</p>
				</div>

				<div class="flex gap-3">
					<button
						type="button"
						on:click={() => (showModal = false)}
						class="flex-1 rounded-md border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50 disabled:opacity-50"
						disabled={isSubmitting}
					>
						Annuler
					</button>
					<button
						type="submit"
						class="flex flex-1 items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
						disabled={isSubmitting}
					>
						{#if isSubmitting}
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span>Création...</span>
						{:else}
							<span>✅</span>
							<span>Créer le transfert</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Animation pour le modal */
	.modal-overlay {
		animation: fadeIn 0.2s ease-out;
	}

	.modal-content {
		animation: slideIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
</style>
