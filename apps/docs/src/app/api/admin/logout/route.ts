import { SESSION_COOKIE_NAME } from '@/lib/admin-auth';

export const runtime = 'edge';

export async function POST(): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: {
      location: '/admin/login',
      'set-cookie': [
        `${SESSION_COOKIE_NAME}=`,
        `Path=/admin`,
        `HttpOnly`,
        `Secure`,
        `SameSite=Strict`,
        `Max-Age=0`,
      ].join('; '),
    },
  });
}
