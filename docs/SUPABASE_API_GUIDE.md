# Supabase API Guide — Complete API Control

> **Zero Prisma. Zero direct DB connections. Zero Dashboard clicks.**
> Har cheez Management API + Service API se hogi. Sirf curl tokens + API calls.

---

## 📌 Architecture Overview

Supabase ke 3 API layers hain jo **milkar sab kuch kar sakti hain**:

| Layer | Token | Base URL |
|-------|-------|----------|
| **Management API** | `sbp_...` (PAT) | `https://api.supabase.com/v1` |
| **Service API** | `service_role` / `sb_secret_...` | `https://{ref}.supabase.co` |
| **GoTrue Auth API** | `anon` ya `service_role` | `https://{ref}.supabase.co/auth/v1` |

**Flow:**
1. `sbp_` token lo → project banao
2. `sbp_` se keys nikalo (anon + service_role)
3. Service API se Storage, Auth Admin, Data API
4. SQL via Management API (sbp_ se hi)

---

## 1. TOKEN LENA (PAT)

```
Dashboard → https://supabase.com/dashboard/account/tokens → Generate New Token
```

```env
SUPABASE_MGMT_TOKEN=sbp_xxxxxxxxxxxxxxxxxxxx
```

---

## 2. ORGANIZATION SLUG

```bash
curl -s "https://api.supabase.com/v1/organizations" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

Response mein `slug` liya → aage sab mein use hoga.

---

## 3. PROJECT CRUD (Management API)

### Create Project
```bash
curl -X POST "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My App",
    "organization_slug": "your-org-slug",
    "db_pass": "StrongPass@123",
    "region_selection": {"type": "smartGroup", "code": "apac"}
  }'
```
**Response:** `{ "ref": "rjxzjdfflupgbjerpevj", ... }` → `ref` save karo.

**Region codes:** `americas`, `emea`, `apac`

### List All Projects
```bash
curl -s "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Get Single Project
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Update Project (Name)
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name"}'
```

### Delete Project
```bash
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Health Check
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/health" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 4. API KEYS NIKALNA (sbp_ se)

```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/api-keys?reveal=true" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

**Response:**
```json
[
  {"name": "anon", "api_key": "eyJ..."},
  {"name": "service_role", "api_key": "eyJ..."}
]
```

```env
SUPABASE_URL=https://{ref}.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

### Manage API Keys (Publishable/Secret)
```bash
# Create new key
curl -X POST "https://api.supabase.com/v1/projects/{ref}/api-keys" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "ci-cd-key", "type": "secret"}'

# List keys (without revealing)
curl -s "https://api.supabase.com/v1/projects/{ref}/api-keys" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Get single key
curl -s "https://api.supabase.com/v1/projects/{ref}/api-keys/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update key
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/api-keys/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "new-name"}'

# Delete key
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/api-keys/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Legacy anon/service_role keys toggle
curl -s "https://api.supabase.com/v1/projects/{ref}/api-keys/legacy" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

curl -X PUT "https://api.supabase.com/v1/projects/{ref}/api-keys/legacy" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 5. SECRETS MANAGEMENT (Management API)

```bash
# List secrets
curl -s "https://api.supabase.com/v1/projects/{ref}/secrets" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Bulk create/update secrets
curl -X POST "https://api.supabase.com/v1/projects/{ref}/secrets" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name": "STRIPE_KEY", "value": "sk_live_xxx"}, {"name": "OPENAI_KEY", "value": "sk-xxx"}]'

# Bulk delete secrets
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/secrets" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '["STRIPE_KEY", "OPENAI_KEY"]'
```

---

## 6. DATABASE — Full Control via SQL

### Execute Query (SELECT, INSERT, UPDATE, DELETE, DDL — sab)
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT table_name FROM information_schema.tables WHERE table_schema='\''public'\'';"}'
```

