# 🌍 EarthQuest

A research-driven, narrative-based role-playing game companion platform

EarthQuest enhances a sustainability-focused tabletop RPG set in a near-future Anthropocene world. The platform digitizes player identity, progression, collaboration, and storytelling while preserving the original gameplay experience.

## 📁 Project Structure

```
EQAPP/
├── backend/          # Node.js + Express API
├── frontend/         # React Native (Expo) mobile app
└── README.md
```

## 🛠️ Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB (Atlas)
- Mongoose ODM
- JWT Authentication
- bcryptjs (password hashing)
- dotenv
- cors
- nodemon (dev)

### Frontend
- React Native
- Expo
- TypeScript
- React Navigation
- AsyncStorage
- @react-native-picker/picker

## 📋 Prerequisites

### 1️⃣ Node.js (Required)

Download and install Node.js LTS  
https://nodejs.org/

Verify:
```bash
node -v
npm -v
```

### 2️⃣ Git (Required)

Download Git:  
https://git-scm.com/

Verify:
```bash
git --version
```

### 3️⃣ Expo CLI (Frontend)
```bash
npm install -g expo-cli
expo --version
```

### 4️⃣ Mobile Testing
- Expo Go (Android / iOS)
- Android Studio (Android emulator)
- Xcode (macOS only)

## 🍃 MongoDB Setup (Required)

EarthQuest uses MongoDB Atlas (cloud) — no local MongoDB installation is required.

### Step 1: Create MongoDB Atlas Account

https://www.mongodb.com/cloud/atlas

- Sign up (free)
- No credit card required

### Step 2: Create a Free Cluster

- Choose M0 (Free Tier)
- Cloud provider: AWS
- Region: nearest to you
- Create cluster

### Step 3: Create Database User

Go to:  
**Security → Database Access**

- Username: `earthquest_user` (or your choice)
- Password: create a strong password
- Save credentials

⚠️ **If your password contains special characters (@ / : #), they must be URL-encoded.**

### Step 4: Allow Network Access

Go to:  
**Security → Network Access**

Add IP:
```
0.0.0.0/0
```

(This allows access from any device during development.)

### Step 5: Get Connection String

Go to:  
**Database → Connect → Connect your application**

Copy the URI:
```
mongodb+srv://<username>:<password>@cluster.mongodb.net/
```

Append database name:
```
/earthquest
```

Example:
```
mongodb+srv://earthquest_user:password@cluster0.mongodb.net/earthquest
```

## 🚀 Backend Setup

### Step 1: Navigate to Backend
```bash
cd backend
```

### Step 2: Install Backend Dependencies
```bash
npm install
```

Installed packages:
- express
- mongoose
- bcryptjs
- jsonwebtoken
- dotenv
- cors
- nodemon

### Step 3: Environment Variables

Create `.env` inside `backend/`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/earthquest
JWT_SECRET=earthquest_super_secret
JWT_EXPIRES_IN=7d
```

### Step 4: Start Backend Server
```bash
npm run dev
```

Expected output:
```
MongoDB connected
Server running on port 5000
```

### Step 5: Test Backend

Open browser:
```
http://localhost:5000
```

Response:
```
EarthQuest API running
```

## 🔐 Authentication (Implemented)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login + JWT |
| GET | `/api/auth/me` | Protected route |

Protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```

## 📱 Frontend Setup

### Step 1: Navigate to Frontend
```bash
cd frontend
```

If nested:
```bash
cd frontend/app
```

### Step 2: Install Frontend Dependencies
```bash
npm install
```

Installed packages:
- expo
- react-native
- @react-navigation/native
- @react-navigation/native-stack
- @react-native-async-storage/async-storage
- @react-native-picker/picker

### Step 3: API Configuration (Important)

Create:
```typescript
// frontend/config/api.ts
import { Platform } from "react-native";

export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : "http://192.168.1.32:5000"; // replace with your Wi-Fi IPv4
```

Use everywhere:
```typescript
import { API_URL } from "../config/api";
```

### Step 4: Start Expo
```bash
expo start
```

## 🔄 Development Workflow

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
expo start
```

## 🐛 Troubleshooting

### Mobile Login Timeout
- Phone & laptop must be on same Wi-Fi
- Use Wi-Fi IPv4 (not localhost)
- Check Windows Firewall allows Node.js

### Clear Expo Cache
```bash
expo start -c
```

## 📚 Next Steps

- Player profile screen
- Badge & level system
- Club / campaign flow
- Storefront & membership
- Forum & collaboration tools

## 🤝 Contributing

This is a research project.  
Coordinate changes via GitHub issues or pull requests.

## 📄 License
