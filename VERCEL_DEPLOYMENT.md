# Vercel Deployment Guide

This guide will help you deploy your SocialFi perpetual trading platform to Vercel with all current features.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your code should be in a Git repository (GitHub, GitLab, or Bitbucket)
3. **Node.js**: Ensure you're using Node.js 18.x or higher (Vercel will use this automatically)

## Step 1: Prepare Your Repository

### 1.1 Ensure All Files Are Committed

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 1.2 Verify Build Scripts

The `package.json` already has the correct build command:

```json
"build": "INLINE_RUNTIME_CHUNK=false yarn test:ci && react-app-rewired build"
```

**Note**: If you want to skip tests during deployment (faster builds), you can create a separate build script:

```json
"build:vercel": "INLINE_RUNTIME_CHUNK=false react-app-rewired build"
```

Update `vercel.json` accordingly:

```json
"buildCommand": "npm run build:vercel"
```

## Step 2: Connect to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel will auto-detect it's a Create React App project

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to project directory
cd catalystv1

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No (first time)
# - Project name: socialfi (or your preferred name)
# - Directory: ./
# - Override settings? No
```

## Step 3: Configure Environment Variables

### 3.1 Via Vercel Dashboard

1. Go to your project settings
2. Navigate to **Settings → Environment Variables**
3. Add the following variables (based on `.env.example`):

#### Required Variables

```bash
# Network Configuration
REACT_APP_DEFAULT_CHAIN_ID=2484
REACT_APP_SUPPORTED_CHAIN_IDS=2484

# Environment
NODE_ENV=production
REACT_APP_ENV=production
INLINE_RUNTIME_CHUNK=false
```

#### Optional Variables (for enhanced features)

```bash
# RPC URLs (if you have custom endpoints)
REACT_APP_ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
REACT_APP_ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
REACT_APP_U2U_TESTNET_RPC_URL=https://rpc-nebulas-testnet.uniultra.xyz

# API Keys (if using Alchemy, Infura, etc.)
REACT_APP_ALCHEMY_API_KEY=your_key_here
REACT_APP_INFURA_API_KEY=your_key_here
REACT_APP_ETHERSCAN_API_KEY=your_key_here

# Firebase (if using)
REACT_APP_FIREBASE_API_KEY=your_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain_here
REACT_APP_FIREBASE_PROJECT_ID=your_project_id_here
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket_here
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here
```

### 3.2 Via Vercel CLI

```bash
# Set environment variables
vercel env add REACT_APP_DEFAULT_CHAIN_ID production
# Enter value when prompted: 2484

vercel env add REACT_APP_SUPPORTED_CHAIN_IDS production
# Enter value when prompted: 2484

# Repeat for all other variables
```

## Step 4: Configure Build Settings

Vercel should auto-detect your settings from `vercel.json`, but verify:

1. **Build Command**: `npm run build` (or `npm run build:vercel` if you created it)
2. **Output Directory**: `build`
3. **Install Command**: `npm install` (or `yarn install` if using Yarn)
4. **Framework Preset**: Create React App

## Step 5: Deploy

### First Deployment

1. Push your code to your Git repository
2. Vercel will automatically detect the push and start building
3. Or manually trigger from Vercel dashboard: **Deployments → Redeploy**

### Subsequent Deployments

Every push to your main branch will trigger an automatic deployment.

## Step 6: Verify Deployment

### 6.1 Check Build Logs

1. Go to your project dashboard
2. Click on the latest deployment
3. Check the build logs for any errors

### 6.2 Test Your Application

1. Visit your Vercel URL (e.g., `your-project.vercel.app`)
2. Verify:
   - ✅ Page loads correctly
   - ✅ Wallet connection works
   - ✅ Trading interface displays
   - ✅ Spot trading toggle works
   - ✅ Perpetual trading interface works
   - ✅ Contract interactions work (test on testnet)

### 6.3 Common Issues & Fixes

#### Issue: Build Fails

- **Solution**: Check build logs for specific errors
- Common causes:
  - Missing environment variables
  - TypeScript errors
  - Test failures (if tests are enabled)

#### Issue: Runtime Errors

- **Solution**: Check browser console for errors
- Common causes:
  - Missing environment variables
  - Network configuration issues
  - CORS issues with RPC endpoints

#### Issue: Assets Not Loading

- **Solution**: Check `vercel.json` rewrite rules
- Ensure static assets are in `public/` directory

## Step 7: Configure Custom Domain (Optional)

1. Go to **Settings → Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. SSL certificate will be automatically provisioned

## Step 8: Optimize Performance

### 8.1 Enable Analytics

1. Go to **Analytics** tab in Vercel dashboard
2. Enable Web Analytics (if available on your plan)

### 8.2 Configure Caching

The `vercel.json` already includes optimized caching headers for:

- Static assets (CSS, JS, images)
- Charting library files
- Fonts

### 8.3 Enable Edge Network (if needed)

For better global performance, Vercel automatically uses their Edge Network.

## Step 9: Continuous Deployment

### Automatic Deployments

- **Production**: Deploys from `main` (or `master`) branch
- **Preview**: Deploys from pull requests and other branches

### Branch Strategy

- `main`: Production deployments
- `develop`: Preview deployments (for testing)
- Feature branches: Preview deployments

## Current Features Deployed

✅ **Spot Trading**: Clean UI without leverage/short options
✅ **Perpetual Trading**: Full-featured trading with leverage
✅ **Trading Mode Toggle**: Switch between spot and perpetual
✅ **Web3 Integration**: Wallet connection (MetaMask, WalletConnect)
✅ **Contract Integration**: Smart contract interactions
✅ **Price Charts**: TradingView integration
✅ **Multi-chain Support**: U2U Testnet, Arbitrum, etc.
✅ **Responsive Design**: Works on mobile and desktop

## Maintenance

### Updating Environment Variables

1. Go to **Settings → Environment Variables**
2. Update values as needed
3. Redeploy to apply changes

### Viewing Logs

1. Go to **Deployments**
2. Click on a deployment
3. View **Function Logs** for server-side errors
4. Check browser console for client-side errors

### Monitoring

- Use Vercel Analytics for performance metrics
- Set up error tracking (e.g., Sentry)
- Monitor RPC endpoint health

## Troubleshooting

### Build Timeouts

If builds timeout (>15 minutes):

1. Optimize your build process
2. Consider using `build:vercel` script without tests
3. Check for large files in the repository

### Memory Issues

If you encounter memory errors:

1. Upgrade Vercel plan (if on free tier)
2. Optimize webpack configuration
3. Reduce bundle size

### RPC Endpoint Issues

If blockchain RPC calls fail:

1. Use reliable RPC providers (Alchemy, Infura)
2. Implement fallback RPC endpoints
3. Handle rate limiting gracefully

## Next Steps

After successful deployment:

1. **Test Thoroughly**: Test all features on the deployed version
2. **Set Up Monitoring**: Add error tracking and analytics
3. **Optimize**: Monitor performance and optimize as needed
4. **Domain**: Set up custom domain for production
5. **SEO**: Configure meta tags and SEO settings

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **React Deployment**: [reactjs.org/docs/deployment.html](https://reactjs.org/docs/deployment.html)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)

---

**Note**: Smart contract deployment (Hardhat) should be done separately and is not part of the Vercel frontend deployment.