### Read-Only Query (safe)
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query/read-only" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users LIMIT 10;"}'
```

### Run Full Schema File
```bash
SCHEMA_SQL=$(cat schema.sql)
SCHEMA_JSON=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SCHEMA_SQL")
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$SCHEMA_JSON"
```

### Run Migration (tracked)
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/migrations" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS todos (id bigint primary key, title text);"}'

# List migrations
curl -s "https://api.supabase.com/v1/projects/{ref}/database/migrations" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update/Patch migration
curl -X PUT "https://api.supabase.com/v1/projects/{ref}/database/migrations/{version}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"statements": ["..."], "version": "123"}'
```

### Database Password Reset
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/password" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "NewStrongPass@456"}'
```

### Generate TypeScript Types
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/database/types/typescript" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### PostgREST OpenAPI Spec
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/database/openapi" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Database Config
```bash
# Get Postgres config
curl -s "https://api.supabase.com/v1/projects/{ref}/config/database/postgres" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update Postgres config
curl -X PUT "https://api.supabase.com/v1/projects/{ref}/config/database/postgres" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"statement_timeout": 30000, "max_connections": 50}'

# PgBouncer config
curl -s "https://api.supabase.com/v1/projects/{ref}/config/database/pgbouncer" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Pooler (Supavisor) config
curl -s "https://api.supabase.com/v1/projects/{ref}/config/database/pooler" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/config/database/pooler" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pool_mode": "transaction", "default_pool_size": 10}'

# Disk config
curl -s "https://api.supabase.com/v1/projects/{ref}/config/disk" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

curl -X POST "https://api.supabase.com/v1/projects/{ref}/config/disk" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storage_type": "gp3", "iops": 3000}'

# Disk autoscale
curl -s "https://api.supabase.com/v1/projects/{ref}/config/disk/autoscale" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Database Context Info
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/database/context" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Backups
```bash
# List backups
curl -s "https://api.supabase.com/v1/projects/{ref}/database/backups" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Get backup schedule
curl -s "https://api.supabase.com/v1/projects/{ref}/database/backups/schedule" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update backup schedule
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/database/backups/schedule" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"schedule": "0 0 * * *"}'

# Create restore point
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/backups/restore-point" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "before-migration"}'

# PITR restore
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/backups/restore-pitr" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recovery_time_target": "2024-01-01T12:00:00Z"}'
```

---

## 7. RLS POLICIES — via SQL (Management API)

> RLS policies sirf SQL se banti hain. Management API ka `database/query` use karo.

### Enable RLS on Table
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "ALTER TABLE users ENABLE ROW LEVEL SECURITY;"}'
```

### Create Policy
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"CREATE POLICY \\\"Users can view own data\\\" ON users FOR SELECT USING (auth.uid() = id);\"}"
```

### List All Policies
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies ORDER BY tablename, policyname;"}'
```

### Drop Policy
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "DROP POLICY IF EXISTS \"Users can view own data\" ON users;"}'
```

### Common Policy Examples (batch)
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat << 'EOSQL'
-- Users table policies
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public access (e.g. for a products table)
CREATE POLICY "Products are public"
  ON products FOR SELECT
  USING (true);

-- Admin-only write
CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'super_admin');
EOSQL
)\"}"
```

---

## 8. DATABASE WEBHOOKS (Management API)

### Enable Database Webhooks
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/webhooks/enable" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

> **Note:** Webhook configurations themselves are created via SQL (the `supabase_functions` schema or `hooks` table). After enabling, you create webhook triggers:

```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"SELECT supabase_functions.http_request('https://your-webhook.url', 'POST', '{\\\"event\\\": \\\"insert\\\"}');\"}"
```

---

## 9. AUTH CONFIG — Full Control (Management API)

### Get Auth Config
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Update Auth Config
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/config/auth" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SITE_URL": "https://myapp.com",
    "JWT_EXP": 3600,
    "DISABLE_SIGNUP": false,
    "MAILER_AUTOCONFIRM": true,
    "SMS_AUTOCONFIRM": true,
    "EXTERNAL_EMAIL_ENABLED": true,
    "EXTERNAL_GOOGLE_ENABLED": true,
    "EXTERNAL_GOOGLE_CLIENT_ID": "xxx.apps.googleusercontent.com",
    "EXTERNAL_GOOGLE_SECRET": "GOCSPX-xxx"
  }'
```

