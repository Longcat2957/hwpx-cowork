<script lang="ts">
    import UserPlus from '@lucide/svelte/icons/user-plus';
    import ShieldCheck from '@lucide/svelte/icons/shield-check';
    import ShieldAlert from '@lucide/svelte/icons/shield-alert';
    import UserRoundX from '@lucide/svelte/icons/user-round-x';
    import CircleCheck from '@lucide/svelte/icons/circle-check';
    import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
    import { getGateway } from '#lib/client/context.js';
    import { errorMessage } from '#lib/client/format.js';
    import type { Member, MemberStatus } from '#lib/contracts/member.js';
    import DataTable from '#lib/components/common/data-table.svelte';
    import ViewState from '#lib/components/common/view-state.svelte';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import { Input } from '#lib/components/ui/input/index.js';
    import * as Avatar from '#lib/components/ui/avatar/index.js';
    import * as Dialog from '#lib/components/ui/dialog/index.js';
    import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
    import * as Field from '#lib/components/ui/field/index.js';
    import * as NativeSelect from '#lib/components/ui/native-select/index.js';
    import * as Empty from '#lib/components/ui/empty/index.js';

    const gateway = getGateway();
    const statusLabels: Record<MemberStatus, string> = {
        active: '활성',
        invited: '초대 대기',
        disabled: '비활성'
    };
    const columns = [
        { id: 'member', label: '구성원', value: (row: Member) => `${row.name} ${row.email}` },
        {
            id: 'role',
            label: '역할',
            value: (row: Member) => (row.role === 'admin' ? '관리자' : '구성원')
        },
        { id: 'status', label: '상태', value: (row: Member) => statusLabels[row.status] },
        { id: 'actions', label: '관리', value: () => '', sortable: false }
    ];
    const isAdmin = $derived(
        $gateway.currentUser?.role === 'admin' && $gateway.scenario !== 'forbidden'
    );
    let statusFilter = $state('all');
    const members = $derived(
        $gateway.members.filter(
            (member) => statusFilter === 'all' || member.status === statusFilter
        )
    );
    const activeCount = $derived(
        $gateway.members.filter((member) => member.status === 'active').length
    );
    const invitedCount = $derived(
        $gateway.members.filter((member) => member.status === 'invited').length
    );
    let inviteOpen = $state(false);
    let inviteName = $state('');
    let inviteEmail = $state('');
    let inviteError = $state('');
    let invitedId = $state('');
    let busy = $state(false);
    const createdInvitation = $derived($gateway.members.find((member) => member.id === invitedId));
    let deactivateOpen = $state(false);
    let selectedId = $state('');
    let deactivateError = $state('');
    let notice = $state('');
    const selectedMember = $derived($gateway.members.find((member) => member.id === selectedId));

    function openInvite() {
        inviteName = '';
        inviteEmail = '';
        invitedId = '';
        inviteError = '';
        inviteOpen = true;
    }

    function invite(event: SubmitEvent) {
        event.preventDefault();
        if (busy) return;
        inviteError = '';
        try {
            busy = true;
            gateway.inviteMember({ name: inviteName.trim(), email: inviteEmail.trim() });
            invitedId =
                $gateway.members.find(
                    (member) => member.email.toLowerCase() === inviteEmail.trim().toLowerCase()
                )?.id ?? '';
            notice = '샘플 초대를 추가했습니다. 실제 이메일은 발송하지 않습니다.';
        } catch (cause) {
            inviteError = errorMessage(cause);
        } finally {
            busy = false;
        }
    }

    function deactivate(event: MouseEvent) {
        event.preventDefault();
        if (busy || !selectedMember) return;
        deactivateError = '';
        try {
            busy = true;
            const name = selectedMember.name;
            gateway.deactivateMember(selectedMember.id);
            deactivateOpen = false;
            notice = `${name} 구성원을 샘플에서 비활성화했습니다.`;
        } catch (cause) {
            deactivateError = errorMessage(cause);
        } finally {
            busy = false;
        }
    }
</script>

<svelte:head><title>구성원 · HWPX Cowork</title></svelte:head>

