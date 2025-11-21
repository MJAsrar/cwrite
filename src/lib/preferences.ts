export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
  compactMode: boolean;
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    indexingComplete: boolean;
    searchResults: boolean;
  };
}

export const defaultPreferences: UserPreferences = {
  theme: 'system',
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  language: 'en',
  notifications: {
    email: true,
    push: true,
    indexingComplete: true,
    searchResults: false,
  },
};

class PreferencesService {
  private storageKey = 'cowrite-preferences';

  getPreferences(): UserPreferences {
    if (typeof window === 'undefined') {
      return defaultPreferences;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultPreferences, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    }

    return defaultPreferences;
  }

  setPreferences(preferences: Partial<UserPreferences>): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const current = this.getPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem(this.storageKey, JSON.stringify(updated));
      
      // Apply preferences to document
      this.applyPreferences(updated);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  applyPreferences(preferences: UserPreferences): void {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;

    // Apply font size
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    switch (preferences.fontSize) {
      case 'small':
        root.classList.add('text-sm');
        break;
      case 'large':
        root.classList.add('text-lg');
        break;
      default:
        root.classList.add('text-base');
    }

    // Apply reduced motion
    if (preferences.reducedMotion) {
      root.classList.add('motion-reduce');
    } else {
      root.classList.remove('motion-reduce');
    }

    // Apply high contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply compact mode
    if (preferences.compactMode) {
      root.classList.add('compact');
    } else {
      root.classList.remove('compact');
    }
  }

  // Sync preferences with server (for authenticated users)
  async syncWithServer(preferences: UserPreferences): Promise<void> {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to sync preferences');
      }
    } catch (error) {
      console.error('Failed to sync preferences with server:', error);
    }
  }

  async loadFromServer(): Promise<UserPreferences | null> {
    try {
      const response = await fetch('/api/user/preferences');
      
      if (response.ok) {
        const serverPreferences = await response.json();
        return { ...defaultPreferences, ...serverPreferences };
      }
    } catch (error) {
      console.error('Failed to load preferences from server:', error);
    }

    return null;
  }
}

export const preferencesService = new PreferencesService();