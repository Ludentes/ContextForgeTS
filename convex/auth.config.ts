/**
 * Convex Auth OpenID Connect configuration.
 *
 * AUTH_ISSUER_URL must match the JWT issuer (the Convex HTTP endpoint URL).
 * This is where JWTs are issued from and where the JWKS is served.
 *
 * Set via Convex environment variables:
 *   npx convex env set AUTH_ISSUER_URL "http://127.0.0.1:3211"        # Local
 *   npx convex env set AUTH_ISSUER_URL "https://<slug>.convex.site" --prod  # Production
 *
 * To find your production issuer URL:
 *   curl https://<your-deployment>.convex.site/.well-known/openid-configuration
 */
export default {
  providers: [
    {
      domain: process.env.AUTH_ISSUER_URL,
      applicationID: "convex",
    },
  ],
}
