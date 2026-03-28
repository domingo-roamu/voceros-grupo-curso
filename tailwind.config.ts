import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

/** Helper: wraps CSS variable channels in oklch() with alpha support */
function oklch(varName: string) {
  return `oklch(var(--${varName}) / <alpha-value>)`;
}

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: oklch('border'),
        input: oklch('input'),
        ring: oklch('ring'),
        background: oklch('background'),
        foreground: oklch('foreground'),
        primary: {
          DEFAULT: oklch('primary'),
          foreground: oklch('primary-foreground'),
        },
        secondary: {
          DEFAULT: oklch('secondary'),
          foreground: oklch('secondary-foreground'),
        },
        destructive: {
          DEFAULT: oklch('destructive'),
          foreground: oklch('destructive-foreground'),
        },
        muted: {
          DEFAULT: oklch('muted'),
          foreground: oklch('muted-foreground'),
        },
        accent: {
          DEFAULT: oklch('accent'),
          foreground: oklch('accent-foreground'),
        },
        popover: {
          DEFAULT: oklch('popover'),
          foreground: oklch('popover-foreground'),
        },
        card: {
          DEFAULT: oklch('card'),
          foreground: oklch('card-foreground'),
        },
        sidebar: {
          DEFAULT: oklch('sidebar'),
          foreground: oklch('sidebar-foreground'),
          primary: oklch('sidebar-primary'),
          'primary-foreground': oklch('sidebar-primary-foreground'),
          accent: oklch('sidebar-accent'),
          'accent-foreground': oklch('sidebar-accent-foreground'),
          border: oklch('sidebar-border'),
          ring: oklch('sidebar-ring'),
        },
        chart: {
          '1': oklch('chart-1'),
          '2': oklch('chart-2'),
          '3': oklch('chart-3'),
          '4': oklch('chart-4'),
          '5': oklch('chart-5'),
        },
        income: {
          DEFAULT: oklch('income'),
          light: oklch('income-light'),
        },
        expense: {
          DEFAULT: oklch('expense'),
          light: oklch('expense-light'),
        },
        balance: {
          DEFAULT: oklch('balance'),
          light: oklch('balance-light'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        fab: '0 4px 14px 0 rgb(0 0 0 / 0.2)',
        'fab-hover': '0 6px 20px 0 rgb(0 0 0 / 0.28)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
