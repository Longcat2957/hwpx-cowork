<script lang="ts">
    // Layout adapted from https://shadcn-svelte.com/blocks/sidebar#sidebar-07.
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { getGateway } from '#lib/client/context.js';
    import AppSidebar from '#lib/components/shell/app-sidebar.svelte';
    import PreviewControls from '#lib/components/shell/preview-controls.svelte';
    import * as Sidebar from '#lib/components/ui/sidebar/index.js';
    import * as Breadcrumb from '#lib/components/ui/breadcrumb/index.js';
    import { Separator } from '#lib/components/ui/separator/index.js';
    import { Button } from '#lib/components/ui/button/index.js';
    import type { Snippet } from 'svelte';

    let { children }: { children: Snippet } = $props();
    const gateway = getGateway();
    const section = $derived.by(() => {
        if (page.url.pathname.startsWith('/admin/members')) return '구성원';
        if (page.url.pathname.startsWith('/admin/settings')) return '운영 설정';
        if (page.url.pathname.startsWith('/jobs')) return '작업';
        return '문서';
    });
    const isDocument = $derived(Boolean(page.params.documentId));

    $effect(() => {
        if (!$gateway.currentUser) {
            void goto('/login', { replaceState: true });
        }
    });
</script>

{#if $gateway.currentUser}
    <Sidebar.Provider>
        <a
            href="#main-content"
            class="bg-background focus:ring-ring sr-only z-50 rounded-md border p-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-2"
        >
            본문으로 건너뛰기
        </a>
        <AppSidebar />
        <Sidebar.Inset class="min-w-0">
            <header
                class="bg-background/95 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-6"
            >
                <div class="flex min-w-0 items-center gap-2">
                    <Sidebar.Trigger class="-ml-1" aria-label="메뉴 열기 또는 닫기" />
                    <Separator
                        orientation="vertical"
                        class="mr-2 data-vertical:h-4 data-vertical:self-auto"
                    />
                    <Breadcrumb.Root aria-label="현재 위치">
                        <Breadcrumb.List class="flex-nowrap">
                            <Breadcrumb.Item class="hidden md:block">
                                <Breadcrumb.Link href="/documents">작업 공간</Breadcrumb.Link>
                            </Breadcrumb.Item>
                            <Breadcrumb.Separator class="hidden md:block" />
                            <Breadcrumb.Item>
                                {#if isDocument}
                                    <Breadcrumb.Link href="/documents">문서</Breadcrumb.Link>
                                {:else}
                                    <Breadcrumb.Page>{section}</Breadcrumb.Page>
                                {/if}
                            </Breadcrumb.Item>
                            {#if isDocument}
                                <Breadcrumb.Separator class="hidden sm:block" />
                                <Breadcrumb.Item class="hidden sm:block">
                                    <Breadcrumb.Page>작업 공간</Breadcrumb.Page>
                                </Breadcrumb.Item>
                            {/if}
                        </Breadcrumb.List>
                    </Breadcrumb.Root>
                </div>
                <PreviewControls />
            </header>
            <main id="main-content" tabindex="-1" class="flex min-w-0 flex-1 flex-col outline-none">
                {@render children()}
            </main>
            <div role="status" aria-live="polite" class="sr-only">{$gateway.notice ?? ''}</div>
        </Sidebar.Inset>
    </Sidebar.Provider>
{:else}
    <main class="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <p class="text-muted-foreground text-sm">계속하려면 로그인하세요.</p>
        <Button href="/login">로그인으로 이동</Button>
    </main>
{/if}