### SSO / SAML Providers
```bash
# List SSO providers
curl -s "https://api.supabase.com/v1/projects/{ref}/config/auth/sso/providers" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Create SSO provider
curl -X POST "https://api.supabase.com/v1/projects/{ref}/config/auth/sso/providers" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "saml",
    "metadata_url": "https://idp.example.com/metadata.xml",
    "domains": ["company.com"],
    "attribute_mapping": {"email": "email", "name": "name"}
  }'

# Get SSO provider
curl -s "https://api.supabase.com/v1/projects/{ref}/config/auth/sso/providers/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update SSO provider
curl -X PUT "https://api.supabase.com/v1/projects/{ref}/config/auth/sso/providers/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domains": ["newcompany.com"]}'

# Delete SSO provider
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/config/auth/sso/providers/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Third-Party Auth Integrations
```bash
# List TPA
curl -s "https://api.supabase.com/v1/projects/{ref}/config/auth/third-party-auth" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Create TPA
curl -X POST "https://api.supabase.com/v1/projects/{ref}/config/auth/third-party-auth" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "auth0", "enabled": true}'

# Get TPA
curl -s "https://api.supabase.com/v1/projects/{ref}/config/auth/third-party-auth/{tpa_id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Delete TPA
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/config/auth/third-party-auth/{tpa_id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Signing Keys (JWT)
```bash
# List signing keys
curl -s "https://api.supabase.com/v1/projects/{ref}/config/auth/signing-keys" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Create signing key
curl -X POST "https://api.supabase.com/v1/projects/{ref}/config/auth/signing-keys" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-key"}'

# Get signing key
curl -s "https://api.supabase.com/v1/projects/{ref}/config/auth/signing-keys/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update signing key
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/config/auth/signing-keys/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "updated-key"}'

# Delete signing key
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/config/auth/signing-keys/{id}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Legacy signing key
curl -s "https://api.supabase.com/v1/projects/{ref}/config/auth/signing-keys/legacy" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Import custom JWT secret
curl -X POST "https://api.supabase.com/v1/projects/{ref}/config/auth/signing-keys/legacy" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jwt_secret": "your-custom-hmac-secret-here"}'
```

---

## 10. AUTH ADMIN — User Management (Service API)

> `service_role` key chahiye. Both `Authorization` and `apikey` headers required.

```bash
AUTH_H="Authorization: Bearer $SUPABASE_SERVICE_KEY"
AUTH_H="$AUTH_H -H \"apikey: $SUPABASE_ANON_KEY\""
```

### Create User (auto-confirmed)
```bash
curl -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@email.com",
    "password": "Pass@123",
    "email_confirm": true,
    "user_metadata": {"full_name": "User Name", "role": "super_admin"}
  }'
```

### List All Users
```bash
curl -s "$SUPABASE_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

### Get Single User
```bash
curl -s "$SUPABASE_URL/auth/v1/admin/user/{user_id}" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

### Update User
```bash
curl -X PUT "$SUPABASE_URL/auth/v1/admin/user/{user_id}" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new@email.com",
    "user_metadata": {"role": "admin"},
    "app_metadata": {"plan": "pro"}
  }'
```

### Delete User
```bash
curl -X DELETE "$SUPABASE_URL/auth/v1/admin/user/{user_id}" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

### Generate Magic Link / Recovery Link
```bash
curl -X POST "$SUPABASE_URL/auth/v1/admin/generate_link" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "magiclink",
    "email": "user@email.com",
    "redirect_to": "https://myapp.com/welcome"
  }'
```

### Audit Logs
```bash
curl -s "$SUPABASE_URL/auth/v1/admin/audit" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

---

## 11. AUTH — User-Facing Endpoints (GoTrue API)

