# 🚀 Exam Portal — Complete Production Deployment Guide

A complete, beginner-friendly, step-by-step guide to deploying the **Online Examination & AI Proctoring Portal** to free/production-grade cloud hosting.

---

## 📑 Table of Contents
1. [System Architecture](#-system-architecture)
2. [Prerequisites & Accounts](#-prerequisites--accounts)
3. [Step 1: Code Preparation (5 Minutes)](#step-1-code-preparation)
4. [Step 2: Deploy Backend to Render](#step-2-deploy-backend-to-render)
5. [Step 3: Deploy Frontend to Vercel](#step-3-deploy-frontend-to-vercel)
6. [Step 4: Connect Frontend & Backend (CORS)](#step-4-connect-frontend--backend)
7. [Step 5: Database & Cloudinary Configuration](#step-5-database--cloudinary-configuration)
8. [Step 6: Post-Deployment Verification Checklist](#step-6-post-deployment-verification-checklist)
9. [Troubleshooting & Common Questions](#-troubleshooting--faq)

---

## 🏗 System Architecture

```
                                  ┌────────────────────────┐
                                  │     User / Browser     │
                                  └───────────┬────────────┘
                                              │
                     ┌────────────────────────┴────────────────────────┐
                     ▼                                                 ▼
        ┌─────────────────────────┐                       ┌─────────────────────────┐
        │    Vercel (Frontend)    │                       │    Render (Backend)     │
        │ • React 18 + Vite SPA   │                       │ • Node.js + Express API │
        │ • YOLOv8m ONNX AI Model │◄─────────────────────►│ • PDF / Excel Exports   │
        │ • WebGPU & WASM Runtime │      HTTPS REST       │ • SMTP Email Alerts     │
        │ • High-Speed Global CDN │                       │ • May 1st Cron Job      │
        └─────────────────────────┘                       └────────────┬────────────┘
                                                                       │
                                        ┌──────────────────────────────┴──────────────────────────────┐
                                        ▼                                                             ▼
                         ┌─────────────────────────────┐                               ┌─────────────────────────────┐
                         │     MongoDB Atlas (DB)      │                               │     Cloudinary (Storage)    │
                         │ • Users, Passwords & Roles  │                               │ • Student Resumes (.pdf)    │
                         │ • Exams, Questions, Bank    │                               │ • Proctor Violation Photos  │
                         │ • Submissions & Logs        │                               │                             │
                         └─────────────────────────────┘                               └─────────────────────────────┘
```

---

## 🔑 Prerequisites & Accounts

Create free accounts on these platforms (all have 100% free tiers):

1. **GitHub**: You already have your repository at `https://github.com/PBKrishnaAbhisri/exam_portal`.
2. **[Render.com](https://render.com/)**: Free hosting for the Node.js backend.
3. **[Vercel.com](https://vercel.com/)**: Fast global CDN hosting for the React frontend + YOLOv8 AI model.
4. **[MongoDB Atlas](https://www.mongodb.com/atlas)**: Cloud database (already set up).
5. **[Cloudinary](https://cloudinary.com/)**: Cloud media storage (already set up).

---

## Step 1: Code Preparation

Make sure your repository has dynamic API configuration and SPA routing before deploying:

### 1.1 Verify Frontend API Base URL
In `frontend/src/api/index.js`, ensure `API_BASE` reads from Vite environment variables:

```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const API = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
```

### 1.2 Create `frontend/vercel.json`
Inside the `frontend/` folder, create a file named `vercel.json` with this exact content:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" }
      ]
    }
  ]
}
```
> **Why is this needed?**
> 1. `rewrites`: Prevents 404 errors when refreshing routes like `/admin/dashboard` or `/student/exam/:id`.
> 2. `headers`: Unlocks multi-threaded `SharedArrayBuffer` so the **YOLOv8 AI Proctoring** model runs at maximum speed using WebGPU / WASM.

### 1.3 Commit and Push
```powershell
git add .
git commit -m "Configure production environment and vercel routing"
git push origin main
```

---

## Step 2: Deploy Backend to Render

1. Log in to **[Render.com](https://dashboard.render.com/)** using your GitHub account.
2. Click **New +** in the top right corner ➜ Select **Web Service**.
3. Under *Connect a repository*, choose **`PBKrishnaAbhisri/exam_portal`**.
4. Fill in the service details:

| Setting | Value |
| :--- | :--- |
| **Name** | `exam-portal-backend` |
| **Region** | Singapore *(or nearest region)* |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

5. Scroll down to **Environment Variables** and add the following keys and values:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `MONGO_URI` | `mongodb+srv://krishnaabhisripb_db_user:TkOgvQEAWPrpI9uK@cluster0.mrofvxx.mongodb.net/exam_portal?retryWrites=true&w=majority` | Your MongoDB Atlas connection |
| `JWT_SECRET` | `your_super_secret_jwt_key_change_in_production` | Secret string for auth tokens |
| `CLOUDINARY_CLOUD_NAME` | `ylqs1w4d` | Cloudinary account name |
| `CLOUDINARY_API_KEY` | `938539997936326` | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | `pGaVG3SllmGZ5nzmzIL5KqcAWTk` | Cloudinary Secret |
| `SMTP_USER` | `krishnaabhisripb@gmail.com` | Notification email address |
| `SMTP_PASS` | `krexirygcmxlxiav` | Gmail App Password (16 letters) |
| `FRONTEND_URL` | `http://localhost:5173` *(Will update after Step 3)* | Allowed CORS origin |

6. Click **Deploy Web Service**.
7. Wait ~2-3 minutes for the build to finish.
8. Once the status shows **Live**, copy your backend URL:
   `https://exam-portal-backend-xxxx.onrender.com`
9. Test the health endpoint in your browser:
   `https://exam-portal-backend-xxxx.onrender.com/api/health`
   *(Should display: `{"status":"OK","message":"Exam Portal API is running."}`)*

---

## Step 3: Deploy Frontend to Vercel

1. Log in to **[Vercel.com](https://vercel.com/)** using your GitHub account.
2. Click **Add New...** ➜ Select **Project**.
3. Find **`exam_portal`** from the list and click **Import**.
4. Configure the build settings:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Framework Preset** | `Vite` | Auto-detected |
| **Root Directory** | Click `Edit` and select **`frontend`** | **Crucial step** |
| **Build Command** | `npm run build` | Default |
| **Output Directory** | `dist` | Default |

5. Expand **Environment Variables** and add:

| Key | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://exam-portal-backend-xxxx.onrender.com/api` *(Your Render backend URL + `/api`)* |

6. Click **Deploy**.
7. Vercel will build your React application and bundle the ~99MB `yolov8m.onnx` model into the static global CDN.
8. When deployment finishes, copy your live frontend URL:
   `https://exam-portal-frontend.vercel.app`

---

## Step 4: Connect Frontend & Backend

Now that your frontend has a live URL, update the backend CORS settings:

1. Go back to your **[Render Dashboard](https://dashboard.render.com/)**.
2. Click on **`exam-portal-backend`** ➜ Go to the **Environment** tab.
3. Find the `FRONTEND_URL` variable and change its value to your live Vercel URL:
   `FRONTEND_URL` = `https://exam-portal-frontend.vercel.app`
4. Click **Save Changes**. Render will automatically trigger a quick re-deploy with the new origin.

---

## Step 5: Database & Cloudinary Configuration

### 5.1 MongoDB Atlas Network Access
1. Open [MongoDB Atlas](https://cloud.mongodb.com/).
2. In the left navigation, click **Network Access** under **Security**.
3. Make sure there is an active IP entry:
   - **IP Address**: `0.0.0.0/0` (Allow access from anywhere).
   *(If not present, click **Add IP Address** ➜ Choose **Allow Access from Anywhere** ➜ Click **Confirm**).*

### 5.2 Cloudinary Media Settings
- Ensure your Cloudinary account allows unsigned or signed uploads as configured in your backend.
- The default configuration uses `multer-storage-cloudinary` which handles authenticated uploads directly on the backend server.

---

## Step 6: Post-Deployment Verification Checklist

Once both services are running, perform these checks to verify everything works:

- [ ] **Student Signup & Login**: Register a test student and log in.
- [ ] **Admin Login**: Log in with an admin account and check the dashboard.
- [ ] **Create & Publish Exam**: Create an exam with multiple sections/questions.
- [ ] **YOLOv8 AI Proctoring**:
  - Start an exam as a student.
  - Allow camera access.
  - Watch the model loading progress bar reach 100%.
  - Check that phone/laptop detection triggers violations properly.
- [ ] **Violation Snapshots**: Trigger a violation and verify the snapshot appears in the Admin review panel (stored in Cloudinary).
- [ ] **Resume Upload**: Upload a student resume (.pdf) and verify the download link from the Admin Students list.
- [ ] **Export Results**: Download PDF and Excel analytics for completed exams.
- [ ] **Email Notifications**: Test "Notify Students" or "Forgot Password OTP" to confirm Gmail SMTP is delivering emails.

---

## 💡 Troubleshooting & FAQ

#### 1. Why does the backend take 30-50 seconds to respond on first load?
> **Answer**: Free instances on Render spin down (sleep) after 15 minutes of inactivity. When a new request arrives, Render automatically wakes up the server (this is called a "cold start"). Subsequent requests are instant.

#### 2. The AI Proctor says "Failed to load model" or stays at 0%
> **Answer**:
> - Verify that `frontend/public/models/yolov8m.onnx` is present in your GitHub repository.
> - Ensure your browser has WebGL / WebGPU enabled and hardware acceleration is on in Chrome settings.

#### 3. CORS Error in Browser Console (`Access-Control-Allow-Origin`)
> **Answer**:
> - Check that `FRONTEND_URL` in your Render Environment Variables matches your exact Vercel URL (e.g., `https://your-app.vercel.app` without a trailing slash).

#### 4. Page refresh gives 404 on sub-pages (e.g. `/student/dashboard`)
> **Answer**:
> - Ensure `frontend/vercel.json` exists in your repository with the `"rewrites"` rule shown in Step 1.2.

---

*Created for the Exam Portal project. Keep this guide handy for future updates and deployments!*
