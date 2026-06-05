/**
 * Storybook config — scaffolded but deps not auto-installed (Storybook
 * pulls ~200MB of dev deps so we keep it opt-in).
 *
 * To start using Storybook:
 *   1. npx storybook@latest init --skip-install --type nextjs
 *      (or just `npx storybook@latest init` and accept defaults)
 *   2. npm run storybook
 *
 * The story files in `stories/` are ready to use as soon as Storybook
 * is installed — they follow the CSF3 pattern that ships with
 * Storybook 7/8.
 */

module.exports = {
  stories: [
    '../stories/**/*.stories.@(js|jsx)',
    '../components/**/*.stories.@(js|jsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: { autodocs: 'tag' },
  staticDirs: ['../public'],
};
