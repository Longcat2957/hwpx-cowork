<script lang="ts">
    import { Badge } from '#lib/components/ui/badge/index.js';
    import { JOB_STATUS_LABELS, type Job } from '#lib/contracts/job.js';
    import ClockIcon from '@lucide/svelte/icons/clock-3';
    import LoaderIcon from '@lucide/svelte/icons/loader-circle';
    import CheckIcon from '@lucide/svelte/icons/check';
    import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
    import CircleSlashIcon from '@lucide/svelte/icons/circle-slash';

    let { job }: { job: Job } = $props();
</script>

{#if job.applyStatus === 'pending'}
    <Badge variant="outline" class="gap-1.5 border-amber-200 bg-amber-50 text-amber-800"
        ><CircleAlertIcon class="size-3" />결과 선택 대기</Badge
    >
{:else}
    <Badge
        variant={job.status === 'failed' ? 'destructive' : 'secondary'}
        class="gap-1.5 whitespace-nowrap font-normal"
    >
        {#if job.status === 'queued'}<ClockIcon class="size-3" />
        {:else if job.status === 'running'}<LoaderIcon class="size-3 motion-safe:animate-spin" />
        {:else if job.status === 'succeeded'}<CheckIcon class="size-3" />
        {:else if job.status === 'failed'}<CircleAlertIcon class="size-3" />
        {:else}<CircleSlashIcon class="size-3" />{/if}
        {JOB_STATUS_LABELS[job.status]}
    </Badge>
{/if}
