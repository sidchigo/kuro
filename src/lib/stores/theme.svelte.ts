import type { StockThemeId, ThemeId, User } from '$lib/types';

export interface StockThemeOption {
  id: StockThemeId;
  label: string;
  color: string;
  rgb: string;
}

export const STOCK_THEMES: StockThemeOption[] = [
  { id: 'crimson', label: 'CRIMSON', color: '#E62E25', rgb: '230 46 37' },
  { id: 'amber', label: 'AMBER', color: '#FF6B00', rgb: '255 107 0' },
  { id: 'acid', label: 'ACID', color: '#00E676', rgb: '0 230 118' },
];

export const THEMES = STOCK_THEMES;

export function hexToRgb(hex: string): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return '230 46 37';
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r} ${g} ${b}`;
}

export function createThemeStore() {
  let currentTheme = $state<ThemeId>('crimson');
  let customColor = $state<string>('#A855F7');
  let activeUser = $state<User | null>(null);
  let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  function applyStyles(themeId: ThemeId, hexColor: string, rgbString: string) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeId);
      document.body?.setAttribute('data-theme', themeId);
      document.documentElement.style.setProperty('--accent', hexColor);
      document.documentElement.style.setProperty('--accent-rgb', rgbString);
      document.body?.style.setProperty('--accent', hexColor);
      document.body?.style.setProperty('--accent-rgb', rgbString);
    }
  }

  function apply(themeId: ThemeId, persistToApi = true) {
    currentTheme = themeId;

    let hex = '#E62E25';
    let rgb = '230 46 37';

    if (themeId === 'custom') {
      hex = customColor;
      rgb = hexToRgb(customColor);
    } else {
      const stock = STOCK_THEMES.find((t) => t.id === themeId);
      if (stock) {
        hex = stock.color;
        rgb = stock.rgb;
      }
    }

    applyStyles(themeId, hex, rgb);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kuro_theme', themeId);
        if (themeId === 'custom') {
          localStorage.setItem('kuro_custom_color', customColor);
        }
      } catch (e) {
        // ignore storage errors
      }

      if (persistToApi && activeUser) {
        if (persistDebounceTimer) {
          clearTimeout(persistDebounceTimer);
        }
        persistDebounceTimer = setTimeout(() => {
          fetch('/api/user/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              theme: themeId,
              customColor: themeId === 'custom' ? customColor : undefined,
            }),
          }).catch(() => {
            // silent fallback
          });
        }, 300);
      }
    }
  }

  function setCustomColor(hex: string) {
    customColor = hex;
    currentTheme = 'custom';
    apply('custom', true);
  }

  function syncUser(user: User | null) {
    activeUser = user;
    if (user?.customColor) {
      customColor = user.customColor;
      try {
        localStorage.setItem('kuro_custom_color', user.customColor);
      } catch {}
    }

    if (user?.themePreference) {
      if (user.themePreference === 'custom') {
        apply('custom', false);
      } else if (STOCK_THEMES.some((t) => t.id === user.themePreference)) {
        apply(user.themePreference as StockThemeId, false);
      }
    } else if (user) {
      // New login without DB preference, save current choice
      apply(currentTheme, true);
    }
  }

  function init(initialUser?: User | null) {
    if (typeof window !== 'undefined') {
      try {
        const savedCustom = localStorage.getItem('kuro_custom_color');
        if (savedCustom && /^#[0-9a-fA-F]{3,8}$/.test(savedCustom)) {
          customColor = savedCustom;
        }
      } catch {}
    }

    if (initialUser) {
      syncUser(initialUser);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('kuro_theme') as ThemeId | null;
        if (saved === 'custom') {
          apply('custom', false);
        } else if (saved && STOCK_THEMES.some((t) => t.id === saved)) {
          apply(saved, false);
        } else {
          apply('crimson', false);
        }
      } catch (e) {
        apply('crimson', false);
      }
    }
  }

  if (typeof window !== 'undefined') {
    init();
  }

  return {
    get currentTheme() {
      return currentTheme;
    },
    get customColor() {
      return customColor;
    },
    setTheme: (id: ThemeId) => apply(id, true),
    setCustomColor,
    syncUser,
    init,
  };
}

export const themeStore = createThemeStore();
