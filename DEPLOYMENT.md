# Deployment Guide

**VOIDCORE: DEEP ALCHEMY** is a pure static site — the production build outputs plain HTML, CSS, and JS with no server required.

---

## Build

```bash
npm install
npm run build
# Output: dist/
```

The `dist/` folder is self-contained and can be hosted on any static host.

---

## Cloudflare Pages

1. Push repository to GitHub
2. Go to **Cloudflare Dashboard → Pages → Create a project**
3. Connect your GitHub repository
4. Set build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** `18` or higher
5. Click **Save and Deploy**

Automatic deployments trigger on every push to `main`.

---

## Netlify

1. Push repository to GitHub
2. Go to **Netlify → Add new site → Import from Git**
3. Choose your repository
4. Build settings are auto-detected from `package.json`, or set manually:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Click **Deploy site**

Or via Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

---

## Vercel

```bash
npm install -g vercel
vercel --prod
```

Or via dashboard — import from GitHub, build settings are auto-detected.

**Note:** Vercel may set base path automatically. Verify `vite.config.ts` has `base: './'`.

---

## GitHub Pages

1. Add `gh-pages` package:
   ```bash
   npm install -D gh-pages
   ```

2. Add to `package.json` scripts:
   ```json
   "deploy": "gh-pages -d dist"
   ```

3. Update `vite.config.ts`:
   ```ts
   base: '/Mining-Hole-Game/'
   ```

4. Deploy:
   ```bash
   npm run build
   npm run deploy
   ```

**Important:** GitHub Pages requires the `base` path to match the repository name.

---

## SPA Routing

**VOIDCORE: DEEP ALCHEMY** is a single-page app with no client-side routing (all navigation is internal state). No `_redirects` or `vercel.json` routing config is required.

---

## Environment Variables

No environment variables are required. The game runs entirely client-side.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Blank page on Cloudflare/Netlify | Check build output directory is `dist` |
| Assets not loading | Ensure `base: './'` in `vite.config.ts` |
| GitHub Pages 404 | Set `base: '/repo-name/'` in `vite.config.ts` |
| Build fails on Node < 18 | Upgrade Node.js to 18 LTS or higher |
| Audio not playing | Browsers require a user gesture before AudioContext starts — clicking Start triggers it automatically |
| Save not persisting | Game uses `localStorage`; private/incognito mode may block it |