> `anon` key use karo public endpoints ke liye. User JWT chahiye protected endpoints ke liye.

### Sign Up
```bash
curl -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@email.com", "password": "Pass@123"}'
```

### Sign In (Password)
```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@email.com", "password": "Pass@123"}'
```

### Sign In (Magic Link)
```bash
curl -X POST "$SUPABASE_URL/auth/v1/magiclink" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@email.com"}'
```

### Sign In (OTP)
```bash
curl -X POST "$SUPABASE_URL/auth/v1/otp" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@email.com"}'
```

### Sign In (OAuth redirect)
```
https://{ref}.supabase.co/auth/v1/authorize?provider=google&redirect_to=https://myapp.com/callback
```

### Refresh Token
```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=refresh_token" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "..."}'
```

### Sign Out
```bash
curl -X POST "$SUPABASE_URL/auth/v1/logout" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"
```

### Get Current User
```bash
curl -s "$SUPABASE_URL/auth/v1/user" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"
```

### Update Current User
```bash
curl -X PUT "$SUPABASE_URL/auth/v1/user" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"email": "new@email.com", "data": {"full_name": "New Name"}}'
```

### Invite User
```bash
curl -X POST "$SUPABASE_URL/auth/v1/invite" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "new@email.com"}'
```

### MFA (Multi-Factor Auth)
```bash
# Enroll factor
curl -X POST "$SUPABASE_URL/auth/v1/factors" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"friendly_name": "My TOTP", "factor_type": "totp", "issuer": "myapp"}'

# Challenge factor
curl -X POST "$SUPABASE_URL/auth/v1/factors/{id}/challenge" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"

# Verify factor
curl -X POST "$SUPABASE_URL/auth/v1/factors/{id}/verify" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'

# Delete factor
curl -X DELETE "$SUPABASE_URL/auth/v1/factors/{id}" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"
```

### Reauthenticate
```bash
curl -X POST "$SUPABASE_URL/auth/v1/reauthenticate" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $USER_JWT"
```

### Auth Settings (Public Config)
```bash
curl -s "$SUPABASE_URL/auth/v1/settings" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

### Auth Health
```bash
curl -s "$SUPABASE_URL/auth/v1/health"
```

---

## 12. STORAGE — Buckets + Objects (Service API)

### Bucket Management

```bash
# List buckets
curl -s "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Get bucket details
curl -s "$SUPABASE_URL/storage/v1/bucket/my-bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Create bucket
curl -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-bucket",
    "public": true,
    "file_size_limit": 5242880,
    "allowed_mime_types": ["image/jpeg", "image/png", "application/pdf"]
  }'

# Update bucket (make private, change limits)
curl -X PUT "$SUPABASE_URL/storage/v1/bucket/my-bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "public": false,
    "file_size_limit": 10485760,
    "allowed_mime_types": ["image/*"]
  }'

# Empty bucket (delete all objects)
curl -X POST "$SUPABASE_URL/storage/v1/bucket/my-bucket/empty" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Delete bucket
curl -X DELETE "$SUPABASE_URL/storage/v1/bucket/my-bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

### Object Management

```bash
# Upload file
curl -X POST "$SUPABASE_URL/storage/v1/object/my-bucket/path/to/file.jpg" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: image/jpeg" \
  -H "x-upsert: true" \
  --data-binary @file.jpg

# List objects
curl -X POST "$SUPABASE_URL/storage/v1/object/list/my-bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prefix": "path/to/",
    "limit": 100,
    "offset": 0,
    "sortBy": {"column": "name", "order": "asc"}
  }'

# Download file
curl -s "$SUPABASE_URL/storage/v1/object/my-bucket/path/to/file.jpg" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -o file.jpg

# Update file
curl -X PUT "$SUPABASE_URL/storage/v1/object/my-bucket/path/to/file.jpg" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: image/jpeg" \
  --data-binary @file.jpg

# Delete file
curl -X DELETE "$SUPABASE_URL/storage/v1/object/my-bucket/path/to/file.jpg" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Copy object
curl -X POST "$SUPABASE_URL/storage/v1/object/copy" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "bucketId": "my-bucket",
    "sourceKey": "path/to/file.jpg",
    "destinationBucket": "other-bucket",
    "destinationKey": "new/path/file.jpg"
  }'

# Move object
curl -X POST "$SUPABASE_URL/storage/v1/object/move" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "bucketId": "my-bucket",
    "sourceKey": "old/path/file.jpg",
    "destinationBucket": "my-bucket",
    "destinationKey": "new/path/file.jpg"
  }'

# Get file info
curl -s "$SUPABASE_URL/storage/v1/object/info/my-bucket/path/to/file.jpg" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

# Create upload signature (TUS)
curl -X POST "$SUPABASE_URL/storage/v1/object/upload/sign" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"bucketId": "my-bucket", "objectName": "large-file.zip"}'
```

