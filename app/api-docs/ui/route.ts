import { getDhanAccessToken } from '@/lib/dhan/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  let accessToken = '';
  const clientId = process.env.DHAN_CLIENT_ID ?? '';
  try {
    accessToken = await getDhanAccessToken();
  } catch {
    accessToken = process.env.DHAN_ACCESS_TOKEN ?? '';
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Project-R API — Swagger UI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui-bundle.js"><\/script>
  <script src="/swagger-ui-standalone-preset.js"><\/script>
  <script>
    window.onload = function() {
      var ui = SwaggerUIBundle({
        urls: [
          { url: '/api-docs/spec', name: 'Project-R (R-Factor AI) API' },
          { url: '/api-docs/dhan-spec', name: 'DhanHQ V2 API' },
        ],
        'urls.primaryName': 'Project-R (R-Factor AI) API',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: 'StandaloneLayout',
        defaultModelsExpandDepth: 1,
        docExpansion: 'list',
        filter: true,
        tryItOutEnabled: true,
        requestInterceptor: function(req) {
          if (req.url && req.url.includes('dhan.co')) {
            req.headers['access-token'] = '${accessToken}';
            req.headers['client-id'] = '${clientId}';
          }
          return req;
        },
        onComplete: function() {
          ui.preauthorizeApiKey('accessToken', '${accessToken}');
          ui.preauthorizeApiKey('clientId', '${clientId}');
        }
      });
    };
  <\/script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
