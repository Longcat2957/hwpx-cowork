<script lang="ts">
    import { onDestroy } from 'svelte';
    import { FileText, LoaderCircle, Plug, ShieldCheck } from '@lucide/svelte';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import * as Alert from '#lib/components/ui/alert/index.js';
    import {
        connectRhwpEditor,
        inspectRhwpRuntime,
        type RhwpBridge
    } from '#lib/client/rhwp-bridge.js';

    let {
        title,
        content,
        viewLabel,
        studioUrl,
        onChanged = () => {}
    }: {
        title: string;
        content: string;
        viewLabel: string;
        studioUrl?: string;
        onChanged?: () => void;
    } = $props();

    let host: HTMLDivElement;
    let bridge = $state<RhwpBridge>();
    let connecting = $state(false);
    let checked = $state(false);
    let error = $state('');
    let loadedFile = $state('');
    let destroyed = false;
    const previewContent = $derived.by(() => {
        const lines = content.split('\n');
        return lines[0]?.trim() === title.trim() ? lines.slice(1).join('\n').trimStart() : content;
    });

    async function connect() {
        if (connecting || bridge) return;
        connecting = true;
        error = '';
        try {
            await inspectRhwpRuntime();
            checked = true;
            if (studioUrl) {
                const connection = await connectRhwpEditor(host, studioUrl, onChanged);
                if (destroyed) connection.destroy();
                else bridge = connection;
            }
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '편집기를 연결하지 못했습니다.';
        } finally {
            connecting = false;
        }
    }

    async function openFile(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !bridge) return;
        try {
            await bridge.open(file);
            loadedFile = file.name;
            error = '';
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '문서를 열지 못했습니다.';
        }
        input.value = '';
    }

    export async function exportFile(format: 'hwp' | 'hwpx'): Promise<Blob> {
        if (!bridge || !loadedFile) {
            throw new Error(
                '샘플 문서에는 다운로드할 실제 파일이 없습니다. 편집기·문서 저장소 연결 후 사용할 수 있습니다.'
            );
        }
        return bridge.exportFile(format);
    }

    onDestroy(() => {
        destroyed = true;
        bridge?.destroy();
    });
</script>

<div class="flex h-full min-h-0 flex-col bg-muted/40">
    <div
        class="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-2.5 text-xs"
    >
        <span class="flex items-center gap-2 text-muted-foreground"
            ><FileText class="size-3.5" />{viewLabel}</span
        >
        <Badge variant="outline">{bridge ? '로컬 편집기' : '읽기 전용 샘플'}</Badge>
    </div>
    <div class="min-h-0 flex-1 overflow-auto">
        {#if !bridge}
            <div class="px-4 pt-4 md:px-6">
                <Alert.Root class="bg-background">
                    <Plug class="size-4" />
                    <Alert.Title>문서 편집기 연결 전입니다</Alert.Title>
                    <Alert.Description>
                        <p>
                            화면 구성용 샘플을 보고 있습니다. 실제 HWP·HWPX 편집과 저장은 편집기
                            연결 후 사용할 수 있습니다.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            class="mt-2"
                            disabled={connecting}
                            onclick={connect}
                        >
                            {#if connecting}<LoaderCircle class="size-3.5 animate-spin" />{/if}
                            {error ? '연결 다시 확인' : '편집기 연결 확인'}
                        </Button>
                        {#if checked && !studioUrl}
                            <p role="status" class="mt-2">
                                편집기 모듈을 확인했습니다. 서비스의 편집기 실행 환경은 아직
                                연결되지 않았습니다.
                            </p>
                        {/if}
                    </Alert.Description>
                </Alert.Root>
            </div>
        {/if}
        {#if error}
            <p role="alert" class="px-6 py-3 text-sm text-destructive">{error}</p>
        {/if}
        <div bind:this={host} class={bridge ? 'h-full min-h-96' : 'hidden'}></div>
        {#if bridge}
            <div class="p-4">
                <label for="local-document" class="mb-2 block text-sm font-medium"
                    >이 브라우저에서 문서 열기</label
                >
                <input
                    id="local-document"
                    type="file"
                    accept=".hwp,.hwpx"
                    onchange={openFile}
                    class="text-sm"
                />
                <p class="mt-2 text-xs text-muted-foreground">
                    {loadedFile || '문서를 선택하면 연결된 편집기에 표시됩니다.'} · 서버에 저장되지 않습니다.
                </p>
            </div>
        {:else}
            <article
                aria-label="문서 샘플 미리보기"
                class="mx-auto my-6 min-h-[540px] w-[calc(100%-2rem)] max-w-[680px] rounded-sm border bg-background px-6 py-8 shadow-sm md:w-[calc(100%-3rem)] md:px-12 md:py-12"
            >
                <div
                    class="mb-10 flex items-center justify-between border-b pb-3 text-[10px] font-medium tracking-widest text-muted-foreground"
                >
                    <span>DEEPET · DOCUMENT</span>
                    <span>샘플 텍스트</span>
                </div>
                <h2 class="mb-6 text-2xl leading-relaxed font-semibold tracking-tight">{title}</h2>
                <div class="whitespace-pre-wrap text-sm leading-8 text-foreground/80">
                    {previewContent ||
                        '새 문서의 작업 공간입니다. 문서 편집기 연결 후 본문을 작성할 수 있습니다.'}
                </div>
                <div
                    class="mt-16 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground"
                >
                    <ShieldCheck class="size-3.5 shrink-0" />
                    <p>이 내용은 화면 검토용 예시이며 실제 문서의 렌더링이 아닙니다.</p>
                </div>
            </article>
        {/if}
    </div>
</div>
