# TradingPro Platform - Deployment Guide

This guide will walk you through deploying the TradingPro platform on Render.

## 🚀 Quick Deploy with Render Blueprint

### Option 1: One-Click Deploy (Recommended)

1. **Click the Deploy to Render button below:**
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy/schema-new?schema=https://raw.githubusercontent.com/amarcoder01/stiedevelopmentinprogess/main/render.yaml)

2. **Configure your environment variables** in the Render dashboard:
   - `POLYGON_API_KEY` - Your Polygon.io API key
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `CHARTIMG_API_KEY` - Your ChartImg API key
   - `GOOGLE_SEARCH_API_KEY` - Your Google Search API key
   - `GOOGLE_SEARCH_ENGINE_ID` - Your Google Search Engine ID

3. **Deploy!** Render will automatically:
   - Create a PostgreSQL database
   - Build and deploy your Next.js application
   - Set up all necessary environment variables

## 🔧 Manual Deployment Steps

### Prerequisites

- [Render account](https://render.com)
- [GitHub account](https://github.com)
- API keys for required services

### Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add your GitHub repository as remote
git remote add origin https://github.com/amarcoder01/stiedevelopmentinprogess.git

# Add all files
git add .

# Commit changes
git commit -m "Initial deployment setup"

# Push to GitHub
git push -u origin main
```

### Step 2: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `tradingpro-db`
   - **Database**: `tradingpro_db`
   - **User**: `tradingpro_user`
   - **Plan**: Starter (Free)
4. Click "Create Database"
5. Copy the **Internal Database URL** for later use

### Step 3: Deploy Web Service

1. In Render Dashboard, click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure the service:

#### Basic Settings
- **Name**: `tradingpro-platform`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: Leave empty (root)

#### Build & Deploy Settings
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npm start`

#### Environment Variables
Add these environment variables:

```env
NODE_ENV=production
DATABASE_URL=<your_postgresql_internal_url>
POLYGON_API_KEY=<your_polygon_api_key>
NEXT_PUBLIC_POLYGON_API_KEY=<your_polygon_api_key>
OPENAI_API_KEY=<your_openai_api_key>
CHARTIMG_API_KEY=<your_chartimg_api_key>
NEXT_PUBLIC_CHARTIMG_API_KEY=<your_chartimg_api_key>
GOOGLE_SEARCH_API_KEY=<your_google_search_api_key>
GOOGLE_SEARCH_ENGINE_ID=<your_google_search_engine_id>
NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY=<your_alpha_vantage_api_key>
NEXT_PUBLIC_BASE_URL=https://your-app-name.onrender.com
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_AI_CHAT=true
NEXT_PUBLIC_ENABLE_PAPER_TRADING=true
```

4. Click "Create Web Service"

### Step 4: Run Database Migrations

After the first deployment, run database migrations:

```bash
# Connect to your Render service via SSH or use the Render shell
npx prisma migrate deploy
npx prisma db push
```

## 🔑 Required API Keys

### 1. Polygon.io API Key
- Sign up at [Polygon.io](https://polygon.io)
- Get your API key from the dashboard
- Used for real-time stock data

### 2. OpenAI API Key
- Sign up at [OpenAI](https://openai.com)
- Get your API key from the dashboard
- Used for AI chat functionality

### 3. ChartImg API Key
- Sign up at [ChartImg](https://chartimg.com)
- Get your API key from the dashboard
- Used for chart generation

### 4. Google Search API Key
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Enable Custom Search API
- Create API key and Search Engine ID
- Used for web search functionality

### 5. Alpha Vantage API Key (Optional)
- Sign up at [Alpha Vantage](https://www.alphavantage.co)
- Get your API key
- Used as fallback for stock data

## 🌐 Custom Domain Setup

1. In your Render service dashboard, go to "Settings"
2. Scroll to "Custom Domains"
3. Add your domain
4. Update your DNS records as instructed

## 📊 Monitoring & Logs

### View Logs
- Go to your service dashboard
- Click "Logs" tab
- Monitor for any errors or issues

### Health Checks
- Your app includes a health check at `/`
- Render will automatically monitor this endpoint

## 🔄 Continuous Deployment

By default, Render will:
- Automatically deploy when you push to the `main` branch
- Run your build command on each deployment
- Restart the service with new code

## 🛠 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check the build logs in Render dashboard
   - Ensure all dependencies are in `package.json`
   - Verify Node.js version compatibility

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Ensure database is running
   - Check if migrations have been applied

3. **Environment Variables**
   - Double-check all API keys are set correctly
   - Ensure no extra spaces in values
   - Verify variable names match exactly

4. **Performance Issues**
   - Consider upgrading to a paid plan
   - Optimize your Next.js build
   - Use caching strategies

### Getting Help

- Check [Render Documentation](https://render.com/docs)
- Review build logs in Render dashboard
- Check application logs for errors
- Verify all environment variables are set

## 🎉 Success!

Once deployed, your TradingPro platform will be available at:
`https://your-app-name.onrender.com`

The platform includes:
- ✅ Real-time stock data
- ✅ AI-powered chat assistant
- ✅ Portfolio management
- ✅ Watchlist functionality
- ✅ Paper trading simulation
- ✅ Professional charts and analytics

## 📈 Scaling

As your application grows:
1. **Upgrade Database Plan**: Move from Starter to Standard
2. **Upgrade Web Service**: Move from Starter to Standard
3. **Add Caching**: Consider Redis for session storage
4. **CDN**: Add Cloudflare for static assets
5. **Monitoring**: Add application monitoring tools

---

**Need help?** Check the [Render Community](https://community.render.com) or create an issue in the GitHub repository.
