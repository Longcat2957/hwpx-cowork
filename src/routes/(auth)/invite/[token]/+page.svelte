<script lang="ts">
    import { tick } from 'svelte';
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import CircleAlert from '@lucide/svelte/icons/circle-alert';
    import LoaderCircle from '@lucide/svelte/icons/loader-circle';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import { getGateway } from '#lib/client/context.js';
    import AuthFrame from '#lib/components/shell/auth-frame.svelte';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Input } from '#lib/components/ui/input/index.js';
    import * as Field from '#lib/components/ui/field/index.js';
    import * as Alert from '#lib/components/ui/alert/index.js';

    const gateway = getGateway();
    const token = $derived(page.params.token ?? '');
    const invitedMember = $derived(
        $gateway.members.find((member) => member.invitationToken === token)
    );
    const invitationError = $derived.by(() => {
        if (token === 'expired')
            return '초대 유효 기간이 지났습니다. 관리자에게 새 초대를 요청해 주세요.';
        if (token === 'used' || (invitedMember && invitedMember.status !== 'invited')) {
            return '이미 수락한 초대입니다. 기존 계정으로 로그인해 주세요.';
        }
        if (!invitedMember) return '유효하지 않은 초대입니다. 전달받은 링크를 다시 확인해 주세요.';
        return '';
    });
    let name = $state('');
    let password = $state('');
    let pending = $state(false);
    let error = $state('');

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (pending || invitationError) return;
        pending = true;
        error = '';
        await tick();
        try {
            const memberId = gateway.acceptInvitation(token, { name: name.trim(), password });
            gateway.switchUser(memberId);
            await goto('/documents');
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '초대를 수락하지 못했습니다.';
        } finally {
            pending = false;
        }
    }
</script>

<svelte:head><title>초대 수락 · HWPX Cowork</title></svelte:head>

<AuthFrame
    title="팀의 작업 공간에 초대합니다"
    description="계정을 설정하고 동료들과 문서를 함께 만들어 보세요."
>
    {#if invitationError}
        <div class="space-y-5">
            <Alert.Root role="alert">
                <CircleAlert aria-hidden="true" />
                <Alert.Title>초대를 사용할 수 없습니다</Alert.Title>
                <Alert.Description>{invitationError}</Alert.Description>
            </Alert.Root>
            <Button href="/login" variant="outline" class="w-full">로그인으로 이동</Button>
        </div>
    {:else}
        <form onsubmit={submit} aria-busy={pending}>
            <Field.Group>
                {#if error}
                    <Alert.Root variant="destructive" role="alert">
                        <CircleAlert aria-hidden="true" />
                        <Alert.Title>입력 내용을 확인해 주세요</Alert.Title>
                        <Alert.Description>{error}</Alert.Description>
                    </Alert.Root>
                {/if}
                <Field.Field>
                    <Field.Label for="invite-name">이름</Field.Label>
                    <Input
                        id="invite-name"
                        autocomplete="name"
                        placeholder="이름을 입력하세요"
                        bind:value={name}
                        required
                        disabled={pending}
                    />
                </Field.Field>
                <Field.Field>
                    <Field.Label for="invite-email">이메일</Field.Label>
                    <Input
                        id="invite-email"
                        type="email"
                        value={invitedMember?.email ?? ''}
                        readonly
                        class="bg-muted/50"
                    />
                    <Field.Description>이 이메일 주소로 초대를 받았습니다.</Field.Description>
                </Field.Field>
                <Field.Field>
                    <Field.Label for="invite-password">비밀번호</Field.Label>
                    <Input
                        id="invite-password"
                        type="password"
                        autocomplete="new-password"
                        placeholder="샘플 비밀번호 8자 이상"
                        bind:value={password}
                        minlength={8}
                        required
                        disabled={pending}
                    />
                </Field.Field>
                <Field.Field>
                    <Button type="submit" class="w-full" disabled={pending}>
                        {#if pending}
                            <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
                            초대 확인 중
                        {:else}
                            초대 수락하고 시작하기
                            <ArrowRight class="size-4" aria-hidden="true" />
                        {/if}
                    </Button>
                    <Field.Description class="text-center">
                        이미 계정이 있나요? <a href="/login">로그인</a>
                    </Field.Description>
                </Field.Field>
            </Field.Group>
        </form>
    {/if}
    {#snippet footer()}
        <div class="space-y-2">
            <p>샘플 초대입니다. 실제 계정이나 초대 링크는 생성되지 않습니다.</p>
            <nav aria-label="샘플 초대 상태" class="flex gap-4">
                <a href="/invite/demo-invite" class="underline underline-offset-4">정상</a>
                <a href="/invite/expired" class="underline underline-offset-4">만료</a>
                <a href="/invite/used" class="underline underline-offset-4">사용됨</a>
            </nav>
        </div>
    {/snippet}
</AuthFrame>
