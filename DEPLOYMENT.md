# 🚀 HealthNexus Deployment Guide

This guide will help you deploy HealthNexus (Frontend + Backend) for free using **Render**.

---

## 🟢 Part 1: Backend Deployment (Render)

1.  **Sign Up/Login** to [Render.com](https://render.com).
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository: `Sumit-Ratna/Medicare`.
4.  Crucial Settings:
    *   **Name**: `healthnexus-backend` (or similar)
    *   **Region**: Closest to you (e.g., Singapore/Frankfurt).
    *   **Root Directory**: `backend` (Important!)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node src/server.js`
    *   **Plan**: Free

5.  **Environment Variables** (Scroll down to "Advanced"):
    Add the following variables (Key = Value):
    *   `PORT` = `8000`
    *   `NODE_ENV` = `production`
    *   `JWT_SECRET` = (Generate a random string or use existing)
    *   `GEMINI_API_KEY` = (Your AI Key)
    *   `MEDGEMMA_API_KEY` = (Your MedGemma Key)
    *   `FIREBASE_SERVICE_ACCOUNT` = (Paste the **entire content** of your `service-account.json` file here as a single string)

6.  Click **Create Web Service**.
7.  Wait for deployment. Once live, copy the **Backend URL** (e.g., `https://healthnexus-backend.onrender.com`).

---

## 🔵 Part 2: Frontend Deployment (Render or Vercel)

We recommend using **Render Static Site** for simplicity, or **Vercel** for speed.

### Option A: Render (Static Site)
1.  Click **New +** -> **Static Site**.
2.  Connect the same GitHub repo.
3.  Settings:
    *   **Name**: `healthnexus-frontend`
    *   **Root Directory**: `frontend_react`
    *   **Build Command**: `npm run build`
    *   **Publish Directory**: `dist`
4.  **Environment Variables**:
    *   `VITE_API_URL` = (Your **Backend URL** from Part 1, e.g., `https://healthnexus-backend.onrender.com`)
    *   `VITE_FIREBASE_API_KEY` = (From `frontend_react/.env`)
    *   `VITE_FIREBASE_AUTH_DOMAIN` = (From `frontend_react/.env`)
    *   `VITE_FIREBASE_PROJECT_ID` = (From `frontend_react/.env`)
    *   ... (Add all other VITE aliases from your local .env)

5.  Click **Create Static Site**.
6.  Your app is now live! 🚀

---

## 🐞 Troubleshooting

*   **CORS Error**: If the frontend can't talk to the backend, ensure your Backend URL in Frontend environment variables (`VITE_API_URL`) has no trailing slash (e.g., `...onrender.com` not `...onrender.com/`).
*   **Database Error**: Ensure `FIREBASE_SERVICE_ACCOUNT` is pasted correctly in Backend Environment Variables. It must be valid JSON content.
