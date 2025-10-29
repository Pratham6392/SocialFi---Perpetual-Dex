# Vercel Deployment Checklist

Use this checklist to ensure successful deployment to Vercel.

## Pre-Deployment Checklist

### ✅ Code Preparation

- [ ] All changes committed to Git
- [ ] Code pushed to repository (GitHub/GitLab/Bitbucket)
- [ ] All environment variables documented in `env.example`
- [ ] `.vercelignore` configured to exclude unnecessary files
- [ ] No sensitive data (private keys, API keys) in code
- [ ] `vercel.json` configuration file created

### ✅ Build Configuration

- [ ] `package.json` has `build:vercel` script (skips tests for faster builds)
- [ ] Build command verified: `npm run build:vercel`
- [ ] Output directory set to `build/`
- [ ] Node.js version compatible (18.x recommended)

### ✅ Environment Variables

- [ ] `REACT_APP_DEFAULT_CHAIN_ID` set (2484 for U2U Testnet)
- [ ] `REACT_APP_SUPPORTED_CHAIN_IDS` set
- [ ] `NODE_ENV=production`
- [ ] `REACT_APP_ENV=production`
- [ ] Optional: RPC URLs configured
- [ ] Optional: API keys configured (if using Alchemy, Infura, etc.)

### ✅ Features Verification

- [ ] Spot trading UI works correctly
- [ ] Perpetual trading UI works correctly
- [ ] Trading mode toggle functions properly
- [ ] Wallet connection works
- [ ] Contract interactions work (on testnet)
- [ ] Price charts load correctly
- [ ] Responsive design works on mobile

## Deployment Steps

### Step 1: Initial Setup

- [ ] Create Vercel account (if not already done)
- [ ] Install Vercel CLI (optional): `npm install -g vercel`
- [ ] Login to Vercel: `vercel login`

### Step 2: Connect Repository

- [ ] Import project from Git repository
- [ ] Select project root directory: `catalystv1` (or adjust if different)
- [ ] Verify framework detection: Create React App

### Step 3: Configure Settings

- [ ] Verify build command: `npm run build:vercel`
- [ ] Verify output directory: `build`
- [ ] Verify install command: `npm install`
- [ ] Set Node.js version to 18.x (if needed)

### Step 4: Environment Variables

- [ ] Add `REACT_APP_DEFAULT_CHAIN_ID=2484`
- [ ] Add `REACT_APP_SUPPORTED_CHAIN_IDS=2484`
- [ ] Add `NODE_ENV=production`
- [ ] Add `REACT_APP_ENV=production`
- [ ] Add `INLINE_RUNTIME_CHUNK=false`
- [ ] Add any custom RPC URLs (if applicable)
- [ ] Add API keys (if applicable)

### Step 5: Deploy

- [ ] Trigger first deployment
- [ ] Monitor build logs for errors
- [ ] Wait for deployment to complete
- [ ] Note the deployment URL

### Step 6: Post-Deployment Testing

- [ ] Verify site loads correctly
- [ ] Test wallet connection
- [ ] Test spot trading interface
- [ ] Test perpetual trading interface
- [ ] Test trading mode toggle
- [ ] Test contract interactions (on testnet)
- [ ] Test on mobile device
- [ ] Check browser console for errors

## Troubleshooting

### Build Fails

- [ ] Check build logs for specific errors
- [ ] Verify all dependencies are in `package.json`
- [ ] Check Node.js version compatibility
- [ ] Verify environment variables are set correctly

### Runtime Errors

- [ ] Check browser console for JavaScript errors
- [ ] Verify all environment variables are set
- [ ] Check network requests in browser DevTools
- [ ] Verify RPC endpoints are accessible

### Assets Not Loading

- [ ] Check `vercel.json` rewrite rules
- [ ] Verify static files are in `public/` directory
- [ ] Check file paths are correct
- [ ] Verify caching headers in `vercel.json`

### Router Issues

- [ ] Verify `HashRouter` is used (already configured)
- [ ] Check `vercel.json` rewrite rules include `/(.*)`

## Optional: Custom Domain Setup

- [ ] Add custom domain in Vercel settings
- [ ] Configure DNS records
- [ ] Wait for SSL certificate provisioning
- [ ] Verify HTTPS works correctly

## Performance Optimization

- [ ] Verify caching headers are configured
- [ ] Check bundle size is reasonable
- [ ] Enable Vercel Analytics (if available)
- [ ] Monitor Core Web Vitals

## Security

- [ ] All environment variables in Vercel dashboard (not in code)
- [ ] No private keys in repository
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] CORS configured correctly (if applicable)

## Monitoring

- [ ] Set up error tracking (e.g., Sentry) - optional
- [ ] Enable Vercel Analytics - optional
- [ ] Monitor deployment logs
- [ ] Set up uptime monitoring - optional

## Done! 🎉

- [ ] All checklist items completed
- [ ] Application successfully deployed
- [ ] All features tested and working
- [ ] Ready for production use

---

**Notes:**

- Smart contract deployment is separate and not part of Vercel deployment
- Keep environment variables updated as needed
- Monitor build times and optimize if needed
- Set up alerts for failed deployments
