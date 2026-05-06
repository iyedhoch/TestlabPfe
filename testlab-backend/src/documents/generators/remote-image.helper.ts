import * as http from 'http';
import * as https from 'https';

export type RemoteBinaryResult = {
  buffer: Buffer;
  contentType: string;
  finalUrl: string;
};

type FetchOptions = {
  timeoutMs: number;
  maxRedirects?: number;
  maxBytes?: number;
  userAgent?: string;
};

function resolveRedirectUrl(currentUrl: string, location: string): string {
  try {
    return new URL(location, currentUrl).toString();
  } catch {
    return location;
  }
}

export async function fetchRemoteBinary(
  url: string,
  options: FetchOptions,
): Promise<RemoteBinaryResult | null> {
  const maxRedirects = options.maxRedirects ?? 5;
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024; // 10MB
  const userAgent = options.userAgent ?? 'TestLab-Documents/1.0';

  const visited = new Set<string>();

  const fetchOnce = (currentUrl: string, redirectsLeft: number): Promise<RemoteBinaryResult | null> => {
    if (!currentUrl || visited.has(currentUrl) || redirectsLeft < 0) {
      return Promise.resolve(null);
    }

    visited.add(currentUrl);

    return new Promise((resolve) => {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch {
        resolve(null);
        return;
      }

      const client = parsed.protocol === 'https:' ? https : parsed.protocol === 'http:' ? http : null;
      if (!client) {
        resolve(null);
        return;
      }

      const req = client.request(
        currentUrl,
        {
          method: 'GET',
          headers: {
            'User-Agent': userAgent,
            Accept: 'image/*,*/*;q=0.8',
          },
        },
        (res) => {
          const statusCode = res.statusCode || 0;
          const location = typeof res.headers.location === 'string' ? res.headers.location : '';

          if (statusCode >= 300 && statusCode < 400 && location) {
            res.resume();
            const nextUrl = resolveRedirectUrl(currentUrl, location);
            fetchOnce(nextUrl, redirectsLeft - 1).then(resolve);
            return;
          }

          if (statusCode < 200 || statusCode >= 300) {
            res.resume();
            resolve(null);
            return;
          }

          const contentTypeHeader = res.headers['content-type'];
          const contentType =
            typeof contentTypeHeader === 'string'
              ? contentTypeHeader
              : Array.isArray(contentTypeHeader)
                ? contentTypeHeader[0] || ''
                : '';

          const chunks: Buffer[] = [];
          let total = 0;

          res.on('data', (chunk: Buffer) => {
            total += chunk.length;
            if (total > maxBytes) {
              req.destroy(new Error('Image too large'));
              return;
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            if (!buffer.length) {
              resolve(null);
              return;
            }

            resolve({ buffer, contentType: contentType || 'application/octet-stream', finalUrl: currentUrl });
          });
        },
      );

      req.on('error', () => resolve(null));
      req.setTimeout(options.timeoutMs, () => {
        req.destroy(new Error('timeout'));
      });
      req.end();
    });
  };

  return fetchOnce(url, maxRedirects);
}

export function toDataUri(contentType: string, buffer: Buffer): string {
  const normalizedType = contentType?.split(';')[0]?.trim() || 'image/png';
  return `data:${normalizedType};base64,${buffer.toString('base64')}`;
}
