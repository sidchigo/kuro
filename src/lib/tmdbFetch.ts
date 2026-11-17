import https from 'node:https';

/**
 * Resilient HTTP/1.1 client for TMDB APIs.
 * Prevents CloudFront HTTP/2 / TLS resets on cloud environments (e.g. OCI).
 */
export function tmdbFetch<T = any>(url: string, headers: Record<string, string> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'kuro-discovery/1.0',
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
              reject(new Error(`Failed to parse TMDB JSON: ${e}`));
            }
          } else {
            reject(new Error(`TMDB HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy(new Error(`TMDB request timed out after 10000ms: ${url}`));
    });
  });
}
