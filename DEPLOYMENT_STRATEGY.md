# Deployment Strategy - Avoiding Vercel Limits

## The Problem
Vercel free tier limits you to 100 deployments per day. Each push to main/production triggers a deployment.

## Solutions Implemented

### 1. Optimized Build Process
- Removed unnecessary `rm -rf node_modules` from build command
- Faster builds = fewer timeout-related redeployments

### 2. Branch-Based Deployments
- Only `main` and `production` branches trigger deployments
- Work on feature branches for development

### 3. Smart Workflow Scripts
```bash
# Use this instead of direct git push
npm run deploy:safe

# Test locally before deploying
npm run preview:local
```

## Best Practices

### Development Workflow
1. **Create feature branches**: `git checkout -b feature/your-feature`
2. **Test locally**: `npm run dev` or `npm run preview:local`
3. **Commit changes**: Use the safe deploy script
4. **Deploy only when ready**: Merge to main when feature is complete

### Emergency Fixes
If you hit the limit and need to deploy urgently:
- Wait 4 hours for limit reset
- Use Vercel CLI for direct deployment: `vercel --prod`
- Consider upgrading to Pro plan ($20/month) for unlimited deployments

### Local Testing Commands
```bash
# Start development server
npm run dev

# Build and test locally
npm run preview:local

# Run tests
npm test

# Check TypeScript
npm run check
```

### Git Workflow
```bash
# Safe development workflow
git checkout -b feature/my-feature
# Make changes...
npm run dev  # Test locally
git add .
git commit -m "Add feature"
# Test more...
git checkout main
git merge feature/my-feature
npm run deploy:safe  # Interactive deployment
```

## Monitoring Usage
- Check Vercel dashboard for deployment count
- Set up alerts when approaching limits
- Consider Pro plan if consistently hitting limits

## Alternative Hosting
If limits become a consistent issue:
- Netlify (similar limits but different reset schedule)
- Railway (generous free tier)
- Render (free tier with different limits)
- Self-hosted VPS