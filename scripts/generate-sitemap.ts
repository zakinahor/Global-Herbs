import fs from 'fs';
import path from 'path';
import { generateSitemapXML } from '../src/utils/sitemap';

function buildSitemap() {
  const xml = generateSitemapXML();
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const targetPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(targetPath, xml, 'utf8');
  console.log(`[Sitemap Generator] Wrote sitemap XML to ${targetPath}`);
}

buildSitemap();
