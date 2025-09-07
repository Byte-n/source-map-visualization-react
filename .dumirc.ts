import { defineConfig } from 'dumi';

export default defineConfig({
  base:
    process.env.NODE_ENV === 'production'
      ? '/source-map-visualization-react/'
      : '/',
  outputPath: 'docs-dist',
  publicPath:
    process.env.NODE_ENV === 'production'
      ? '/source-map-visualization-react/'
      : '/',
  themeConfig: {
    rtl: false,
    sourceLink: undefined,
    name: 'source map',
    footer:
      'Made with<span style="color: rgb(255, 255, 255);">❤</span>by <span><a href="https://github.com/Byte-n">Byte-n</a> | Copyright © 2025-present</span>',
    github: 'https://github.com/Byte-n/source-map-visualization-react',
  },
});
