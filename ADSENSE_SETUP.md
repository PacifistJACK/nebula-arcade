# Google AdSense Setup Guide

## Step 1: Sign Up for AdSense

1. Go to [Google AdSense](https://www.google.com/adsense)
2. Click "Get Started"
3. Enter your website URL (after deployment)
4. Fill in your details and submit application
5. Wait for approval (usually 1-2 weeks)

## Step 2: Get Your Publisher ID

After approval:
1. Go to AdSense dashboard
2. Click "Ads" → "Overview"
3. Copy your Publisher ID (looks like: `ca-pub-1234567890123456`)

## Step 3: Add AdSense Script to Your Site

Add this to `frontend/index.html` in the `<head>` section:

```html
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```

Replace `ca-pub-XXXXXXXXXXXXXXXX` with your actual Publisher ID.

## Step 4: Update AdBanner Component

In `frontend/src/components/AdBanner.jsx`, replace:
```javascript
data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
```

With your actual Publisher ID.

## Step 5: Create Ad Units in AdSense

1. Go to AdSense → "Ads" → "By ad unit"
2. Click "+ New ad unit"
3. Choose "Display ads"
4. Create these ad units:

### Recommended Ad Units:

**1. Homepage Banner**
- Name: "Homepage Top Banner"
- Type: Display ads
- Size: Responsive
- Copy the `data-ad-slot` number

**2. Leaderboard Banner**
- Name: "Leaderboard Sidebar"
- Type: Display ads
- Size: Responsive
- Copy the `data-ad-slot` number

**3. Game Selection Banner**
- Name: "Game Grid Banner"
- Type: Display ads
- Size: Responsive
- Copy the `data-ad-slot` number

## Step 6: Add Ads to Your Pages

### Example 1: Homepage Banner

In `frontend/src/pages/HomePage.jsx`:

```javascript
import AdBanner from '../components/AdBanner';

// Add after the hero section
<AdBanner 
    slot="1234567890"  // Your ad slot ID
    style={{ maxWidth: '728px', margin: '2rem auto' }}
/>
```

### Example 2: Leaderboard Sidebar

In `frontend/src/pages/Leaderboard.jsx`:

```javascript
import AdBanner from '../components/AdBanner';

// Add in the sidebar or bottom
<AdBanner 
    slot="0987654321"  // Your ad slot ID
    style={{ maxWidth: '300px', margin: '1rem auto' }}
/>
```

### Example 3: Game Selection

In `frontend/src/pages/GameSelect.jsx`:

```javascript
import AdBanner from '../components/AdBanner';

// Add between game cards
<AdBanner 
    slot="1122334455"  // Your ad slot ID
    style={{ maxWidth: '728px', margin: '2rem auto' }}
/>
```

## Recommended Ad Placements (Non-Intrusive):

✅ **Good Placements:**
- Top of homepage (above games)
- Bottom of leaderboard page
- Between game selection cards
- Sidebar on desktop

❌ **Avoid:**
- Inside games (ruins experience)
- Pop-ups during gameplay
- Auto-play video ads
- Too many ads on one page

## Best Practices:

1. **Limit ads per page**: 2-3 maximum
2. **Responsive design**: Use responsive ad units
3. **Natural placement**: Blend with your design
4. **User experience first**: Don't sacrifice gameplay
5. **Monitor performance**: Check AdSense analytics

## Privacy & Legal:

### Add Privacy Policy

Create `frontend/public/privacy-policy.html` with:
- What data you collect
- How you use cookies
- Third-party services (AdSense)
- User rights

### Add Cookie Consent

Install a cookie consent library:
```bash
npm install react-cookie-consent
```

Add to `App.jsx`:
```javascript
import CookieConsent from "react-cookie-consent";

<CookieConsent>
  This website uses cookies to enhance the user experience.
</CookieConsent>
```

## Expected Earnings:

**Conservative Estimates:**
- 100 daily visitors: $1-3/day ($30-90/month)
- 500 daily visitors: $5-15/day ($150-450/month)
- 1,000 daily visitors: $10-30/day ($300-900/month)
- 5,000 daily visitors: $50-150/day ($1,500-4,500/month)

**Factors affecting earnings:**
- Geographic location of visitors
- Ad placement quality
- Click-through rate (CTR)
- Niche/topic relevance

## Deployment Checklist:

- [ ] Sign up for AdSense
- [ ] Get approval
- [ ] Add AdSense script to index.html
- [ ] Update Publisher ID in AdBanner.jsx
- [ ] Create ad units in AdSense
- [ ] Add ad slots to pages
- [ ] Add Privacy Policy
- [ ] Add Cookie Consent
- [ ] Deploy to production
- [ ] Verify ads are showing
- [ ] Monitor AdSense dashboard

## Tips for Success:

1. **Quality content**: Keep making great games
2. **SEO optimization**: Get organic traffic
3. **Social media**: Share your games
4. **Gaming communities**: Reddit, Discord
5. **Regular updates**: Keep users coming back
6. **Analytics**: Track what works

## Support:

If ads don't show:
1. Check browser console for errors
2. Verify Publisher ID is correct
3. Ensure site is deployed (not localhost)
4. Wait 24-48 hours after adding code
5. Check AdSense account status

Good luck with monetization! 🚀
