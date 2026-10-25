export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type AuthRequirement = "public" | "user-cookie" | "admin-cookie";

export type ApiTag = "public" | "auth" | "user" | "admin" | "diagnostics";

export interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface EndpointResponse {
  status: number;
  description: string;
  schema?: string;
}

export interface ApiEndpoint {
  id: string;
  path: string;
  method: HttpMethod;
  tag: ApiTag;
  auth: AuthRequirement;
  sameOrigin: boolean;
  rateLimited: boolean;
  description: string;
  summary: string;
  queryParams?: EndpointParam[];
  requestHeaders?: Record<string, string>;
  requestBody?: {
    contentType: string;
    schema: string;
    example?: string;
  };
  responses: EndpointResponse[];
  curlTemplate: string;
}

export const API_REGISTRY: ApiEndpoint[] = [
  // 1. POST /api/auth/request-otp
  {
    id: "auth-request-otp",
    path: "/api/auth/request-otp",
    method: "POST",
    tag: "auth",
    auth: "public",
    sameOrigin: true,
    rateLimited: true,
    summary: "Request OTP Code",
    description: "Generates an OTP code for passwordless sign-in and dispatches it via Nodemailer SMTP. Rate limited to 3/email/15m and 10/IP/1h.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{ email: string }`,
      example: JSON.stringify({ email: "trader@example.com" }, null, 2),
    },
    responses: [
      { status: 200, description: "OTP sent successfully", schema: `{\n  "ok": true\n}` },
      { status: 400, description: "Invalid email format or body", schema: `{\n  "ok": false,\n  "error": "invalid_email"\n}` },
      { status: 429, description: "Too many OTP requests", schema: `{\n  "ok": false,\n  "error": "rate_limited",\n  "message": "Too many requests. Please try again later."\n}` },
      { status: 502, description: "Email delivery failure", schema: `{\n  "ok": false,\n  "error": "send_failed"\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/auth/request-otp \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -d '{"email":"trader@example.com"}'`,
  },

  // 2. POST /api/auth/verify-otp
  {
    id: "auth-verify-otp",
    path: "/api/auth/verify-otp",
    method: "POST",
    tag: "auth",
    auth: "public",
    sameOrigin: true,
    rateLimited: true,
    summary: "Verify OTP & Establish Session",
    description: "Validates the 6-digit OTP code against the salted hash. Upserts the User in MongoDB and returns an HTTP-only JWT session cookie (`fogm_session`).",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{ email: string, code: string }`,
      example: JSON.stringify({ email: "trader@example.com", code: "492014" }, null, 2),
    },
    responses: [
      { status: 200, description: "Session created successfully", schema: `{\n  "ok": true,\n  "profileComplete": false\n}` },
      { status: 400, description: "Invalid or expired code", schema: `{\n  "ok": false,\n  "error": "invalid_code"\n}` },
      { status: 429, description: "Too many verification attempts", schema: `{\n  "ok": false,\n  "error": "too_many_attempts"\n}` },
    ],
    curlTemplate: `curl -i -X POST http://localhost:3000/api/auth/verify-otp \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -d '{"email":"trader@example.com","code":"123456"}' \\
  -c cookie.txt`,
  },

  // 3. POST /api/auth/logout
  {
    id: "auth-logout",
    path: "/api/auth/logout",
    method: "POST",
    tag: "auth",
    auth: "public",
    sameOrigin: false,
    rateLimited: false,
    summary: "User Sign Out",
    description: "Invalidates the current user session by clearing the `fogm_session` HTTP-only cookie.",
    responses: [
      { status: 200, description: "Signed out", schema: `{\n  "ok": true\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/auth/logout \\
  -b cookie.txt`,
  },

  // 4. GET /api/me
  {
    id: "user-me-get",
    path: "/api/me",
    method: "GET",
    tag: "user",
    auth: "user-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Get Current Authenticated User",
    description: "Resolves the `fogm_session` cookie to return user profile data, privacy flags, and leaderboard standing. Automatically slides session expiration if token is > 24 hours old.",
    responses: [
      { status: 200, description: "Active session resolved", schema: `{\n  "user": {\n    "id": "67123...",\n    "email": "trader@example.com",\n    "name": "Alex Trader",\n    "avatarUrl": "https://...",\n    "profileComplete": true,\n    "showName": true,\n    "showPhoto": true,\n    "country": "US"\n  },\n  "entry": null\n}` },
      { status: 200, description: "No session or expired token", schema: `{\n  "user": null,\n  "entry": null\n}` },
    ],
    curlTemplate: `curl -X GET http://localhost:3000/api/me \\
  -b cookie.txt`,
  },

  // 5. PATCH /api/me
  {
    id: "user-me-patch",
    path: "/api/me",
    method: "PATCH",
    tag: "user",
    auth: "user-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Update User Profile",
    description: "Updates user display name, avatar URL, country, and privacy settings (`showName`, `showPhoto`). Marks `profileComplete: true` upon name submission.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{\n  name?: string;\n  avatarUrl?: string;\n  showName?: boolean;\n  showPhoto?: boolean;\n  country?: string;\n}`,
      example: JSON.stringify({ name: "Alex Trader", country: "US", showName: true, showPhoto: true }, null, 2),
    },
    responses: [
      { status: 200, description: "Profile updated", schema: `{\n  "ok": true\n}` },
      { status: 400, description: "Validation error or invalid avatar host", schema: `{\n  "ok": false,\n  "error": "invalid_avatar"\n}` },
      { status: 401, description: "Unauthorized / missing session", schema: `{\n  "ok": false,\n  "error": "unauthorized"\n}` },
    ],
    curlTemplate: `curl -X PATCH http://localhost:3000/api/me \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -b cookie.txt \\
  -d '{"name":"Alex Trader","country":"US","showName":true}'`,
  },

  // 6. POST /api/avatar/sign
  {
    id: "user-avatar-sign",
    path: "/api/avatar/sign",
    method: "POST",
    tag: "user",
    auth: "user-cookie",
    sameOrigin: true,
    rateLimited: true,
    summary: "Sign Cloudinary Avatar Upload",
    description: "Generates an HMAC-SHA1 signature allowing the authenticated user to upload an avatar directly to Cloudinary folder `fogm/avatars`. Rate limited to 20/user/1h.",
    responses: [
      { status: 200, description: "Upload signature generated", schema: `{\n  "uploadUrl": "https://api.cloudinary.com/v1_1/<cloud_name>/image/upload",\n  "apiKey": "123456789",\n  "timestamp": 1729864000,\n  "signature": "da39a3ee5e6b4b0d3255bfef95601890afd80709",\n  "folder": "fogm/avatars",\n  "publicId": "u_67123..."\n}` },
      { status: 401, description: "Unauthorized", schema: `{\n  "ok": false,\n  "error": "unauthorized"\n}` },
      { status: 429, description: "Rate limit exceeded", schema: `{\n  "ok": false,\n  "error": "rate_limited"\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/avatar/sign \\
  -H "Origin: http://localhost:3000" \\
  -b cookie.txt`,
  },

  // 7. GET /api/card/[userId]
  {
    id: "card-og-get",
    path: "/api/card/[userId]",
    method: "GET",
    tag: "public",
    auth: "public",
    sameOrigin: false,
    rateLimited: false,
    summary: "Generate Dynamic Social Rank Card",
    description: "Renders a high-resolution PNG image (OG banner 1200x630 or story 1080x1920) via Satori showcasing trader rank, returns, and contest badge.",
    queryParams: [
      { name: "userId", type: "string", required: true, description: "MongoDB User ID or 'preview'" },
      { name: "format", type: "string", required: false, description: "'og' (1200x630) or 'story' (1080x1920)" },
    ],
    responses: [
      { status: 200, description: "PNG image binary stream", schema: `Content-Type: image/png` },
      { status: 404, description: "User not found or disabled", schema: `{\n  "error": "Not found"\n}` },
    ],
    curlTemplate: `curl -X GET "http://localhost:3000/api/card/preview?format=og" \\
  -o rank-card.png`,
  },

  // 8. POST /api/admin/login
  {
    id: "admin-login",
    path: "/api/admin/login",
    method: "POST",
    tag: "admin",
    auth: "public",
    sameOrigin: true,
    rateLimited: true,
    summary: "Administrator Sign In",
    description: "Authenticates against server environment credentials (`ADMIN_EMAIL` and `ADMIN_PASSWORD`). Issues strict encrypted JWT in `fogm_admin` cookie.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{ email: string, password: string }`,
      example: JSON.stringify({ email: "admin@domain.com", password: "your-password" }, null, 2),
    },
    responses: [
      { status: 200, description: "Authenticated successfully", schema: `{\n  "ok": true\n}` },
      { status: 401, description: "Invalid credentials", schema: `{\n  "ok": false,\n  "error": "invalid_credentials"\n}` },
      { status: 429, description: "Rate limited (5/15m)", schema: `{\n  "ok": false,\n  "error": "rate_limited",\n  "message": "Too many attempts."\n}` },
    ],
    curlTemplate: `curl -i -X POST http://localhost:3000/api/admin/login \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -d '{"email":"admin@domain.com","password":"your-admin-password"}' \\
  -c admin_cookie.txt`,
  },

  // 9. POST /api/admin/logout
  {
    id: "admin-logout",
    path: "/api/admin/logout",
    method: "POST",
    tag: "admin",
    auth: "public",
    sameOrigin: false,
    rateLimited: false,
    summary: "Administrator Sign Out",
    description: "Clears the `fogm_admin` cookie.",
    responses: [
      { status: 200, description: "Admin logged out", schema: `{\n  "ok": true\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/admin/logout \\
  -b admin_cookie.txt`,
  },

  // 10. GET /api/admin/stats
  {
    id: "admin-stats",
    path: "/api/admin/stats",
    method: "GET",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Admin Overview Metrics & Timeline",
    description: "Aggregates total user count, 7-day signups, active users, 30-day zero-filled signup trajectory, and top countries with participant distribution.",
    responses: [
      { status: 200, description: "Stats aggregated", schema: `{\n  "totalUsers": 1284,\n  "newIn7d": 142,\n  "activeIn7d": 892,\n  "profileComplete": 1002,\n  "profileCompletePct": 78,\n  "signupsByDay": [{ "_id": "2026-10-01", "count": 12 }, ...],\n  "topCountries": [{ "_id": "US", "count": 420 }, ...]\n}` },
      { status: 401, description: "Unauthorized admin", schema: `{\n  "error": "unauthorized"\n}` },
    ],
    curlTemplate: `curl -X GET http://localhost:3000/api/admin/stats \\
  -b admin_cookie.txt`,
  },

  // 11. GET /api/admin/users
  {
    id: "admin-users-get",
    path: "/api/admin/users",
    method: "GET",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Paginated Users & Filters",
    description: "Returns paginated user list with full search, status, profileComplete, and country filters. Supports safe sort field whitelisting.",
    queryParams: [
      { name: "page", type: "number", required: false, description: "Page number (default 1)" },
      { name: "pageSize", type: "number", required: false, description: "Items per page (default 25, max 100)" },
      { name: "search", type: "string", required: false, description: "Search by name or email" },
      { name: "status", type: "string", required: false, description: "'active' | 'disabled'" },
      { name: "country", type: "string", required: false, description: "2-letter ISO country code" },
      { name: "sortField", type: "string", required: false, description: "'createdAt' | 'name' | 'email' | 'loginCount'" },
      { name: "sortDir", type: "string", required: false, description: "'asc' | 'desc'" },
    ],
    responses: [
      { status: 200, description: "Users list", schema: `{\n  "total": 1284,\n  "page": 1,\n  "pageSize": 25,\n  "users": [...]\n}` },
      { status: 401, description: "Unauthorized", schema: `{\n  "error": "unauthorized"\n}` },
    ],
    curlTemplate: `curl -X GET "http://localhost:3000/api/admin/users?page=1&pageSize=25&status=active" \\
  -b admin_cookie.txt`,
  },

  // 12. PATCH /api/admin/users
  {
    id: "admin-users-patch",
    path: "/api/admin/users",
    method: "PATCH",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Modify User Account",
    description: "Updates user account details, changes status (`active`/`disabled`), or triggers `forceSignOut: true` to invalidate sessions immediately. Logs audit entry.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{\n  userId: string;\n  name?: string;\n  country?: string;\n  showName?: boolean;\n  showPhoto?: boolean;\n  status?: "active" | "disabled";\n  forceSignOut?: boolean;\n}`,
      example: JSON.stringify({ userId: "67123...", status: "disabled", forceSignOut: true }, null, 2),
    },
    responses: [
      { status: 200, description: "User modified", schema: `{\n  "ok": true\n}` },
      { status: 404, description: "User not found", schema: `{\n  "error": "User not found"\n}` },
    ],
    curlTemplate: `curl -X PATCH http://localhost:3000/api/admin/users \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt \\
  -d '{"userId":"<user_id>","status":"disabled","forceSignOut":true}'`,
  },

  // 13. DELETE /api/admin/users
  {
    id: "admin-users-delete",
    path: "/api/admin/users",
    method: "DELETE",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Delete User Account",
    description: "Permanently deletes a registered user account and associated credentials from MongoDB. Logs audit trail.",
    queryParams: [
      { name: "userId", type: "string", required: true, description: "Target user ID" },
    ],
    responses: [
      { status: 200, description: "User deleted", schema: `{\n  "ok": true\n}` },
      { status: 404, description: "User not found", schema: `{\n  "error": "User not found"\n}` },
    ],
    curlTemplate: `curl -X DELETE "http://localhost:3000/api/admin/users?userId=<user_id>" \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt`,
  },

  // 14. POST /api/admin/users/bulk
  {
    id: "admin-users-bulk",
    path: "/api/admin/users/bulk",
    method: "POST",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Bulk User Operations",
    description: "Performs batch status changes or session invalidation for multiple selected user IDs in a single operation.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{\n  userIds: string[];\n  action: "enable" | "disable" | "force_sign_out";\n}`,
      example: JSON.stringify({ userIds: ["671...", "672..."], action: "disable" }, null, 2),
    },
    responses: [
      { status: 200, description: "Bulk action complete", schema: `{\n  "ok": true,\n  "count": 2\n}` },
      { status: 400, description: "Invalid action or empty userIds", schema: `{\n  "error": "Invalid action"\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/admin/users/bulk \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt \\
  -d '{"userIds":["<id1>","<id2>"],"action":"force_sign_out"}'`,
  },

  // 15. GET /api/admin/users/export
  {
    id: "admin-users-export",
    path: "/api/admin/users/export",
    method: "GET",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Export Users to CSV",
    description: "Streams CSV file containing filtered user records. Sanitizes all cells against CSV formula injection (`= + - @`).",
    queryParams: [
      { name: "search", type: "string", required: false, description: "Search query" },
      { name: "status", type: "string", required: false, description: "Status filter" },
    ],
    responses: [
      { status: 200, description: "CSV stream", schema: `Content-Type: text/csv` },
    ],
    curlTemplate: `curl -X GET "http://localhost:3000/api/admin/users/export?status=active" \\
  -b admin_cookie.txt \\
  -o users-export.csv`,
  },

  // 16. GET /api/admin/traders
  {
    id: "admin-traders-get",
    path: "/api/admin/traders",
    method: "GET",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "List Leaderboard Traders",
    description: "Returns paginated trader ranking data for period ('today', 'week', 'overall') with search, sorting, and performance stats.",
    queryParams: [
      { name: "period", type: "string", required: false, description: "'today' | 'week' | 'overall'" },
      { name: "page", type: "number", required: false, description: "Page number" },
      { name: "pageSize", type: "number", required: false, description: "Page size" },
      { name: "search", type: "string", required: false, description: "Filter by trader name or city" },
    ],
    responses: [
      { status: 200, description: "Traders list", schema: `{\n  "total": 50,\n  "page": 1,\n  "pageSize": 25,\n  "traders": [...]\n}` },
    ],
    curlTemplate: `curl -X GET "http://localhost:3000/api/admin/traders?period=overall&page=1" \\
  -b admin_cookie.txt`,
  },

  // 17. POST /api/admin/traders
  {
    id: "admin-traders-post",
    path: "/api/admin/traders",
    method: "POST",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Create Leaderboard Trader",
    description: "Adds a new trader directly to the contest standings database. Logs an audit entry.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{\n  name: string;\n  countryCode: string;\n  city: string;\n  netProfit: number;\n  returnPct: number;\n  winRatePct: number;\n  maxDrawdownPct: number;\n  tradesCount: number;\n  volumeLots: number;\n  topInstrument: string;\n}`,
      example: JSON.stringify({ name: "Elena Rostova", countryCode: "CZ", city: "Prague", netProfit: 14250, returnPct: 42.5, winRatePct: 68.2, maxDrawdownPct: 4.1, tradesCount: 120, volumeLots: 450, topInstrument: "EURUSD" }, null, 2),
    },
    responses: [
      { status: 200, description: "Trader created", schema: `{\n  "ok": true,\n  "id": "67123..."\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/admin/traders \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt \\
  -d '{"name":"Elena Rostova","countryCode":"CZ","city":"Prague","netProfit":14250,"returnPct":42.5,"winRatePct":68.2,"maxDrawdownPct":4.1,"tradesCount":120,"volumeLots":450,"topInstrument":"EURUSD"}'`,
  },

  // 18. PATCH /api/admin/traders
  {
    id: "admin-traders-patch",
    path: "/api/admin/traders",
    method: "PATCH",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Update Leaderboard Trader",
    description: "Updates trader metrics, city, country, or top instrument. Logs audit trail.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{ id: string, ...partialTraderFields }`,
      example: JSON.stringify({ id: "67123...", netProfit: 16800, returnPct: 48.2 }, null, 2),
    },
    responses: [
      { status: 200, description: "Trader updated", schema: `{\n  "ok": true\n}` },
      { status: 404, description: "Trader not found", schema: `{\n  "error": "Trader not found"\n}` },
    ],
    curlTemplate: `curl -X PATCH http://localhost:3000/api/admin/traders \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt \\
  -d '{"id":"<trader_id>","netProfit":16800}'`,
  },

  // 19. DELETE /api/admin/traders
  {
    id: "admin-traders-delete",
    path: "/api/admin/traders",
    method: "DELETE",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Delete Leaderboard Trader",
    description: "Removes trader from contest standings collection. Logs audit entry.",
    queryParams: [
      { name: "id", type: "string", required: true, description: "Trader ID" },
    ],
    responses: [
      { status: 200, description: "Trader removed", schema: `{\n  "ok": true\n}` },
      { status: 404, description: "Not found", schema: `{\n  "error": "Trader not found"\n}` },
    ],
    curlTemplate: `curl -X DELETE "http://localhost:3000/api/admin/traders?id=<trader_id>" \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt`,
  },

  // 20. POST /api/admin/traders/import
  {
    id: "admin-traders-import",
    path: "/api/admin/traders/import",
    method: "POST",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Bulk Import Traders (JSON)",
    description: "Imports array of trader records in either 'append' or 'replace' mode. Automatically re-ranks and logs audit event.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `{\n  period?: "today" | "week" | "overall";\n  mode: "append" | "replace";\n  traders: TraderRecord[];\n}`,
      example: JSON.stringify({ mode: "append", traders: [{ name: "Marcus V.", countryCode: "DE", city: "Berlin", netProfit: 11200, returnPct: 35.1, winRatePct: 62.4, maxDrawdownPct: 5.2, tradesCount: 80, volumeLots: 220, topInstrument: "XAUUSD" }] }, null, 2),
    },
    responses: [
      { status: 200, description: "Records imported", schema: `{\n  "ok": true,\n  "imported": 1\n}` },
      { status: 400, description: "Invalid format", schema: `{\n  "error": "Import data must be a JSON array"\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/admin/traders/import \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt \\
  -d '{"mode":"append","traders":[{"name":"Marcus V.","countryCode":"DE","city":"Berlin","netProfit":11200,"returnPct":35.1,"winRatePct":62.4,"maxDrawdownPct":5.2,"tradesCount":80,"volumeLots":220,"topInstrument":"XAUUSD"}]}'`,
  },

  // 21. GET /api/admin/settings
  {
    id: "admin-settings-get",
    path: "/api/admin/settings",
    method: "GET",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Fetch Complete Site Configuration",
    description: "Returns the current `SiteSettingsData` document including brand, theme, contest rules, prizes, steps, and maintenance status.",
    responses: [
      { status: 200, description: "Site settings document", schema: `Full SiteSettingsData JSON` },
    ],
    curlTemplate: `curl -X GET http://localhost:3000/api/admin/settings \\
  -b admin_cookie.txt`,
  },

  // 22. PATCH /api/admin/settings
  {
    id: "admin-settings-patch",
    path: "/api/admin/settings",
    method: "PATCH",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Update Site Settings & CMS",
    description: "Persists changes to brand, theme, contest timeline, copy, steps, rules, or prizes. Invalidate Next.js cache and logs audit diff.",
    requestHeaders: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000",
    },
    requestBody: {
      contentType: "application/json",
      schema: `Partial<SiteSettingsData>`,
      example: JSON.stringify({ contest: { prizeFund: 75000, status: "active" } }, null, 2),
    },
    responses: [
      { status: 200, description: "Settings saved", schema: `{\n  "ok": true,\n  "settings": {...}\n}` },
    ],
    curlTemplate: `curl -X PATCH http://localhost:3000/api/admin/settings \\
  -H "Content-Type: application/json" \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt \\
  -d '{"contest":{"prizeFund":75000}}'`,
  },

  // 23. POST /api/admin/settings/revalidate
  {
    id: "admin-settings-revalidate",
    path: "/api/admin/settings/revalidate",
    method: "POST",
    tag: "diagnostics",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Revalidate Site Cache Tag",
    description: "Executes `revalidateTag('settings')` to immediately purge stale cached layout and site settings across all server nodes.",
    responses: [
      { status: 200, description: "Cache purged", schema: `{\n  "ok": true,\n  "revalidated": true\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/admin/settings/revalidate \\
  -b admin_cookie.txt`,
  },

  // 24. POST /api/admin/test-email
  {
    id: "admin-test-email",
    path: "/api/admin/test-email",
    method: "POST",
    tag: "diagnostics",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Send Diagnostic Email",
    description: "Dispatches a verification test email via Nodemailer SMTP strictly to the server configured `ADMIN_EMAIL` address.",
    responses: [
      { status: 200, description: "Test email dispatched", schema: `{\n  "ok": true,\n  "message": "Test email sent to admin address"\n}` },
      { status: 500, description: "SMTP configuration or network failure", schema: `{\n  "ok": false,\n  "message": "SMTP connection failed"\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/admin/test-email \\
  -b admin_cookie.txt`,
  },

  // 25. POST /api/admin/upload/sign
  {
    id: "admin-upload-sign",
    path: "/api/admin/upload/sign",
    method: "POST",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: true,
    rateLimited: false,
    summary: "Sign Brand Asset Upload",
    description: "Generates an HMAC-SHA1 signature via Cloudinary SDK for uploading official brand assets (logo, og-image, favicon) to folder `fogm/brand` with overwrite permission.",
    responses: [
      { status: 200, description: "Upload signature generated", schema: `{\n  "uploadUrl": "https://api.cloudinary.com/v1_1/<cloud_name>/image/upload",\n  "apiKey": "123456789",\n  "timestamp": 1729864000,\n  "signature": "3c9909afec25354d551dae21590bb26e38d53f21",\n  "folder": "fogm/brand",\n  "publicId": "logo-light",\n  "overwrite": "true",\n  "invalidate": "true"\n}` },
    ],
    curlTemplate: `curl -X POST http://localhost:3000/api/admin/upload/sign \\
  -H "Origin: http://localhost:3000" \\
  -b admin_cookie.txt`,
  },

  // 26. GET /api/admin/audit
  {
    id: "admin-audit-get",
    path: "/api/admin/audit",
    method: "GET",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Query Audit Log Entries",
    description: "Queries paginated administrative event entries with action filtering and ISO date range boundary search. Audit logs retained for 180 days.",
    queryParams: [
      { name: "action", type: "string", required: false, description: "Action name (e.g. 'update_settings', 'delete_user')" },
      { name: "from", type: "string", required: false, description: "ISO start timestamp" },
      { name: "to", type: "string", required: false, description: "ISO end timestamp" },
      { name: "page", type: "number", required: false, description: "Page number" },
      { name: "pageSize", type: "number", required: false, description: "Page size (default 25)" },
    ],
    responses: [
      { status: 200, description: "Audit records", schema: `{\n  "total": 45,\n  "page": 1,\n  "pageSize": 25,\n  "entries": [{\n    "id": "67123...",\n    "actor": "admin",\n    "action": "update_settings",\n    "target": "settings",\n    "before": {...},\n    "after": {...},\n    "ip": "127.0.0.1",\n    "createdAt": "2026-10-25T16:00:00Z"\n  }]\n}` },
    ],
    curlTemplate: `curl -X GET "http://localhost:3000/api/admin/audit?action=update_settings&page=1" \\
  -b admin_cookie.txt`,
  },

  // 27. GET /api/admin/audit/export
  {
    id: "admin-audit-export",
    path: "/api/admin/audit/export",
    method: "GET",
    tag: "admin",
    auth: "admin-cookie",
    sameOrigin: false,
    rateLimited: false,
    summary: "Export Audit Log to CSV",
    description: "Streams CSV export of administrative audit trail with formula injection protection.",
    queryParams: [
      { name: "action", type: "string", required: false, description: "Action filter" },
      { name: "from", type: "string", required: false, description: "Start date" },
      { name: "to", type: "string", required: false, description: "End date" },
    ],
    responses: [
      { status: 200, description: "CSV Stream", schema: `Content-Type: text/csv` },
    ],
    curlTemplate: `curl -X GET "http://localhost:3000/api/admin/audit/export?action=update_settings" \\
  -b admin_cookie.txt \\
  -o audit-export.csv`,
  },
];
