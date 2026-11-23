# Bundle Size Checklist

Use these steps in the dashboard's Vite project to inspect production bundle
contents. This repository is a Docusaurus docs portal; do not add Vite-specific
configuration here unless the dashboard is moved into this project.

## Setup

- [ ] Add the visualizer to the dashboard project:

  ```sh
  npm install --save-dev rollup-plugin-visualizer
  ```

- [ ] In `vite.config.ts`, enable the visualizer only for the `analyze` mode:

  ```ts
  import { defineConfig } from 'vite';
  import { visualizer } from 'rollup-plugin-visualizer';

  export default defineConfig(({ mode }) => ({
    plugins: [
      ...(mode === 'analyze'
        ? [
            visualizer({
              filename: 'dist/stats.html',
              open: false,
              gzipSize: true,
              brotliSize: true,
            }),
          ]
        : []),
    ],
  }));
  ```

## Analyze

- [ ] From the dashboard project directory, create a production build and report:

  ```sh
  npx vite build --mode analyze
  ```

- [ ] Open `dist/stats.html` and inspect large dependencies, duplicated modules,
  and unexpectedly large application chunks.
- [ ] Record the largest contributors and compare them with the previous report.
- [ ] Optimize only where the report indicates a meaningful opportunity, then
  rerun the analysis to verify the result.
