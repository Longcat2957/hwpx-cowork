<script lang="ts">
    import { goto } from '$app/navigation';
    import FileTextIcon from '@lucide/svelte/icons/file-text';
    import PlusIcon from '@lucide/svelte/icons/plus';
    import UploadIcon from '@lucide/svelte/icons/upload';
    import MoreHorizontalIcon from '@lucide/svelte/icons/ellipsis';
    import SparklesIcon from '@lucide/svelte/icons/sparkles';
    import { getGateway } from '#lib/client/context.js';
    import { errorMessage, formatDate, formatSize } from '#lib/client/format.js';
    import { MAX_UPLOAD_BYTES, type DocumentRecord } from '#lib/contracts/document.js';
    import DataTable from '#lib/components/common/data-table.svelte';
    import ViewState from '#lib/components/common/view-state.svelte';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import { Input } from '#lib/components/ui/input/index.js';
    import { Textarea } from '#lib/components/ui/textarea/index.js';
    import * as Dialog from '#lib/components/ui/dialog/index.js';
    import * as Field from '#lib/components/ui/field/index.js';
    import * as NativeSelect from '#lib/components/ui/native-select/index.js';
    import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
    import * as Avatar from '#lib/components/ui/avatar/index.js';

    const gateway = getGateway();
    let formatFilter = $state('all');
    let createOpen = $state(false);
    let uploadOpen = $state(false);
    let renameOpen = $state(false);
    let title = $state('');
    let format = $state<'hwp' | 'hwpx'>('hwpx');
    let mode = $state('blank');
    let prompt = $state('');
    let file = $state<File | null>(null);
    let renameId = $state('');
    let renameTitle = $state('');
    let error = $state('');
    let busy = $state(false);
    const documents = $derived(
        $gateway.documents.filter(
            (document) => formatFilter === 'all' || document.format === formatFilter
        )
    );
    const columns = [
        { id: 'title', label: '문서 이름', value: (row: DocumentRecord) => row.title },
        { id: 'format', label: '형식', value: (row: DocumentRecord) => row.format },
        { id: 'owner', label: '작성자', value: (row: DocumentRecord) => row.ownerId },
        { id: 'updatedAt', label: '최근 수정', value: (row: DocumentRecord) => row.updatedAt },
        { id: 'actions', label: '문서 작업', value: () => '', sortable: false }
    ];

    function createDocument(event: SubmitEvent) {
        event.preventDefault();
        if (busy) return;
        error = '';
        if (mode === 'ai' && (!prompt.trim() || prompt.length > 10000)) {
            error = '만들 문서에 대한 설명을 1~10,000자로 입력해 주세요.';
            return;
        }
        try {
            busy = true;
            const id = gateway.createDocument({ title, format });
            if (mode === 'ai') gateway.submitJob({ documentId: id, prompt });
            createOpen = false;
            void goto(`/documents/${id}`);
        } catch (cause) {
            error = errorMessage(cause);
        } finally {
            busy = false;
        }
    }

    function uploadDocument(event: SubmitEvent) {
        event.preventDefault();
        if (!file || busy) return;
        error = '';
        try {
            busy = true;
            const id = gateway.uploadDocument({
                name: file.name,
                size: file.size,
                type: file.type
            });
            uploadOpen = false;
            void goto(`/documents/${id}`);
        } catch (cause) {
            error = errorMessage(cause);
        } finally {
            busy = false;
        }
    }

    function renameDocument(event: SubmitEvent) {
        event.preventDefault();
        try {
            gateway.renameDocument(renameId, renameTitle);
            renameOpen = false;
        } catch (cause) {
            error = errorMessage(cause);
        }
    }
</script>

