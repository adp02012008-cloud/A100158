# Bug Slayers Team Hub Setup Guide

## Architecture Overview

- **Frontend**: Vite + React PWA (`src/`)
- **Backend API**: Node.js + Express Server (`server/index.js`)
- **Database**: MongoDB Mongoose (`server/models/`)
- **Authentication**: Firebase Authentication (Server-side verified ID Tokens)

---

## 1. Environment Setup

Create `.env` file from `.env.example`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/team_dashboard
FIREBASE_WEB_API_KEY=AIzaSyA-IZJElov16omfcApWpfWEVNA-F8ILX78
VITE_API_URL=http://localhost:5000/api
```

---

## 2. Install & Run Express Server

```bash
npm install
npm run dev
```

The Express API server starts on port `5000`.

---

## 3. Data Migration (Optional)

To import legacy data from Google Sheets to MongoDB:

```bash
RUN_MIGRATION=true node server/scripts/migrateSheetsToMongo.js
```
