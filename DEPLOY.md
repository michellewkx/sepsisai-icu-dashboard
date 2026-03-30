# 🚀 Deploy to Vercel - Get Your Free Domain!

## Method 1: Vercel Website (Easiest - 5 minutes)

### Step 1: Go to Vercel
Visit: **https://vercel.com/new**

### Step 2: Connect GitHub
1. Click **"Continue with GitHub"**
2. Authorize Vercel to access your repos
3. Select your organization or personal account

### Step 3: Import Repository
1. Find your `sepsis-ai-dashboard` repo
2. Click **"Import"**

### Step 4: Configure Project

**Project Name:** `sepsis-ai` (or whatever you prefer)

**Framework Preset:** **"Other"**

**Root Directory:** `demo`

**Build & Output Settings:**
- Build Command: `pip install -r requirements.txt`
- Output Directory: Leave empty (Python doesn't need this)
- Install Command: `pip install -r requirements.txt`

**Environment Variables** (Click "Add" for each):
- **PORT**: `8000`

### Step 5: Deploy
1. Click **"Deploy"** button
2. Wait 1-3 minutes
3. **Done!** 🎉

### Step 6: Get Your Free Domain
After deployment, you'll see:
```
Production: https://sepsis-ai.vercel.app
```

**That's it!** Your demo is live! 🚀

---

## Method 2: Vercel CLI (Pro Method)

### Prerequisites
- Node.js 20+ (optional, for CLI)
- GitHub account with repo access

### Deploy Commands

```bash
# 1. Navigate to demo folder
cd /Users/wangkexin02/workspace/baidu/agents/infographic/itc-competition/demo

# 2. Login to Vercel (opens browser)
npx vercel login

# 3. Deploy
npx vercel --prod

# 4. Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Select your account/org
# - Link to existing project? No
# - Project name? sepsis-ai
# - In which directory is your code? ./ (current directory)
# - Want to modify these settings? No

# 5. Done! You'll get a URL like:
# https://sepsis-ai.vercel.app
```

---

## 🔗 Custom Domain (Optional, Same Day!)

### Buy a Domain
- **Namecheap**: $10/year
- **Cloudflare**: $8/year (recommended)

### Configure in Vercel
1. Go to **Vercel Dashboard** → **sepsis-ai** → **Settings** → **Domains**
2. Click **"Add"** → Enter your domain (e.g., `sepsisai.com`)
3. **Copy DNS records** from Vercel

### Update DNS
1. Go to your domain provider (Namecheap/Cloudflare)
2. **Add DNS records**:
   - Type: **CNAME**
   - Name: **www**
   - Value: **cname.vercel-dns.com**

### Wait 5-30 minutes
- DNS propagation takes time
- Vercel will auto-configure HTTPS

---

## 🐛 Troubleshooting

### Build Fails?

**Issue:** Python version too old
**Fix:** Add `runtime.txt`:
```text
python-3.10.13
```

**Issue:** Dependencies not found
**Fix:** Ensure `requirements.txt` is in root:
```bash
cd demo
cat requirements.txt
```

### Can't Access?

**Issue:** Domain not resolving
**Fix:**
1. Check DNS settings match Vercel's instructions
2. Wait 15-30 minutes for DNS propagation
3. Use `dig` or `nslookup` to verify:
```bash
dig yourdomain.com
```

### Server Error?

**Issue:** 500/502 errors
**Fix:**
1. Check Vercel deployment logs
2. Ensure PORT environment variable is set to `8000`
3. Verify `api/index.py` exists and imports correctly

---

## 📊 What You Get After Deployment

### Free Tier Includes:
✅ **Free subdomain**: `sepsis-ai.vercel.app`
✅ **Automatic HTTPS**: SSL certificates included
✅ **Global CDN**: Fast worldwide access
✅ **100GB bandwidth/month**: Plenty for demos
✅ **Auto-deploy on git push**: Updates automatically

### Limits:
- 100GB bandwidth/month
- 6,000 minutes/month execution time
- 10 builds/day

For ITC competition: **Free tier is more than enough!**

---

## 🎯 Quick Reference

| Action | Command |
|--------|----------|
| Deploy to preview | `npx vercel` |
| Deploy to production | `npx vercel --prod` |
| View logs | `npx vercel logs` |
| Open dashboard | `npx vercel open` |

---

## 📝 Checklist for ITC Competition

- [ ] Deploy to Vercel (Method 1 or 2)
- [ ] Test all API endpoints work
- [ ] Verify responsive design on different devices
- [ ] Check auto-refresh functionality
- [ ] Test with different patients (low/medium/high risk)
- [ ] **Optional**: Buy and configure custom domain
- [ ] Document the live URL in your presentation
- [ ] **Backup**: Have local copy ready if needed

---

## 🔗 Helpful Links

- **Vercel**: https://vercel.com
- **Vercel Python Docs**: https://vercel.com/docs/frameworks/python
- **Your Project**: https://vercel.com/dashboard (after login)
- **GitHub Integration**: https://vercel.com/docs/deployments/overview

---

## 💡 Pro Tips

1. **Test First**: Use `npx vercel` (preview) before `--prod`
2. **Keep URLs Handy**: Save both preview and production URLs
3. **Monitor**: Check deployment logs if something breaks
4. **Auto-Deploy**: Connect GitHub for automatic updates on push
5. **Team Access**: Add team members to Vercel project for easy collaboration

---

## ✅ Success!

Once deployed, you'll have:
- **Live demo**: https://sepsis-ai.vercel.app (or similar)
- **Shareable link** for your team and competition judges
- **Professional showcase** of your SepsisAI system
- **Zero hosting costs** (free tier)

**Your demo is ready to impress! 🎉**

---

**Last Updated:** March 2026
**Version:** 1.0.0
