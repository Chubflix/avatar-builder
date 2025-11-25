

/** @type { import('@storybook/nextjs').StorybookConfig } */
const config = {
  "stories": [
    "../app/design-system/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../app/design-system/**/*.mdx"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest"
  ],
  "framework": {
    "name": "@storybook/nextjs",
    "options": {}
  },
  "staticDirs": [
    "../public"
  ]
};
export default config;