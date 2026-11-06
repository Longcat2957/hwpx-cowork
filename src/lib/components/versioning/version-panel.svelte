<script lang="ts">
    import {
        ArrowDownToLine,
        Check,
        ChevronRight,
        GitBranch,
        GitCommitHorizontal,
        GitCompareArrows,
        History,
        Star
    } from '@lucide/svelte';
    import { getGateway } from '#lib/client/context.js';
    import type { DocumentVersion } from '#lib/contracts/version.js';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import * as Collapsible from '#lib/components/ui/collapsible/index.js';
    import * as Sheet from '#lib/components/ui/sheet/index.js';
    import * as Dialog from '#lib/components/ui/dialog/index.js';
    import * as NativeSelect from '#lib/components/ui/native-select/index.js';

    let {
        documentId,
        open = $bindable(false),
        onPreview
    }: {
        documentId: string;
        open?: boolean;
        onPreview: (version: DocumentVersion) => void;
    } = $props();
    const gateway = getGateway();
    let selectedId = $state('');
    let compareId = $state('');
    let compareOpen = $state(false);
    let action = $state<'restore' | 'import' | 'representative' | null>(null);
    let confirmOpen = $state(false);
    let expectedRepresentativeId = $state('');
    let expectedRevision = $state(0);
    let targetId = $state('');
    let error = $state('');
    let notice = $state('');
    const document = $derived($gateway.documents.find((item) => item.id === documentId));
    const branches = $derived($gateway.branches.filter((item) => item.documentId === documentId));
    const versions = $derived($gateway.versions.filter((item) => item.documentId === documentId));
    const selected = $derived(versions.find((version) => version.id === selectedId));
    const compared = $derived(versions.find((version) => version.id === compareId));
    const ownBranch = $derived(
        branches.find((branch) => branch.userId === $gateway.currentUser?.id)
    );
    const actionLabels = {
        restore: '내 작업본 복원',
        import: '내 브랜치로 가져오기',
        representative: '대표 버전 지정'
    };

    $effect(() => {
        if (!versions.some((version) => version.id === selectedId))
            selectedId = document?.representativeVersionId ?? versions[0]?.id ?? '';
        if (!versions.some((version) => version.id === compareId))
            compareId = versions.find((version) => version.id !== selectedId)?.id ?? '';
    });

    function authorName(id: string) {
        return $gateway.members.find((member) => member.id === id)?.name ?? '구성원';
    }

    function requestAction(next: 'restore' | 'import' | 'representative') {
        if (!selected || !document) return;
        action = next;
        targetId = selected.id;
        expectedRepresentativeId = document.representativeVersionId;
        expectedRevision = ownBranch?.revision ?? 0;
        error = '';
        confirmOpen = true;
    }

    function confirmAction() {
        if (!action) return;
        try {
            if (action === 'representative') {
                gateway.setRepresentative(documentId, targetId, expectedRepresentativeId);
            } else {
                if ((ownBranch?.revision ?? 0) !== expectedRevision) {
                    throw new Error(
                        '확인하는 동안 작업본이 변경되었습니다. 창을 닫고 최신 내용을 다시 확인해 주세요.'
                    );
                }
                if (action === 'restore') gateway.restoreVersion(documentId, targetId);
                else gateway.importVersion(documentId, targetId);
            }
            notice = `${actionLabels[action]}을 샘플 상태에 반영했습니다.`;
            confirmOpen = false;
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '버전을 변경하지 못했습니다.';
        }
    }
</script>

