import type { MetadataRoute } from 'next';
import { VERIFIED_PROGRAMS_IN_CATALOG } from '@/lib/catalog';
import { DATA_SLICE, PUBLIC_ORIGIN } from '@/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = PUBLIC_ORIGIN;
  return [
    {
      url: `${origin}/`,
      lastModified: DATA_SLICE.checkedOn ?? undefined,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${origin}/calendar/`,
      lastModified: DATA_SLICE.checkedOn ?? undefined,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${origin}/privacy/`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...VERIFIED_PROGRAMS_IN_CATALOG.map((program) => ({
      url: `${origin}/program/${program.id}/`,
      lastModified: program.checkedOn ?? undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
