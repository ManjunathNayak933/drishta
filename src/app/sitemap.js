import {
  getAllPoliticianSlugs,
  getAllIssueSlugs,
  getAllArticleSlugs,
  getAllPromiseSlugs,
} from '@/lib/api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://drishta.in';

export default async function sitemap() {
  const [politicians, issues, articles, promises] = await Promise.all([
    getAllPoliticianSlugs().catch(() => []),
    getAllIssueSlugs().catch(() => []),
    getAllArticleSlugs().catch(() => []),
    getAllPromiseSlugs().catch(() => []),
  ]);

  const static_pages = [
    { url: `${APP_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/promises`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${APP_URL}/issues`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${APP_URL}/news`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${APP_URL}/compare`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${APP_URL}/about`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${APP_URL}/editorial-policy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${APP_URL}/methodology`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const politician_pages = politicians.map((p) => ({
    url: `${APP_URL}/politician/${encodeURIComponent(p.state)}/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const issue_pages = issues.map((i) => ({
    url: `${APP_URL}/issue/${i.id}/${i.slug}`,
    lastModified: i.updated_at,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const article_pages = articles.map((a) => ({
    url: `${APP_URL}/news/article/${a.slug}`,
    lastModified: a.updated_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const promise_pages = promises.map((p) => ({
    url: `${APP_URL}/promise/${p.id}/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    ...static_pages,
    ...politician_pages,
    ...issue_pages,
    ...article_pages,
    ...promise_pages,
  ];
}
