<script lang="ts">
    // Adapted from the official shadcn-svelte sidebar-07 block:
    // https://shadcn-svelte.com/blocks/sidebar#sidebar-07
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import FileText from '@lucide/svelte/icons/file-text';
    import FolderOpen from '@lucide/svelte/icons/folder-open';
    import ListTodo from '@lucide/svelte/icons/list-todo';
    import Users from '@lucide/svelte/icons/users';
    import Settings2 from '@lucide/svelte/icons/settings-2';
    import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
    import LogOut from '@lucide/svelte/icons/log-out';
    import UserRound from '@lucide/svelte/icons/user-round';
    import ShieldCheck from '@lucide/svelte/icons/shield-check';
    import { getGateway } from '#lib/client/context.js';
    import * as Sidebar from '#lib/components/ui/sidebar/index.js';
    import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
    import * as Avatar from '#lib/components/ui/avatar/index.js';

    const gateway = getGateway();
    const sidebar = Sidebar.useSidebar();
    const navigation = [
        { label: '문서', href: '/documents', icon: FolderOpen },
        { label: '작업', href: '/jobs', icon: ListTodo }
    ];
    const administration = [
        { label: '구성원', href: '/admin/members', icon: Users },
        { label: '운영 설정', href: '/admin/settings', icon: Settings2 }
    ];
    let error = $state('');

    function closeMobileMenu() {
        sidebar.setOpenMobile(false);
    }

    async function logout() {
        error = '';
        try {
            gateway.logout();
            closeMobileMenu();
            await goto('/login');
        } catch (cause) {
            error = cause instanceof Error ? cause.message : '로그아웃하지 못했습니다.';
        }
    }
</script>

<Sidebar.Root collapsible="icon" variant="inset">
    <Sidebar.Header class="px-2 pt-3">
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton size="lg" tooltipContent="HWPX Cowork">
                    {#snippet child({ props })}
                        <a {...props} href="/documents" onclick={closeMobileMenu}>
                            <div
                                class="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg"
                            >
                                <FileText class="size-4" aria-hidden="true" />
                            </div>
                            <div class="grid flex-1 gap-0.5 text-left leading-tight">
                                <span class="truncate font-semibold tracking-tight"
                                    >HWPX Cowork</span
                                >
                                <span class="text-muted-foreground truncate text-xs"
                                    >팀의 문서 작업 공간</span
                                >
                            </div>
                        </a>
                    {/snippet}
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Header>
    <Sidebar.Content>
        <Sidebar.Group>
            <Sidebar.GroupLabel>작업 공간</Sidebar.GroupLabel>
            <Sidebar.Menu>
                {#each navigation as item (item.href)}
                    <Sidebar.MenuItem>
                        <Sidebar.MenuButton
                            isActive={page.url.pathname.startsWith(item.href)}
                            tooltipContent={item.label}
                            class="h-10"
                        >
                            {#snippet child({ props })}
                                <a
                                    {...props}
                                    href={item.href}
                                    aria-current={page.url.pathname.startsWith(item.href)
                                        ? 'page'
                                        : undefined}
                                    onclick={closeMobileMenu}
                                >
                                    <item.icon aria-hidden="true" />
                                    <span>{item.label}</span>
                                </a>
                            {/snippet}
                        </Sidebar.MenuButton>
                    </Sidebar.MenuItem>
                {/each}
            </Sidebar.Menu>
        </Sidebar.Group>
        {#if $gateway.currentUser?.role === 'admin'}
            <Sidebar.Group>
                <Sidebar.GroupLabel>관리자</Sidebar.GroupLabel>
                <Sidebar.Menu>
                    {#each administration as item (item.href)}
                        <Sidebar.MenuItem>
                            <Sidebar.MenuButton
                                isActive={page.url.pathname === item.href}
                                tooltipContent={item.label}
                                class="h-10"
                            >
                                {#snippet child({ props })}
                                    <a
                                        {...props}
                                        href={item.href}
                                        aria-current={page.url.pathname === item.href
                                            ? 'page'
                                            : undefined}
                                        onclick={closeMobileMenu}
                                    >
                                        <item.icon aria-hidden="true" />
                                        <span>{item.label}</span>
                                    </a>
                                {/snippet}
                            </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                    {/each}
                </Sidebar.Menu>
            </Sidebar.Group>
        {/if}
    </Sidebar.Content>
    <Sidebar.Footer>
        <div
            class="text-muted-foreground px-2 pb-3 text-xs leading-5 group-data-[collapsible=icon]:hidden"
        >
            <p>함께 보는 문서, 나만의 작업 이력.</p>
            <p>개인 브랜치에서 안전하게 편집하세요.</p>
        </div>
        {#if $gateway.currentUser}
            {@const user = $gateway.currentUser}
            <Sidebar.Menu>
                <Sidebar.MenuItem>
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger>
                            {#snippet child({ props })}
                                <Sidebar.MenuButton
                                    {...props}
                                    size="lg"
                                    class="data-[state=open]:bg-sidebar-accent"
                                    aria-label={`${user.name} 사용자 메뉴`}
                                >
                                    <Avatar.Root class="size-8 rounded-lg">
                                        <Avatar.Fallback
                                            class="bg-muted rounded-lg text-xs font-medium"
                                        >
                                            {user.initials}
                                        </Avatar.Fallback>
                                    </Avatar.Root>
                                    <div class="grid flex-1 gap-0.5 text-left leading-tight">
                                        <span class="truncate font-medium">{user.name}</span>
                                        <span class="text-muted-foreground truncate text-xs">
                                            {user.role === 'admin' ? '관리자' : '구성원'}
                                        </span>
                                    </div>
                                    <ChevronsUpDown class="ml-auto size-4" aria-hidden="true" />
                                </Sidebar.MenuButton>
                            {/snippet}
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content
                            class="min-w-56 rounded-lg"
                            side={sidebar.isMobile ? 'bottom' : 'right'}
                            align="end"
                            sideOffset={4}
                        >
                            <DropdownMenu.Label>
                                <p class="font-medium">{user.name}</p>
                                <p class="text-muted-foreground mt-1 text-xs font-normal">
                                    {user.email}
                                </p>
                            </DropdownMenu.Label>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item disabled>
                                {#if user.role === 'admin'}
                                    <ShieldCheck aria-hidden="true" />
                                    관리자 계정
                                {:else}
                                    <UserRound aria-hidden="true" />
                                    구성원 계정
                                {/if}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onSelect={() => void logout()}>
                                <LogOut aria-hidden="true" />
                                로그아웃
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
                </Sidebar.MenuItem>
            </Sidebar.Menu>
        {/if}
        {#if error}
            <p role="alert" class="text-destructive px-2 text-xs">{error}</p>
        {/if}
    </Sidebar.Footer>
    <Sidebar.Rail aria-label="메뉴 접기 또는 펼치기" />
</Sidebar.Root>
