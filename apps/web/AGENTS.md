<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

For this repo on Next.js 16, request-boundary routing must live in `apps/web/src/proxy.ts`. Do not add new `middleware.ts` files for route protection or auth redirects.
<!-- END:nextjs-agent-rules -->
