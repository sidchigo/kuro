<script lang="ts">
  import type { User } from "$lib/types";

  interface Props {
    currentUser: User | null;
    watchlistCount: number;
    seenCount: number;
    onOpenAuth: () => void;
    onLogout: () => void;
    onToggleMobileDrawer: (section: "plan" | "seen" | "accent") => void;
  }

  let {
    currentUser,
    watchlistCount,
    seenCount,
    onOpenAuth,
    onLogout,
    onToggleMobileDrawer,
  }: Props = $props();
</script>

<header
  class="h-12 px-3 flex items-center justify-between border-b border-[#262629] bg-[#0A0A0B] sticky top-0 z-30"
>
  <span
    class="font-serif text-2xl font-normal tracking-tight text-[#F2EFE9] lg:hidden"
  >
    kuro<span class="text-accent" style="color: var(--accent);">.</span>
  </span>

  <!-- User & RBAC Controls -->
  <div class="flex items-center gap-2 font-mono text-[10px] ml-auto">
    <!-- Mobile Drawer Triggers -->
    {#if watchlistCount > 0}
      <button
        type="button"
        onclick={() => onToggleMobileDrawer("plan")}
        class="lg:hidden border border-[#262629] px-2 py-0.5 text-accent hover:border-accent transition-colors"
      >
        PLAN [{watchlistCount}]
      </button>
    {/if}
    <button
      type="button"
      onclick={() => onToggleMobileDrawer("seen")}
      class="lg:hidden border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882] transition-colors"
    >
      SEEN [{seenCount}]
    </button>
    <button
      type="button"
      onclick={() => onToggleMobileDrawer("accent")}
      class="lg:hidden border border-[#262629] px-1.5 py-0.5 flex items-center gap-1 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882] transition-colors"
      title="Manage Accents"
      aria-label="Manage Accent Colors"
    >
      <span class="w-1.5 h-1.5 inline-block shrink-0" style="background-color: var(--accent);"></span>
      <span>ACCENT</span>
    </button>

    <!-- Global Navigation: Archive & Admin (Similar header style) -->
    {#if currentUser}
      <a
        href="/archive"
        class="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-accent hover:border-accent uppercase transition-colors"
        title="Expanded Archive"
      >
        [ARCHIVE]
      </a>
      {#if currentUser.role === "admin"}
        <a
          href="/admin"
          class="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#8A8882] uppercase transition-colors"
          title="Admin Panel"
        >
          [ADMIN]
        </a>
      {/if}
      <button
        type="button"
        onclick={onLogout}
        class="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-accent hover:border-accent uppercase transition-colors"
        title="Logout"
      >
        [LOGOUT]
      </button>
    {:else}
      <button
        type="button"
        onclick={onOpenAuth}
        class="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-accent hover:border-accent uppercase transition-colors"
        title="Archive (Sign In Required)"
      >
        [ARCHIVE]
      </button>
      <button
        type="button"
        onclick={onOpenAuth}
        class="border border-[#262629] px-2 py-0.5 text-[#8A8882] hover:text-[#F2EFE9] hover:border-[#F2EFE9] uppercase transition-colors"
      >
        [SIGN IN]
      </button>
    {/if}
  </div>
</header>
