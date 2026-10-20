import { execSync } from 'node:child_process';

export const PWA_BUILDS_DIR = '.pwa-builds';
export const PWA_VERSIONS = ['A', 'B'] as const;

/** Playwright global setup: two production builds that differ only in their build id. */
export default function buildVersions() {
  for (const version of PWA_VERSIONS) {
    execSync(`npx vite build --outDir ${PWA_BUILDS_DIR}/${version} --emptyOutDir --logLevel warn`, {
      stdio: 'inherit',
      env: { ...process.env, APP_BUILD_ID: version },
    });
  }
}
