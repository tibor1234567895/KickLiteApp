# Kick Live Streaming App Documentation

## Project Overview
KickLiteApp is an Expo-managed React Native client for Kick.com that focuses on quick stream discovery, native playback, and an immersive chat experience. Users can browse featured streams, follow creators, sign in with Kick OAuth, and watch shows with real-time chat rendered directly on device.

## Tech Stack
- Expo SDK 54 with React Native 0.81 and TypeScript
- `expo-video` for hardware-accelerated HLS playback, PiP, and background audio (paired with `expo-audio`)
- NativeWind for utility-first styling
- React Navigation (bottom tabs + stack) for routing
- Axios for Kick API integration
- AsyncStorage for persisting preferences and follow lists
- WebSocket chat pipeline with optional 7TV emote enrichment

## Application Architecture

### Navigation Layout
- **Bottom tab navigator**: Home, Followed, Search, Settings
- **Stack screen**: `StreamScreen` is pushed from discovery tabs to present playback and chat

### Screens (`src/screens`)
- `HomeScreen.tsx` – Displays live channels sorted by viewer count with pull-to-refresh and infinite scroll.
- `FollowedScreen.tsx` – Lists saved channels, highlighting those that are currently live.
- `SearchScreen.tsx` – Typesense-powered channel search with live status indicators.
- `StreamScreen.tsx` – Hosts the video player (`expo-video`), chat, follow controls, and orientation handling.
- `SettingsScreen.tsx` – Theme toggles, Kick OAuth management, and chat preference switches (including 7TV emotes).

### Components (`src/components`)
- `ChatView.tsx` – Connects to Kick's WebSocket chat gateway, manages heartbeats/reconnects, and renders parsed message parts. When the "7TV emotes" preference is enabled it fetches global and channel-specific sets from the 7TV REST API and swaps matching tokens for inline images.

### Context Providers (`src/context`)
- `AuthContext.tsx` – Wraps Expo AuthSession to authenticate against Kick through an OAuth proxy. Persists tokens, refreshes silently, and exposes `signIn`/`signOut` plus the user profile.
- `PreferencesContext.tsx` – Stores chat preferences (including the 7TV toggle) and other user choices via AsyncStorage.
- `FollowContext.tsx` – Maintains the followed channel list, synchronized with AsyncStorage and Kick API responses.
- `ThemeContext.tsx` – Manages the light/dark theme palette and offers a toggle consumed by screens/components.

### Services (`src/services`)
- `api.ts` – Shared HTTP client with Kick REST endpoints for channel and stream information.
- `search.ts` – Typesense search client abstractions used by the search screen.

## Data Flow Summary
1. Screens access shared state by consuming the Context providers registered near the root of `App.tsx`.
2. Stream playback uses `expo-video` with Kick-provided HLS URLs; background audio and PiP support are coordinated through Expo's AV APIs.
3. Chat establishes a WebSocket session using the active channel ID. Incoming messages are parsed into rich segments, optionally decorated with 7TV emote URLs pulled from the REST API.
4. Authenticated requests rely on the access token issued by the OAuth proxy. Refresh tokens are exchanged via the proxy's `/refresh` endpoint when nearing expiration.

## Environment & Configuration
Configure the following environment variables (via `.env` or your secrets manager) before running the app:

| Variable | Description |
| -------- | ----------- |
| `EXPO_PUBLIC_TYPESENSE_SEARCH_KEY` | Read-only Typesense search key for local/dev builds. Required for search results. |
| `EXPO_PUBLIC_KICK_CLIENT_ID` | Kick OAuth client identifier used during Expo AuthSession login. |
| `EXPO_PUBLIC_KICK_AUTHORIZE_URL` | Optional override for the Kick authorization endpoint (defaults to `https://kick.com/oauth/authorize`). |
| `EXPO_PUBLIC_KICK_SCOPE` | Space-delimited scopes requested during sign-in (defaults to `user:read`). |
| `EXPO_PUBLIC_KICK_PROXY_URL` | Base URL for the OAuth proxy that exchanges authorization codes and refresh tokens. Must expose `/token` and `/refresh` endpoints mirroring Kick's OAuth responses. |

Example configuration:

```bash
EXPO_PUBLIC_TYPESENSE_SEARCH_KEY=your_typesense_key
EXPO_PUBLIC_KICK_CLIENT_ID=your_kick_client_id
EXPO_PUBLIC_KICK_SCOPE="user:read chat:write"
EXPO_PUBLIC_KICK_PROXY_URL=https://your-proxy.example.com
```

### OAuth Proxy Requirements
- The proxy should forward authorization codes to `https://kick.com/api/v1/oauth/token` and return `{ access_token, refresh_token, expires_in, token_type, profile }`.
- `/refresh` must accept `{ "refreshToken": "..." }` and return the same structure so the app can silently renew sessions.
- Any failures should propagate descriptive errors so `AuthContext` can surface them to the UI.

### 7TV Integration Notes
- No additional environment variables are required, but outbound HTTPS access to `https://7tv.io/v3` is necessary.
- The 7TV toggle in Settings enables fetching both the global and channel sets; ensure your network policy allows these requests.

## Setup & Running Locally
1. Install dependencies: `npm install`
2. Start the Expo dev server: `npm start`
3. Launch on device or simulator via Expo Go, iOS Simulator (`i`), or Android emulator (`a`).
4. Confirm your OAuth proxy is reachable from the device/emulator and that the required env vars are loaded (Expo will warn if missing).

## Manual QA Scenarios
- **Kick OAuth happy path** – Sign in through the OAuth proxy, approve the Kick consent screen, and verify the profile appears under Settings → Account.
- **Refresh failure messaging** – Simulate a proxy error on `/refresh` and ensure the app surfaces the error while returning to the signed-out state.
- **Chat fallback** – Disable 7TV emotes in Settings and confirm chat messages render instantly without attempting 7TV fetches; re-enable to see emotes populate for supported tokens.
- **Playback regression** – Validate PiP and background audio after switching away from the app to ensure the `expo-video` player remains active.
