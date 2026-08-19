# ICE Jail Tax (www.icejailtax.com)

A standalone, high-performance civic web application that calculates the estimated property value decline for homeowners and taxpayers near the proposed Department of Homeland Security / ICE detention center in Williamsport (Washington County), Maryland.

Based on empirical research published in November 2024 by MIT Press in *The Review of Economics and Statistics* (*"The Local Impacts of Prisons"*).

---

## Features

- **Real-Time Address Matching & Property Valuation**:
  - Distance calculation to the proposed facility (10900 Hopewell Rd / 16220 Wright Rd, Williamsport, MD).
  - Integration with Maryland Department of Planning iMAP / SDAT official property records.
  - Automatic calculation of dollar loss based on the study's distance tiers:
    - **&le; 1.24 miles**: 3.4% estimated decline ($p < 0.01$, Strong statistical certainty)
    - **&le; 1.86 miles**: 2.0% estimated decline ($p < 0.10$)
    - **&le; 2.49 miles**: 1.8% estimated decline ($p < 0.10$)
- **Custom Valuation Calculator**:
  - Allows anyone to test hypothetical or market valuations at any percentage rate.
- **Interactive Leaflet Map Visualizer**:
  - Displays the proposed facility and concentric impact circles with interactive popups and line-of-sight distance rendering.
- **Action & Public Comment Generator**:
  - One-click copy tool generating pre-formatted official testimony customized with the user's specific address and dollar loss figures.
- **Community Impact Breakdown**:
  - Explains the estimated $22.3 Million total property value risk across Williamsport, Hagerstown, Halfway, Kemps Mill, Pinesburg, and Wilson-Conococheague.
- **Social Sharing & SEO**:
  - OpenGraph, Twitter card tags, JSON-LD Schema.org metadata, and fast mobile-first responsive layout.

---

## Tech Stack & Architecture

- **Frontend**: Pure modern HTML5, CSS3 (Custom Properties, Grid, Flexbox), Vanilla JavaScript (ES6+).
- **Mapping**: Leaflet.js + CARTO Positron map tiles.
- **Data APIs**:
  - Primary: Hagerstown Rapid Response Address Checker API (`https://hagerstownrapidresponse.com/wp-json/hrr-address-checker/v1/check`) with full CORS support.
  - Fallback: U.S. Census Bureau Geocoding API + Maryland iMAP ArcGIS REST Service.
- **Hosting Ready**: Works statically out of the box with Cloudflare Pages, Vercel, Netlify, GitHub Pages, Apache, or Nginx.

---

## Deployment Instructions

### Option 1: Cloudflare Pages
1. Push this repository to GitHub or GitLab.
2. Go to Cloudflare Dashboard &rarr; Pages &rarr; Create a project.
3. Select your repository. Build output directory: `./` (root).
4. In custom domains, add `www.icejailtax.com` and `icejailtax.com`.

### Option 2: Vercel
1. Run `npx vercel` or connect the repository in your Vercel Dashboard.
2. Root directory: `./`. No build command needed.
3. Attach custom domain `www.icejailtax.com`.

### Option 3: Traditional Web Host (cPanel / Hostinger / Apache / Nginx)
1. Upload all files (`index.html`, `css/`, `js/`, `assets/`, `_headers`, `robots.txt`, `sitemap.xml`) to the `public_html` directory of `www.icejailtax.com`.

---

## Local Development & Testing

To run the site locally:

```bash
# Python
python -m http.server 3000

# Node.js / npx
npx serve .
```

Open `http://localhost:3000` in your web browser.
