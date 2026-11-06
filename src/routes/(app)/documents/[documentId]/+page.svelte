<script lang="ts">
    import { page } from '$app/state';
    import { MediaQuery } from 'svelte/reactivity';
    import {
        ArrowLeft,
        Check,
        ChevronDown,
        Download,
        FileText,
        FlaskConical,
        GitBranch,
        History,
        LoaderCircle,
        MessageSquare,
        Save,
        Star
    } from '@lucide/svelte';
    import { getGateway } from '#lib/client/context.js';
    import type { DocumentVersion } from '#lib/contracts/version.js';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import * as Resizable from '#lib/components/ui/resizable/index.js';
    import * as Tabs from '#lib/components/ui/tabs/index.js';
    import * as Dialog from '#lib/components/ui/dialog/index.js';
    import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
    import * as NativeSelect from '#lib/components/ui/native-select/index.js';
    import * as Empty from '#lib/components/ui/empty/index.js';
    import DocumentHost from '#lib/components/editor/document-host.svelte';
    import ChatPanel from '#lib/components/chat/chat-panel.svelte';
    import VersionPanel from '#lib/components/versioning/version-panel.svelte';

    const gateway = getGateway();
    const wide = new MediaQuery('(min-width: 1024px)');
    const documentId = $derived(page.params.documentId ?? '');
    const document = $derived($gateway.documents.find((item) => item.id === documentId));
    const ownBranch = $derived(
        $gateway.branches.find(
            (branch) =>
                branch.documentId === documentId && branch.userId === $gateway.currentUser?.id
        )
    );
    const representative = $derived(
        $gateway.versions.find((version) => version.id === document?.representativeVersionId)
    );
    let mobileTab = $state('document');
    let view = $state('working');
    let selectedVersionId = $state('');
    let versionsOpen = $state(false);
    let downloadOpen = $state(false);
    let downloadTarget = $state('working');
    let downloadFormat = $state<'hwp' | 'hwpx'>('hwpx');
    let downloading = $state(false);
    let downloadError = $state('');
    let notice = $state('');
    let error = $state('');
    let host = $state<DocumentHost>();
    const selectedVersion = $derived(
        $gateway.versions.find(
            (version) => version.id === selectedVersionId && version.documentId === documentId
        )
    );
    const dirty = $derived(!!ownBranch && ownBranch.revision !== ownBranch.savedRevision);
    const visibleContent = $derived(
        view === 'representative'
            ? (representative?.content ?? '')
            : view === 'version'
              ? (selectedVersion?.content ?? '')
              : (ownBranch?.content ?? representative?.content ?? '')
    );
    const viewLabel = $derived(
        view === 'representative'
            ? '문서 대표 버전'
            : view === 'version'
              ? (selectedVersion?.title ?? '저장된 버전')
              : '내 작업본'
    );

    $effect(() => {
        if (view === 'version' && !selectedVersion) view = 'working';
    });

    function save() {
        try {
            gateway.saveDocument(documentId);
            error = '';
            notice =
                '샘플 작업본의 저장 상태를 반영했습니다. 실제 파일은 서버에 저장되지 않았습니다.';
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '저장 상태를 반영하지 못했습니다.';
        }
    }

    function simulateEdit() {
        try {
            gateway.markEdited(documentId);
            view = 'working';
            notice =
                '미저장 변경 상태를 재현했습니다. 실행 중인 AI 작업을 완료하면 결과 충돌을 확인할 수 있습니다.';
            error = '';
        } catch (cause) {
            error =
                cause instanceof Error ? cause.message : '샘플 편집 상태를 변경하지 못했습니다.';
        }
    }

    function previewVersion(version: DocumentVersion) {
        selectedVersionId = version.id;
        view = 'version';
        mobileTab = 'document';
    }

    async function download() {
        if (downloading) return;
        downloading = true;
        downloadError = '';
        try {
            if (downloadTarget !== 'working') {
                throw new Error(
                    '저장된 버전의 실제 파일은 아직 연결되지 않았습니다. 샘플 데이터로는 파일을 다운로드할 수 없습니다.'
                );
            }
            if (!host) throw new Error('문서 편집기가 준비되지 않았습니다.');
            const blob = await host.exportFile(downloadFormat);
            if (!(blob instanceof Blob) || !blob.size)
                throw new Error('다운로드할 문서 파일이 없습니다.');
            const url = URL.createObjectURL(blob);
            const anchor = window.document.createElement('a');
            anchor.href = url;
            anchor.download = `${document?.title.replace(/[\\/:*?"<>|]/g, '_') ?? 'document'}.${downloadFormat}`;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            notice = '편집기에서 내보낸 문서의 다운로드를 요청했습니다.';
            downloadOpen = false;
        } catch (cause) {
            downloadError =
                cause instanceof Error ? cause.message : '문서 내보내기에 실패했습니다.';
        } finally {
            downloading = false;
        }
    }
