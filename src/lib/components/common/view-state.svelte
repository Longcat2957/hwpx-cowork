<script lang="ts">
    import type { Snippet } from 'svelte';
    import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
    import * as Empty from '#lib/components/ui/empty/index.js';
    import { Skeleton } from '#lib/components/ui/skeleton/index.js';
    import { Button } from '#lib/components/ui/button/index.js';

    let {
        loading = false,
        error = null,
        onretry,
        children
    }: {
        loading?: boolean;
        error?: string | null;
        onretry: () => void;
        children: Snippet;
    } = $props();
</script>

{#if loading}
    <div role="status" class="space-y-4 rounded-xl border p-6">
        <span class="sr-only">불러오는 중</span>
        {#each [1, 2, 3, 4] as row (row)}<Skeleton class="h-14 w-full" />{/each}
    </div>
{:else if error}
    <Empty.Root class="min-h-72 border">
        <Empty.Header>
            <Empty.Media variant="icon"><TriangleAlertIcon aria-hidden="true" /></Empty.Media>
            <Empty.Title>화면을 불러오지 못했습니다</Empty.Title>
            <Empty.Description>{error}</Empty.Description>
        </Empty.Header>
        <Empty.Content><Button variant="outline" onclick={onretry}>다시 시도</Button></Empty.Content
        >
    </Empty.Root>
{:else}
    {@render children()}
{/if}
