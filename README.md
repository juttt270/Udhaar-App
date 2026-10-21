# 💧 Water Plant Khata & Monthly Udhaar System (Udhaar-App)

Complete, modern, and production-grade Web Management Software tailored for **Mineral Water Supply Plants** to manage monthly customer credit ledgers, daily bottle delivery logs (Roznamcha), cash collections (Wasooli), and instant monthly PDF bills/slips.

---

## 🚀 Key Features

- **📱 Fully Responsive**: Optimized for delivery riders on mobile phones, shop counters on tablets, and desktop managers.
- **🔐 Secure Authentication**: Edge-compatible JWT authentication with `httpOnly` secure cookies and `bcrypt` password hashing. Automatic first-time plant setup wizard.
- **📊 Real-time Dashboard**: Live counters for today's delivered bottles, returned empty cans, today's cash collections, active customers count, and total pending receivables.
- **📅 Roznamcha (Daily Delivery Grid)**:
  - Select date with quick navigation (Today, Yesterday, Next/Previous Day).
  - Search by customer name, phone, or street/area.
  - Interactive stepper buttons (`[-] 1 [+]`) for delivered cans and returned empty cans.
  - 1-click presets (`1 In / 1 Out`, `2 In / 2 Out`, `Clear`).
  - **Single-click Bulk Save** (`Roznamcha Save Karein`) with instant toast alerts.
- **👥 Customer Management**:
  - Add & edit customer records with custom price per can, initial debt balance, and empty bottle deposit.
  - Live debt badges (Wajib-ul-Ada / Advance / Clear).
  - Empty bottle balance tracking (how many cans the customer currently holds).
  - Instant WhatsApp & phone call links.
- **💵 Wasooli (Payment Recording)**:
  - Record cash, EasyPaisa, JazzCash, or bank transfers.
  - Dynamic dropdown showing customer's live pending balance.
  - Recent payment logs with receipt numbers.
- **📄 Monthly Bill & PDF Generator**:
  - Select any month and customer.
  - Generates comprehensive date-wise billing statement (opening balance, deliveries, returns, payments, closing balance).
  - **Instant Download PDF**: Professional, printable A4 water delivery invoice with plant branding, rate breakdown, and authorized signature line.
  - **1-Click WhatsApp Share**: Formats a WhatsApp message ready to send to the customer.
- **⚙️ Plant Profile & Rates**:
  - Custom plant name, phone, address, and default bottle rates.

---

## 🛠️ Technology Stack (Monorepo - Frontend + Backend in One)

- **Framework**: [Next.js](https://nextjs.org/) (App Router + Server API Routes)
- **Language**: TypeScript
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) via Mongoose (512MB Free Forever)
- **Authentication**: `jose` (JWT) + `bcryptjs`
- **PDF Generation**: `jspdf` + `jspdf-autotable` (100% Client-side, zero serverless timeouts)
- **Styling**: Vanilla CSS Design System (Custom aqua theme, responsive grid, toast notifications)
- **Icons**: `lucide-react`
- **Hosting**: [Vercel](https://vercel.com/) (Hobby Plan - 100% Free Forever)

---

## 📦 Local Setup & Development

### 1. Clone the repository
```bash
git clone https://github.com/juttt270/Udhaar-App.git
cd Udhaar-App
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/water_plant_db?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## ☁️ 100% Free Deployment on Vercel & MongoDB Atlas

### Step 1: Create Free MongoDB Atlas Database
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up for free.
2. Create a new cluster and select **M0 (Free Forever)**.
3. Under **Database Access**, create a database user (e.g., `wateruser` and a strong password).
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere, required for Vercel serverless).
5. Click **Connect** -> **Drivers** -> Copy your connection string (URI).

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com/) and sign in with GitHub.
2. Click **Add New...** -> **Project** -> Import `juttt270/Udhaar-App`.
3. In **Environment Variables**, add:
   - `MONGODB_URI`: *Your MongoDB connection string from Step 1*
   - `JWT_SECRET`: *Any random string (e.g. `water_plant_secure_secret_2026`)*
4. Click **Deploy**!
5. Your application will be live in 1 minute on a free `https://your-app.vercel.app` domain with automatic SSL!

---

## 📝 License
MIT License. Built for mineral water plants & delivery businesses.
