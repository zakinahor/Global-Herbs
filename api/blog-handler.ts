import express from 'express';
import { blogRouter } from '../src/server/blog/blogRoutes';

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(blogRouter);

/**
 * Serverless function entrypoint for blog and blog-admin endpoints on Vercel
 */
export default function handler(req: any, res: any) {
  return app(req, res);
}
