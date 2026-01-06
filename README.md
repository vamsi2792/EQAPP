# 🌍 EarthQuest

**A research-driven, narrative-based role-playing game companion platform**

EarthQuest enhances a sustainability-focused tabletop RPG set in a near-future Anthropocene world. The platform digitizes player identity, progression, collaboration, and storytelling while preserving the original gameplay experience.

---

## 📁 Project Structure

```
EQAPP/
├── backend/          # Node.js + Express API
├── frontend/         # React Native (Expo) mobile app
└── README.md
```

---

## 🛠️ Technology Stack

**Backend**
- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT Authentication
- bcrypt for password hashing

**Frontend**
- React Native
- Expo
- TypeScript

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### 1. **Node.js** (Required)
- Download and install [Node.js LTS](https://nodejs.org/)
- Verify installation:
  ```bash
  node -v
  npm -v
  ```

### 2. **Git** (Required)
- Download [Git](https://git-scm.com/)
- Verify installation:
  ```bash
  git --version
  ```

### 3. **Expo CLI** (Required for Frontend)
- Install globally:
  ```bash
  npm install -g expo-cli
  ```
- Verify installation:
  ```bash
  expo --version
  ```

### 4. **Mobile Testing** (Choose One)
- **Expo Go App**: Install on your iOS or Android device
- **Android Studio**: For Android emulator
- **Xcode**: For iOS simulator (macOS only)

---

## 🚀 Backend Setup

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Development Server
```bash
npm run dev
```

**Expected Output:**
```
[nodemon] 3.1.11
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node src/server.js`
Server running on port 5000
```

### Step 4: Test the API
Open your browser and navigate to:
```
http://localhost:5000
```

**Expected Response:**
```json
"EarthQuest API running"
```

---

## 🔐 Authentication Endpoints

> **Note:** Authentication endpoints will be implemented in future updates. The basic server setup is now complete.

---

## 📱 Frontend Setup

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

If your app is nested in an `app/` folder:
```bash
cd frontend/app
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start Expo Development Server
```bash
expo start
```

This will:
- Open Expo DevTools in your browser
- Display a QR code in the terminal
- Show options for running on different platforms

### Step 4: Run the App

Choose your preferred method:

#### 📱 **Physical Device**
1. Install **Expo Go** from App Store (iOS) or Google Play (Android)
2. Scan the QR code displayed in your terminal

#### 🤖 **Android Emulator**
- Press `a` in the terminal
- Requires Android Studio with an emulator configured

#### 🍎 **iOS Simulator** (macOS only)
- Press `i` in the terminal
- Requires Xcode installed

---

## 🔄 Development Workflow

### Backend
```bash
cd backend
npm run dev          # Start development server with hot reload
```

### Frontend
```bash
cd frontend
expo start           # Start Expo development server
```

---

## 🐛 Troubleshooting

### Expo Not Starting
```bash
# Clear Expo cache
expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Port Already in Use
```bash
# Kill process on port 5000 (macOS/Linux)
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📚 Next Steps

- [ ] Integrate MongoDB database
- [ ] Set up authentication system (JWT)
- [ ] Create character creation endpoints
- [ ] Implement campaign management
- [ ] Design UI/UX for mobile app
- [ ] Add real-time collaboration features
- [ ] Integrate storytelling mechanics

---

## 🤝 Contributing


## 📄 License



