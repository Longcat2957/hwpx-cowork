<script lang="ts">
    // Card and field composition adapted from the official login-01 block:
    // https://shadcn-svelte.com/blocks/login#login-01
    import FileText from '@lucide/svelte/icons/file-text';
    import { Badge } from '#lib/components/ui/badge/index.js';
    import * as Card from '#lib/components/ui/card/index.js';
    import type { Snippet } from 'svelte';

    let {
        title,
        description,
        children,
        footer
    }: {
        title: string;
        description: string;
        children: Snippet;
        footer?: Snippet;
    } = $props();
</script>

<main class="bg-muted/30 flex min-h-svh flex-col items-center justify-center px-4 py-12">
    <div class="mb-8 flex flex-col items-center gap-3">
        <a href="/documents" class="flex items-center gap-2.5 font-semibold tracking-tight">
            <span
                class="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl"
            >
                <FileText class="size-5" aria-hidden="true" />
            </span>
            HWPX Cowork
        </a>
        <Badge variant="outline" class="text-muted-foreground gap-1.5 font-normal">
            <span class="size-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
            샘플 미리보기
        </Badge>
    </div>
    <Card.Root class="w-full max-w-sm gap-6 shadow-sm">
        <Card.Header class="gap-2">
            <Card.Title class="text-2xl font-semibold tracking-tight"><h1>{title}</h1></Card.Title>
            <Card.Description class="leading-6">{description}</Card.Description>
        </Card.Header>
        <Card.Content>{@render children()}</Card.Content>
        {#if footer}
            <Card.Footer class="text-muted-foreground border-t pt-5 text-xs leading-6">
                {@render footer()}
            </Card.Footer>
        {/if}
    </Card.Root>
    <p class="text-muted-foreground mt-6 text-center text-xs leading-6">
        함께 만드는 문서, 안전하게 이어지는 작업.
    </p>
</main>
