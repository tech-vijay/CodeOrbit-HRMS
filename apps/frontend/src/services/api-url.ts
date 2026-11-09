export const normalizeApiBaseUrl = (
  configuredUrl: string | undefined,
  production: boolean,
  hostname: string
): string => {
  const configured = configuredUrl?.trim();
  if (!configured) {
    if (production && hostname.includes('onrender.com')) {
      return 'https://codeorbit-hrms-api.onrender.com/api';
    }
    return '/api/v1';
  }

  const trimmedUrl = configured.replace(/\/+$/, '');
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl.replace(/\/api(?:\/v1)?$/i, '') + '/api';
  }

  const url = new URL(trimmedUrl);
  url.pathname = `${url.pathname.replace(/\/api(?:\/v1)?$/i, '').replace(/\/+$/, '')}/api`;
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
};
