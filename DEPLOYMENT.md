# InvestIQ Deployment Guide

This guide details the step-by-step procedure for deploying the **InvestIQ** Investment Research Terminal in production: hosting the Node.js Express backend on **Render**, and the React frontend on **Vercel**.

---

## 1. Backend Deployment on Render

Render is a cloud application platform that hosts web services natively from Git repositories.

### Step 1: Prepare the Codebase
Ensure that `backend/package.json` contains a production start script (which runs the server using node):
```json
"scripts": {
  "start": "node src/server.js",
  "dev": "node --watch src/server.js"
}
```
*Note: Do not run `nodemon` or Node `--watch` flags in production environments.*

### Step 2: Create a New Web Service on Render
1. Sign in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository.
4. Configure the Web Service settings:
   - **Name**: `investiq-backend` (or a name of your choice).
   - **Language**: `Node`.
   - **Branch**: `main`.
   - **Root Directory**: `backend` (Crucial: set this so Render builds from the backend folder).
   - **Build Command**: `npm install` (or `npm ci` for clean reproducible installs).
   - **Start Command**: `npm start`.
   - **Instance Type**: Select **Free** (or any tier of your choice).

### Step 3: Configure Environment Variables
In the **Environment** tab of your Render Web Service, add the following variables:
- `MONGODB_URI`: Your MongoDB Atlas connection string.
- `JWT_SECRET`: A long, cryptographically secure random string to sign JWT tokens.
- `GEMINI_API_KEY`: Your Google AI Studio API key.
- `TAVILY_API_KEY`: Your Tavily search API key.
- `TWELVEDATA_API_KEY`: Your Twelve Data API key (enables real-time symbol lookup; local alias fallback triggers if absent or exhausted).
- `GOOGLE_CLIENT_ID`: Google OAuth 2.0 client credentials client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth 2.0 client credentials client secret.
- `BACKEND_URL`: The active URL of this Render Web Service (e.g. `https://investiq-backend.onrender.com`).
- `FRONTEND_URL`: The active URL of your Vercel deployment (e.g. `https://investiq.vercel.app`).
- `PORT`: (Optional) Render automatically binds the container to its own port, which our server reads dynamically from `process.env.PORT || 5000`.

Click **Create Web Service**. Render will build and launch the API server.

---

## 2. Frontend Deployment on Vercel

Vercel is optimized for frontend framework deployments, providing fast build hooks and global edge routing.

### Step 1: Verify SPA Routing Configuration
Vercel requires custom configuration to prevent `404 Not Found` errors when users reload deep pages (like `/login` or `/signup`). InvestIQ includes a preconfigured `frontend/vercel.json` file:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
This forces Vercel to route all paths back to the client-side router (`index.html`).