<Sheet.Root bind:open>
    <Sheet.Content class="w-full gap-0 sm:max-w-3xl">
        <Sheet.Header class="border-b p-5">
            <Sheet.Title class="flex items-center gap-2"
                ><History class="size-4" />문서 버전</Sheet.Title
            >
            <Sheet.Description
                >사용자별 작업 이력을 살펴보고, 원하는 시점으로 이어서 작업하세요.</Sheet.Description
            >
        </Sheet.Header>
        <div class="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[260px_1fr]">
            <nav
                class="space-y-3 border-b bg-muted/20 p-4 md:border-r md:border-b-0"
                aria-label="사용자별 문서 버전 트리"
            >
                {#each branches as branch (branch.id)}
                    <Collapsible.Root open class="group/branch">
                        <Collapsible.Trigger>
                            {#snippet child({ props })}
                                <Button
                                    variant="ghost"
                                    class="h-auto w-full justify-start px-2 py-2.5"
                                    {...props}
                                >
                                    <ChevronRight
                                        class="size-3.5 group-data-[state=open]/branch:rotate-90"
                                    />
                                    <GitBranch class="size-4 text-primary" />
                                    <span
                                        >{authorName(branch.userId)}{branch.userId ===
                                        $gateway.currentUser?.id
                                            ? ' (나)'
                                            : ''}</span
                                    >
                                </Button>
                            {/snippet}
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <p
                                class="mb-2 ml-10 break-all font-mono text-[10px] text-muted-foreground"
                            >
                                {branch.id}
                            </p>
                            <ul class="ml-4 space-y-1 border-l pl-2">
                                {#each versions.filter((version) => version.branchId === branch.id && !versions.some((parent) => parent.id === version.parentVersionId && parent.branchId === branch.id)) as root (root.id)}
                                    {@render versionNode(root, [])}
                                {/each}
                            </ul>
                        </Collapsible.Content>
                    </Collapsible.Root>
                {/each}
                {#if !branches.length}<p class="py-8 text-sm text-muted-foreground">
                        아직 저장된 작업 이력이 없습니다.
                    </p>{/if}
            </nav>
            <div class="space-y-5 p-5">
                {#if notice}<p role="status" class="flex items-start gap-2 text-sm text-primary">
                        <Check class="mt-0.5 size-4 shrink-0" />{notice}
                    </p>{/if}
                {#if selected}
                    <div class="space-y-3">
                        <div class="flex flex-wrap gap-2">
                            <Badge variant="outline">저장된 버전</Badge
                            >{#if selected.id === document?.representativeVersionId}<Badge
                                    ><Star class="size-3" />대표 버전</Badge
                                >{/if}
                        </div>
                        <h3 class="text-lg font-semibold">{selected.title}</h3>
                        <p class="text-sm leading-6 text-muted-foreground">{selected.summary}</p>
                        <dl class="grid grid-cols-[76px_1fr] gap-2 text-xs">
                            <dt class="text-muted-foreground">작성자</dt>
                            <dd>{authorName(selected.authorId)}</dd>
                            <dt class="text-muted-foreground">저장 시각</dt>
                            <dd>{new Date(selected.createdAt).toLocaleString('ko-KR')}</dd>
                            <dt class="text-muted-foreground">버전 ID</dt>
                            <dd class="break-all font-mono">{selected.id}</dd>
                            <dt class="text-muted-foreground">부모 버전</dt>
                            <dd class="break-all font-mono">
                                {selected.parentVersionId ?? '시작 버전'}
                            </dd>
                            {#if selected.sourceVersionId}<dt class="text-muted-foreground">
                                    가져온 원본
                                </dt>
                                <dd class="break-all font-mono">{selected.sourceVersionId}</dd>{/if}
                        </dl>
                    </div>
                    <div class="space-y-3 border-y py-4">
                        <Button
                            variant="outline"
                            class="w-full justify-start"
                            onclick={() => {
                                onPreview(selected);
                                open = false;
                            }}><GitCommitHorizontal class="size-4" />선택한 버전 보기</Button
                        >
                        {#if selected.authorId === $gateway.currentUser?.id}
                            <Button
                                variant="outline"
                                class="w-full justify-start"
                                onclick={() => requestAction('restore')}
                                ><History class="size-4" />내 작업본 복원</Button
                            >
                        {:else}
                            <Button
                                variant="outline"
                                class="w-full justify-start"
                                onclick={() => requestAction('import')}
                                ><ArrowDownToLine class="size-4" />내 브랜치로 가져오기</Button
                            >
                        {/if}
                        <Button
                            variant="outline"
                            class="w-full justify-start"
                            disabled={selected.id === document?.representativeVersionId}
                            onclick={() => requestAction('representative')}
                            ><Star class="size-4" />대표 버전 지정</Button
                        >
                        <p class="text-xs leading-5 text-muted-foreground">
                            복원·가져오기는 내 작업본만 변경합니다. 대표 지정은 모든 구성원이 처음
                            보는 버전을 변경합니다.
                        </p>
                    </div>
                    <div class="space-y-3">
                        <label for="compare-version" class="text-sm font-medium"
                            >이 버전과 비교하기</label
                        >
                        <NativeSelect.Root
                            id="compare-version"
                            bind:value={compareId}
                            class="w-full"
                        >
                            <NativeSelect.Option value="">비교할 버전 선택</NativeSelect.Option>
                            {#each versions as version (version.id)}
                                {#if version.id !== selectedId}<NativeSelect.Option
                                        value={version.id}
                                        >{authorName(version.authorId)} · {version.title}</NativeSelect.Option
                                    >{/if}
                            {/each}
                        </NativeSelect.Root>
                        <Button
                            variant="secondary"
                            class="w-full"
                            disabled={!compared || compared.id === selectedId}
                            onclick={() => (compareOpen = true)}
                            ><GitCompareArrows class="size-4" />두 버전 비교</Button
                        >
                    </div>
                {/if}
            </div>
        </div>
        <div class="border-t px-5 py-3 text-xs text-muted-foreground">
            샘플 이력 · 실제 파일 저장·비교는 아직 연결되지 않았습니다.
        </div>
    </Sheet.Content>
</Sheet.Root>

{#snippet versionNode(version: DocumentVersion, ancestors: string[])}
    {#if !ancestors.includes(version.id)}
        {@const children = versions.filter(
            (item) => item.parentVersionId === version.id && item.branchId === version.branchId
        )}
        <li>
            <Button
                variant={selectedId === version.id ? 'secondary' : 'ghost'}
                class="h-auto w-full justify-start gap-2 px-2 py-2 text-left"
                onclick={() => {
                    selectedId = version.id;
                    notice = '';
                }}
            >
                <GitCommitHorizontal class="size-3.5 shrink-0" />
                <span class="min-w-0 flex-1"
                    ><span class="block truncate text-xs">{version.title}</span><span
                        class="block text-[10px] text-muted-foreground"
                        >{new Date(version.createdAt).toLocaleDateString('ko-KR')}</span
                    ></span
                >
                {#if version.id === document?.representativeVersionId}<Star
                        class="size-3 shrink-0 text-primary"
                    />{/if}
            </Button>
            {#if children.length}
                <ul class="ml-3 border-l pl-1.5">
                    {#each children as child (child.id)}{@render versionNode(child, [
                            ...ancestors,
                            version.id
                        ])}{/each}
                </ul>
            {/if}
        </li>
    {/if}
{/snippet}

<Dialog.Root bind:open={compareOpen}>
    <Dialog.Content class="max-h-[90dvh] overflow-auto sm:max-w-3xl">
        <Dialog.Header
            ><Dialog.Title>두 버전 비교</Dialog.Title><Dialog.Description
                >샘플 텍스트를 나란히 표시합니다. HWP의 표·서식·이미지 변경 비교는 실제 연동
                단계에서 제공합니다.</Dialog.Description
            ></Dialog.Header
        >
        <div class="grid gap-4 md:grid-cols-2">
            {#each [selected, compared] as version, index (index)}
                {#if version}<section class="rounded-lg border p-4">
                        <Badge variant="outline" class="mb-3"
                            >{index === 0 ? '기준 버전' : '비교 버전'}</Badge
                        >
                        <h3 class="mb-3 text-sm font-medium">{version.title}</h3>
                        <p
                            class="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground"
                        >
                            {version.content}
                        </p>
                    </section>{/if}
            {/each}
        </div>
        <Dialog.Footer
            ><Button variant="outline" onclick={() => (compareOpen = false)}>닫기</Button
            ></Dialog.Footer
        >
    </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={confirmOpen}>
    <Dialog.Content>
        <Dialog.Header
            ><Dialog.Title>{action ? actionLabels[action] : '버전 변경'} 확인</Dialog.Title
            ><Dialog.Description
                >{action === 'representative'
                    ? '이 문서의 기본 보기와 목록에 표시되는 대표 버전이 바뀝니다. 다른 구성원의 작업본은 변경되지 않습니다.'
                    : '현재 작업 상태를 복원점으로 보존한 뒤 선택한 버전으로 내 작업본을 변경합니다. 기존 이력은 삭제되지 않습니다.'}</Dialog.Description
            ></Dialog.Header
        >
        {#if ownBranch && ownBranch.revision !== ownBranch.savedRevision && action !== 'representative'}<p
                class="rounded-lg bg-muted p-3 text-sm"
            >
                내 작업본에 미저장 변경이 있습니다. 현재 상태를 보존하고 진행합니다.
            </p>{/if}
        {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
        <Dialog.Footer
            ><Button variant="outline" onclick={() => (confirmOpen = false)}>취소</Button><Button
                onclick={confirmAction}>{action ? actionLabels[action] : '확인'}</Button
            ></Dialog.Footer
        >
    </Dialog.Content>
</Dialog.Root>
