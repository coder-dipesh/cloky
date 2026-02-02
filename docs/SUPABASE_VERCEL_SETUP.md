# Supabase + Vercel setup (Cloky)

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the contents of `supabase/schema.sql` to create tables and RLS.
3. In **Project Settings → API**, copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
4. In **Authentication → URL Configuration**, add your site URL and redirect URL:
   - **Site URL**: `https://your-app.vercel.app` (or localhost for dev)
   - **Redirect URLs**: `https://your-app.vercel.app/**` and `http://localhost:5173/**` (or your dev URL)
5. **Email + password login:** In **Authentication → Providers → Email**:
   - Ensure **Email** is enabled.
   - Turn **off** "Confirm email" if you want users to sign in immediately after signup (no confirmation email). If you leave it on, users must click the confirmation link before they can sign in.

## 2. Local development

1. Copy the example config:
   ```bash
   cp js/supabase-config.example.js js/supabase-config.js
   ```
2. Edit `js/supabase-config.js` and set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. Open the app (e.g. with a local server). Sign in with your email; Supabase will send a magic link.

## 3. Vercel deployment (fix “Supabase is not configured” in production)

1. In **Vercel → Your project → Settings → Environment Variables**, add:
   - **Name:** `SUPABASE_URL` → **Value:** your Supabase project URL (e.g. `https://xxxx.supabase.co`)
   - **Name:** `SUPABASE_ANON_KEY` → **Value:** your Supabase anon key (from Supabase → Project Settings → API → anon public)
   Apply to **Production** (and Preview if you want).
2. In **Settings → Build & Development**:
   - **Build Command:** `node scripts/write-supabase-config.js`  
     (If you use the repo’s `vercel.json`, this is set there; otherwise set it here.)
   - **Output Directory:** leave empty or `.` (so the built site includes the generated `js/supabase-config.js`).
3. **Redeploy** (Deployments → … on latest → Redeploy). The build runs the script, which creates `js/supabase-config.js` from the env vars. If the build fails with “Missing env vars”, add the two variables above and redeploy again.

## 4. Custom SMTP (SendGrid) – optional

Supabase’s built-in email has limits. To use your own sending (e.g. SendGrid) for magic links:

### 4.1 SendGrid setup

1. In [SendGrid](https://sendgrid.com): **Settings → Sender Authentication**.
2. **Verify a Single Sender** (or a domain):
   - Single Sender: add an email like `noreply@yourdomain.com` and verify it.
   - Domain: verify your domain so you can send from any address on it (e.g. `noreply@cloky.app`).
3. Create an API key: **Settings → API Keys → Create API Key**.
   - Name it (e.g. `cloky-supabase`).
   - Permissions: **Mail Send → Full Access** (or at least “Mail Send”).
   - Copy the key (starts with `SG.`). You won’t see it again.

### 4.2 Supabase custom SMTP

In Supabase: **Authentication → Notifications → Email**.

1. Fill **Sender details**:
   - **Sender email:** the verified address (e.g. `noreply@yourdomain.com`).
   - **Sender name:** e.g. `Cloky`.
2. Fill **SMTP provider settings**:
   - **Host:** `smtp.sendgrid.net`
   - **Port:** `587` (TLS; or `465` for SSL)
   - **Username:** `apikey` (literally the word `apikey`, not your API key)
   - **Password:** your SendGrid API key (the `SG.xxx...` value)
3. Set **Minimum interval per user** if you want (e.g. 60 seconds).
4. Turn **Enable custom SMTP** on.

Supabase will then send magic-link (and other auth) emails via SendGrid. No code changes in Cloky are required.

## 5. Auth (magic link)

- Users enter their email and click **Send magic link**.
- Supabase emails a link (via your custom SMTP if enabled); clicking it signs them in and redirects back to your app.
- Each user only sees their own shifts (RLS). Data syncs across devices in real time.
