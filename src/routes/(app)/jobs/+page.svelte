<script lang="ts">
    import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
    import PlayIcon from '@lucide/svelte/icons/play';
    import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
    import { getGateway } from '#lib/client/context.js';
    import { errorMessage, formatDate } from '#lib/client/format.js';
    import { JOB_APPLY_STATUS_LABELS, type Job } from '#lib/contracts/job.js';
    import DataTable from '#lib/components/common/data-table.svelte';
    import ViewState from '#lib/components/common/view-state.svelte';
    import JobStatus from '#lib/components/jobs/job-status.svelte';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import { Progress } from '#lib/components/ui/progress/index.js';
    import * as Tabs from '#lib/components/ui/tabs/index.js';
    import * as Dialog from '#lib/components/ui/dialog/index.js';
    import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';

    const gateway = getGateway();
    let filter = $state('all');
    let detailId = $state<string | null>(null);
    let detailOpen = $state(false);
    let cancelId = $state<string | null>(null);
    let cancelOpen = $state(false);
    let error = $state('');
    const active = $derived(
        $gateway.jobs.filter((job) => job.status === 'queued' || job.status === 'running')
    );
    const pending = $derived($gateway.jobs.filter((job) => job.applyStatus === 'pending'));
    const filtered = $derived(
        $gateway.jobs.filter(
            (job) =>
                filter === 'all' ||
                (filter === 'active' && ['queued', 'running'].includes(job.status)) ||
                (filter === 'pending' && job.applyStatus === 'pending') ||
                (filter === 'done' && ['succeeded', 'failed', 'cancelled'].includes(job.status))
        )
    );
    const selected = $derived($gateway.jobs.find((job) => job.id === detailId));
    const columns = [
        {
            id: 'prompt',
            label: '작업',
            value: (job: Job) =>
                `${$gateway.documents.find((document) => document.id === job.documentId)?.title} ${job.prompt}`
        },
        { id: 'status', label: '상태', value: (job: Job) => job.status },
        { id: 'user', label: '요청자', value: (job: Job) => job.userId },
        { id: 'createdAt', label: '요청 시간', value: (job: Job) => job.createdAt },
        { id: 'actions', label: '작업 관리', value: () => '', sortable: false }
    ];

    function act(action: () => void) {
        error = '';
        try {
            action();
        } catch (cause) {
            error = errorMessage(cause);
        }
    }
    function confirmCancellation() {
        error = '';
        if (!cancelId) return;
        try {
            gateway.cancelJob(cancelId);
            cancelOpen = false;
        } catch (cause) {
            error = errorMessage(cause);
        }
    }
</script>

