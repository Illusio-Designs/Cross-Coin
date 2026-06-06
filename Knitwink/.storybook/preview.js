import '../styles/globals.css';

/**
 * Storybook preview config — wraps every story with the same global
 * styles + a centred decorator so layout looks consistent.
 *
 * The QueryClientProvider isn't wired here because almost every story
 * we'd write is presentational. If you add a story that uses
 * useQuery, wrap it manually inside the story file or add a decorator
 * here that mounts a fresh QueryClient per story.
 */

export const parameters = {
  layout: 'centered',
  controls: { expanded: true },
  backgrounds: {
    default: 'light',
    values: [
      { name: 'light', value: '#fafafa' },
      { name: 'white', value: '#ffffff' },
      { name: 'dark',  value: '#111111' },
    ],
  },
  a11y: { config: { rules: [{ id: 'autocomplete-valid', enabled: false }] } },
  viewport: {
    viewports: {
      mobile: { name: 'Mobile (375)', styles: { width: '375px', height: '667px' } },
      tablet: { name: 'Tablet (768)', styles: { width: '768px', height: '1024px' } },
      desktop: { name: 'Desktop (1440)', styles: { width: '1440px', height: '900px' } },
    },
  },
};

export const tags = ['autodocs'];
