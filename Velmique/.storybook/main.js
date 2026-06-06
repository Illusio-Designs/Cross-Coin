/**
 * Storybook config — scaffolded but deps not auto-installed.
 *
 * To start using Storybook:
 *   1. npx storybook@latest init --skip-install --type nextjs
 *   2. npm run storybook
 *
 * The story files in `stories/` are ready as soon as Storybook lands
 * (CSF3 pattern; works with Storybook 7/8).
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
