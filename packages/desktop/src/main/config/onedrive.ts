export const ONEDRIVE_CONFIG = {
  // Public client ID for desktop OAuth flow (safe to include in code)
  clientId: 'd6471ed5-2e1f-472f-95f0-e672258b4522',
  authority: 'https://login.microsoftonline.com/common',
  graphBaseUrl: 'https://graph.microsoft.com/v1.0',
  scopes: ['Files.Read', 'offline_access', 'User.Read'],
  authTimeoutMs: 120000,
} as const;
