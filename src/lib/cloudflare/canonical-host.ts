/** The public www alias shares the site's established canonical origin and Studio grant. */
export function canonicalHearthafterRedirect(request: Request): Response | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  if (url.hostname !== 'www.hearthafter.homes') return null;
  url.protocol = 'https:';
  url.hostname = 'hearthafter.homes';
  url.port = '';
  return new Response(null, {status: 308, headers: {
    Location: url.href,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }});
}