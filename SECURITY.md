# Security Notes

This project uses demo authentication for hackathon evaluation.

## Demo Authentication

- Protected routes are guarded by Next.js middleware.
- Login creates a signed session token.
- The session is stored in an HttpOnly cookie, so client-side JavaScript cannot read it.
- The cookie uses `SameSite=Lax` and is marked `Secure` in production.
- Secrets and demo credentials must be provided through environment configuration for deployed environments.

## Production Path

For production, replace the demo credential provider with an identity provider such as SSO/OAuth, Auth0, Clerk, Firebase Auth, or a database-backed user store. Production deployments should also add role-based access control, audit logs, password hashing for local accounts, and secret rotation.
