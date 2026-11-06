<script lang="ts">
    import { onMount } from 'svelte';
    import {
        ArrowUp,
        CircleCheck,
        FileText,
        History,
        LoaderCircle,
        MessageSquare,
        Paperclip,
        Plus,
        Quote,
        Sparkles,
        WifiOff,
        X
    } from '@lucide/svelte';
    import { getGateway } from '#lib/client/context.js';
    import { JOB_APPLY_STATUS_LABELS, JOB_STATUS_LABELS } from '#lib/contracts/job.js';
    import type { DocumentSelection } from '#lib/contracts/session.js';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import { Progress } from '#lib/components/ui/progress/index.js';
    import * as Message from '#lib/components/ui/message/index.js';
    import * as Bubble from '#lib/components/ui/bubble/index.js';
    import * as MessageScroller from '#lib/components/ui/message-scroller/index.js';
    import * as InputGroup from '#lib/components/ui/input-group/index.js';
    import * as Attachment from '#lib/components/ui/attachment/index.js';
    import * as NativeSelect from '#lib/components/ui/native-select/index.js';
    import * as Trace from '#lib/components/ui/trace/index.js';
    import * as Alert from '#lib/components/ui/alert/index.js';
    import ResultChoice from '#lib/components/versioning/result-choice.svelte';
    import ViewState from '#lib/components/common/view-state.svelte';

    let { documentId }: { documentId: string } = $props();
    const gateway = getGateway();
    let selectedSessionId = $state('');
    let drafts = $state<Record<string, string>>({});
    let selectedAttachments = $state<Record<string, string[]>>({});
    let selections = $state<Record<string, DocumentSelection | undefined>>({});
    let error = $state('');
    let eventAnnouncement = $state('');
    let fileInput: HTMLInputElement;
    const sessions = $derived(
        $gateway.sessions.filter((session) => session.documentId === documentId)
    );
    const selectedSession = $derived(sessions.find((session) => session.id === selectedSessionId));
    const readonly = $derived(
        !!selectedSession && selectedSession.userId !== $gateway.currentUser?.id
    );
    const draftKey = $derived(
        `${$gateway.currentUser?.id}:${documentId}:${selectedSessionId || 'new'}`
    );
    const messages = $derived(
        $gateway.messages.filter((message) => message.sessionId === selectedSessionId)
    );
    const jobs = $derived(
        $gateway.jobs
            .filter((job) => job.sessionId === selectedSessionId)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    );
    const branch = $derived(
        $gateway.branches.find(
            (item) => item.documentId === documentId && item.userId === $gateway.currentUser?.id
        )
    );
    const activeJob = $derived(jobs.find((job) => ['queued', 'running'].includes(job.status)));
    const latestJob = $derived(activeJob ?? jobs[0]);
    const pendingJobs = $derived(
        $gateway.jobs.filter(
            (job) =>
                job.documentId === documentId &&
                job.userId === $gateway.currentUser?.id &&
                job.applyStatus === 'pending'
        )
    );
    const selection = $derived(selections[draftKey]);

    onMount(() =>
        gateway.subscribeEvents(0, (event) => {
            const job = $gateway.jobs.find((item) => item.id === event.jobId);
            if (job?.documentId === documentId) {
                eventAnnouncement = `작업 진행 상황 업데이트: ${JOB_STATUS_LABELS[event.data.status]}, ${event.data.progress}%`;
            }
        })
    );

    $effect(() => {
        if (!sessions.some((session) => session.id === selectedSessionId)) {
            selectedSessionId =
                sessions.find((session) => session.userId === $gateway.currentUser?.id)?.id ??
                sessions[0]?.id ??
                '';
        }
    });

    function act(action: () => void) {
        error = '';
        try {
            action();
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '요청을 처리하지 못했습니다.';
        }
    }

    function newSession() {
        act(() => {
            selectedSessionId = gateway.createSession(documentId);
        });
    }

    function send(event: SubmitEvent) {
        event.preventDefault();
        if (readonly || activeJob) return;
        const key = draftKey;
        const prompt = (drafts[key] ?? '').trim();
        if (!prompt) return;
        act(() => {
            gateway.submitJob({
                documentId,
                prompt,
                sessionId: selectedSessionId || undefined,
                attachmentIds: selectedAttachments[key] ?? [],
                selection
            });
            drafts[key] = '';
            selectedAttachments[key] = [];
            selections[key] = undefined;
        });
    }

    function addFiles(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const key = draftKey;
        for (const file of Array.from(input.files ?? [])) {
            act(() => {
                const id = gateway.addAttachment({
                    documentId,
                    sessionId: selectedSessionId || undefined,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
                selectedAttachments[key] = [...(selectedAttachments[key] ?? []), id];
            });
        }
        input.value = '';
    }

    function removeAttachment(id: string) {
        act(() => {
            gateway.removeAttachment(id);
            selectedAttachments[draftKey] = (selectedAttachments[draftKey] ?? []).filter(
                (item) => item !== id
            );
        });
    }

    function quoteSample() {
        if (branch) {
            selections[draftKey] = {
                text: branch.content.split('\n').find((line) => line.trim()) ?? '샘플 문단',
                revision: branch.revision
            };
        }
    }

    function memberName(id: string) {
        return $gateway.members.find((member) => member.id === id)?.name ?? '구성원';
    }
</script>

<section
    class="flex h-full min-h-0 flex-col overflow-y-auto bg-background"
    aria-label="문서 AI 대화"
>
    <header class="shrink-0 space-y-3 border-b p-4">
        <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <Sparkles class="size-4 text-primary" />
                <h2 class="text-sm font-semibold">문서와 함께 대화</h2>
            </div>
            <Button variant="ghost" size="icon-sm" onclick={newSession} aria-label="새 대화 시작"
                ><Plus class="size-4" /></Button
            >
        </div>
        <div class="flex items-center gap-2">
            <History class="size-3.5 shrink-0 text-muted-foreground" />
            <NativeSelect.Root
                bind:value={selectedSessionId}
                aria-label="대화 세션 선택"
                class="min-w-0 flex-1"
            >
                {#if !sessions.length}<NativeSelect.Option value=""
                        >새 대화를 시작하세요</NativeSelect.Option
                    >{/if}
                {#each sessions as session (session.id)}
                    <NativeSelect.Option value={session.id}
                        >{memberName(session.userId)} · {session.title}{session.userId !==
                        $gateway.currentUser?.id
                            ? ' (읽기 전용)'
                            : ''}</NativeSelect.Option
                    >
                {/each}
            </NativeSelect.Root>
        </div>
        {#if readonly}
            <p class="text-xs leading-5 text-muted-foreground">
                다른 구성원의 대화 이력입니다. 내 작업을 요청하려면 새 대화를 시작하세요.
            </p>
        {/if}
    </header>

    {#if pendingJobs.length}
        <div
            class="max-h-40 shrink-0 space-y-2 overflow-y-auto border-b bg-amber-50/50 p-3 dark:bg-amber-950/20"
        >
            <p class="text-xs font-medium">
                내 작업 결과 {pendingJobs.length}건이 선택을 기다리고 있습니다
            </p>
            {#each pendingJobs as job (job.id)}
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="max-w-44 truncate text-xs text-muted-foreground">{job.prompt}</span
                    ><ResultChoice {job} />
                </div>
            {/each}
        </div>
    {/if}

    {#if $gateway.connection === 'disconnected'}
        <Alert.Root class="m-3 w-auto">
            <WifiOff class="size-4" />
            <Alert.Title>이벤트 연결이 끊겼습니다</Alert.Title>
            <Alert.Description>
                입력과 대화 이력은 유지됩니다. 다시 연결하면 이후 작업 진행 상황을 확인할 수
                있습니다.
                <Button
                    variant="outline"
                    size="sm"
                    class="mt-2"
                    onclick={() => act(() => gateway.setConnection('connected'))}>다시 연결</Button
                >
            </Alert.Description>
        </Alert.Root>
    {/if}
    <span role="status" aria-live="polite" class="sr-only">{eventAnnouncement}</span>

    <div class="min-h-0 flex-1">
        <MessageScroller.Provider autoScroll>
            <MessageScroller.Root>
                <MessageScroller.Viewport>
                    <MessageScroller.Content class="gap-6 p-4">
                        <ViewState
                            loading={$gateway.loading}
                            error={$gateway.error ??
                                ($gateway.scenario === 'forbidden'
                                    ? '대화 이력을 볼 수 있는 권한이 없습니다.'
                                    : null)}
                            onretry={() => gateway.reset('default')}
                        >
                            {#if !messages.length}
                                <div
                                    class="flex flex-1 flex-col items-center justify-center py-12 text-center"
                                >
                                    <div class="mb-4 rounded-xl border bg-muted/30 p-3">
                                        <MessageSquare class="size-6 text-muted-foreground" />
                                    </div>
                                    <h3 class="text-sm font-medium">어떤 작업을 도와드릴까요?</h3>
                                    <p
                                        class="mt-2 max-w-64 text-xs leading-6 text-muted-foreground"
                                    >
                                        내용을 다듬거나 필요한 정보를 정리해 보세요. 이
                                        미리보기에서는 샘플 응답으로 흐름을 확인합니다.
                                    </p>
                                    {#if !readonly}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            class="mt-5"
                                            onclick={() =>
                                                (drafts[draftKey] =
                                                    '문서의 핵심 내용을 간결하게 정리해 주세요.')}
                                            >핵심 내용 정리하기</Button
                                        >
                                    {/if}
                                </div>
                            {/if}
                            {#each messages as message (message.id)}
                                <MessageScroller.Item>
                                    <Message.Root align={message.role === 'user' ? 'end' : 'start'}>
                                        <Message.Content>
                                            <Message.Header
                                                >{message.role === 'assistant'
                                                    ? 'Deepet AI · 샘플 응답'
                                                    : memberName(message.userId)}</Message.Header
                                            >
                                            <Bubble.Root
                                                variant={message.role === 'user'
                                                    ? 'secondary'
                                                    : 'ghost'}
                                                class="max-w-full"
                                            >
                                                <Bubble.Content
                                                    class="whitespace-pre-wrap leading-7"
                                                    >{message.content}</Bubble.Content
                                                >
                                            </Bubble.Root>
                                            {#if message.attachmentIds.length}
                                                <div class="flex flex-wrap gap-1.5">
                                                    {#each message.attachmentIds as attachmentId (attachmentId)}
                                                        <Badge variant="outline"
                                                            ><Paperclip
                                                                class="size-3"
                                                            />{$gateway.attachments.find(
                                                                (item) => item.id === attachmentId
                                                            )?.name ?? '참고 파일'}</Badge
                                                        >
                                                    {/each}
                                                </div>
                                            {/if}
                                            <Message.Footer
                                                >{new Date(message.createdAt).toLocaleTimeString(
                                                    'ko-KR',
                                                    { hour: '2-digit', minute: '2-digit' }
                                                )}</Message.Footer
                                            >
                                        </Message.Content>
                                    </Message.Root>
                                </MessageScroller.Item>
                            {/each}
                            {#if latestJob}
                                <div class="space-y-3 rounded-xl border bg-muted/20 p-3">
                                    <div class="flex flex-wrap items-center justify-between gap-2">
                                        <span class="text-xs font-medium">요청한 문서 작업</span
                                        ><Badge
                                            variant={latestJob.status === 'failed'
                                                ? 'destructive'
                                                : 'secondary'}
                                            >{JOB_STATUS_LABELS[latestJob.status]}</Badge
                                        >
                                    </div>
                                    <Trace.Root>
                                        <Trace.Line
                                            status={latestJob.status === 'running'
                                                ? 'running'
                                                : latestJob.status === 'failed'
                                                  ? 'error'
                                                  : undefined}
                                        >
                                            <Trace.Icon
                                                >{#if activeJob}<LoaderCircle
                                                        class="size-3.5 animate-spin"
                                                    />{:else}<CircleCheck
                                                        class="size-3.5"
                                                    />{/if}</Trace.Icon
                                            >
                                            <Trace.Title
                                                >{latestJob.status === 'queued'
                                                    ? '실행 대기열에 등록됨'
                                                    : latestJob.status === 'running'
                                                      ? '샘플 문서를 검토하고 수정하는 중'
                                                      : JOB_APPLY_STATUS_LABELS[
                                                            latestJob.applyStatus
                                                        ]}</Trace.Title
                                            >
                                        </Trace.Line>
                                    </Trace.Root>
                                    {#if activeJob}<Progress
                                            value={latestJob.progress}
                                            aria-label="샘플 작업 진행률"
                                        />{/if}
                                    {#if latestJob.error}<p
                                            class="text-xs leading-5 text-destructive"
                                            role="alert"
                                        >
                                            {latestJob.error}
                                        </p>{/if}
                                    {#if !readonly}
                                        <div class="flex flex-wrap gap-2">
                                            {#if activeJob}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onclick={() =>
                                                        act(() => gateway.advanceJob(latestJob.id))}
                                                    >샘플 작업 다음 단계</Button
                                                >
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onclick={() =>
                                                        act(() => gateway.cancelJob(latestJob.id))}
                                                    >작업 취소</Button
                                                >
                                            {:else if latestJob.status === 'failed' || latestJob.status === 'cancelled'}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onclick={() =>
                                                        act(() => {
                                                            gateway.retryJob(latestJob.id);
                                                        })}>다시 요청</Button
                                                >
                                            {/if}
                                        </div>
                                    {/if}
                                    <p class="text-[11px] leading-5 text-muted-foreground">
                                        실제 AI 호출·사용량 정보는 연결 전입니다. 대표 버전은 자동
                                        변경되지 않습니다.
                                    </p>
                                </div>
                            {/if}
                        </ViewState>
                    </MessageScroller.Content>
                </MessageScroller.Viewport>
                <MessageScroller.Button aria-label="최근 메시지로 이동" />
            </MessageScroller.Root>
        </MessageScroller.Provider>
    </div>

    <form
        onsubmit={send}
        class="sticky bottom-0 z-10 shrink-0 space-y-2 border-t bg-background p-3"
    >
        {#if error}<p role="alert" class="text-xs leading-5 text-destructive">{error}</p>{/if}
        {#if selection}
            <div class="flex items-start gap-2 rounded-lg border bg-muted/40 p-2 text-xs">
                <Quote class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div class="min-w-0 flex-1">
                    <p class="font-medium">샘플 문단 참조 · 수정 {selection.revision}</p>
                    <p class="mt-1 line-clamp-2 text-muted-foreground">{selection.text}</p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="문단 참조 해제"
                    onclick={() => (selections[draftKey] = undefined)}
                    ><X class="size-3.5" /></Button
                >
            </div>
        {/if}
        <Attachment.Group class="flex-wrap">
            {#each selectedAttachments[draftKey] ?? [] as id (id)}
                {@const attachment = $gateway.attachments.find((item) => item.id === id)}
                {#if attachment}
                    <Attachment.Root size="xs"
                        ><Attachment.Media><FileText class="size-3.5" /></Attachment.Media
                        ><Attachment.Content
                            ><Attachment.Title>{attachment.name}</Attachment.Title
                            ><Attachment.Description
                                >선택만 완료 · 서버 미전송</Attachment.Description
                            ></Attachment.Content
                        ><Attachment.Actions
                            ><Attachment.Action
                                aria-label={`${attachment.name} 첨부 해제`}
                                onclick={() => removeAttachment(id)}
                                ><X class="size-3" /></Attachment.Action
                            ></Attachment.Actions
                        ></Attachment.Root
                    >
                {/if}
            {/each}
        </Attachment.Group>
        <InputGroup.Root>
            <InputGroup.Textarea
                aria-label="AI 작업 지시"
                placeholder={readonly
                    ? '다른 구성원의 대화는 읽기 전용입니다'
                    : '문서를 어떻게 바꿀까요?'}
                value={drafts[draftKey] ?? ''}
                oninput={(event) => (drafts[draftKey] = event.currentTarget.value)}
                disabled={readonly}
                maxlength={10000}
                rows={3}
                class="min-h-20 max-h-40 resize-none"
            />
            <InputGroup.Addon align="block-end" class="justify-between">
                <div class="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={readonly}
                        aria-label="참고 파일 첨부"
                        onclick={() => fileInput.click()}><Paperclip class="size-4" /></Button
                    >
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={readonly || !branch}
                        aria-label="샘플 문단 참조"
                        onclick={quoteSample}><Quote class="size-4" /></Button
                    >
                    <span class="text-[11px] font-normal">샘플 요청</span>
                </div>
                <Button
                    type="submit"
                    size="icon-sm"
                    aria-label="AI 작업 요청 보내기"
                    disabled={readonly || !!activeJob || !(drafts[draftKey] ?? '').trim()}
                    ><ArrowUp class="size-4" /></Button
                >
            </InputGroup.Addon>
        </InputGroup.Root>
        <input
            bind:this={fileInput}
            type="file"
            multiple
            accept=".hwp,.hwpx,.pdf,.png,.jpg,.jpeg,.webp"
            onchange={addFiles}
            class="hidden"
            aria-label="참고 파일 선택"
        />
        <p class="px-1 text-[10px] leading-4 text-muted-foreground">
            HWP·HWPX·PDF·이미지, 파일당 최대 25MB. 실제 분석은 백엔드 연결 후 제공됩니다.
        </p>
    </form>
</section>
