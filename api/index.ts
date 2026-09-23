import app from '../server/app';
import type { Request, Response } from 'express';

// Vercel Serverless Function handler
export default function handler(req: Request, res: Response) {
  // Normalize Vercel URL if rewritten
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

  return app(req, res);
}

