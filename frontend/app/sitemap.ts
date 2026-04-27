import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://policyengine.org/us/utah-2026-tax-changes',
      lastModified: new Date('2026-04-27'),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
