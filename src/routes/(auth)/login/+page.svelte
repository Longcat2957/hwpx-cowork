<script lang="ts">
    import { tick } from 'svelte';
    import { goto } from '$app/navigation';
    import LoaderCircle from '@lucide/svelte/icons/loader-circle';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
    import CircleAlert from '@lucide/svelte/icons/circle-alert';
    import { getGateway } from '#lib/client/context.js';
    import AuthFrame from '#lib/components/shell/auth-frame.svelte';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Input } from '#lib/components/ui/input/index.js';
    import * as Field from '#lib/components/ui/field/index.js';
    import * as Alert from '#lib/components/ui/alert/index.js';

    const gateway = getGateway();
    let email = $state('');
    let password = $state('');
    let pending = $state(false);
    let error = $state('');

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (pending) return;
        pending = true;
        error = '';
        await tick();
        try {
            gateway.login(email.trim(), password);
            await goto('/documents');
        } catch (cause) {
            error =
                cause instanceof Error
                    ? cause.message
                    : '로그인하지 못했습니다. 다시 시도해 주세요.';
        } finally {
            pending = false;
        }
    }

    function fillSample() {
        email = 'minji@deepet.local';
        password = 'preview1234';
        error = '';
    }
</script>

<svelte:head><title>로그인 · HWPX Cowork</title></svelte:head>

<AuthFrame
    title="다시 만나 반갑습니다"
    description="초대받은 계정으로 로그인하고 팀의 문서 작업을 이어가세요."
>
    <form onsubmit={submit} aria-busy={pending}>
        <Field.Group>
            {#if error}
                <Alert.Root variant="destructive" role="alert">
                    <CircleAlert aria-hidden="true" />
                    <Alert.Title>로그인을 확인해 주세요</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                </Alert.Root>
            {/if}
            <Field.Field>
                <Field.Label for="login-email">이메일</Field.Label>
                <Input
                    id="login-email"
                    type="email"
                    autocomplete="username"
                    placeholder="name@company.com"
                    bind:value={email}
                    required
                    disabled={pending}
                />
            </Field.Field>
            <Field.Field>
                <Field.Label for="login-password">비밀번호</Field.Label>
                <Input
                    id="login-password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="비밀번호를 입력하세요"
                    bind:value={password}
                    required
                    disabled={pending}
                />
            </Field.Field>
            <Field.Field>
                <Button type="submit" class="w-full" disabled={pending}>
                    {#if pending}
                        <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
                        로그인 중
                    {:else}
                        로그인
                        <ArrowRight class="size-4" aria-hidden="true" />
                    {/if}
                </Button>
                <Field.Description class="text-center leading-6">
                    계정이 없다면 관리자에게 초대를 요청하세요.
                </Field.Description>
            </Field.Field>
        </Field.Group>
    </form>
    {#snippet footer()}
        <div class="w-full space-y-2">
            <p>샘플 계정으로 로그인 화면을 확인할 수 있습니다. 실제 인증은 수행하지 않습니다.</p>
            <Button
                type="button"
                variant="outline"
                size="sm"
                class="w-full"
                onclick={fillSample}
                disabled={pending}
            >
                샘플 계정 채우기
            </Button>
            <a href="/invite/demo-invite" class="block text-center underline underline-offset-4"
                >초대 수락 화면 미리보기</a
            >
        </div>
    {/snippet}
</AuthFrame>