### Public Objects (no auth required)
```bash
# Public upload
curl -X POST "$SUPABASE_URL/storage/v1/object/public/my-bucket/file.jpg" \
  -H "Content-Type: image/jpeg" \
  --data-binary @file.jpg

# Public download
curl -s "$SUPABASE_URL/storage/v1/object/public/my-bucket/file.jpg" -o file.jpg
```

### Image/Video Transformation
```bash
# Render transformed image
curl -s -X POST "$SUPABASE_URL/storage/v1/render/image/my-bucket/photo.jpg?width=200&height=200&resize=cover" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" -o thumb.jpg

# Video thumbnail
curl -s -X POST "$SUPABASE_URL/storage/v1/render/video/my-bucket/video.mp4" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" -o thumbnail.jpg
```

### Storage Config
```bash
# Get storage config
curl -s "https://api.supabase.com/v1/projects/{ref}/config/storage" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update storage config
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/config/storage" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"s3_credentials_endpoint": "https://...", "image_transformation_enabled": true}'

# List storage buckets (via Management API)
curl -s "https://api.supabase.com/v1/projects/{ref}/storage/buckets" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 13. STORAGE RLS POLICIES — via SQL (Management API)

> Storage policies bhi SQL se define hoti hain. You can create RLS policies for the `storage.objects` table:

```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$(cat << 'EOSQL'
-- Allow authenticated users to read objects in 'my-bucket'
CREATE POLICY "Allow authenticated read"
  ON storage.objects FOR SELECT
  USING (auth.role() = 'authenticated' AND bucket_id = 'my-bucket');

-- Allow users to upload to their own folder
CREATE POLICY "Allow own upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'my-bucket' AND auth.uid() = owner);

-- Allow users to update their own files
CREATE POLICY "Allow own update"
  ON storage.objects FOR UPDATE
  USING (auth.uid() = owner)
  WITH CHECK (auth.uid() = owner);

-- Allow public read on 'public-bucket'
CREATE POLICY "Public bucket read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'public-bucket' AND auth.role() = 'anon');

-- Deny delete unless admin
CREATE POLICY "Admin delete only"
  ON storage.objects FOR DELETE
  USING (auth.jwt() ->> 'role' = 'super_admin' AND bucket_id = 'my-bucket');
EOSQL
)\"}"
```

> **Important:** Pehle `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;` ensure karo.

---

## 14. EDGE FUNCTIONS (Management API)

### List Functions
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/functions" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Create Function
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/functions" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "hello-world",
    "name": "Hello World",
    "body": "import { serve } from \"https://deno.land/std@0.177.0/http/server.ts\"\n\nserve((req) => {\n  return new Response(JSON.stringify({message: \"Hello!\"}), {\n    headers: {\"Content-Type\": \"application/json\"}\n  });\n})",
    "verify_jwt": true
  }'
```

