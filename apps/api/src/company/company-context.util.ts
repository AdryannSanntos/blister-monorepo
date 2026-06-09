import type { Request } from 'express';

export const ACTIVE_COMPANY_COOKIE = 'blister-active-company-id';

export function getActiveCompanyIdFromRequest(req: Request): string | undefined {
  const cookieValue = req.cookies?.[ACTIVE_COMPANY_COOKIE];
  if (typeof cookieValue === 'string' && cookieValue.length > 0) {
    return cookieValue;
  }

  const headerValue = req.headers['x-blister-company-id'];
  if (typeof headerValue === 'string' && headerValue.length > 0) {
    return headerValue;
  }

  if (Array.isArray(headerValue) && headerValue[0]) {
    return headerValue[0];
  }

  return undefined;
}
