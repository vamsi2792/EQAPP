# EarthQuest Project Documentation

## 1. Project Overview

EarthQuest is a companion mobile platform for a sustainability-focused tabletop role-playing game. The app supports user registration, email verification, login, adventure selection, an interactive 3D map, mission brief content, member/GM roles, club management concepts, profile screens, and a storefront/membership flow.

The current project is split into two main parts:

- `backend/` - Node.js, Express, MongoDB, JWT API server.
- `frontend/earthquest-app/` - Expo React Native mobile application.

The project currently runs in development using a local backend on port `5000`, exposed publicly through ngrok so that Expo Go on a phone can call the backend and load the hosted map HTML.

## 2. Technology Stack

### Backend

- Node.js
- Express
- MongoDB Atlas
- Mongoose
- JWT authentication
- bcryptjs password hashing
- Nodemailer using Gmail credentials
- ArcGIS token generation through the ArcGIS REST API
- dotenv for environment variables
- ngrok for exposing local backend to a phone during development

### Frontend

- React Native
- Expo
- TypeScript
- React Navigation native stack
- AsyncStorage for local token storage
- React Native WebView for loading the ArcGIS 3D map
- Expo Image Picker for selecting club images
- Cloudinary image URLs for map pins, scenario images, and other remote assets

## 3. Folder Structure

```text
EQAPP/
  README.md
  PROJECT_DOCUMENTATION.md
  backend/
    package.json
    src/
      app.js
      server.js
      config/
      controllers/
      middleware/
      models/
      public/
      routes/
      utils/
  frontend/
    earthquest-app/
      App.tsx
      package.json
      app.json
      assets/
      components/
      screens/
```

## 4. Backend Summary

The backend is an Express API that connects to MongoDB Atlas and exposes authentication, profile, adventure, club, and ArcGIS routes.

The server starts from:

```text
backend/src/server.js
```

The main Express app is configured in:

```text
backend/src/app.js
```

It enables CORS, JSON request parsing, static file serving from `backend/src/public`, and mounts the API routes.

### Main Backend Routes

| Route prefix | Purpose |
| --- | --- |
| `/api/auth` | Signup, email OTP verification, login, password reset, role upgrades, current user |
| `/api/profile` | Basic profile, full profile with club data, profile update, leave club |
| `/api/adventures` | Published map adventures, adventure purchase/access-code flow, owned/joined adventures |
| `/api/club` | Create club, request to join, approve members, list members, kick/ban members, assign moderator |
| `/api/arcgis-token` | Protected route that generates an ArcGIS token for the frontend map |

### Authentication

Authentication is implemented with email/password login and JWT tokens.

Implemented auth features:

- Signup with first name, last name, email, password, and profile fields.
- Password hashing with bcryptjs.
- Email OTP generation during signup.
- Email verification before login.
- Resend verification OTP.
- Login with JWT response.
- Forgot password OTP.
- Reset password with OTP.
- Set username.
- Upgrade account to member.
- Upgrade account to GM.
- Fetch current user through `/api/auth/me`.

Important note: the frontend currently stores the token in two keys:

- `authToken` is used by the app-level auth context.
- `token` is used by `MapScreen` when requesting the ArcGIS token.

This works, but future cleanup should standardize on one key.

### User Roles and Permissions

The `User` model defines four account types:

- `viewer`
- `registrant`
- `member`
- `gm`

Permissions are automatically assigned in the user schema when `accountType` changes.

Main permissions:

- `canPlay`
- `canPurchase`
- `canDownloadPDF`
- `canJoinClub`
- `canCreateClub`
- `canModerateClub`

Only `gm` currently receives club creation and club moderation permissions.

### Adventure System

The adventure backend includes:

- `Adventure` model with title, description, location, images, scenes, difficulty, category, and publish status.
- `AdventureAccess` model for purchase/access code ownership.
- Public published adventure list for map display.
- Protected purchase route that creates an access code.
- Protected enter-code route that adds a player to an adventure.
- Protected my-adventures route.
- Protected single-adventure route that checks player access.
- Protected deactivate-code route for the owner.

The current frontend map mostly uses hard-coded scenario data inside `earthquestMap.html`, but the backend has a more database-driven adventure structure ready for future integration.

### Club System

The backend has a real club data model and API routes for:

- Creating a club.
- Joining by club code as a pending member.
- Approving pending members.
- Listing members.
- Kicking members.
- Banning members.
- Assigning moderators.

The frontend club screen currently uses mostly mock/local data and should later be connected to these backend routes.

### ArcGIS Map Token

The backend protects ArcGIS credentials by generating a token server-side through:

```text
GET /api/arcgis-token
```

The route requires a valid JWT. It reads ArcGIS credentials from backend environment variables and calls the ArcGIS REST token endpoint.