<div class="mx-auto w-full max-w-7xl space-y-7 p-4 md:p-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
            <h1 class="text-2xl font-semibold tracking-tight">구성원</h1>
            <p class="text-muted-foreground text-sm">
                함께 일할 동료를 초대하고 작업 공간의 접근 권한을 관리하세요.
            </p>
        </div>
        {#if isAdmin}
            <Button class="h-9" onclick={openInvite}
                ><UserPlus aria-hidden="true" />구성원 초대</Button
            >
        {/if}
    </header>
    {#if !isAdmin}
        <Empty.Root class="min-h-80 rounded-xl border">
            <Empty.Header>
                <Empty.Media variant="icon"><ShieldAlert aria-hidden="true" /></Empty.Media>
                <Empty.Title>관리자만 확인할 수 있습니다</Empty.Title>
                <Empty.Description
                    >구성원 관리에는 관리자 권한이 필요합니다. 문서 작업 공간으로 돌아가세요.</Empty.Description
                >
            </Empty.Header>
            <Empty.Content
                ><Button href="/documents" variant="outline">문서로 돌아가기</Button></Empty.Content
            >
        </Empty.Root>
    {:else}
        <ViewState
            loading={$gateway.loading}
            error={$gateway.error}
            onretry={() => gateway.reset()}
        >
            <div class="space-y-4">
                <DataTable
                    data={members}
                    {columns}
                    searchColumn="member"
                    searchLabel="이름 또는 이메일 검색"
                    emptyTitle="표시할 구성원이 없습니다"
                    emptyDescription="상태 필터를 변경하거나 함께 일할 동료를 초대하세요."
                >
                    {#snippet toolbar()}
                        <NativeSelect.Root bind:value={statusFilter} aria-label="구성원 상태 필터">
                            <NativeSelect.Option value="all">모든 상태</NativeSelect.Option>
                            <NativeSelect.Option value="active">활성</NativeSelect.Option>
                            <NativeSelect.Option value="invited">초대 대기</NativeSelect.Option>
                            <NativeSelect.Option value="disabled">비활성</NativeSelect.Option>
                        </NativeSelect.Root>
                        <p class="text-muted-foreground text-xs sm:ml-auto">
                            활성 {activeCount}명 · 초대 대기 {invitedCount}명
                        </p>
                    {/snippet}
                    {#snippet cell(member, column)}
                        {#if column === 'member'}
                            <div class="flex min-w-56 items-center gap-3">
                                <Avatar.Root class="size-9">
                                    <Avatar.Fallback class="bg-muted text-xs font-medium"
                                        >{member.initials}</Avatar.Fallback
                                    >
                                </Avatar.Root>
                                <div class="space-y-1">
                                    <p class="font-medium">
                                        {member.name}{#if member.id === $gateway.currentUser?.id}<span
                                                class="text-muted-foreground ml-2 text-xs font-normal"
                                                >나</span
                                            >{/if}
                                    </p>
                                    <p class="text-muted-foreground text-xs">{member.email}</p>
                                </div>
                            </div>
                        {:else if column === 'role'}
                            <span class="flex items-center gap-1.5 whitespace-nowrap text-sm">
                                {#if member.role === 'admin'}<ShieldCheck
                                        class="text-muted-foreground size-3.5"
                                        aria-hidden="true"
                                    />{/if}
                                {member.role === 'admin' ? '관리자' : '구성원'}
                            </span>
                        {:else if column === 'status'}
                            <Badge
                                variant={member.status === 'active' ? 'secondary' : 'outline'}
                                class="gap-1.5 font-normal"
                            >
                                <span
                                    class={`size-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : member.status === 'invited' ? 'bg-amber-500' : 'bg-muted-foreground/50'}`}
                                    aria-hidden="true"
                                ></span>
                                {statusLabels[member.status]}
                            </Badge>
                        {:else if member.status === 'invited' && member.invitationToken}
                            <Button
                                href={`/invite/${member.invitationToken}`}
                                variant="ghost"
                                size="sm"
                                class="whitespace-nowrap"
                            >
                                초대 미리보기<ArrowUpRight class="size-3.5" aria-hidden="true" />
                            </Button>
                        {:else if member.status === 'active' && member.id !== $gateway.currentUser?.id}
                            <Button
                                variant="ghost"
                                size="sm"
                                class="text-muted-foreground whitespace-nowrap"
                                aria-label={`${member.name} 비활성화`}
                                onclick={() => {
                                    selectedId = member.id;
                                    deactivateError = '';
                                    deactivateOpen = true;
                                }}
                            >
                                <UserRoundX class="size-3.5" aria-hidden="true" />비활성화
                            </Button>
                        {:else}
                            <span class="text-muted-foreground px-3 text-xs"
                                >{member.id === $gateway.currentUser?.id ? '현재 계정' : '—'}</span
                            >
                        {/if}
                    {/snippet}
                </DataTable>
                {#if notice}<p role="status" class="text-muted-foreground text-sm">{notice}</p>{/if}
                <p class="text-muted-foreground text-xs leading-6">
                    샘플 미리보기입니다. 구성원 변경이나 초대 메일 발송은 실제로 수행되지 않습니다.
                </p>
            </div>
        </ViewState>
    {/if}
</div>

<Dialog.Root bind:open={inviteOpen}>
    <Dialog.Content class="p-6 sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title
                >{createdInvitation ? '샘플 초대가 준비되었습니다' : '구성원 초대'}</Dialog.Title
            >
            <Dialog.Description
                >{createdInvitation
                    ? '현재 미리보기 안에서 초대 수락 화면을 확인할 수 있습니다.'
                    : '함께 문서를 편집할 동료의 이름과 이메일을 입력하세요.'}</Dialog.Description
            >
        </Dialog.Header>
        {#if createdInvitation?.invitationToken}
            <div class="space-y-5">
                <div class="bg-muted/50 flex items-start gap-3 rounded-lg p-4">
                    <CircleCheck class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                    <div class="space-y-1">
                        <p class="text-sm font-medium">{createdInvitation.name}</p>
                        <p class="text-muted-foreground break-all text-xs">
                            {createdInvitation.email}
                        </p>
                    </div>
                </div>
                <p class="text-muted-foreground text-xs leading-6">
                    실제 초대 링크가 발급되거나 이메일이 발송되지 않습니다. 새로고침하면 샘플 초대도
                    초기화됩니다.
                </p>
                <Dialog.Footer>
                    <Button variant="outline" onclick={() => (inviteOpen = false)}>닫기</Button>
                    <Button
                        href={`/invite/${createdInvitation.invitationToken}`}
                        onclick={() => (inviteOpen = false)}
                        >초대 화면 열기<ArrowUpRight aria-hidden="true" /></Button
                    >
                </Dialog.Footer>
            </div>
        {:else}
            <form class="space-y-5" onsubmit={invite}>
                <Field.Field
                    ><Field.Label for="member-invite-name">이름</Field.Label><Input
                        id="member-invite-name"
                        bind:value={inviteName}
                        placeholder="예: 김소라"
                        required
                        maxlength={80}
                        disabled={busy}
                    /></Field.Field
                >
                <Field.Field
                    ><Field.Label for="member-invite-email">이메일</Field.Label><Input
                        id="member-invite-email"
                        type="email"
                        bind:value={inviteEmail}
                        placeholder="name@company.com"
                        required
                        disabled={busy}
                    /></Field.Field
                >
                <p class="text-muted-foreground text-xs leading-6">
                    초대한 구성원은 문서·버전·대화를 열람하고 자신의 브랜치에서 편집할 수 있습니다.
                </p>
                {#if inviteError}<p role="alert" class="text-destructive text-sm">
                        {inviteError}
                    </p>{/if}
                <Dialog.Footer
                    ><Button
                        type="button"
                        variant="outline"
                        onclick={() => (inviteOpen = false)}
                        disabled={busy}>취소</Button
                    ><Button type="submit" disabled={busy}
                        >{busy ? '초대 준비 중…' : '샘플 초대 만들기'}</Button
                    ></Dialog.Footer
                >
            </form>
        {/if}
    </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root bind:open={deactivateOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>{selectedMember?.name} 구성원을 비활성화할까요?</AlertDialog.Title>
            <AlertDialog.Description
                >이 계정의 작업 공간 접근을 제한합니다. 기존 문서와 작업 이력은 유지됩니다. 현재
                화면에서는 샘플 계정 상태만 변경합니다.</AlertDialog.Description
            >
        </AlertDialog.Header>
        {#if deactivateError}<p role="alert" class="text-destructive text-sm">
                {deactivateError}
            </p>{/if}
        <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={busy}>취소</AlertDialog.Cancel>
            <AlertDialog.Action variant="destructive" onclick={deactivate} disabled={busy}
                >{busy ? '변경 중…' : '비활성화'}</AlertDialog.Action
            >
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
