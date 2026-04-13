import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/guides/(.*)',
  '/supplies',
  '/privacy',
  '/terms',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { pathname, hostname } = req.nextUrl;

  const isAppSubdomain = hostname === 'app.proxidex.com' || hostname === 'app.localhost';

  // On app subdomain
  if (isAppSubdomain) {
    // Root path: internally serve the deck builder app without changing the URL
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/app', req.url));
    }
    // Keep /app clean: redirect back to root if someone somehow visits /app
    if (pathname === '/app') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    // Allow public routes
    if (isPublicRoute(req)) {
      return NextResponse.next();
    }
    // Protect all other routes
    await auth.protect();
    return NextResponse.next();
  }

  // On main domain (proxidex.com)
  if (hostname === 'proxidex.com' || hostname === 'localhost' || hostname === 'app.localhost') {
    // Redirect /app on main domain to the app subdomain (skip in dev)
    if (pathname === '/app' && hostname !== 'localhost' && hostname !== 'app.localhost') {
      return NextResponse.redirect(new URL('https://app.proxidex.com/'));
    }
    // If trying to access app-only routes on main domain, redirect to app subdomain
    if (pathname.startsWith('/decks') || pathname.startsWith('/settings') || pathname.startsWith('/print')) {
      const url = req.nextUrl.clone();
      url.hostname = 'app.proxidex.com';
      return NextResponse.redirect(url);
    }
    // Allow all other routes on main domain (landing page)
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