<svelte:head><title>작업 · HWPX Cowork</title></svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-7 p-4 md:p-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">작업</h1>
            <p class="text-sm text-muted-foreground">
                문서별 AI 작업의 진행 상황과 확인할 결과를 한곳에서 살펴보세요.
            </p>
        </div>
        <Button href="/documents" variant="outline" class="h-9"
            >문서에서 새 작업 시작<ArrowUpRightIcon /></Button
        >
    </header>
    {#if error}<p
            role="alert"
            class="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
        >
            {error}
        </p>{/if}
    <ViewState loading={$gateway.loading} error={$gateway.error} onretry={() => gateway.reset()}>
        <Tabs.Root bind:value={filter} class="gap-5">
            <Tabs.List variant="line" class="max-w-full overflow-x-auto">
                <Tabs.Trigger value="all"
                    >전체 <span class="text-muted-foreground">{$gateway.jobs.length}</span
                    ></Tabs.Trigger
                >
                <Tabs.Trigger value="active"
                    >진행 중 <span class="text-muted-foreground">{active.length}</span
                    ></Tabs.Trigger
                >
                <Tabs.Trigger value="pending"
                    >결과 선택 <Badge variant="secondary" class="px-1.5 text-[10px]"
                        >{pending.length}</Badge
                    ></Tabs.Trigger
                >
                <Tabs.Trigger value="done">종료된 작업</Tabs.Trigger>
            </Tabs.List>
            <DataTable
                data={filtered}
                {columns}
                searchColumn="prompt"
                searchLabel="문서 또는 요청 내용 검색"
                emptyTitle="이 상태의 작업이 없습니다"
                emptyDescription="문서 화면에서 AI에게 수정을 요청하면 진행 상황을 확인할 수 있습니다."
            >
                {#snippet cell(job, column)}
                    {#if column === 'prompt'}
                        <button
                            class="block max-w-80 space-y-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onclick={() => {
                                detailId = job.id;
                                detailOpen = true;
                                error = '';
                            }}
                            ><span class="block truncate font-medium hover:underline"
                                >{$gateway.documents.find(
                                    (document) => document.id === job.documentId
                                )?.title ?? '문서'}</span
                            ><span class="block max-w-64 truncate text-xs text-muted-foreground"
                                >{job.prompt}</span
                            ></button
                        >
                    {:else if column === 'status'}
                        <div class="space-y-2">
                            <JobStatus {job} />{#if job.status === 'running'}<Progress
                                    value={job.progress}
                                    aria-label="샘플 작업 진행률"
                                    class="h-1.5 w-28"
                                />{/if}
                        </div>
                    {:else if column === 'user'}
                        <span class="whitespace-nowrap text-sm"
                            >{$gateway.members.find((member) => member.id === job.userId)?.name ??
                                '알 수 없음'}{#if job.userId === $gateway.currentUser?.id}<span
                                    class="ml-1 text-xs text-muted-foreground">(나)</span
                                >{/if}</span
                        >
                    {:else if column === 'createdAt'}
                        <span class="whitespace-nowrap text-xs text-muted-foreground"
                            >{formatDate(job.createdAt)}</span
                        >
                    {:else}
                        <div class="flex items-center gap-1">
                            {#if job.applyStatus === 'pending'}<Button
                                    size="sm"
                                    href={`/documents/${job.documentId}`}>결과 선택</Button
                                >
                            {:else if job.userId === $gateway.currentUser?.id && ['queued', 'running'].includes(job.status)}<Button
                                    variant="outline"
                                    size="sm"
                                    onclick={() => act(() => gateway.advanceJob(job.id))}
                                    ><PlayIcon />샘플 진행</Button
                                ><Button
                                    variant="ghost"
                                    size="sm"
                                    onclick={() => {
                                        cancelId = job.id;
                                        cancelOpen = true;
                                    }}>취소</Button
                                >
                            {:else if job.userId === $gateway.currentUser?.id && ['failed', 'cancelled'].includes(job.status)}<Button
                                    variant="outline"
                                    size="sm"
                                    onclick={() =>
                                        act(() => {
                                            gateway.retryJob(job.id);
                                        })}><RotateCcwIcon />다시 시도</Button
                                >
                            {:else}<Button
                                    variant="ghost"
                                    size="sm"
                                    href={`/documents/${job.documentId}`}
                                    >문서 보기<ArrowUpRightIcon /></Button
                                >{/if}
                        </div>
                    {/if}
                {/snippet}
            </DataTable>
        </Tabs.Root>
        <p class="mt-4 text-xs leading-relaxed text-muted-foreground">
            샘플 미리보기에서는 ‘샘플 진행’으로 다음 상태를 확인할 수 있습니다. 실제 AI 작업은
            실행되지 않습니다.
        </p>
    </ViewState>
</div>

<AlertDialog.Root bind:open={cancelOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header
            ><AlertDialog.Title>이 작업을 취소할까요?</AlertDialog.Title><AlertDialog.Description
                >진행 중인 샘플 작업을 종료합니다. 현재 문서와 직접 편집한 내용은 유지됩니다.</AlertDialog.Description
            ></AlertDialog.Header
        >
        {#if error}<p role="alert" class="text-sm text-destructive">{error}</p>{/if}
        <AlertDialog.Footer
            ><AlertDialog.Cancel>계속 진행</AlertDialog.Cancel><AlertDialog.Action
                onclick={confirmCancellation}>작업 취소</AlertDialog.Action
            ></AlertDialog.Footer
        >
    </AlertDialog.Content>
</AlertDialog.Root>

<Dialog.Root bind:open={detailOpen}>
    <Dialog.Content class="sm:max-w-lg p-6">
        {#if selected}
            <Dialog.Header
                ><Dialog.Title>작업 상세</Dialog.Title><Dialog.Description
                    >{$gateway.documents.find((document) => document.id === selected.documentId)
                        ?.title}</Dialog.Description
                ></Dialog.Header
            >
            <div class="space-y-5">
                <div class="flex flex-wrap items-center gap-2">
                    <JobStatus job={selected} /><span class="text-xs text-muted-foreground"
                        >{JOB_APPLY_STATUS_LABELS[selected.applyStatus]}</span
                    >
                </div>
                <div class="space-y-2">
                    <h3 class="text-xs font-medium text-muted-foreground">요청 내용</h3>
                    <p
                        class="whitespace-pre-wrap rounded-lg bg-muted/60 p-4 text-sm leading-relaxed"
                    >
                        {selected.prompt}
                    </p>
                </div>
                <dl class="grid grid-cols-2 gap-y-3 text-sm">
                    <dt class="text-muted-foreground">요청자</dt>
                    <dd>
                        {$gateway.members.find((member) => member.id === selected.userId)?.name}
                    </dd>
                    <dt class="text-muted-foreground">요청 시간</dt>
                    <dd>{formatDate(selected.createdAt)}</dd>
                    <dt class="text-muted-foreground">업데이트</dt>
                    <dd>{formatDate(selected.updatedAt)}</dd>
                </dl>
                {#if selected.error}<p role="alert" class="text-sm text-destructive">
                        {selected.error}
                    </p>{/if}
                <p class="text-xs text-muted-foreground">
                    모의 작업의 상태입니다. 실제 사용량과 비용은 없습니다.
                </p>
            </div>
            <Dialog.Footer
                ><Button variant="outline" onclick={() => (detailOpen = false)}>닫기</Button><Button
                    href={`/documents/${selected.documentId}`}
                    >문서에서 확인<ArrowUpRightIcon /></Button
                ></Dialog.Footer
            >
        {/if}
    </Dialog.Content>
</Dialog.Root>
