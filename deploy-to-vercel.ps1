# Vercel Deployment Script for Windows PowerShell
# Run this script to deploy your project to Vercel

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Vercel Deployment Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if already logged in
Write-Host "Checking Vercel authentication..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Not logged in. Please login first:" -ForegroundColor Yellow
    Write-Host "  vercel login" -ForegroundColor Green
    exit 1
}

Write-Host "Logged in as: $whoami" -ForegroundColor Green
Write-Host ""

# Step 1: Link Project
Write-Host "Step 1: Linking project to Vercel..." -ForegroundColor Yellow
Write-Host "You will be prompted to:" -ForegroundColor Yellow
Write-Host "  1. Select scope (your account)" -ForegroundColor Yellow
Write-Host "  2. Link to existing project OR Create new project" -ForegroundColor Yellow
Write-Host "  3. Enter project name (e.g., 'socialfi-perpetual')" -ForegroundColor Yellow
Write-Host ""
$link = Read-Host "Press Enter to continue with linking..."
vercel link --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "Linking failed. Please try again manually." -ForegroundColor Red
    exit 1
}

Write-Host "Project linked successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Set Environment Variables
Write-Host "Step 2: Setting environment variables..." -ForegroundColor Yellow
Write-Host "You will need to enter the following values:" -ForegroundColor Yellow
Write-Host ""

$envVars = @{
    "REACT_APP_DEFAULT_CHAIN_ID" = "2484"
    "REACT_APP_SUPPORTED_CHAIN_IDS" = "2484"
    "NODE_ENV" = "production"
    "REACT_APP_ENV" = "production"
    "INLINE_RUNTIME_CHUNK" = "false"
}

$setEnv = Read-Host "Set environment variables automatically? (Y/n)"
if ($setEnv -eq "" -or $setEnv -eq "Y" -or $setEnv -eq "y") {
    foreach ($key in $envVars.Keys) {
        Write-Host "Setting $key = $($envVars[$key])..." -ForegroundColor Yellow
        Write-Output $envVars[$key] | vercel env add $key production --yes
        Write-Output $envVars[$key] | vercel env add $key preview --yes
        Write-Output $envVars[$key] | vercel env add $key development --yes
    }
    Write-Host "Environment variables set successfully!" -ForegroundColor Green
} else {
    Write-Host "Skipping automatic environment variable setup." -ForegroundColor Yellow
    Write-Host "Please set them manually in Vercel dashboard:" -ForegroundColor Yellow
    Write-Host "  Dashboard → Your Project → Settings → Environment Variables" -ForegroundColor Cyan
    foreach ($key in $envVars.Keys) {
        Write-Host "  - $key = $($envVars[$key])" -ForegroundColor White
    }
}

Write-Host ""

# Step 3: Deploy
Write-Host "Step 3: Deploying to Vercel..." -ForegroundColor Yellow
$deploy = Read-Host "Deploy to production now? (Y/n)"

if ($deploy -eq "" -or $deploy -eq "Y" -or $deploy -eq "y") {
    Write-Host "Deploying..." -ForegroundColor Yellow
    vercel --prod
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "===================================" -ForegroundColor Green
        Write-Host "Deployment Successful! 🎉" -ForegroundColor Green
        Write-Host "===================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your application is now live on Vercel!" -ForegroundColor Green
        Write-Host "Visit your Vercel dashboard to see the deployment URL." -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "Deployment failed. Check the error messages above." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Skipping deployment." -ForegroundColor Yellow
    Write-Host "To deploy manually, run: vercel --prod" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Deployment script completed!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

