# ExpenseTrack — Medical Sales Agent Expense Manager

AI-powered expense management system for medical sales agents. Scan bills, track expenses, and generate reports.

## Features

- 📸 **AI Bill Scanner** — Upload a receipt and Gemini AI extracts amount, date, vendor, category
- ➕ **Manual Entry** — Quick-add presets and full form for manual expense logging
- 📊 **Dashboard** — Daily/weekly/monthly/yearly stats with interactive charts
- 📋 **Expense History** — Search, filter, edit, delete expenses with receipt viewer
- 📈 **Reports & Analytics** — Category breakdowns, trend charts, Excel/CSV export

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + Recharts
- **Backend**: Express.js + Mongoose
- **Database**: MongoDB Atlas
- **AI OCR**: Google Gemini 2.0 Flash
- **File Storage**: Cloudinary
- **Reports**: ExcelJS

## Getting Started

### 1. Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- Google Gemini API key (free from [aistudio.google.com](https://aistudio.google.com))

### 2. Setup Backend

```bash
cd server
cp .env.example .env
# Edit .env with your credentials
npm install
npm run dev
```

### 3. Setup Frontend

```bash
cd client
npm install
npm run dev
```

### 4. Environment Variables (server/.env)

```
PORT=5000
MONGODB_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GEMINI_API_KEY=...
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with stats and charts |
| `/scan` | AI bill scanner |
| `/add` | Manual expense entry |
| `/history` | Expense history with search/filter |
| `/reports` | Reports & analytics with export |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List expenses (filterable) |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/:id` | Update expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| GET | `/api/expenses/stats/summary` | Dashboard stats |
| GET | `/api/expenses/stats/by-category` | Category breakdown |
| GET | `/api/expenses/stats/trend` | Trend data |
| POST | `/api/scan` | Scan receipt with AI |
| GET | `/api/reports/excel` | Download Excel report |
| GET | `/api/reports/csv` | Download CSV report |
