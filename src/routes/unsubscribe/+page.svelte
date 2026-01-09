<script lang="ts">
    import type { PageData } from './$types';
    import Button from '$lib/components/ui/button/button.svelte';
    
    export let data: PageData;
</script>

<svelte:head>
    <title>Désabonnement - Pattyly</title>
    <meta name="description" content="Désabonnement des emails marketing Pattyly" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-[#FFE8D6]/30 via-transparent to-transparent flex items-center justify-center px-4 py-16">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {#if data.success}
            <!-- Succès -->
            <div class="mb-6">
                <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-semibold text-neutral-900 mb-2">Désabonnement réussi</h1>
                <p class="text-neutral-600 mb-2">{data.message}</p>
                {#if data.email}
                    <p class="text-sm text-neutral-500">Email : {data.email}</p>
                {/if}
            </div>
        {:else}
            <!-- Erreur -->
            <div class="mb-6">
                <div class="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </div>
                <h1 class="text-2xl font-semibold text-neutral-900 mb-2">Erreur</h1>
                <p class="text-neutral-600">{data.message}</p>
            </div>
        {/if}

        <div class="mt-8">
            <Button href="/" variant="outline" class="w-full">
                Retour à l'accueil
            </Button>
        </div>

        <p class="text-xs text-neutral-500 mt-6">
            Si vous avez des questions, n'hésitez pas à nous contacter à 
            <a href="mailto:contact@pattyly.com" class="text-[#FF6F61] hover:underline">contact@pattyly.com</a>
        </p>
    </div>
</div>

