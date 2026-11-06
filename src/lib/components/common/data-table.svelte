<script lang="ts" generics="T extends { id: string }">
    // Adapted from https://shadcn-svelte.com/docs/components/data-table (TanStack v9).
    import {
        createTable,
        tableFeatures,
        columnFilteringFeature,
        rowPaginationFeature,
        rowSortingFeature,
        createFilteredRowModel,
        createPaginatedRowModel,
        createSortedRowModel,
        filterFn_includesString,
        sortFn_text
    } from '@tanstack/svelte-table';
    import type { Snippet } from 'svelte';
    import SearchIcon from '@lucide/svelte/icons/search';
    import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
    import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
    import InboxIcon from '@lucide/svelte/icons/inbox';
    import * as Table from '#lib/components/ui/table/index.js';
    import * as Empty from '#lib/components/ui/empty/index.js';
    import * as InputGroup from '#lib/components/ui/input-group/index.js';
    import { Button } from '#lib/components/ui/button/index.js';

    let {
        data,
        columns,
        cell,
        searchColumn,
        searchLabel = '검색',
        emptyTitle = '표시할 항목이 없습니다',
        emptyDescription = '새 항목을 추가하면 여기에 표시됩니다.',
        toolbar
    }: {
        data: T[];
        columns: { id: string; label: string; value: (row: T) => string; sortable?: boolean }[];
        cell: Snippet<[T, string]>;
        searchColumn: string;
        searchLabel?: string;
        emptyTitle?: string;
        emptyDescription?: string;
        toolbar?: Snippet;
    } = $props();

    const features = tableFeatures({
        columnFilteringFeature,
        rowPaginationFeature,
        rowSortingFeature,
        filteredRowModel: createFilteredRowModel(),
        paginatedRowModel: createPaginatedRowModel(),
        sortedRowModel: createSortedRowModel(),
        filterFns: { includesString: filterFn_includesString },
        sortFns: { text: sortFn_text }
    });
    const table = createTable({
        features,
        get data() {
            return data;
        },
        get columns() {
            return columns.map((column) => ({
                id: column.id,
                accessorFn: column.value,
                header: column.label,
                enableSorting: column.sortable !== false,
                filterFn: 'includesString' as const,
                sortFn: 'text' as const
            }));
        },
        getRowId: (row) => row.id,
        initialState: { pagination: { pageIndex: 0, pageSize: 8 } }
    });
</script>

<div class="min-w-0 space-y-4">
    <div class="flex flex-wrap items-center gap-3">
        <InputGroup.Root class="h-10 w-full sm:max-w-xs">
            <InputGroup.Addon><SearchIcon aria-hidden="true" /></InputGroup.Addon>
            <InputGroup.Input
                aria-label={searchLabel}
                placeholder={searchLabel}
                value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
                oninput={(event) =>
                    table.getColumn(searchColumn)?.setFilterValue(event.currentTarget.value)}
            />
        </InputGroup.Root>
        {@render toolbar?.()}
    </div>
    <div class="min-w-0 overflow-hidden rounded-xl border bg-background">
        <Table.Root>
            <Table.Header class="bg-muted/40">
                {#each table.getHeaderGroups() as group (group.id)}
                    <Table.Row>
                        {#each group.headers as header (header.id)}
                            <Table.Head
                                aria-sort={header.column.getIsSorted() === 'asc'
                                    ? 'ascending'
                                    : header.column.getIsSorted() === 'desc'
                                      ? 'descending'
                                      : 'none'}
                                class="h-12 px-4"
                            >
                                {#if header.column.getCanSort()}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        class="-ml-2 text-xs font-medium"
                                        onclick={header.column.getToggleSortingHandler()}
                                    >
                                        {columns.find((column) => column.id === header.column.id)
                                            ?.label}
                                        <ArrowUpDownIcon
                                            class="size-3 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                    </Button>
                                {:else}
                                    <span class="text-xs"
                                        >{columns.find((column) => column.id === header.column.id)
                                            ?.label}</span
                                    >
                                {/if}
                            </Table.Head>
                        {/each}
                    </Table.Row>
                {/each}
            </Table.Header>
            <Table.Body>
                {#each table.getRowModel().rows as row (row.id)}
                    <Table.Row>
                        {#each row.getAllCells() as item (item.id)}
                            <Table.Cell class="px-4 py-4"
                                >{@render cell(row.original, item.column.id)}</Table.Cell
                            >
                        {/each}
                    </Table.Row>
                {:else}
                    <Table.Row>
                        <Table.Cell colspan={columns.length} class="h-60">
                            <Empty.Root>
                                <Empty.Header>
                                    <Empty.Media variant="icon"
                                        ><InboxIcon aria-hidden="true" /></Empty.Media
                                    >
                                    <Empty.Title
                                        >{data.length
                                            ? '검색 결과가 없습니다'
                                            : emptyTitle}</Empty.Title
                                    >
                                    <Empty.Description
                                        >{data.length
                                            ? '다른 검색어나 필터를 사용해 보세요.'
                                            : emptyDescription}</Empty.Description
                                    >
                                </Empty.Header>
                            </Empty.Root>
                        </Table.Cell>
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </div>
    <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span aria-live="polite">총 {table.getFilteredRowModel().rows.length}개</span>
        <div class="flex items-center gap-2">
            <span
                >{table.atoms.pagination.get().pageIndex + 1} / {Math.max(
                    1,
                    table.getPageCount()
                )}</span
            >
            <Button
                variant="outline"
                size="icon-sm"
                aria-label="이전 페이지"
                onclick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}><ChevronLeftIcon /></Button
            >
            <Button
                variant="outline"
                size="icon-sm"
                aria-label="다음 페이지"
                onclick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}><ChevronRightIcon /></Button
            >
        </div>
    </div>
</div>