The frontend then injects that token into the WebView before the map HTML loads.

## 5. Frontend Summary

The frontend is an Expo React Native app located at:

```text
frontend/earthquest-app
```

The app entry point is:

```text
frontend/earthquest-app/App.tsx
```

It uses React Navigation with two main flows:

- Unauthenticated flow: opening screen, login, signup, verify email, forgot password, reset password.
- Authenticated flow: landing screen, adventure select, map, mission brief, profile, clubs, membership, storefront.

### Main Screens

| Screen | Purpose |
| --- | --- |
| `OpeningScreen` | First screen before login/signup |
| `LoginScreen` | Logs users in with backend API |
| `SignupScreen` | Two-step signup with account details and player identity |
| `VerifyEmailScreen` | Confirms signup OTP |
| `ForgotPasswordScreen` | Starts password reset |
| `ResetPasswordScreen` | Completes password reset |
| `LandingScreen` | Main authenticated home/menu screen |
| `AdventureSelectScreen` | Lets the user choose available adventures |
| `MapScreen` | Loads the ArcGIS 3D map in a WebView |
| `MissionBriefScreen` | Shows mission/scenario details after selecting a map pin |
| `MyProfileScreen` | Profile UI, role badge, achievements, account/Vanguardian profile modals |
| `ClubModal` | Club browsing/creation/roster UI, currently mock/local data |
| `BecomeAMemberScreen` | Membership comparison and external upgrade link |
| `StoreFront` | Storefront UI and membership-gated mock cart behavior |
| `AboutEarthQuest` | Informational EarthQuest screen |
| `HowToPlayEarthQuest` | Game instructions/info screen |

### Map and Cloudinary Usage

The map is implemented as a local HTML file:

```text
backend/src/public/earthquestMap.html
```

This file loads ArcGIS JavaScript SDK, opens a 3D web scene, adds EarthQuest scenario pins, and sends pin-click events back to the React Native app through `window.ReactNativeWebView.postMessage`.

Cloudinary is used for image hosting. The map scenario images and marker icon are remote Cloudinary URLs inside `earthquestMap.html`. This is a practical setup because mobile builds and WebViews can load public hosted images without bundling every scenario image into the app.

Current example image URL pattern:

```text
https://res.cloudinary.com/<cloud-name>/image/upload/...
```

When adding new scenario images, upload images to Cloudinary, copy the secure image URL, and add it to the relevant `images` array.

## 6. Environment Variables

Do not commit real `.env` values to GitHub.

### Backend `.env`

Create this file:

```text
backend/.env
```

