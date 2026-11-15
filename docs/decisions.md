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

## Adventure codes and groups

- A **Game Master** creates a code for an open adventure (one code per GM per adventure)
  and shares it; **any verified player** enters a code to join that GM's group. A group
  is just a set of players: it **does not unlock** the adventure, the map or any content
  (those stay open to everyone). Its purpose is to let a table of players see each other
  and chat.
- The adventure list now comes from the server (a small catalogue seeded with
  `npm run seed:adventures`: Adventure 1 open, 2 and 3 "Coming Soon"). Locked adventures
  cannot get or redeem codes.
- Only the group's owner sees the code. The owner can pause or resume new joins, replace
  the code (the old one stops working, players stay), remove a player, or delete the group.
  Players can leave. Leaving, removal or deletion ends the chat link.
- Entering a code twice no longer adds the player twice (bug fixed).
- Codes are still free: there is no payment step, only the Game Master restriction.
- Not built: code expiry, locking content behind a code, group chat.

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

## Game Mentors (GMs): open decision

How things work today: a GM exists only when an admin calls `/api/auth/upgrade-member`
then `/api/auth/upgrade-gm` with `ADMIN_API_KEY`. There is no in-app path and no written
qualification. The app already presents "Become a GM" as a members-only perk, and the
membership/payment step is a placeholder that links to the external website.

Recommended direction (not decided yet):
1. **Player**: any verified account.
2. **Member**: completes the membership step (payment or approval; currently a placeholder).
3. **Game Mentor**: a member who applies in the app, agrees to a short code of conduct,
   and is approved by the EarthQuest team (the same admins who review reports). Admins
   can also revoke GM status; decide what happens to a demoted GM's club (disband it or
   assign a new GM).

For a small pilot, keeping manual promotion by admin key is acceptable. Build the
apply-and-approve flow before opening to real users.

## Known gaps (from the code review)

- Adventure codes (`POST /api/adventures/codes`, alias `/purchase`) are Game Master only
  but still **free**: there is no payment step.
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

1. Apply-and-approve flow for Game Mentors, plus a real membership step (today only an
   admin can make a GM, and GMs are needed to create clubs and adventure codes).
2. Real payment, or a decision that codes stay free.
3. Optional: unread badges, push notifications, club images, a blocked-players list,
   code expiry.

## Continuing later

Open a terminal in the project folder and run `claude --resume` (or `claude --continue`)
to reopen a previous Claude Code session with its history. Restart the backend and
Expo yourself afterwards.