<svelte:head><title>문서 · HWPX Cowork</title></svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-7 p-4 md:p-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">문서</h1>
            <p class="text-sm text-muted-foreground">
                함께 보는 문서, 각자의 작업 공간. 이어서 편집할 문서를 선택하세요.
            </p>
        </div>
        <div class="flex gap-2">
            <Button
                variant="outline"
                class="h-9"
                onclick={() => {
                    error = '';
                    file = null;
                    uploadOpen = true;
                }}><UploadIcon />업로드</Button
            >
            <Button
                class="h-9"
                onclick={() => {
                    error = '';
                    title = '';
                    prompt = '';
                    mode = 'blank';
                    createOpen = true;
                }}><PlusIcon />새 문서</Button
            >
        </div>
    </header>
    <ViewState loading={$gateway.loading} error={$gateway.error} onretry={() => gateway.reset()}>
        <DataTable
            data={documents}
            {columns}
            searchColumn="title"
            searchLabel="문서 이름 검색"
            emptyTitle="첫 문서를 추가해 보세요"
            emptyDescription="HWP·HWPX 파일을 업로드하거나 새 문서를 만들어 시작하세요."
        >
            {#snippet toolbar()}
                <NativeSelect.Root bind:value={formatFilter} aria-label="문서 형식 필터">
                    <NativeSelect.Option value="all">모든 형식</NativeSelect.Option>
                    <NativeSelect.Option value="hwpx">HWPX</NativeSelect.Option>
                    <NativeSelect.Option value="hwp">HWP</NativeSelect.Option>
                </NativeSelect.Root>
            {/snippet}
            {#snippet cell(document, column)}
                {#if column === 'title'}
                    <a
                        href={`/documents/${document.id}`}
                        class="group flex min-w-52 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span
                            class="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground"
                            ><FileTextIcon class="size-5" aria-hidden="true" /></span
                        >
                        <span class="space-y-1"
                            ><span class="block font-medium group-hover:underline"
                                >{document.title}</span
                            ><span class="block text-xs text-muted-foreground"
                                >{formatSize(document.size)} · {$gateway.versions.find(
                                    (version) => version.id === document.representativeVersionId
                                )?.title ?? '대표 버전 없음'}</span
                            ></span
                        >
                    </a>
                {:else if column === 'format'}
                    <Badge variant="outline" class="font-mono text-[10px]"
                        >{document.format.toUpperCase()}</Badge
                    >
                {:else if column === 'owner'}
                    {@const member = $gateway.members.find((item) => item.id === document.ownerId)}
                    <span class="flex items-center gap-2 whitespace-nowrap"
                        ><Avatar.Root class="size-6"
                            ><Avatar.Fallback class="text-[10px]"
                                >{member?.initials}</Avatar.Fallback
                            ></Avatar.Root
                        >{member?.name ?? '알 수 없음'}</span
                    >
                {:else if column === 'updatedAt'}
                    <span class="whitespace-nowrap text-xs text-muted-foreground"
                        >{formatDate(document.updatedAt)}</span
                    >
                {:else}
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger
                            >{#snippet child({ props })}<Button
                                    {...props}
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`${document.title} 메뉴`}
                                    ><MoreHorizontalIcon /></Button
                                >{/snippet}</DropdownMenu.Trigger
                        >
                        <DropdownMenu.Content align="end">
                            <DropdownMenu.Item
                                onclick={() => void goto(`/documents/${document.id}`)}
                                >문서 열기</DropdownMenu.Item
                            >
                            <DropdownMenu.Item
                                onclick={() => {
                                    renameId = document.id;
                                    renameTitle = document.title;
                                    error = '';
                                    renameOpen = true;
                                }}>이름 변경</DropdownMenu.Item
                            >
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                {/if}
            {/snippet}
        </DataTable>
    </ViewState>
</div>

<Dialog.Root bind:open={createOpen}>
    <Dialog.Content class="sm:max-w-md p-6">
        <Dialog.Header
            ><Dialog.Title>새 문서</Dialog.Title><Dialog.Description
                >빈 문서로 시작하거나 AI 초안 작성 흐름을 미리 봅니다.</Dialog.Description
            ></Dialog.Header
        >
        <form class="space-y-5" onsubmit={createDocument}>
            <Field.Field
                ><Field.Label for="new-title">문서 이름</Field.Label><Input
                    id="new-title"
                    bind:value={title}
                    required
                    maxlength={120}
                    placeholder="예: 2026년 하반기 사업 제안서"
                /></Field.Field
            >
            <div class="grid grid-cols-2 gap-3">
                <Field.Field
                    ><Field.Label for="new-format">파일 형식</Field.Label><NativeSelect.Root
                        id="new-format"
                        bind:value={format}
                        class="w-full"
                        ><NativeSelect.Option value="hwpx">HWPX</NativeSelect.Option
                        ><NativeSelect.Option value="hwp">HWP</NativeSelect.Option
                        ></NativeSelect.Root
                    ></Field.Field
                >
                <Field.Field
                    ><Field.Label for="new-mode">시작 방식</Field.Label><NativeSelect.Root
                        id="new-mode"
                        bind:value={mode}
                        class="w-full"
                        ><NativeSelect.Option value="blank">빈 문서</NativeSelect.Option
                        ><NativeSelect.Option value="ai">AI 초안</NativeSelect.Option
                        ></NativeSelect.Root
                    ></Field.Field
                >
            </div>
            {#if mode === 'ai'}<Field.Field
                    ><Field.Label for="new-prompt">어떤 문서를 만들까요?</Field.Label><Textarea
                        id="new-prompt"
                        bind:value={prompt}
                        required
                        maxlength={10000}
                        placeholder="목적, 대상, 포함할 내용을 알려주세요."
                    /></Field.Field
                >{/if}
            <p class="text-xs text-muted-foreground">
                샘플 미리보기입니다. 실제 파일이나 AI 초안은 생성하지 않습니다.
            </p>
            {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
            <Dialog.Footer
                ><Button type="button" variant="outline" onclick={() => (createOpen = false)}
                    >취소</Button
                ><Button type="submit" disabled={busy}
                    >{#if mode === 'ai'}<SparklesIcon />{/if}{busy
                        ? '준비 중…'
                        : '문서 만들기'}</Button
                ></Dialog.Footer
            >
        </form>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={uploadOpen}>
    <Dialog.Content class="sm:max-w-md p-6">
        <Dialog.Header
            ><Dialog.Title>문서 업로드</Dialog.Title><Dialog.Description
                >HWP 또는 HWPX 파일을 선택하세요.</Dialog.Description
            ></Dialog.Header
        >
        <form class="space-y-5" onsubmit={uploadDocument}>
            <Field.Field
                ><Field.Label for="upload-file">파일 선택</Field.Label><Input
                    id="upload-file"
                    type="file"
                    accept=".hwp,.hwpx"
                    onchange={(event) => {
                        file = event.currentTarget.files?.[0] ?? null;
                        error = '';
                    }}
                /><Field.Description
                    >HWP·HWPX · 최대 {formatSize(MAX_UPLOAD_BYTES)}</Field.Description
                ></Field.Field
            >
            {#if file}<p class="rounded-lg bg-muted p-3 text-sm">
                    {file.name}<span class="ml-2 text-xs text-muted-foreground"
                        >{formatSize(file.size)}</span
                    >
                </p>{/if}
            <p class="text-xs text-muted-foreground">
                이름·크기만 샘플 목록에 추가합니다. 선택한 파일은 서버로 전송되지 않습니다.
            </p>
            {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
            <Dialog.Footer
                ><Button type="button" variant="outline" onclick={() => (uploadOpen = false)}
                    >취소</Button
                ><Button type="submit" disabled={!file || busy}
                    >{busy ? '추가 중…' : '샘플 목록에 추가'}</Button
                ></Dialog.Footer
            >
        </form>
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={renameOpen}>
    <Dialog.Content class="p-6">
        <Dialog.Header
            ><Dialog.Title>문서 이름 변경</Dialog.Title><Dialog.Description
                >목록에 표시할 이름을 입력하세요.</Dialog.Description
            ></Dialog.Header
        >
        <form class="space-y-4" onsubmit={renameDocument}>
            <Field.Field
                ><Field.Label for="rename-title">문서 이름</Field.Label><Input
                    id="rename-title"
                    bind:value={renameTitle}
                    required
                    maxlength={120}
                /></Field.Field
            >{#if error}<p role="alert" class="text-sm text-destructive">
                    {error}
                </p>{/if}<Dialog.Footer
                ><Button type="button" variant="outline" onclick={() => (renameOpen = false)}
                    >취소</Button
                ><Button type="submit">변경</Button></Dialog.Footer
            >
        </form>
    </Dialog.Content>
</Dialog.Root>
