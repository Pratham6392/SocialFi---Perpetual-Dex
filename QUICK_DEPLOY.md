# Quick Vercel Deployment Guide

## 🚀 Fast Track Deployment (5 Minutes)

### Step 1: Push to Git

```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel will auto-detect your project settings

### Step 3: Add Environment Variables

In Vercel dashboard → Settings → Environment Variables, add:

```bash
REACT_APP_DEFAULT_CHAIN_ID=2484
REACT_APP_SUPPORTED_CHAIN_IDS=2484
NODE_ENV=production
REACT_APP_ENV=production
INLINE_RUNTIME_CHUNK=false
```

### Step 4: Deploy

Click **"Deploy"** - Vercel will automatically:

- Install dependencies
- Run the build
- Deploy to production

### Step 5: Test

Visit your deployed URL and verify:

- ✅ Page loads
- ✅ Trading interface works
- ✅ Wallet connection works

## 📋 Detailed Steps

For comprehensive instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

## 🔧 Configuration Files

- `vercel.json` - Vercel deployment configuration
- `.vercelignore` - Files excluded from deployment
- `env.example` - Environment variables template
- `package.json` - Build scripts

## ⚡ Build Script

The deployment uses `build:vercel` which:

- ✅ Skips tests for faster builds
- ✅ Optimizes bundle size
- ✅ Generates source maps (disabled for smaller build)

## 🌐 Environment Variables Reference

### Required

- `REACT_APP_DEFAULT_CHAIN_ID` - Default blockchain network
- `REACT_APP_SUPPORTED_CHAIN_IDS` - Supported networks
- `NODE_ENV` - Environment mode
- `REACT_APP_ENV` - App environment

### Optional (for enhanced features)

- RPC URLs (Arbitrum, U2U Testnet)
- API Keys (Alchemy, Infura, Etherscan)
- Firebase credentials

See `env.example` for full list.

## 🐛 Troubleshooting

### Build fails?

- Check build logs in Vercel dashboard
- Verify Node.js version (18.x recommended)
- Ensure all dependencies are in package.json

### Page not loading?

- Check browser console for errors
- Verify environment variables are set
- Check network requests

### Router not working?

- Already configured with HashRouter ✓
- Check vercel.json rewrite rules ✓

## 📚 Additional Resources

- [Full Deployment Guide](./VERCEL_DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [Vercel Documentation](https://vercel.com/docs)

---

**Ready to deploy?** Just follow Step 1-4 above! 🚀