</script>

<svelte:head><title>{document?.title ?? '문서 작업 공간'} · HWPX Cowork</title></svelte:head>

{#if document}
    <div
        class="flex h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0 min-w-0 flex-none flex-col overflow-hidden md:h-[calc(100dvh-5rem)] md:max-h-[calc(100dvh-5rem)]"
    >
        <header class="shrink-0 space-y-3 border-b bg-background px-4 py-4 md:px-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                    <Button
                        href="/documents"
                        variant="ghost"
                        size="icon-sm"
                        class="mt-0.5 shrink-0"
                        aria-label="문서 목록으로 돌아가기"><ArrowLeft class="size-4" /></Button
                    >
                    <div class="min-w-0">
                        <h1 class="break-words text-lg font-semibold tracking-tight">
                            {document.title}
                        </h1>
                        <div
                            class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
                        >
                            <span>{document.format.toUpperCase()}</span><span aria-hidden="true"
                                >·</span
                            ><span class="flex items-center gap-1"
                                ><GitBranch class="size-3.5" />{$gateway.currentUser?.name}의 작업
                                공간</span
                            ><Badge variant="outline">샘플</Badge>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onclick={() => (versionsOpen = true)}
                        ><History class="size-3.5" />버전</Button
                    >
                    <Button
                        size="sm"
                        variant="outline"
                        onclick={() => {
                            downloadTarget = view === 'version' ? 'version' : view;
                            downloadError = '';
                            downloadOpen = true;
                        }}
                        ><Download class="size-3.5" /><span class="hidden sm:inline">다운로드</span
                        ><span class="sr-only sm:hidden">다운로드</span></Button
                    >
                    <Button size="sm" onclick={save} disabled={!ownBranch}
                        ><Save class="size-3.5" />샘플 저장</Button
                    >
                </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        {#snippet child({ props })}<Button
                                variant="ghost"
                                size="sm"
                                class="-ml-2"
                                {...props}
                                >{#if view === 'representative'}<Star
                                        class="size-3.5"
                                    />{:else}<GitBranch
                                        class="size-3.5"
                                    />{/if}{viewLabel}<ChevronDown
                                    class="size-3.5 text-muted-foreground"
                                /></Button
                            >{/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="start">
                        <DropdownMenu.Item onclick={() => (view = 'working')}
                            ><GitBranch class="size-4" />내 작업본</DropdownMenu.Item
                        >
                        <DropdownMenu.Item onclick={() => (view = 'representative')}
                            ><Star class="size-4" />대표 버전 보기</DropdownMenu.Item
                        >
                        {#if selectedVersion}<DropdownMenu.Item onclick={() => (view = 'version')}
                                ><History
                                    class="size-4"
                                />{selectedVersion.title}</DropdownMenu.Item
                            >{/if}
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
                <div class="flex items-center gap-3">
                    <span
                        class="flex items-center gap-1.5 text-xs text-muted-foreground"
                        role="status"
                        >{#if dirty}<span class="size-1.5 rounded-full bg-amber-500"></span>미저장
                            변경{:else}<Check class="size-3.5" />샘플 작업본 저장됨{/if}</span
                    >
                    <DropdownMenu.Root
                        ><DropdownMenu.Trigger
                            >{#snippet child({ props })}<Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="작업 공간 상태 재현"
                                    {...props}><FlaskConical class="size-3.5" /></Button
                                >{/snippet}</DropdownMenu.Trigger
                        ><DropdownMenu.Content align="end"
                            ><DropdownMenu.Label>화면 검토용 동작</DropdownMenu.Label
                            ><DropdownMenu.Item onclick={simulateEdit}
                                >미저장 변경 재현</DropdownMenu.Item
                            ></DropdownMenu.Content
                        ></DropdownMenu.Root
                    >
                </div>
            </div>
            {#if notice}<p role="status" class="text-xs leading-5 text-muted-foreground">
                    {notice}
                </p>{/if}
            {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
        </header>

        {#key documentId}
            <Tabs.Root bind:value={mobileTab} class="flex min-h-0 flex-1 flex-col gap-0">
                <div class="border-b bg-background p-2 lg:hidden">
                    <Tabs.List class="grid w-full grid-cols-2"
                        ><Tabs.Trigger value="document"
                            ><FileText class="size-4" />문서</Tabs.Trigger
                        ><Tabs.Trigger value="chat"
                            ><MessageSquare class="size-4" />대화</Tabs.Trigger
                        ></Tabs.List
                    >
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                    <Resizable.PaneGroup direction="horizontal" class="max-lg:!block">
                        <Resizable.Pane
                            defaultSize={62}
                            minSize={35}
                            class={mobileTab === 'document'
                                ? 'h-full min-w-0'
                                : 'hidden h-full min-w-0 lg:block'}
                        >
                            <Tabs.Content value="document" class="h-full">
                                {#snippet child({ props })}
                                    <div
                                        {...props}
                                        hidden={!wide.current && mobileTab !== 'document'}
                                        class="h-full outline-none"
                                    >
                                        <DocumentHost
                                            bind:this={host}
                                            title={document.title}
                                            content={visibleContent}
                                            {viewLabel}
                                            onChanged={simulateEdit}
                                        />
                                    </div>
                                {/snippet}
                            </Tabs.Content>
                        </Resizable.Pane>
                        <Resizable.Handle
                            withHandle
                            class="hidden lg:flex"
                            aria-label="문서와 대화 영역 너비 조절"
                        />
                        <Resizable.Pane
                            defaultSize={38}
                            minSize={28}
                            class={mobileTab === 'chat'
                                ? 'h-full min-w-0'
                                : 'hidden h-full min-w-0 lg:block'}
                        >
                            <Tabs.Content value="chat" class="h-full">
                                {#snippet child({ props })}
                                    <div
                                        {...props}
                                        hidden={!wide.current && mobileTab !== 'chat'}
                                        class="h-full outline-none"
                                    >
                                        <ChatPanel {documentId} />
                                    </div>
                                {/snippet}
                            </Tabs.Content>
                        </Resizable.Pane>
                    </Resizable.PaneGroup>
                </div>
            </Tabs.Root>
        {/key}
    </div>
    <VersionPanel {documentId} bind:open={versionsOpen} onPreview={previewVersion} />
{:else}
    <Empty.Root class="m-6 min-h-96 rounded-xl border"
        ><Empty.Header
            ><Empty.Media variant="icon"><FileText /></Empty.Media><Empty.Title
                >문서를 찾을 수 없습니다</Empty.Title
            ><Empty.Description>문서가 삭제되었거나 샘플 상태가 초기화되었습니다.</Empty.Description
            ></Empty.Header
        ><Empty.Content
            ><Button href="/documents" variant="outline">문서 목록으로 돌아가기</Button
            ></Empty.Content
        ></Empty.Root
    >
{/if}

<Dialog.Root bind:open={downloadOpen}>
    <Dialog.Content>
        <Dialog.Header
            ><Dialog.Title>문서 다운로드</Dialog.Title><Dialog.Description
                >내려받을 대상과 문서 형식을 선택하세요. 실제 파일이 준비된 경우에만 다운로드합니다.</Dialog.Description
            ></Dialog.Header
        >
        <div class="space-y-3">
            <div class="space-y-1.5">
                <label for="download-target" class="text-sm font-medium">대상</label
                ><NativeSelect.Root id="download-target" bind:value={downloadTarget} class="w-full"
                    ><NativeSelect.Option value="working">내 작업본</NativeSelect.Option
                    ><NativeSelect.Option value="representative">대표 버전</NativeSelect.Option
                    >{#if selectedVersion}<NativeSelect.Option value="version"
                            >선택한 버전 · {selectedVersion.title}</NativeSelect.Option
                        >{/if}</NativeSelect.Root
                >
            </div>
            <div class="space-y-1.5">
                <label for="download-format" class="text-sm font-medium">파일 형식</label
                ><NativeSelect.Root id="download-format" bind:value={downloadFormat} class="w-full"
                    ><NativeSelect.Option value="hwpx">HWPX (.hwpx)</NativeSelect.Option
                    ><NativeSelect.Option value="hwp">HWP (.hwp)</NativeSelect.Option
                    ></NativeSelect.Root
                >
            </div>
        </div>
        {#if downloadError}<p role="alert" class="text-sm leading-6 text-destructive">
                {downloadError}
            </p>{/if}
        <Dialog.Footer
            ><Button variant="outline" onclick={() => (downloadOpen = false)}>닫기</Button><Button
                disabled={downloading}
                onclick={download}
                >{#if downloading}<LoaderCircle class="size-4 animate-spin" />{:else}<Download
                        class="size-4"
                    />{/if}파일 준비</Button
            ></Dialog.Footer
        >
    </Dialog.Content>
</Dialog.Root>