### Deploy Function (Multipart)
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/functions/deploy" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "metadata={\"slug\":\"my-function\",\"name\":\"My Function\",\"entrypoint_path\":\"index.ts\",\"import_map_path\":\"deno.json\",\"verify_jwt\":true};type=application/json" \
  -F "index.ts=@./functions/index.ts;type=application/typescript" \
  -F "deno.json=@./functions/deno.json;type=application/json"
```

### Get Function Details
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/functions/{slug}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Update Function
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/functions/{slug}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "verify_jwt": false}'
```

### Get Function Body
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/functions/{slug}/body" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Delete Function
```bash
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/functions/{slug}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Invoke Function (Service API)
```bash
curl -X POST "$SUPABASE_URL/functions/v1/hello-world" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

---

## 15. REALTIME (Management API)

### Update Realtime Config
```bash
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/config/realtime" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "max_channels": 100}'
```

---

## 16. POSTGREST CONFIG (Management API)

```bash
# Get config
curl -s "https://api.supabase.com/v1/projects/{ref}/postgrest" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update config
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/postgrest" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"max_rows": 1000, "db_schema": "public,storage"}'
```

---

## 17. SSL ENFORCEMENT (Management API)

```bash
# Get config
curl -s "https://api.supabase.com/v1/projects/{ref}/ssl-enforcement" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/ssl-enforcement" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 18. NETWORK RESTRICTIONS (Management API)

```bash
# Get restrictions
curl -s "https://api.supabase.com/v1/projects/{ref}/network-restrictions" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update restrictions
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/network-restrictions" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"db_egress_restriction": "blocked", "allowed_ips": ["203.0.113.0/24", "198.51.100.0/24"]}'

# Apply restrictions
curl -X POST "https://api.supabase.com/v1/projects/{ref}/network-restrictions/apply" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Manage bans
curl -X POST "https://api.supabase.com/v1/projects/{ref}/network-bans/retrieve" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/network-bans" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip_addresses": ["203.0.113.42"]}'
```

---

## 19. CUSTOM DOMAINS (Management API)

```bash
# Get status
curl -s "https://api.supabase.com/v1/projects/{ref}/custom-hostname" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Initialize
curl -X POST "https://api.supabase.com/v1/projects/{ref}/custom-hostname/initialize" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"hostname": "api.myapp.com"}'

# Reverify hostname
curl -X POST "https://api.supabase.com/v1/projects/{ref}/custom-hostname/reverify" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Activate
curl -X POST "https://api.supabase.com/v1/projects/{ref}/custom-hostname/activate" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Delete
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/custom-hostname" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 20. VANITY SUBDOMAIN (Management API)

```bash
# Get current
curl -s "https://api.supabase.com/v1/projects/{ref}/vanity-subdomain" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Check availability
curl -X POST "https://api.supabase.com/v1/projects/{ref}/vanity-subdomain/check-availability" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vanity_subdomain": "myapp"}'

# Activate
curl -X POST "https://api.supabase.com/v1/projects/{ref}/vanity-subdomain/activate" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vanity_subdomain": "myapp"}'

# Delete
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/vanity-subdomain" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 21. PREVIEW BRANCHES (Management API)

### List Branches
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/branches" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Create Branch
```bash
curl -X POST "https://api.supabase.com/v1/projects/{ref}/branches" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"branch_name": "feature-staging", "region": "us-east-1"}'
```

### Get Branch
```bash
curl -s "https://api.supabase.com/v1/projects/{ref}/branches/{branch_name}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Delete Branch
```bash
curl -X DELETE "https://api.supabase.com/v1/branches/{branch_id_or_ref}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Merge Branch
```bash
curl -X POST "https://api.supabase.com/v1/branches/{branch_id_or_ref}/merge" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Branch Diff
```bash
curl -s "https://api.supabase.com/v1/branches/{branch_id_or_ref}/diff" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Reset Branch
```bash
curl -X POST "https://api.supabase.com/v1/branches/{branch_id_or_ref}/reset" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

### Disable Preview Branching
```bash
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/branches" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 22. DATA API — REST (PostgREST, Service API)

> Service key use karo backend se. Anon key use karo frontend se (with RLS).

### Read Rows
```bash
curl -s "$SUPABASE_URL/rest/v1/users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY"

