<script lang="ts">
	import { Instagram, Paperclip } from 'lucide-svelte';

	export let shop: {
		instagram?: string | null;
		tiktok?: string | null;
		website?: string | null;
	};
	export let iconStyle: string = 'color: #6b7280;';
</script>

<!-- Social Media Icons - Top right (all screens) - Design moderne -->
<div class="absolute right-4 top-4 z-50 flex items-center gap-2.5">
	{#if shop.instagram}
		<a
			href="https://instagram.com/{shop.instagram.replace('@', '')}"
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-full bg-white/80 p-2 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-sm"
			style={iconStyle}
			title="Instagram"
		>
			<Instagram class="h-4 w-4" />
		</a>
	{/if}
	{#if shop.tiktok}
		<a
			href="https://tiktok.com/@{shop.tiktok.replace('@', '')}"
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-full bg-white/80 p-2 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-sm"
			style={iconStyle}
			title="TikTok"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
				/>
			</svg>
		</a>
	{/if}
	{#if shop.website}
		<a
			href={shop.website}
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-full bg-white/80 p-2 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-sm"
			style={iconStyle}
			title="Site internet"
		>
			<Paperclip class="h-4 w-4" />
		</a>
	{/if}
</div>

