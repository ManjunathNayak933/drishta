const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://drishta.in';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/'],
      },
      {
        userAgent: 'Googlebot-News',
        allow: ['/news/', '/channel/', '/issue/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
