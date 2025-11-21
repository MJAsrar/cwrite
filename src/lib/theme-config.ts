export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeConfig {
  name: string;
  colors: ThemeColors;
  fonts: {
    sans: string;
    serif: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  borderRadius: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  shadows: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

export const lightTheme: ThemeConfig = {
  name: 'light',
  colors: {
    background: '0.96 0.01 85',
    foreground: '0.25 0.02 75',
    card: '0.98 0.008 85',
    cardForeground: '0.25 0.02 75',
    popover: '0.98 0.008 85',
    popoverForeground: '0.25 0.02 75',
    primary: '0.45 0.08 65',
    primaryForeground: '0.98 0.008 85',
    secondary: '0.88 0.015 80',
    secondaryForeground: '0.25 0.02 75',
    muted: '0.92 0.012 82',
    mutedForeground: '0.55 0.02 75',
    accent: '0.65 0.12 55',
    accentForeground: '0.98 0.008 85',
    destructive: '0.65 0.15 25',
    destructiveForeground: '0.98 0.008 85',
    border: '0.88 0.015 80',
    input: '0.88 0.015 80',
    ring: '0.45 0.08 65',
  },
  fonts: {
    sans: 'var(--font-geist-sans)',
    serif: 'var(--font-playfair)',
    mono: 'var(--font-geist-mono)',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  borderRadius: {
    xs: '0.25rem',
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

export const darkTheme: ThemeConfig = {
  ...lightTheme,
  name: 'dark',
  colors: {
    background: '0.145 0 0',
    foreground: '0.985 0 0',
    card: '0.145 0 0',
    cardForeground: '0.985 0 0',
    popover: '0.145 0 0',
    popoverForeground: '0.985 0 0',
    primary: '0.985 0 0',
    primaryForeground: '0.145 0 0',
    secondary: '0.269 0 0',
    secondaryForeground: '0.985 0 0',
    muted: '0.269 0 0',
    mutedForeground: '0.64 0.015 0',
    accent: '0.269 0 0',
    accentForeground: '0.985 0 0',
    destructive: '0.65 0.15 25',
    destructiveForeground: '0.985 0 0',
    border: '0.269 0 0',
    input: '0.269 0 0',
    ring: '0.985 0 0',
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
} as const;

export type ThemeName = keyof typeof themes;