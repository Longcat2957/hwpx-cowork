<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button } from '#lib/components/ui/button/index.js';

    onMount(() => {
        void goto('/documents', { replaceState: true });
    });
</script>

<main class="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
    <p class="text-muted-foreground text-sm">문서 작업 공간으로 이동합니다.</p>
    <Button href="/documents" variant="outline">문서 목록 열기</Button>
</main>
