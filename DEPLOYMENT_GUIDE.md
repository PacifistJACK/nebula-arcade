# Deployment Guide - Nebula Arcade

## 🚀 Quick Deployment Steps

### Step 1: Push to GitHub

1. **Create a GitHub account** (if you don't have one)
   - Go to https://github.com
   - Sign up for free

2. **Create a new repository**
   - Click "+" in top right → "New repository"
   - Name: `nebula-arcade` (or any name you like)
   - Description: "Neon-themed arcade game platform"
   - Keep it **Public** (required for free hosting)
   - Don't initialize with README (you already have files)
   - Click "Create repository"

3. **Initialize Git in your project**
   ```bash
   cd "d:/Antigravity projects/proj 2"
   git init
   git add .
   git commit -m "Initial commit - Nebula Arcade"
   ```

4. **Connect to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/nebula-arcade.git
   git branch -M main
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` with your GitHub username.

### Step 2: Deploy Frontend (Vercel - Recommended)

**Why Vercel?**
- ✅ Free forever
- ✅ Automatic deployments
- ✅ Custom domain support
- ✅ Perfect for React/Vite
- ✅ Global CDN

**Deployment Steps:**

1. **Sign up for Vercel**
   - Go to https://vercel.com
   - Click "Sign Up"
   - Choose "Continue with GitHub"
   - Authorize Vercel

2. **Import your project**
   - Click "Add New..." → "Project"
   - Select your `nebula-arcade` repository
   - Click "Import"

3. **Configure build settings**
   - Framework Preset: **Vite**
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add these:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_KEY=your_supabase_anon_key
     ```
   - Get these from your Supabase project settings

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your site will be live at: `https://your-project.vercel.app`

### Step 3: Custom Domain (Optional)

1. **Buy a domain** (optional)
   - Namecheap, GoDaddy, or Google Domains
   - Example: `nebulaarcade.com` (~$10-15/year)

2. **Add to Vercel**
   - Go to your project → "Settings" → "Domains"
   - Add your domain
   - Follow DNS instructions

---

## 🎯 Alternative: Netlify Deployment

**If you prefer Netlify:**

1. **Sign up**
   - Go to https://netlify.com
   - Sign up with GitHub

2. **Deploy**
   - Click "Add new site" → "Import an existing project"
   - Choose GitHub → Select repository
   - Build settings:
     - Base directory: `frontend`
     - Build command: `npm run build`
     - Publish directory: `frontend/dist`

3. **Environment Variables**
   - Site settings → Environment variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`

4. **Deploy**
   - Click "Deploy site"
   - Live at: `https://your-site.netlify.app`

---

## 📝 Pre-Deployment Checklist

Before deploying, make sure:

- [ ] Supabase project is set up
- [ ] `scores` table exists in Supabase
- [ ] Environment variables are correct
- [ ] All games work locally
- [ ] No console errors
- [ ] `.env` file is in `.gitignore` (don't commit secrets!)

---

## 🔒 Important: .gitignore

Make sure you have a `.gitignore` file in your project root:

```
# Dependencies
node_modules/
frontend/node_modules/
backend/node_modules/

# Environment variables
.env
frontend/.env
backend/.env
.env.local
.env.production

# Build outputs
frontend/dist/
frontend/build/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
```

---

## 🚀 Deployment Commands Summary

```bash
# 1. Initialize Git
cd "d:/Antigravity projects/proj 2"
git init
git add .
git commit -m "Initial commit"

# 2. Create GitHub repo (do this on GitHub.com first)

# 3. Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/nebula-arcade.git
git branch -M main
git push -u origin main

# 4. Deploy on Vercel (do this on vercel.com)
```

---

## 🔄 Future Updates

After initial deployment, to update your site:

```bash
# Make changes to your code
git add .
git commit -m "Description of changes"
git push

# Vercel/Netlify will auto-deploy! ✨
```

---

## 📊 After Deployment

1. **Test everything**
   - Play all 6 games
   - Test login/signup
   - Check leaderboard
   - Verify scores save

2. **Set up analytics**
   - Google Analytics (free)
   - Vercel Analytics (free)

3. **Apply for AdSense**
   - Need live site URL
   - Usually takes 1-2 weeks for approval

4. **Share your site!**
   - Social media
   - Gaming forums
   - Reddit (r/WebGames, r/gamedev)
   - Discord servers

---

## 💡 Tips

- **Free hosting**: Vercel/Netlify are free forever for personal projects
- **Custom domain**: Optional but looks more professional
- **SSL/HTTPS**: Automatic with Vercel/Netlify
- **Performance**: Both platforms use global CDN (super fast!)
- **Automatic deployments**: Every git push updates your site

---

## 🆘 Troubleshooting

**Build fails?**
- Check environment variables are set
- Verify build command is correct
- Check for console errors locally first

**Games not working?**
- Verify Supabase credentials
- Check browser console for errors
- Ensure all files are committed to Git

**Slow loading?**
- Images optimized?
- Using CDN for assets?
- Check Vercel/Netlify analytics

---

## 🎉 You're Ready!

Your site will be live at:
- Vercel: `https://your-project.vercel.app`
- Netlify: `https://your-site.netlify.app`

Then you can apply for AdSense and start earning! 💰

Good luck! 🚀
