# NutriPlan Deployment Guide

## Overview

NutriPlan is a Next.js application with Supabase backend. Deployment targets:

- **Frontend:** Vercel (recommended) or self-hosted Node.js server
- **Database:** Supabase PostgreSQL (managed)
- **Auth:** Supabase Auth (managed)
- **APIs:** Next.js API routes + Edge Functions

## Prerequisites

- Supabase account with project created
- Vercel account (for frontend) or Node.js 22+ server
- GitHub repository with main branch
- Environment variables configured

## Environment Variables

Required `.env.local` (never commit to git):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Auth (OAuth providers)
GITHUB_ID=your-github-app-id
GITHUB_SECRET=your-github-app-secret

# API Keys
GIGACHAT_API_KEY=your-gigachat-key
YOOKASSA_API_KEY=your-yookassa-key
RESEND_API_KEY=your-resend-key
```

## Database Setup

### Migrations

Apply Supabase migrations before deploying:

```bash
# Option 1: Via Supabase CLI
npx supabase link --project-ref your-project-ref
npx supabase migration up

# Option 2: Via Supabase dashboard
# Go to SQL Editor → paste migration files from supabase/migrations/
```

### Initial Data

No seed data required. Database auto-creates user records on signup.

## Vercel Deployment (Recommended)

### 1. Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select root directory: `.`
4. Framework: Next.js (auto-detected)

### 2. Configure Environment Variables

Add all variables from `.env.local` in Vercel dashboard:

- Settings → Environment Variables
- Paste each variable

### 3. Deploy

```bash
git push origin main
```

Vercel auto-deploys on push to `main`. Build takes ~2-3 minutes.

### 4. Domain Setup

Add custom domain in Vercel dashboard (optional):

- Domain → Add → your-domain.com
- Update DNS records as instructed

## Self-Hosted Deployment (Node.js)

### 1. Build

```bash
npm install
npm run build
```

### 2. Set Environment Variables

```bash
export NEXT_PUBLIC_SUPABASE_URL=...
export NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# ... all other vars
```

### 3. Run Server

```bash
npm run start
```

App runs on `http://localhost:3000` by default. Use `PORT` env var to override.

### 4. Process Manager

Use PM2 or systemd to keep process alive:

```bash
# PM2
npm install -g pm2
pm2 start npm --name "nutriplan" -- start
pm2 startup
pm2 save

# systemd (create /etc/systemd/system/nutriplan.service)
[Unit]
Description=NutriPlan
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/nutriplan
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Testing Before Deploy

```bash
# Local verification
npm run format:check
npm run lint
npm run test
npm run build

# Smoke test
npm run start
# Visit http://localhost:3000 → verify pages load
# Test login flow
# Test basic features (settings, food log)
```

## Monitoring & Logs

### Vercel Logs

```bash
# CLI logs
vercel logs --follow

# Dashboard: Deployments → select deployment → Logs tab
```

### Application Monitoring

Monitor key metrics:

- Build time (target: <3 min)
- Error rate (target: <1%)
- API response time (target: <200ms)

Use Vercel Analytics + Supabase dashboard for insights.

## Rollback

### Vercel

1. Dashboard → Deployments
2. Find previous working deployment
3. Click → Redeploy

### Self-Hosted

1. Keep previous build artifacts
2. Stop current process: `pm2 stop nutriplan`
3. Restore previous version: `git checkout <commit>`
4. Rebuild: `npm run build && npm run start`

## Release Checklist

- [ ] All tests passing (`npm test`)
- [ ] No lint errors (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables configured in deployment platform
- [ ] Database migrations applied
- [ ] Smoke tests pass (login, basic features work)
- [ ] Monitoring configured
- [ ] Rollback plan documented
- [ ] Team notified of deployment

## Troubleshooting

### Build fails

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Database connection errors

1. Check SUPABASE_URL and ANON_KEY are correct
2. Verify Supabase project is active
3. Check network/firewall isn't blocking requests

### Auth not working

1. Verify GITHUB_ID/SECRET in Supabase dashboard
2. Check callback URL matches (usually `https://your-domain/auth/callback`)
3. Clear browser cookies and try again

### API timeout errors

1. Check Gigachat API key validity
2. Increase timeout in route handler (default 60s)
3. Check Supabase service role key has correct permissions

## Performance Optimization

- Images: use `next/image` component (auto-optimization)
- Bundle: analyze with `npm run build -- --analyze`
- Database: add indexes for frequently queried columns (Supabase dashboard)
- Caching: leverage Next.js ISR and edge caching

## Security

- Never commit `.env.local` or secrets
- Rotate API keys quarterly
- Enable HTTPS only (auto on Vercel)
- Regularly update dependencies: `npm audit`
- Monitor Supabase audit logs for suspicious activity

## Support

For deployment issues:

- Vercel docs: https://vercel.com/docs
- Supabase docs: https://supabase.com/docs
- GitHub Issues: Check project repo
