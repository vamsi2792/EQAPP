# 🌍 EarthQuest – Project Setup & Overview

EarthQuest is a **research-driven, narrative-based role-playing game companion platform** designed to enhance a sustainability-focused tabletop RPG set in a near-future Anthropocene world. The platform digitizes player identity, progression, collaboration, and storytelling while preserving the original gameplay experience.

This repository contains the **initial backend and frontend setup** for the EarthQuest mobile application.

---

## 📁 Repository Structure

EQAPP/
├── backend/ # Node.js + Express backend
├── frontend/ # React Native (Expo) mobile app
├── README.md


---

## 🧩 Tech Stack (Current)

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- bcrypt (password hashing)

### Frontend
- React Native
- Expo
- TypeScript

---

## ✅ Prerequisites

Make sure the following are installed before starting:

### 1. Node.js (Required)
Download and install **Node.js (LTS)**  
https://nodejs.org/

Verify installation:
```bash
node -v
npm -v

2. Git (Required)

Download Git:
https://git-scm.com/

Verify: git --version

3. MongoDB (Required for Backend)

Choose one option:

Option A – Local MongoDB
https://www.mongodb.com/try/download/community

Option B – MongoDB Atlas (Recommended)
https://www.mongodb.com/cloud/atlas

Create a free cluster and copy your connection string.

4. Expo CLI (Frontend)

Install Expo CLI globally:

npm install -g expo-cli


Verify:

expo --version

🚀 Backend Setup (Node.js + Express)
Step 1: Navigate to Backend
cd backend

Step 2: Install Dependencies
npm install

Step 3: Environment Variables

Create a .env file inside the backend/ folder:

PORT=5000
JWT_SECRET=earthquest_secret
MONGO_URI=mongodb://127.0.0.1:27017/earthquest


If using MongoDB Atlas, replace MONGO_URI with your Atlas connection string.

Step 4: Start Backend Server
npm run dev


Expected output:

MongoDB connected
Server running on port 5000


Test in browser:

http://localhost:5000


Expected response:

EarthQuest API running

🔐 Authentication APIs (Implemented)
Register User

POST /api/auth/register

{
  "name": "Test User",
  "email": "test@earthquest.org",
  "password": "password123"
}

Login User

POST /api/auth/login

{
  "email": "test@earthquest.org",
  "password": "password123"
}


Response includes:

JWT token

User object (id, name, role)

📱 Frontend Setup (React Native + Expo)
Step 1: Navigate to Frontend
cd frontend


If the app is inside an app folder:

cd app

Step 2: Install Dependencies
npm install

Step 3: Start Expo App
expo start


This will:

Open Expo DevTools in the browser

Show a QR code in the terminal

Step 4: Run the App

Choose one:

📱 Scan QR code using Expo Go app

🖥️ Android Emulator

🍎 iOS Simulator (Mac only)