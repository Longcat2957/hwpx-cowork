<script lang="ts">
    import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
    import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
    import FlaskConical from '@lucide/svelte/icons/flask-conical';
    import { getGateway } from '#lib/client/context.js';
    import { SCENARIOS } from '#lib/client/mock/scenarios.js';
    import { Button } from '#lib/components/ui/button/index.js';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import * as Sheet from '#lib/components/ui/sheet/index.js';
    import * as Field from '#lib/components/ui/field/index.js';
    import * as NativeSelect from '#lib/components/ui/native-select/index.js';

    const gateway = getGateway();
    let message = $state('');
    let error = $state('');
    const scenario = $derived(SCENARIOS.find((item) => item.id === $gateway.scenario));

    function changeScenario(value: string) {
        const selected = SCENARIOS.find((item) => item.id === value);
        if (!selected) return;
        error = '';
        try {
            gateway.reset(selected.id);
            message = `${selected.label} 샘플을 불러왔습니다.`;
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '샘플을 변경하지 못했습니다.';
        }
    }

    function changeUser(value: string) {
        error = '';
        try {
            gateway.switchUser(value);
            message = '미리보기 계정을 변경했습니다.';
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '계정을 변경하지 못했습니다.';
        }
    }
</script>

<div class="flex shrink-0 items-center gap-2">
    <Badge variant="outline" class="text-muted-foreground gap-1.5 font-normal">
        <span class="size-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
        샘플 미리보기
    </Badge>
    <Sheet.Root>
        <Sheet.Trigger>
            {#snippet child({ props })}
                <Button {...props} variant="ghost" size="icon-sm" aria-label="미리보기 설정">
                    <SlidersHorizontal class="size-4" aria-hidden="true" />
                </Button>
            {/snippet}
        </Sheet.Trigger>
        <Sheet.Content class="w-[min(100%,24rem)]">
            <Sheet.Header>
                <Sheet.Title class="flex items-center gap-2">
                    <FlaskConical class="size-4" aria-hidden="true" />
                    미리보기 설정
                </Sheet.Title>
                <Sheet.Description>
                    샘플 계정과 상황을 바꾸어 화면을 확인하세요. 새로고침하면 초기 상태로
                    돌아갑니다.
                </Sheet.Description>
            </Sheet.Header>
            <div class="space-y-6 px-4 pb-6">
                <Field.Field>
                    <Field.Label for="preview-account">샘플 계정</Field.Label>
                    <NativeSelect.Root
                        id="preview-account"
                        class="w-full"
                        value={$gateway.currentUser?.id ?? ''}
                        onchange={(event) => changeUser(event.currentTarget.value)}
                    >
                        {#if !$gateway.currentUser}
                            <NativeSelect.Option value="" disabled
                                >계정을 선택하세요</NativeSelect.Option
                            >
                        {/if}
                        {#each $gateway.members.filter((member) => member.status === 'active') as member (member.id)}
                            <NativeSelect.Option value={member.id}>
                                {member.name} · {member.role === 'admin' ? '관리자' : '구성원'}
                            </NativeSelect.Option>
                        {/each}
                    </NativeSelect.Root>
                    <Field.Description
                        >역할에 따라 표시되는 메뉴와 동작을 살펴볼 수 있습니다.</Field.Description
                    >
                </Field.Field>
                <Field.Field>
                    <Field.Label for="preview-scenario">샘플 상황</Field.Label>
                    <NativeSelect.Root
                        id="preview-scenario"
                        class="w-full"
                        value={$gateway.scenario}
                        onchange={(event) => changeScenario(event.currentTarget.value)}
                    >
                        {#each SCENARIOS as item (item.id)}
                            <NativeSelect.Option value={item.id}>{item.label}</NativeSelect.Option>
                        {/each}
                    </NativeSelect.Root>
                    <Field.Description>{scenario?.description}</Field.Description>
                </Field.Field>
                <Button
                    variant="outline"
                    class="w-full"
                    onclick={() => changeScenario($gateway.scenario)}
                >
                    <RotateCcw class="size-4" aria-hidden="true" />
                    현재 샘플 초기화
                </Button>
                {#if error}
                    <p role="alert" class="text-destructive text-sm leading-6">{error}</p>
                {:else if message}
                    <p role="status" class="text-muted-foreground text-sm leading-6">{message}</p>
                {/if}
                <div class="bg-muted/60 text-muted-foreground rounded-lg p-4 text-xs leading-6">
                    이 화면의 계정·문서·대화는 검토용 예시입니다. 변경 내용은 실제 업무 데이터에
                    반영되지 않습니다.
                </div>
            </div>
        </Sheet.Content>
    </Sheet.Root>
</div>