Required values:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
ARCGIS_USERNAME=your_arcgis_username
ARCGIS_PASSWORD=your_arcgis_password
ARCGIS_REFERER=your_allowed_referer
```

Notes:

- Gmail should use an app password, not the normal Gmail password.
- MongoDB Atlas must allow the laptop network IP, or use `0.0.0.0/0` during development only.
- ArcGIS credentials stay in the backend so the mobile app does not expose them directly.

### Frontend `.env`

Create this file:

```text
frontend/earthquest-app/.env
```

Required value:

```env
EXPO_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
```

Use the current ngrok HTTPS URL here. Because ngrok URLs often change, this value must be updated whenever a new tunnel is started.

Important: `MapScreen.tsx` currently contains a hard-coded ngrok URL for `MAP_URL` and `/api/arcgis-token`. Update those values too, or refactor the file to use `EXPO_PUBLIC_API_URL`.

## 7. How to Run the Project

These are the steps currently used during development.

### Step 1: Connect Laptop and Phone to the Same Network

Connect the laptop to the mobile hotspot. This keeps the development machine and phone on a network setup that works reliably with Expo Go and local services.

### Step 2: Start ngrok

Open a terminal or command prompt and run:

```bash
ngrok http 5000 --request-header-add="ngrok-skip-browser-warning:true"
```

Copy the HTTPS forwarding URL from ngrok.

Example:

```text
https://example-name.ngrok-free.app
```

Then update:

- `frontend/earthquest-app/.env`
- The hard-coded URLs in `frontend/earthquest-app/screens/MapScreen.tsx`

### Step 3: Start Backend

Open a new terminal:

```bash
cd backend
npm install
npm run dev
```

Expected result:

```text
MongoDB connected
Server running on port 5000
```

You can test the backend by opening:

```text
http://localhost:5000
```

Expected response:

```text
EarthQuest API running
```

### Step 4: Start Frontend

Open another terminal:

```bash
cd frontend
cd earthquest-app
npm install
npx expo start
```

Then open the app with Expo Go by scanning the QR code.

If the app behaves strangely after changing environment variables, restart Expo with cache clearing:

```bash
npx expo start -c
```

## 8. Current Implementation Status

### Implemented or Mostly Implemented

- Backend Express server.
- MongoDB connection.
- User model with roles, permissions, profile, stats, achievements, email verification, and password reset fields.
- Signup with email OTP.
- Login with JWT.
- Password reset with OTP.
- Permission middleware.
- Profile routes.
- Club data model and backend routes.
- Adventure and adventure access models.
- Adventure access-code backend flow.
- ArcGIS token backend route.
- Expo app navigation.
- Auth screens.
- Landing and informational screens.
- Adventure selection screen.
- WebView-based ArcGIS 3D map.
- Map pin click to mission brief flow.
- Mission brief screen.
- Profile UI.
- Membership and storefront UI.
- Club UI prototype.
- Cloudinary-hosted remote images.

### Partially Implemented / Prototype Areas

- Club frontend uses mock/local data instead of the backend club API.
- Profile screen uses hard-coded sample profile data instead of loading `/api/profile/full`.
- Storefront products are mock data; product backend route exists but is commented out in `app.js`.
- Membership upgrade UI links externally, while backend has `/api/auth/upgrade-member`.
- Adventure selection is hard-coded in frontend instead of loading available adventures from the backend.
- Map scenario data is hard-coded in `earthquestMap.html` instead of being fully database-driven.
- `MapScreen.tsx` has hard-coded ngrok URLs instead of using `EXPO_PUBLIC_API_URL`.
- Token storage is split between `authToken` and `token`.

## 9. Known Issues and Risks

- The project depends on ngrok URLs, and those URLs can change each time ngrok restarts.
- Some files contain garbled emoji/symbol characters, likely from encoding mismatch. The app can still work, but text cleanup would improve readability.
- There are no automated backend or frontend tests yet.
- No central API helper exists on the frontend, so API URLs and headers are repeated in screen files.
- Secrets must be kept out of Git. Current `.env` files should remain local only.
- CORS is open for development. A production deployment should restrict allowed origins.
- MongoDB Atlas network access set to `0.0.0.0/0` is convenient for development but should be tightened for production.
- Club and profile screens currently look feature-rich, but much of the behavior is not connected to persistent backend data yet.

## 10. Recommended Future Improvements

### High Priority

- Refactor `MapScreen.tsx` to use `EXPO_PUBLIC_API_URL` for both map HTML and ArcGIS token calls.
- Standardize token storage to one AsyncStorage key.
- Create a shared frontend API client for base URL, auth headers, JSON parsing, and ngrok warning header.
- Connect profile screen to `/api/profile/full`.
- Connect club screen to `/api/club` routes.
- Move map scenario data from `earthquestMap.html` into MongoDB or a backend endpoint.
- Add `.env.example` files for backend and frontend.

### Medium Priority

- Add backend validation for request bodies.
- Add better error handling and loading states in the frontend.
- Add seed scripts for adventures, map pins, and sample clubs.
- Add product/storefront backend integration.
- Replace placeholder membership/payment flow with a real payment or admin approval process.
- Add automated tests for auth, profile, club, and adventure routes.

### Production Readiness

- Deploy backend to a stable host instead of relying on ngrok.
- Deploy map HTML with the backend or a static hosting provider.
- Restrict CORS origins.
- Protect all secrets with production environment variables.
- Add logging and monitoring.
- Add rate limiting for auth and OTP routes.
- Add refresh-token or session-expiry handling.
- Review ArcGIS token expiration and renewal behavior.

## 11. Handoff Notes for the Next Developer

Start by running the project exactly as described above. After login, test the main user journey:

1. Create an account.
2. Verify email with OTP.
3. Login.
4. Open adventure selection.
5. Open the map.
6. Tap or search for a map scenario.
7. Open the mission brief.
8. Visit profile, clubs, membership, and storefront screens.

The most important mental model is:

- Backend already has the foundation for persistent users, roles, clubs, adventures, and ArcGIS token security.
- Frontend already has the visual/user-flow prototype for the full EarthQuest experience.
- The next phase should connect the mock frontend screens to the real backend APIs and remove hard-coded ngrok/map data.

## 12. Overall Assessment

This is a strong prototype setup for a research/game companion app. The backend is organized around the right domain concepts: users, permissions, clubs, adventures, access codes, and secure ArcGIS tokens. The frontend already communicates the intended user experience: onboarding, role-based gameplay, interactive map exploration, mission briefings, profiles, clubs, membership, and store access.

The main weakness is not the concept or structure; it is consistency. Some systems are fully backend-backed, while others are still local mock UI. The most valuable next work is to make the frontend consume the existing backend consistently, centralize configuration, and replace hard-coded ngrok/scenario values with environment-driven or database-driven data.

