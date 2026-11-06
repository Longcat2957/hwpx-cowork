<script lang="ts">
    import '../app.css';
    import FileText from '@lucide/svelte/icons/file-text';
    import { setGateway } from '#lib/client/context.js';
    import { createMockGateway } from '#lib/client/mock/gateway.js';
    import type { Snippet } from 'svelte';

    let { children }: { children: Snippet } = $props();

    if (import.meta.env.DEV) {
        setGateway(createMockGateway());
    }
</script>

<svelte:head>
    <title>HWPX Cowork — 함께 만드는 문서</title>
    <meta name="description" content="문서와 대화, 팀의 작업을 한곳에서 관리하세요." />
</svelte:head>

{#if import.meta.env.DEV}
    {@render children()}
{:else}
    <main class="bg-muted/30 flex min-h-svh items-center justify-center px-6">
        <section class="bg-background w-full max-w-md rounded-xl border p-8 text-center">
            <div
                class="bg-primary text-primary-foreground mx-auto mb-5 flex size-11 items-center justify-center rounded-xl"
            >
                <FileText class="size-6" aria-hidden="true" />
            </div>
            <p class="text-muted-foreground mb-2 text-sm font-medium">HWPX Cowork</p>
            <h1 class="text-xl font-semibold tracking-tight">서비스 연결을 준비하고 있습니다</h1>
            <p class="text-muted-foreground mt-3 text-sm leading-6">
                아직 백엔드가 연결되지 않았습니다. 화면 미리보기는 개발 환경에서 이용할 수 있습니다.
            </p>
        </section>
    </main>
{/if}
