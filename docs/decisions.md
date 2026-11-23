# EarthQuest: product decisions and status

Written to preserve decisions made while building chat, clubs and profiles, so they do not
live only in a chat history. Secrets are never recorded here.

## How players connect (chat contacts)

Players can chat only if they share **an approved club** or **the same adventure access
code** (both need verified emails, and neither may have blocked the other). There are no
friend requests and no player search. Pending club members are not connected yet.

| Connection | Backend | In the app |
|---|---|---|
| Club | Done | **Done** (Club screen, real API) |
| Adventure code | Done (`/api/adventures/*`) | **Done** (Adventure groups screen) |

## Purchases, Game Mentors and adventure codes

This replaces the earlier "adventure groups" and "Game Mentor application" designs, which
were removed.

- **Everything is bought on the website** (Stripe). The app's storefront only redirects
  there: membership ($10), adventures, and free downloads such as the Player Handbook PDF
  (hosted on the website, not by the app).
- **Webhook:** `POST /api/payments/stripe/webhook` verifies Stripe's signature
  (`STRIPE_WEBHOOK_SECRET`) and handles `checkout.session.completed` when paid. The website
  must create each Checkout Session with `client_reference_id` = the buyer's EarthQuest
  user id (fallback: matching the customer email) and `metadata.kind` = `membership` or
  `adventure` (plus `metadata.adventureSlug`, e.g. `eq1`, for adventures).
  Fulfilment is idempotent (one `Purchase` row per session); payments that match no
  account or adventure are saved with `fulfilled: false` for an admin to resolve.
- **Membership** sets the account to member (a Game Mentor stays one).
- **Buying an adventure** gives the buyer two codes: a **Game Mentor code** (8 characters,
  redeemable only by the buyer) and a **member code** (6 characters) to hand to their
  club. Adventures with `requiresGM` also make the buyer a Game Mentor; others do not.
  (This is how "a GM condition on certain adventures" was read; change `requiresGM` per
  adventure in the database.)
- **Joining an adventure** with the member code works only for approved members of the
  Game Mentor's club. Wrong, paused and not-yours codes all answer "Invalid code".
- The Game Mentor can pause or replace the member code (`/api/adventures/mine/...`).
- **Clubs:** a member finds a club by name (`GET /api/club/search?q=`) and asks to join
  (`POST /api/club/join` with `clubId`); the GM approves or declines. A club code still works.
- Chat contacts are still club mates plus adventure co-players, so they are club mates in
  practice.
- Removed: the free `/codes` and `/purchase` routes, adventure groups, and the Game Mentor
  application, review and revoke flow with its code of conduct.
- App: Landing menu > "My adventures" (enter a code; Game Mentors see and share their
  codes, replace the member code, pause joining). Club screen has search by name. The
  storefront opens the website (`EXPO_PUBLIC_STORE_URL`, default `https://earthquest.com`).
- Not done here: the website creating Checkout Sessions (see above).

## Chat

- One-to-one chat only. Live delivery over Socket.IO with a REST fallback; the same chat
  is reachable from the Landing menu (outside the game) and the Map menu (in the game).
- History is kept permanently. Messages are at most 1000 characters.
- The "can these two chat?" rule is re-checked on **every send**, so leaving a club or
  being kicked ends the chat for new messages (history stays readable).
- Not built: unread badges, push notifications, group chat.

## Block and report

- **Block = two-way silence.** Neither person can send or start a chat; both are hidden
  from each other's contacts; history stays readable. The blocked person is never told
  (error messages stay generic).
- **Report** a message by long-pressing it. A report stores the message plus a copy of
  the messages around it (4 before, 2 after). Each person can report a message once;
  reports are rate limited.
- **Admins** (accounts whose verified email is in `ADMIN_EMAILS`) review reports in the
  app ("Review chat reports" in the Landing menu) and mark them resolved.
- Privacy note: reports hold short copies of private chat text. Decide who may read them
  before real users arrive.

## Usernames and profile

- A username is **required at signup** and can be **changed any time**.
  Rules: 3-20 characters, letters, numbers and underscore; stored lowercase, unique
  without regard to case.
- Accounts created before this change have no username and set one in Profile >
  Account Details.
- The profile screen shows the real account. Still sample data: the Vanguardian page and
  the Achievements chips.

## Clubs

- Only **Game Masters** can create a club, **one club each**; a player belongs to **one
  club at a time**.
- Join by club code; the GM or a moderator approves or declines. A pending player sees
  only the club name, never the roster.
- Roles are decided by your role in your own club: GM, moderator, member. Moderators can
  approve requests and remove or ban ordinary members, but not the GM or other moderators.
  Only the GM appoints moderators, edits club info (name, bio, Discord link), or deletes
  the club. The GM cannot leave; they delete the club.
- Not built: club images, transferring GM ownership, join-request notifications.

## Known gaps (from the code review)

- Admin-uploaded scenario images are stored on local disk and will disappear on hosts
  with ephemeral storage; move to object storage before deploying.
- Verification emails use Gmail SMTP (a daily sending cap); use a transactional email
  provider before real users sign up.
- Any logged-in user can obtain an ArcGIS token for the shared account; scope that
  account tightly or proxy the requests.

## Setup notes (no secrets)

- Backend config lives in `backend/.env` (see `backend/.env.example`); the frontend needs
  `EXPO_PUBLIC_API_URL` in `frontend/earthquest-app/.env`.
- **Database name:** the connection string must name the database
  (`...mongodb.net/earthquest`). Without a name MongoDB silently uses a `test` database.
- **Passwords with special characters** (such as `@`) must be URL-encoded in the
  connection string (`@` becomes `%40`).
- **Email:** `EMAIL_PASS` must be a Gmail **App Password** (16 characters), not the normal
  password, and 2-step verification must be on.
- **ngrok free tunnels change address on every restart.** Update `EXPO_PUBLIC_API_URL`
  and restart Expo with `npx expo start -c` after any change. `MapScreen.tsx` also holds
  the backend URL, which must match `ARCGIS_REFERER`.
- **Expo Go on iPhone supports only the latest SDK**; the project is on SDK 58.
- Run the checks with `cd backend && npm test` and, in the app,
  `npx tsc --noEmit && npx expo-doctor`.
- Admin access is by `ADMIN_EMAILS` (content and chat-report review) and by
  `ADMIN_API_KEY` (promoting members/GMs). Restart the backend after changing `.env`.

## Next steps

1. Website: create Checkout Sessions with `client_reference_id` and `metadata` as above,
   and register the webhook in Stripe.
2. Set `requiresGM` on the adventures that should make the buyer a Game Mentor.
3. Optional: unread badges, push notifications, club images, a blocked-players list.

## Continuing later

Open a terminal in the project folder and run `claude --resume` (or `claude --continue`)
to reopen a previous Claude Code session with its history. Restart the backend and
Expo yourself afterwards.
