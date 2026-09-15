import type { MetadataRoute } from 'next';
import { PUBLIC_ORIGIN } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/debug/', '/api/', '/return/'],
    },
    sitemap: `${PUBLIC_ORIGIN}/sitemap.xml`,
  };
}
