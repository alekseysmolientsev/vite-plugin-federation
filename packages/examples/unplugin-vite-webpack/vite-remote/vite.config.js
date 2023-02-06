import federation from '@originjs/vite-plugin-federation/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(async ({ command }) => ({
	server: {
		fs: {
			allow: ['.'],
		},
	},
	plugins: [
		federation({
      name: 'vite',      
      exposes: {
        "./RemoteApp": "./src/components/Button.tsx"
      },
    }).vite(),
		react(),
	],
}));