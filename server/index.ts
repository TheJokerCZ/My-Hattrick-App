import express from 'express';
import cors from 'cors';
import { buildOAuthHeader } from './chppOAuth';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const CHPP_REQUEST_TOKEN_URL = 'https://chpp.hattrick.org/oauth/request_token.ashx';
const CHPP_AUTHORIZE_URL = 'https://chpp.hattrick.org/oauth/authorize.aspx';
const CHPP_ACCESS_TOKEN_URL = 'https://chpp.hattrick.org/oauth/access_token.ashx';
const CHPP_XML_URL = 'https://chpp.hattrick.org/chppxml.ashx';

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'MyHattrick CHPP Proxy' });
});

app.post('/api/chpp/request-token', async (req, res) => {
  try {
    const { consumerKey, consumerSecret } = req.body as {
      consumerKey?: string;
      consumerSecret?: string;
    };
    if (!consumerKey || !consumerSecret) {
      res.status(400).json({ error: 'Chybí Consumer Key nebo Consumer Secret.' });
      return;
    }

    const authHeader = buildOAuthHeader({
      method: 'POST',
      url: CHPP_REQUEST_TOKEN_URL,
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
      extraOAuthParams: { oauth_callback: 'oob' },
    });

    const response = await fetch(CHPP_REQUEST_TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });

    const text = await response.text();
    if (!response.ok) {
      res.status(response.status).json({
        error: `Hattrick odmítl žádost o token (${response.status}): ${text}`,
      });
      return;
    }

    const parsed = new URLSearchParams(text);
    const requestToken = parsed.get('oauth_token');
    const requestTokenSecret = parsed.get('oauth_token_secret');
    if (!requestToken || !requestTokenSecret) {
      res.status(502).json({ error: `Neočekávaná odpověď z Hattrick OAuth: ${text}` });
      return;
    }

    res.json({
      requestToken,
      requestTokenSecret,
      authorizeUrl: `${CHPP_AUTHORIZE_URL}?oauth_token=${encodeURIComponent(requestToken)}`,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Chyba komunikace se serverem Hattrick.',
    });
  }
});

app.post('/api/chpp/access-token', async (req, res) => {
  try {
    const {
      consumerKey,
      consumerSecret,
      requestToken,
      requestTokenSecret,
      verificationCode,
    } = req.body as {
      consumerKey?: string;
      consumerSecret?: string;
      requestToken?: string;
      requestTokenSecret?: string;
      verificationCode?: string;
    };

    if (
      !consumerKey ||
      !consumerSecret ||
      !requestToken ||
      !requestTokenSecret ||
      !verificationCode
    ) {
      res.status(400).json({ error: 'Chybí některý z povinných OAuth parametrů nebo PIN kód.' });
      return;
    }

    const authHeader = buildOAuthHeader({
      method: 'POST',
      url: CHPP_ACCESS_TOKEN_URL,
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
      token: requestToken.trim(),
      tokenSecret: requestTokenSecret.trim(),
      extraOAuthParams: { oauth_verifier: verificationCode.trim() },
    });

    const response = await fetch(CHPP_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });

    const text = await response.text();
    if (!response.ok) {
      res.status(response.status).json({
        error: `Hattrick odmítl výměnu tokenu (${response.status}): ${text}`,
      });
      return;
    }

    const parsed = new URLSearchParams(text);
    const accessToken = parsed.get('oauth_token');
    const accessTokenSecret = parsed.get('oauth_token_secret');
    if (!accessToken || !accessTokenSecret) {
      res.status(502).json({ error: `Chybná odpověď při ověření kódu: ${text}` });
      return;
    }

    res.json({ accessToken, accessTokenSecret });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Chyba při dokončení OAuth přihlášení.',
    });
  }
});

async function fetchChppXml(
  file: string,
  version: string,
  creds: {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  },
  extraParams: Record<string, string> = {}
): Promise<string> {
  const queryParams: Record<string, string> = {
    file,
    version,
    ...extraParams,
  };
  const qs = new URLSearchParams(queryParams).toString();
  const fullUrl = `${CHPP_XML_URL}?${qs}`;

  const authHeader = buildOAuthHeader({
    method: 'GET',
    url: CHPP_XML_URL,
    consumerKey: creds.consumerKey.trim(),
    consumerSecret: creds.consumerSecret.trim(),
    token: creds.accessToken.trim(),
    tokenSecret: creds.accessTokenSecret.trim(),
    queryParams,
  });

  const resp = await fetch(fullUrl, {
    method: 'GET',
    headers: { Authorization: authHeader },
  });

  const xml = await resp.text();
  if (!resp.ok) {
    throw new Error(`CHPP ${file} vrátil stav ${resp.status}: ${xml}`);
  }
  return xml;
}

app.post('/api/chpp/sync', async (req, res) => {
  try {
    const { consumerKey, consumerSecret, accessToken, accessTokenSecret } = req.body as {
      consumerKey?: string;
      consumerSecret?: string;
      accessToken?: string;
      accessTokenSecret?: string;
    };

    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      res.status(400).json({ error: 'Chybí přihlašovací tokeny CHPP.' });
      return;
    }

    const creds = { consumerKey, consumerSecret, accessToken, accessTokenSecret };

    const [playersXml, trainingXml, teamDetailsXml] = await Promise.all([
      fetchChppXml('players', '2.5', creds, { actionType: 'view' }),
      fetchChppXml('training', '2.2', creds).catch(() => ''),
      fetchChppXml('teamdetails', '3.5', creds).catch(() => ''),
    ]);

    res.json({
      playersXml,
      trainingXml,
      teamDetailsXml,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Nepodařilo se stáhnout data z Hattrick CHPP.',
    });
  }
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`MyHattrick CHPP proxy server běží na http://localhost:${PORT}`);
});
