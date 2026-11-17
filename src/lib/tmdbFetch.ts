import https from 'node:https';

/**
 * Resilient HTTP/1.1 client for TMDB APIs with auto-retry.
 * Prevents CloudFront HTTP/2 / TLS resets on cloud environments (e.g. OCI).
 */
export async function tmdbFetch<T = any>(
  url: string,
  headers: Record<string, string> = {},
  retries = 2
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await new Promise<T>((resolve, reject) => {
        const req = https.get(
          url,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              ...headers,
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
            });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  resolve(JSON.parse(data) as T);
                } catch (e) {
                  reject(new Error(`Failed to parse TMDB JSON from ${url}: ${e}`));
                }
              } else {
                reject(new Error(`TMDB HTTP ${res.statusCode} for ${url}: ${data}`));
              }
            });
          }
        );

        req.on('error', (err) => {
          reject(err);
        });

        req.setTimeout(8000, () => {
          req.destroy(new Error(`TMDB request timed out after 8000ms: ${url}`));
        });
      });
    } catch (err: any) {
      const isNetworkError =
        err?.code === 'ECONNRESET' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'EAI_AGAIN' ||
        err?.message?.includes('timed out');
      if (attempt < retries && isNetworkError) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}
