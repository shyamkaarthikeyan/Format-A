# Format A - Vercel Deployment Guide

## 🚀 Migration from Render to Vercel

This guide will help you migrate your Format A IEEE Document Generator from Render to Vercel.

### 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm install -g vercel`
3. **GitHub Repository**: Ensure your code is pushed to GitHub

### 🛠️ Deployment Steps

#### 1. **Connect to Vercel**
```bash
# Login to Vercel
vercel login

# Navigate to your project directory
cd "d:\IEEE\Format A\StreamlitToReact"

# Deploy to Vercel
vercel
```

#### 2. **Configure Environment Variables**
In your Vercel dashboard, add these environment variables:

- `EMAIL_USER`: `formatateam@gmail.com`
- `EMAIL_PASS`: `qrcrrrlodnywmsyw`
- `NODE_ENV`: `production`

#### 3. **Project Settings**
- **Framework Preset**: Vite
- **Output Directory**: `client/dist`
- **Install Command**: `npm install`
- **Build Command**: `npm run build`

### 🔧 Key Changes Made

#### **File Structure**
```
├── api/                          # Vercel Functions
│   ├── generate/
│   │   ├── docx.ts              # Word document generation
│   │   ├── docx-to-pdf.ts       # PDF conversion
│   │   └── email.ts             # Email functionality
│   ├── generate-docx-py.py      # Python document generator
│   ├── convert-docx-to-pdf.py   # Python PDF converter
│   └── requirements.txt         # Python dependencies
├── vercel.json                   # Vercel configuration
└── .env.example                 # Environment variables template
```

#### **API Endpoints**
Your existing client code already uses the correct endpoints:
- `/api/generate/docx` - Word document generation
- `/api/generate/docx-to-pdf` - PDF generation
- `/api/generate/email` - Email functionality

### 🆚 Render vs Vercel Comparison

| Feature | Render | Vercel |
|---------|--------|--------|
| **Type** | Traditional Server | Serverless Functions |
| **Python Support** | ✅ Full Runtime | ✅ Serverless Functions |
| **Cold Starts** | Minimal | 1-2 seconds |
| **Scaling** | Manual | Automatic |
| **Free Tier** | 512MB RAM | 1GB RAM per function |
| **Build Time** | 5-10 minutes | 2-5 minutes |

### 🔄 Migration Benefits

1. **Faster Deployments**: 2-3x faster build times
2. **Better Performance**: Edge functions and global CDN
3. **Automatic Scaling**: No manual instance management
4. **Cost Effective**: Pay per use vs fixed instances

### 🧪 Testing Your Deployment

1. **Frontend**: Visit your Vercel URL
2. **Word Generation**: Test document download
3. **PDF Generation**: Test PDF conversion
4. **Email**: Test email functionality

### 🎯 Post-Migration Steps

1. **Update DNS**: Point your custom domain to Vercel
2. **Monitor Performance**: Use Vercel Analytics
3. **Set Up Monitoring**: Configure error tracking

### 🔧 Troubleshooting

#### **Common Issues**
1. **Python Dependencies**: Ensure all packages are in `api/requirements.txt`
2. **Environment Variables**: Double-check all variables are set
3. **Function Timeout**: Python functions have 10s limit on free tier

#### **Performance Optimization**
1. **Function Warming**: Add periodic health checks
2. **Caching**: Use Vercel's edge caching
3. **Bundle Size**: Optimize client-side dependencies

### 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables
3. Test API endpoints individually

Your migration is now complete! 🎉