# With filters
curl -s "$SUPABASE_URL/rest/v1/users?email=eq.user@email.com&select=id,email,created_at" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY"
```

### Insert Row
```bash
curl -X POST "$SUPABASE_URL/rest/v1/users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name": "John", "email": "john@email.com"}'
```

### Update Rows
```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/users?id=eq.1" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"name": "John Updated"}'
```

### Delete Rows
```bash
curl -X DELETE "$SUPABASE_URL/rest/v1/users?id=eq.1" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY"
```

### Call Postgres Function (RPC)
```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/function_name" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"param1": "value1"}'
```

### GraphQL
```bash
curl -X POST "$SUPABASE_URL/graphql/v1" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id email name } }"}'
```

---

## 23. ANALYTICS & LOGS (Management API)

```bash
# Query logs
curl -s "https://api.supabase.com/v1/projects/{ref}/analytics/endpoints/logs.all?query=SELECT%20*%20FROM%20edge_logs%20LIMIT%2050" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# API usage counts
curl -s "https://api.supabase.com/v1/projects/{ref}/analytics/endpoints/usage.api-counts" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# API request counts
curl -s "https://api.supabase.com/v1/projects/{ref}/analytics/endpoints/usage.api-requests-count" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Functions combined stats
curl -s "https://api.supabase.com/v1/projects/{ref}/analytics/endpoints/functions.combined-stats" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 24. BILLING ADDONS (Management API)

```bash
# List addons
curl -s "https://api.supabase.com/v1/projects/{ref}/billing/addons" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Apply/update addons
curl -X PATCH "https://api.supabase.com/v1/projects/{ref}/billing/addons" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"addons": [{"variant": "pitr-7"}]}'

# Remove addon
curl -X DELETE "https://api.supabase.com/v1/projects/{ref}/billing/addons/{variant}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 25. LOG DRAINS (Management API v2)

```bash
# List log drains
curl -s "https://api.supabase.com/v2/projects/{ref}/log-drains" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Create log drain
curl -X POST "https://api.supabase.com/v2/projects/{ref}/log-drains" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "datadog-drain",
    "type": "datadog",
    "config": {"api_key": "dd-api-key-here", "site": "us5.datadoghq.com"}
  }'

# Get log drain
curl -s "https://api.supabase.com/v2/projects/{ref}/log-drains/{token}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Update log drain
curl -X PATCH "https://api.supabase.com/v2/projects/{ref}/log-drains/{token}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"config": {"api_key": "new-key"}}'

# Delete log drain
curl -X DELETE "https://api.supabase.com/v2/projects/{ref}/log-drains/{token}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 26. ORGANIZATION MANAGEMENT (Management API)

```bash
# List organizations
curl -s "https://api.supabase.com/v1/organizations" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# Get organization details
curl -s "https://api.supabase.com/v1/organizations/{slug}" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# List members
curl -s "https://api.supabase.com/v1/organizations/{slug}/members" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# List entitlements (plan info)
curl -s "https://api.supabase.com/v1/organizations/{slug}/entitlements" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"

# List projects in org
curl -s "https://api.supabase.com/v1/organizations/{slug}/projects" \
  -H "Authorization: Bearer $SUPABASE_MGMT_TOKEN"
```

---

## 27. FULL AUTOMATION SCRIPT (Zero Dashboard)

