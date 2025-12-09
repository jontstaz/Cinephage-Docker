import { browser } from '$app/environment';
import type { Theme } from './themes';

const THEME_KEY = 'theme';

class ThemeStore {
	current = $state<Theme>('dark');

	constructor() {
		if (browser) {
			const stored = localStorage.getItem(THEME_KEY) as Theme | null;
			if (stored) {
				this.current = stored;
				this.apply(stored);
			} else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
				this.current = 'dark';
				this.apply('dark');
			} else {
				this.current = 'light';
				this.apply('light');
			}
		}
	}

	set(theme: Theme) {
		this.current = theme;
		this.apply(theme);
		if (browser) {
			localStorage.setItem(THEME_KEY, theme);
		}
	}

	private apply(theme: Theme) {
		if (browser) {
			document.documentElement.setAttribute('data-theme', theme);
		}
	}
}

export const theme = new ThemeStore();
