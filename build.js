/**
 * Build script for Offline GPT extension.
 * Bundles the sidebar JavaScript with dependencies.
 */

import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/sidebar/sidebar.js'],
  bundle: true,
  outfile: 'dist/sidebar.bundle.js',
  format: 'esm',
  platform: 'browser',
  target: ['chrome120'],
  sourcemap: true,
  minify: !isWatch,
  logLevel: 'info',
  loader: {
    '.txt': 'text',  // Inline .txt files as strings
  },
};

async function build() {
  try {
    if (isWatch) {
      const context = await esbuild.context(buildOptions);
      await context.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build complete!');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
