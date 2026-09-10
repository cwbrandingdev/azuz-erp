export class MetaTokenExpiredError extends Error {
  constructor(message = 'Token de acesso Meta expirado') {
    super(message);
    this.name = 'MetaTokenExpiredError';
  }
}

export function isMetaTokenExpired(error: {
  code?: number;
  type?: string;
  message?: string;
}): boolean {
  if (error.code === 190) {
    return true;
  }

  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('session has expired') ||
    message.includes('access token has expired') ||
    message.includes('expired access token') ||
    message.includes('invalid oauth access token') ||
    message.includes('error validating access token')
  );
}
