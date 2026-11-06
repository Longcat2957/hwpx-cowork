<script lang="ts">
    import { GitCompareArrows } from '@lucide/svelte';
    import { getGateway } from '#lib/client/context.js';
    import type { Job } from '#lib/contracts/job.js';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import * as Dialog from '#lib/components/ui/dialog/index.js';

    let { job }: { job: Job } = $props();
    const gateway = getGateway();
    let open = $state(false);
    let expectedRevision = $state(0);
    let error = $state('');
    let directContent = $state('');
    const branch = $derived($gateway.branches.find((item) => item.id === job.branchId));
    const result = $derived($gateway.versions.find((item) => item.id === job.resultVersionId));

    function show() {
        expectedRevision = branch?.revision ?? 0;
        directContent = branch?.content ?? '';
        error = '';
        open = true;
    }

    function choose(choice: 'apply' | 'keep') {
        try {
            gateway.resolveJob(job.id, choice, expectedRevision);
            open = false;
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '결과를 반영하지 못했습니다.';
        }
    }
</script>

<Button size="sm" variant="outline" onclick={show}
    ><GitCompareArrows class="size-3.5" />결과 비교·선택</Button
>
<Dialog.Root bind:open>
    <Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <Dialog.Header>
            <Dialog.Title>내 편집본과 AI 결과 선택</Dialog.Title>
            <Dialog.Description
                >작업을 요청한 뒤 내 작업본이 변경되었습니다. 두 내용을 비교하고 사용할 결과를
                선택하세요. 기존 버전 이력은 보존됩니다.</Dialog.Description
            >
        </Dialog.Header>
        <Badge variant="outline" class="w-fit">샘플 텍스트 비교 · 실제 문서 비교 아님</Badge>
        <div class="grid gap-3 md:grid-cols-2">
            <section class="rounded-lg border p-4">
                <h3 class="mb-3 text-sm font-semibold">내 편집본 · 수정 {expectedRevision}</h3>
                <p
                    class="max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground"
                >
                    {directContent}
                </p>
            </section>
            <section class="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <h3 class="mb-3 text-sm font-semibold">AI 작업 결과</h3>
                <p
                    class="max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground"
                >
                    {result?.content ?? '결과를 찾을 수 없습니다.'}
                </p>
            </section>
        </div>
        {#if error}
            <div role="alert" class="space-y-2 text-sm text-destructive">
                <p>{error}</p>
                <Button variant="outline" size="sm" onclick={show}>최신 작업본으로 다시 비교</Button
                >
            </div>
        {/if}
        <Dialog.Footer class="flex-wrap">
            <Button variant="ghost" onclick={() => (open = false)}>나중에 선택</Button>
            <Button variant="outline" onclick={() => choose('keep')}>내 편집본 유지</Button>
            <Button disabled={!result} onclick={() => choose('apply')}>AI 결과로 바꾸기</Button>
        </Dialog.Footer>
        <p class="text-xs text-muted-foreground">
            선택은 내 작업본에만 적용됩니다. 문서의 대표 버전은 별도로 지정합니다.
        </p>
    </Dialog.Content>
</Dialog.Root>
