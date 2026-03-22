import { app, safeStorage, shell } from 'electron';
import { createServer, type Server } from 'http';
import { randomBytes, createHash } from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import { ONEDRIVE_CONFIG } from '../config/onedrive';

interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
  accountEmail?: string | null;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface CallbackResult {
  code?: string;
  error?: string;
  errorDescription?: string;
}

export interface OneDriveConnectionStatus {
  connected: boolean;
  accountEmail: string | null;
  expiresAt: number | null;
}

const CALLBACK_PATH = '/oauth/callback';
const CALLBACK_PORT = 3001;

function base64UrlEncode(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sha256Base64Url(input: string): string {
  return base64UrlEncode(createHash('sha256').update(input).digest());
}

export class OneDriveAuthService {
  private readonly tokenFilePath: string;

  constructor() {
    this.tokenFilePath = path.join(app.getPath('userData'), 'onedrive-tokens.enc');
  }

  async login(): Promise<OneDriveConnectionStatus> {
    const verifier = base64UrlEncode(randomBytes(32));
    const challenge = sha256Base64Url(verifier);
    const state = base64UrlEncode(randomBytes(24));

    const callback = await this.waitForCallback(state, verifier);
    if (callback.error) {
      throw new Error(`Microsoft sign-in failed: ${callback.errorDescription || callback.error}`);
    }
    if (!callback.code) {
      throw new Error('Microsoft sign-in failed: missing authorization code');
    }

    const token = await this.exchangeCodeForToken(callback.code, callback.redirectUri, verifier);
    const me = await this.fetchProfile(token.access_token);

    const tokensToStore: StoredTokens = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope,
      tokenType: token.token_type,
      accountEmail: me.mail || me.userPrincipalName || null,
    };

    await this.storeTokens(tokensToStore);

    return {
      connected: true,
      accountEmail: tokensToStore.accountEmail || null,
      expiresAt: tokensToStore.expiresAt,
    };
  }

  async logout(): Promise<void> {
    try {
      await fs.unlink(this.tokenFilePath);
    } catch (error) {
      const e = error as NodeJS.ErrnoException;
      if (e.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getConnectionStatus(): Promise<OneDriveConnectionStatus> {
    const stored = await this.loadTokens();
    if (!stored) {
      return { connected: false, accountEmail: null, expiresAt: null };
    }

    const validToken = await this.ensureValidAccessToken(stored);
    if (!validToken) {
      await this.logout();
      return { connected: false, accountEmail: null, expiresAt: null };
    }

    return {
      connected: true,
      accountEmail: validToken.accountEmail || null,
      expiresAt: validToken.expiresAt,
    };
  }

  async getAccessToken(): Promise<string | null> {
    const stored = await this.loadTokens();
    if (!stored) return null;
    const validToken = await this.ensureValidAccessToken(stored);
    if (!validToken) return null;
    return validToken.accessToken;
  }

  private async waitForCallback(
    expectedState: string,
    verifier: string
  ): Promise<CallbackResult & { redirectUri: string }> {
    return new Promise((resolve, reject) => {
      let timeoutHandle: NodeJS.Timeout | undefined;
      let settled = false;

      const server = createServer((req, res) => {
        try {
          const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
          if (reqUrl.pathname !== CALLBACK_PATH) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }

          const code = reqUrl.searchParams.get('code') || undefined;
          const error = reqUrl.searchParams.get('error') || undefined;
          const errorDescription = reqUrl.searchParams.get('error_description') || undefined;
          const state = reqUrl.searchParams.get('state') || undefined;

          if (state !== expectedState) {
            res.statusCode = 400;
            res.end('Invalid OAuth state');
            if (!settled) {
              settled = true;
              cleanup(server, timeoutHandle);
              reject(new Error('Microsoft sign-in failed: invalid OAuth state'));
            }
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(
            '<html><body><h2>Placemark sign-in successful</h2><p>You can close this tab.</p></body></html>'
          );

          if (!settled) {
            settled = true;
            const address = server.address();
            if (!address || typeof address === 'string') {
              cleanup(server, timeoutHandle);
              reject(new Error('Microsoft sign-in failed: invalid callback server state'));
              return;
            }
            const redirectUri = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;
            cleanup(server, timeoutHandle);
            resolve({ code, error, errorDescription, redirectUri });
          }
        } catch (error) {
          if (!settled) {
            settled = true;
            cleanup(server, timeoutHandle);
            reject(error);
          }
        }
      });

      server.listen(CALLBACK_PORT, 'localhost', async () => {
        try {
          const address = server.address();
          if (!address || typeof address === 'string') {
            throw new Error('Microsoft sign-in failed: cannot start callback server');
          }

          const redirectUri = `http://localhost:${CALLBACK_PORT}${CALLBACK_PATH}`;

          const authUrl = new URL(`${ONEDRIVE_CONFIG.authority}/oauth2/v2.0/authorize`);
          authUrl.searchParams.set('client_id', ONEDRIVE_CONFIG.clientId);
          authUrl.searchParams.set('response_type', 'code');
          authUrl.searchParams.set('redirect_uri', redirectUri);
          authUrl.searchParams.set('response_mode', 'query');
          authUrl.searchParams.set('scope', ONEDRIVE_CONFIG.scopes.join(' '));
          authUrl.searchParams.set('state', expectedState);
          authUrl.searchParams.set('code_challenge', sha256Base64Url(verifier));
          authUrl.searchParams.set('code_challenge_method', 'S256');

          await shell.openExternal(authUrl.toString());

          timeoutHandle = setTimeout(() => {
            if (!settled) {
              settled = true;
              cleanup(server, timeoutHandle);
              reject(new Error('Microsoft sign-in timed out'));
            }
          }, ONEDRIVE_CONFIG.authTimeoutMs);
        } catch (error) {
          if (!settled) {
            settled = true;
            cleanup(server, timeoutHandle);
            reject(error);
          }
        }
      });
    });
  }

  private async exchangeCodeForToken(
    code: string,
    redirectUri: string,
    verifier: string
  ): Promise<TokenResponse> {
    const tokenUrl = `${ONEDRIVE_CONFIG.authority}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: ONEDRIVE_CONFIG.clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      scope: ONEDRIVE_CONFIG.scopes.join(' '),
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${text}`);
    }

    return (await response.json()) as TokenResponse;
  }

  private async refreshToken(stored: StoredTokens): Promise<StoredTokens | null> {
    if (!stored.refreshToken) return null;

    const tokenUrl = `${ONEDRIVE_CONFIG.authority}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: ONEDRIVE_CONFIG.clientId,
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
      scope: ONEDRIVE_CONFIG.scopes.join(' '),
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      return null;
    }

    const token = (await response.json()) as TokenResponse;
    const refreshed: StoredTokens = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token || stored.refreshToken,
      expiresAt: Date.now() + token.expires_in * 1000,
      scope: token.scope,
      tokenType: token.token_type,
      accountEmail: stored.accountEmail,
    };

    await this.storeTokens(refreshed);
    return refreshed;
  }

  private async ensureValidAccessToken(stored: StoredTokens): Promise<StoredTokens | null> {
    // Refresh 2 minutes before nominal expiry to avoid race conditions.
    const refreshThreshold = 2 * 60 * 1000;
    if (stored.expiresAt - Date.now() > refreshThreshold) {
      return stored;
    }

    return this.refreshToken(stored);
  }

  private async fetchProfile(
    accessToken: string
  ): Promise<{ mail?: string; userPrincipalName?: string }> {
    const response = await fetch(
      `${ONEDRIVE_CONFIG.graphBaseUrl}/me?$select=mail,userPrincipalName`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return {};
    }

    return (await response.json()) as { mail?: string; userPrincipalName?: string };
  }

  private async storeTokens(tokens: StoredTokens): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS secure storage is not available on this machine');
    }

    const serialized = JSON.stringify(tokens);
    const encrypted = safeStorage.encryptString(serialized);
    await fs.writeFile(this.tokenFilePath, encrypted.toString('base64'), 'utf-8');
  }

  private async loadTokens(): Promise<StoredTokens | null> {
    try {
      const encoded = await fs.readFile(this.tokenFilePath, 'utf-8');
      if (!encoded) return null;

      if (!safeStorage.isEncryptionAvailable()) {
        return null;
      }

      const encrypted = Buffer.from(encoded, 'base64');
      const decryptedJson = safeStorage.decryptString(encrypted);
      return JSON.parse(decryptedJson) as StoredTokens;
    } catch (error) {
      const e = error as NodeJS.ErrnoException;
      if (e.code === 'ENOENT') {
        return null;
      }
      return null;
    }
  }
}

function cleanup(server: Server, timeoutHandle?: NodeJS.Timeout): void {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
  }
  server.close();
}
