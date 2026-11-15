import crypto from 'node:crypto';

function rfc3986Encode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export interface OAuthSignParams {
  method: 'GET' | 'POST';
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  extraOAuthParams?: Record<string, string>;
  queryParams?: Record<string, string>;
}

export function buildOAuthHeader(params: OAuthSignParams): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...(params.token ? { oauth_token: params.token } : {}),
    ...(params.extraOAuthParams ?? {}),
  };

  const allParams: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(oauthParams)) {
    allParams.push([k, v]);
  }
  if (params.queryParams) {
    for (const [k, v] of Object.entries(params.queryParams)) {
      allParams.push([k, v]);
    }
  }

  allParams.sort(([aK, aV], [bK, bV]) => {
    const eAK = rfc3986Encode(aK);
    const eBK = rfc3986Encode(bK);
    if (eAK === eBK) {
      return rfc3986Encode(aV).localeCompare(rfc3986Encode(bV));
    }
    return eAK.localeCompare(eBK);
  });

  const normalizedParams = allParams
    .map(([k, v]) => `${rfc3986Encode(k)}=${rfc3986Encode(v)}`)
    .join('&');

  const urlObj = new URL(params.url);
  const baseUrl = `${urlObj.origin}${urlObj.pathname}`;

  const signatureBaseString = [
    params.method.toUpperCase(),
    rfc3986Encode(baseUrl),
    rfc3986Encode(normalizedParams),
  ].join('&');

  const signingKey = `${rfc3986Encode(params.consumerSecret)}&${rfc3986Encode(
    params.tokenSecret ?? ''
  )}`;

  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  const headerParts = Object.entries({
    ...oauthParams,
    oauth_signature: signature,
  }).map(([k, v]) => `${rfc3986Encode(k)}="${rfc3986Encode(v)}"`);

  return `OAuth ${headerParts.join(', ')}`;
}
