import * as Sentry from '@sentry/nextjs';

const SENSITIVE_HEADERS = ['authorization', 'access-token', 'client-id', 'cookie'];
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function maskString(str: string): string {
  return str.replace(JWT_PATTERN, '[REDACTED_JWT]');
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,

  beforeSend(event) {
    // Mask JWT tokens in exception messages
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = maskString(ex.value);
      }
    }

    // Scrub sensitive headers from breadcrumbs
    if (event.breadcrumbs) {
      for (const crumb of event.breadcrumbs) {
        if (crumb.data && typeof crumb.data === 'object') {
          for (const key of SENSITIVE_HEADERS) {
            if (key in crumb.data) crumb.data[key] = '[REDACTED]';
          }
          // Also check nested headers object
          if (crumb.data.headers && typeof crumb.data.headers === 'object') {
            for (const key of SENSITIVE_HEADERS) {
              if (key in crumb.data.headers) crumb.data.headers[key] = '[REDACTED]';
            }
          }
        }
      }
    }

    return event;
  },
});