```bash
#!/bin/bash
set -e

MGMT_TOKEN="sbp_..."
ORG_SLUG="your-org-slug"
PROJECT_NAME="My App"

# 1. Create project
echo "Creating project..."
RESULT=$(curl -s -X POST "https://api.supabase.com/v1/projects" \
  -H "Authorization: Bearer $MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$PROJECT_NAME\", \"organization_slug\": \"$ORG_SLUG\", \"db_pass\": \"StrongPass@123\", \"region_selection\": {\"type\": \"smartGroup\", \"code\": \"apac\"}}")
REF=$(echo $RESULT | python3 -c "import json,sys; print(json.load(sys.stdin)['ref'])")
echo "Project ref: $REF"

# 2. Wait for project to become active
sleep 30

# 3. Get API keys
KEYS=$(curl -s "https://api.supabase.com/v1/projects/$REF/api-keys?reveal=true" \
  -H "Authorization: Bearer $MGMT_TOKEN")
ANON=$(echo $KEYS | python3 -c "import json,sys; keys=json.load(sys.stdin); print([k['api_key'] for k in keys if k['name']=='anon'][0])")
SERVICE=$(echo $KEYS | python3 -c "import json,sys; keys=json.load(sys.stdin); print([k['api_key'] for k in keys if k['name']=='service_role'][0])")
SUPABASE_URL="https://$REF.supabase.co"

# 4. Run schema
echo "Running schema..."
SQL=$(cat schema.sql)
SQL_JSON=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SQL")
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$SQL_JSON"
echo "Schema done"

# 5. Create RLS policies
echo "Creating RLS policies..."
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"ALTER TABLE users ENABLE ROW LEVEL SECURITY; CREATE POLICY \\\"Users can view own data\\\" ON users FOR SELECT USING (auth.uid() = id);\"}"
echo "RLS done"

# 6. Create storage buckets
echo "Creating buckets..."
for bucket in assets uploads media; do
  curl -s -X POST "$SUPABASE_URL/storage/v1/bucket" \
    -H "Authorization: Bearer $SERVICE" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$bucket\", \"public\": true}"
done
echo "Buckets done"

# 7. Create admin user
echo "Creating admin user..."
curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE" \
  -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@email.com", "password": "Admin@123", "email_confirm": true}'
echo "Admin done"

# 8. Enable database webhooks
echo "Enabling webhooks..."
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/webhooks/enable" \
  -H "Authorization: Bearer $MGMT_TOKEN"

# 9. Deploy edge function
echo "Deploying edge function..."
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/functions" \
  -H "Authorization: Bearer $MGMT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug": "hello-world", "name": "Hello World", "body": "import { serve } from \"https://deno.land/std@0.177.0/http/server.ts\"\n\nserve((req) => {\n  return new Response(JSON.stringify({message: \"Hello from API!\"}), {\n    headers: {\"Content-Type\": \"application/json\"}\n  });\n})", "verify_jwt": false}'
echo "Functions done"

echo "=== ENV for .env.local ==="
echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_ANON_KEY=$ANON"
echo "SUPABASE_SERVICE_KEY=$SERVICE"
```

---

## 📌 TOKEN SUMMARY

| Token | Kahan se milega | Kya kar sakta hai |
|-------|-----------------|-------------------|
| `sbp_...` (PAT) | Dashboard → Access Tokens | Project CRUD, SQL, config, keys, functions, secrets, domains, branches |
| `service_role` / `sb_secret_...` | Management API (sbp_ se) | Storage, Auth Admin, Data API, Functions invoke |
| `anon` / `sb_publishable_...` | Management API (sbp_ se) | Frontend public access, GoTrue auth flows |

> **⚠️ Rule:** `service_role` / secret keys kabhi frontend ya client-side code mein mat dalo.
> Sirf backend / API calls / CI/CD mein use karo.

---

## 🔗 Important Links

| Cheez | Link |
|-------|------|
| Access Tokens (PAT) generate | https://supabase.com/dashboard/account/tokens |
| Management API OpenAPI | https://api.supabase.com/api/v1 |
| Supabase API Reference | https://supabase.com/docs/reference/api/introduction |
| Auth GoTrue API | `POST {url}/auth/v1/{signup,token,user,...}` |
| Auth Admin API | `POST {url}/auth/v1/admin/users` |
| Storage API | `POST {url}/storage/v1/{bucket,object}` |
| Data API (PostgREST) | `{url}/rest/v1/{table}` |
| GraphQL API | `POST {url}/graphql/v1` |
| Edge Functions | `POST {url}/functions/v1/{slug}` |
