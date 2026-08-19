import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

function omitGeneralPngs() {
  return {
    name: 'omit-general-pngs',
    closeBundle() {
      const dir = path.resolve('dist/generals');
      if (!fs.existsSync(dir)) return;
      for (const name of fs.readdirSync(dir)) {
        if (name.endsWith('.png')) fs.unlinkSync(path.join(dir, name));
      }
    },
  };
}

export default defineConfig({
  base: "/xiangqi-sanguo/",
  plugins: [react(), tailwindcss(), omitGeneralPngs()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
