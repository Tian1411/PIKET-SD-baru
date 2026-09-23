if ((globalThis as any).__dirname === '.') {
  delete (globalThis as any).__dirname;
}
process.env.DISABLE_HMR = 'true';

import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import app from './server/app';

async function startServer() {
  const PORT = 3000;

  // Vite middleware in dev vs static serving in prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Sistem Laporan Piket SD berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
