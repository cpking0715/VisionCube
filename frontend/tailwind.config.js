/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        secondary: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
        success: { DEFAULT: '#10B981', bg: 'var(--color-success-bg)' },
        warning: { DEFAULT: '#F59E0B', bg: 'var(--color-warning-bg)' },
        danger: { DEFAULT: '#EF4444', bg: 'var(--color-danger-bg)' },
        info: { DEFAULT: '#3B82F6', bg: 'var(--color-info-bg)' },
        /* 深色主题语义色（对应 index.css CSS 变量） */
        canvas: 'var(--color-canvas)',
        panel: { DEFAULT: 'var(--color-panel)', 2: 'var(--color-panel-2)' },
        line: { DEFAULT: 'var(--color-line)', strong: 'var(--color-line-strong)' },
        ink: { 1: 'var(--color-ink-1)', 2: 'var(--color-ink-2)', 3: 'var(--color-ink-3)' },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        /* 工作台卡片：默认 / hover 悬浮 */
        card: '0 1px 2px 0 rgb(79 70 229 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
        'card-hover': '0 2px 4px 0 rgb(79 70 229 / 0.06), 0 12px 32px -8px rgb(15 23 42 / 0.14)',
        /* 品牌辉光 */
        glow: '0 0 0 1px rgb(99 102 241 / 0.12), 0 8px 24px -6px rgb(99 102 241 / 0.35)',
      },
      backgroundImage: {
        /* 品牌渐变：主色 → 辅色，用于横幅/强调背景 */
        'gradient-brand': 'linear-gradient(135deg, #818CF8 0%, #A5B4FC 45%, #38BDF8 100%)',
        'gradient-brand-soft': 'linear-gradient(135deg, rgb(129 140 248 / 0.16) 0%, rgb(56 189 248 / 0.1) 100%)',
        'gradient-hero': 'linear-gradient(160deg, rgb(49 46 129 / 0.98) 0%, rgb(67 56 202 / 0.95) 42%, rgb(2 132 199 / 0.9) 100%)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.4, 0, 0.2, 1) both',
        'shimmer': 'shimmer 2.2s linear infinite',
      },
      transitionDuration: {
        fast: '100ms',
        normal: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
}
