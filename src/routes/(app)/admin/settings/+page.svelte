<script lang="ts">
    import ShieldAlert from '@lucide/svelte/icons/shield-alert';
    import Archive from '@lucide/svelte/icons/archive';
    import CircleCheck from '@lucide/svelte/icons/circle-check';
    import Info from '@lucide/svelte/icons/info';
    import { getGateway } from '#lib/client/context.js';
    import { errorMessage } from '#lib/client/format.js';
    import { RETENTION_MIN_DAYS, RETENTION_MAX_DAYS } from '#lib/contracts/settings.js';
    import ViewState from '#lib/components/common/view-state.svelte';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Input } from '#lib/components/ui/input/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import * as Card from '#lib/components/ui/card/index.js';
    import * as Field from '#lib/components/ui/field/index.js';
    import * as Alert from '#lib/components/ui/alert/index.js';
    import * as Empty from '#lib/components/ui/empty/index.js';

    const gateway = getGateway();
    const isAdmin = $derived(
        $gateway.currentUser?.role === 'admin' && $gateway.scenario !== 'forbidden'
    );
    const storedDays = $derived($gateway.settings.retentionDays);
    const currentUserId = $derived($gateway.currentUser?.id);
    let retentionDays = $state('30');
    let error = $state('');
    let message = $state('');
    let busy = $state(false);
    const hasChanges = $derived(retentionDays !== String(storedDays));

    $effect(() => {
        currentUserId;
        retentionDays = String(storedDays);
        error = '';
    });

    function cancel() {
        retentionDays = String(storedDays);
        error = '';
        message = '변경 내용을 취소했습니다.';
    }

    function save(event: SubmitEvent) {
        event.preventDefault();
        if (busy) return;
        error = '';
        message = '';
        const days = Number(retentionDays);
        if (
            !retentionDays.trim() ||
            !Number.isInteger(days) ||
            days < RETENTION_MIN_DAYS ||
            days > RETENTION_MAX_DAYS
        ) {
            error = `보관 기간은 ${RETENTION_MIN_DAYS}~${RETENTION_MAX_DAYS}일의 정수로 입력해 주세요.`;
            return;
        }
        try {
            busy = true;
            gateway.updateSettings({ retentionDays: days });
            retentionDays = String(days);
            message = '샘플 설정을 저장했습니다. 실제 이력 정리는 실행하지 않습니다.';
        } catch (cause) {
            error = errorMessage(cause);
        } finally {
            busy = false;
        }
    }
</script>

<svelte:head><title>운영 설정 · HWPX Cowork</title></svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-7 p-4 md:p-8">
    <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight">운영 설정</h1>
        <p class="text-muted-foreground text-sm">팀의 작업 이력을 얼마나 보관할지 설정하세요.</p>
    </header>
    {#if !isAdmin}
        <Empty.Root class="min-h-80 rounded-xl border">
            <Empty.Header>
                <Empty.Media variant="icon"><ShieldAlert aria-hidden="true" /></Empty.Media>
                <Empty.Title>관리자만 변경할 수 있습니다</Empty.Title>
                <Empty.Description
                    >운영 설정에는 관리자 권한이 필요합니다. 문서 작업 공간으로 돌아가세요.</Empty.Description
                >
            </Empty.Header>
            <Empty.Content
                ><Button href="/documents" variant="outline">문서로 돌아가기</Button></Empty.Content
            >
        </Empty.Root>
    {:else}
        <ViewState loading={$gateway.loading} onretry={() => gateway.reset()}>
            <div class="max-w-3xl space-y-5">
                <Card.Root>
                    <Card.Header class="border-b">
                        <Card.Title class="flex items-center gap-2 text-base"
                            ><Archive class="size-4" aria-hidden="true" />이력 보관</Card.Title
                        >
                        <Card.Description
                            >완료된 작업과 이전 버전의 기본 보관 기간을 설정합니다.</Card.Description
                        >
                    </Card.Header>
                    <form onsubmit={save} novalidate aria-busy={busy}>
                        <Card.Content class="space-y-6 pb-6">
                            <Field.Field>
                                <div class="flex items-center gap-2">
                                    <Field.Label for="retention-days">기본 보관 기간</Field.Label>
                                    <Badge
                                        variant="outline"
                                        class="text-muted-foreground font-normal">기본값 30일</Badge
                                    >
                                </div>
                                <div class="flex items-center gap-3">
                                    <Input
                                        id="retention-days"
                                        type="number"
                                        inputmode="numeric"
                                        min={RETENTION_MIN_DAYS}
                                        max={RETENTION_MAX_DAYS}
                                        step={1}
                                        value={retentionDays}
                                        oninput={(event) => {
                                            retentionDays = event.currentTarget.value;
                                            error = '';
                                            message = '';
                                        }}
                                        class="w-32"
                                        aria-invalid={Boolean(error)}
                                        aria-describedby="retention-help retention-error"
                                        disabled={busy}
                                    />
                                    <span class="text-muted-foreground text-sm">일</span>
                                </div>
                                <Field.Description id="retention-help"
                                    >{RETENTION_MIN_DAYS}일에서 {RETENTION_MAX_DAYS}일 사이의 정수를
                                    입력하세요.</Field.Description
                                >
                                <p
                                    id="retention-error"
                                    role={error ? 'alert' : undefined}
                                    class="text-destructive text-sm"
                                >
                                    {error}
                                </p>
                            </Field.Field>
                            <Alert.Root class="bg-muted/30">
                                <Info aria-hidden="true" />
                                <Alert.Title>필요한 버전은 계속 보관합니다</Alert.Title>
                                <Alert.Description
                                    >대표 버전, 각 브랜치의 최신 버전, 진행 중인 작업에서 사용하는
                                    자료는 정리 대상에서 보호합니다.</Alert.Description
                                >
                            </Alert.Root>
                            {#if $gateway.error}
                                <p class="text-muted-foreground text-sm leading-6">
                                    설정을 변경할 수 없는 오류 상황을 미리 보고 있습니다. 저장 시
                                    오류 안내를 확인할 수 있습니다.
                                </p>
                            {/if}
                            {#if message}
                                <p
                                    role="status"
                                    class="text-muted-foreground flex items-start gap-2 text-sm leading-6"
                                >
                                    <CircleCheck
                                        class="mt-1 size-4 shrink-0"
                                        aria-hidden="true"
                                    />{message}
                                </p>
                            {/if}
                        </Card.Content>
                        <Card.Footer class="justify-between gap-3 border-t pt-5">
                            <span class="text-muted-foreground text-xs"
                                >{hasChanges
                                    ? '저장하지 않은 변경이 있습니다.'
                                    : `현재 샘플 설정: ${storedDays}일`}</span
                            >
                            <div class="flex shrink-0 gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onclick={cancel}
                                    disabled={!hasChanges || busy}>취소</Button
                                >
                                <Button type="submit" disabled={busy}
                                    >{busy ? '저장 중…' : '저장'}</Button
                                >
                            </div>
                        </Card.Footer>
                    </form>
                </Card.Root>
                <p class="text-muted-foreground text-xs leading-6">
                    샘플 미리보기에서는 설정 값만 바뀝니다. 문서나 이력이 실제로 삭제되지 않으며
                    새로고침하면 기본값으로 돌아갑니다.
                </p>
            </div>
        </ViewState>
    {/if}
</div>
