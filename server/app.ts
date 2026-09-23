import express, { Express, Request, Response } from 'express';
import authRouter from './routes/auth';
import reportsRouter from './routes/reports';
import classesRouter from './routes/classes';
import teachersRouter from './routes/teachers';
import studentsRouter from './routes/students';
import adminRouter, { getSettingsHandler, updateSettingsHandler } from './routes/admin';
import exportRouter from './routes/export';
import { authenticate, requireAdmin } from './auth';
import { getDB } from './db';

// Create Express application instance
export function createExpressApp(): Express {
  const app = express();

  // Inisialisasi database
  try {
    getDB();
    console.log('[DB] Database piket SD berhasil diinisialisasi.');
  } catch (err) {
    console.error('[DB] Gagal menginisialisasi database:', err);
  }

  // Middleware parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Vercel & Reverse Proxy URL normalization middleware
  app.use((req, res, next) => {
    const matchedPath = (req.headers['x-matched-path'] as string) ||
                        (req.headers['x-vercel-matched-path'] as string) ||
                        (req.headers['x-now-route-matches'] as string);

    const queryRoute = (req.query?.__vercel_route as string | undefined) ||
                       (req.query?.__path as string | undefined);

    if (queryRoute) {
      const cleanRoute = queryRoute.startsWith('/') ? queryRoute : `/${queryRoute}`;
      req.url = cleanRoute.startsWith('/api') ? cleanRoute : `/api${cleanRoute}`;
    } else if (matchedPath && (matchedPath.startsWith('/api') || matchedPath.startsWith('/'))) {
      req.url = matchedPath.startsWith('/api') ? matchedPath : `/api${matchedPath}`;
    } else if (req.originalUrl && req.originalUrl.startsWith('/api') && (req.url === '/api' || req.url === '/')) {
      req.url = req.originalUrl;
    }
    next();
  });

  // CORS support (berguna jika frontend dan API dipanggil secara terpisah)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // Health check handler
  const healthHandler = (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      app: 'Sistem Laporan Piket Harian SD - UPTD SDN Oehendak',
      environment: process.env.VERCEL ? 'vercel-serverless' : (process.env.NODE_ENV || 'development'),
    });
  };

  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);
  app.get('/api', healthHandler);

  // Pasang router dengan prefix /api/... serta fallback tanpa /api
  // untuk memastikan kompatibilitas penuh dengan berbagai konfigurasi serverless Vercel
  const routeModules = [
    ['auth', authRouter],
    ['reports', reportsRouter],
    ['classes', classesRouter],
    ['teachers', teachersRouter],
    ['students', studentsRouter],
    ['admin', adminRouter],
    ['export', exportRouter],
  ] as const;

  routeModules.forEach(([pathSegment, router]) => {
    app.use(`/api/${pathSegment}`, router);
    app.use(`/${pathSegment}`, router);
  });

  // Settings endpoints (supports both /api/settings and /api/admin/settings)
  app.get(['/api/settings', '/api/settings/', '/settings', '/settings/'], (req: Request, res: Response) => getSettingsHandler(req as any, res));
  app.put(['/api/settings', '/api/settings/', '/settings', '/settings/'], authenticate, requireAdmin, (req: Request, res: Response) => updateSettingsHandler(req as any, res));

  // Catch-all API 404 JSON handler
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Endpoint API tidak ditemukan',
      path: req.originalUrl || req.url,
      method: req.method,
    });
  });

  return app;
}

const app = createExpressApp();
export default app;