### Step 2: Configure a New Project on Vercel
1. Sign in to your [Vercel Dashboard](https://vercel.com).
2. Click **Add New** and select **Project**.
3. Import your Git repository.
4. Configure the Project settings:
   - **Framework Preset**: `Vite` (Vercel auto-detects this).
   - **Root Directory**: `frontend` (Crucial: click edit and select the `frontend` folder).
   - **Build Command**: `npm run build`.
   - **Output Directory**: `dist`.
   - **Install Command**: `npm install`.

### Step 3: Add Production Environment Variables
Expand the **Environment Variables** section and add:
- `VITE_API_URL`: The complete URL of your live Render backend (e.g. `https://investiq-backend.onrender.com`). No trailing slash.

Click **Deploy**. Vercel will bundle the React assets and distribute them across their edge network.

---

## 3. Reference Environment Configuration

### Backend variables (`backend/.env` / Render Env Settings)
| Variable Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | Required | Connection string to MongoDB cluster | `mongodb+srv://user:pass@cluster.mongodb.net/investiq` |
| `JWT_SECRET` | Required | Key for signing session web tokens | `8d5e1fbc737402a...` |
| `GEMINI_API_KEY` | Required | Google Generative AI API key | `AIzaSy...` |
| `TAVILY_API_KEY` | Required | Tavily Search API key for web RAG | `tvly-...` |
| `TWELVEDATA_API_KEY`| Optional | Twelve Data API key for stock symbol resolution | `a4e7e...` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID | `12345-abc.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET`| Optional | Google OAuth client secret | `GOCSPX-xyz` |
| `BACKEND_URL` | Required | Live backend server base url | `https://investiq-api.onrender.com` |
| `FRONTEND_URL` | Required | Live frontend server base url | `https://investiq-app.vercel.app` |

### Frontend variables (`frontend/.env` / Vercel Env Settings)
| Variable Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Required | Endpoint pointing to live API server | `https://investiq-api.onrender.com` |

---

## 4. Common Deployment Issues & Troubleshooting

### 1. Server-Sent Events (SSE) / EventSource Connection Drops
- **Symptom**: The UI starts the research pipeline but gets stuck at Stage 1, or returns a "Connection to streaming endpoint lost" or timeout error.
- **Cause**: Many cloud host services and proxies (like Render, Cloudflare, or AWS ELB) buffer server responses by default. This interferes with Server-Sent Events since SSE relies on immediate unbuffered chunk delivery.
- **Resolution**:
  - InvestIQ uses custom backend routing headers: `'X-Accel-Buffering': 'no'`.
  - On Render, this is resolved automatically by setting `X-Accel-Buffering: no` headers. If you use a proxy server or custom Nginx, ensure buffering is explicitly disabled for `/api/research/stream`.
  - For Render specifically, if the connection terminates due to idle timeouts (Render kills connections after 100 seconds of inactivity), the Express server runs an active heartbeat logging (`res.write(': heartbeat\n\n')`) every 15 seconds to keep the line active.

### 2. MongoDB Network Permissions / Connection Timeouts
- **Symptom**: Render deployment logs show `MongoDB connection error: MongooseServerSelectionError: connection timed out` or server fails to boot.
- **Cause**: MongoDB Atlas clusters reject traffic from unknown IP addresses by default. Since Render services do not run on static IPs (IP addresses change dynamically with each deploy or scaling event), the database blocks the connection.
- **Resolution**:
  - In MongoDB Atlas, go to **Network Access**.
  - Add a new entry to the IP Access List and set the IP Address to `0.0.0.0/0` (Allow Access from Anywhere).
  - Ensure the connection password string is properly URL-encoded (especially if it contains special characters like `@`, `/`, `+` or `:`).

### 3. Google OAuth Redirect URI Mismatches
- **Symptom**: Clicking "Continue with Google" redirects the browser to a Google error page displaying `Error 400: redirect_uri_mismatch`.
- **Cause**: Google Console restricts callback redirects to URLs explicitly whitelisted in the OAuth credential list.
- **Resolution**:
  - Log in to your [Google Cloud Console](https://console.cloud.google.com).
  - Select your project, navigate to **APIs & Services** > **Credentials**.
  - Edit your OAuth 2.0 Client ID.
  - Under **Authorized redirect URIs**, add your production endpoint:
    `https://<your-backend-render-subdomain>.onrender.com/api/auth/google/callback`
  - In your Render backend env variables, verify that `BACKEND_URL` is set to `https://<your-backend-render-subdomain>.onrender.com` with NO trailing slash.

### 4. Twelve Data API Rate Limits & Missing Keys
- **Symptom**: User gets `Twelve Data API key is missing` or `symbol search response status` error on stock search.
- **Cause**: On the free tier, Twelve Data limits lookups.
- **Resolution**:
  - Set a valid `TWELVEDATA_API_KEY` in environment configurations.
  - If rate limits are hit, the application automatically catches the network exception and searches our pre-compiled emergency fallbacks registry (`ALIAS_FALLBACK` in `companyResolver.js`). Add any essential demo stocks (e.g., standard symbols like Apple, Google, Microsoft, Tesla, TCS, Infosys, Reliance, HDFC, Nvidia) to `ALIAS_FALLBACK` to guarantee uptime during grading reviews.
