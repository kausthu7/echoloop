import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Secret Leak Guard Plugin for Vite
 * 
 * Prevents secret API keys, service role keys, and private credentials
 * from ever being compiled into the client-side JavaScript bundles.
 */
function secretLeakGuardPlugin(): Plugin {
  return {
    name: 'secret-leak-guard',
    buildStart() {
      // 1. Audit all environment variables prefixed with VITE_
      const allowedViteVars = new Set([
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
      ]);

      for (const key of Object.keys(process.env)) {
        if (key.startsWith('VITE_') && !allowedViteVars.has(key)) {
          const lower = key.toLowerCase();
          if (
            lower.includes('gemini') ||
            lower.includes('secret') ||
            lower.includes('service_role') ||
            lower.includes('private') ||
            lower.includes('password')
          ) {
            throw new Error(
              `\n🚨 [SECURITY FATAL] Detected high-risk variable "${key}" exposed to the client bundle!\n` +
              `Variables starting with "VITE_" are embedded into the public browser JavaScript bundle.\n` +
              `Remove the "VITE_" prefix so it remains strictly server-side (e.g. GEMINI_API_KEY).\n`
            );
          }
        }
      }
    },
    generateBundle(_options, bundle) {
      // 2. Scan generated JavaScript chunks for key signatures
      const leakPatterns = [
        { name: 'Google / Gemini API Key', regex: /(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{35,})/ },
        { name: 'Supabase Service Role Key', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]*service_role/ },
        { name: 'Private Key Header', regex: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
      ];

      for (const [fileName, fileInfo] of Object.entries(bundle)) {
        if (fileInfo.type === 'chunk' && fileInfo.code) {
          for (const pattern of leakPatterns) {
            if (pattern.regex.test(fileInfo.code)) {
              throw new Error(
                `\n🚨 [SECURITY FATAL] Potential secret leak (${pattern.name}) detected inside compiled client bundle: "${fileName}"!\n` +
                `Build aborted to prevent leaking credentials to public users.\n`
              );
            }
          }
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      secretLeakGuardPlugin(),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'ui-vendor': ['lucide-react', 'motion', 'canvas-confetti'],
          },
        },
      },
    },
  };
});
