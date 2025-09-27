# KickLiteApp

A React Native mobile application for watching Kick.com live streams. Built with Expo and styled with NativeWind.

## Features

- 🎮 Browse live streams sorted by viewer count
- 🔍 Search for specific channels
- ❤️ Follow your favorite streamers
- 💬 Native Kick chat powered by WebSockets with optional 7TV emotes (toggle in Settings)
- 🌓 Dark/Light theme support
- 📱 Picture-in-Picture support (iOS)
- 📺 Fullscreen mode with automatic orientation
- 🔄 Pull-to-refresh functionality

## Screenshots

<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
  <img src="screenshots/Home.png" alt="Home Screen" width="30%" />
  <img src="screenshots/Followed.png" alt="Followed Screen" width="30%" />
  <img src="screenshots/Stream.png" alt="Stream Screen" width="30%" />
</div>

| Screen   | Description                                                     |
| -------- | --------------------------------------------------------------- |
| Home     | Browse live streams sorted by viewer count with infinite scroll |
| Followed | Track your favorite streamers with live status indicators       |
| Stream   | Watch live streams with native chat and PiP support             |

## Tech Stack

- React Native with Expo
- TypeScript
- NativeWind (Tailwind CSS)
- React Navigation
- Expo AV for video playback
- AsyncStorage for local data persistence
- React Context providers for auth, theme, follow management, and user preferences ([Auth](src/context/AuthContext.tsx), [Theme](src/context/ThemeContext.tsx), [Follow](src/context/FollowContext.tsx), [Preferences](src/context/PreferencesContext.tsx))

## Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (optional)

## Installation

1. Clone the repository:

```bash
git clone [repository-url]
cd KickLiteApp
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables (see [Environment Configuration](#environment-configuration)).

4. Start the development server:

```bash
npm start
```

5. Run on your device:

- Scan the QR code with Expo Go (Android)
- Scan the QR code with Camera app (iOS)
- Press 'i' for iOS simulator
- Press 'a' for Android emulator

## Project Structure

```
src/
├── components/
├── screens/
│   ├── HomeScreen.tsx
│   ├── StreamScreen.tsx
│   ├── SearchScreen.tsx
│   └── FollowedScreen.tsx
├── services/
│   ├── api.ts
│   └── search.ts
├── context/
│   ├── AuthContext.tsx
│   ├── FollowContext.tsx
│   ├── PreferencesContext.tsx
│   └── ThemeContext.tsx
└── types/
    └── index.ts
```

## Features in Detail

### Home Screen

- Lists live streams sorted by viewer count
- Pull-to-refresh to update the list
- Infinite scroll for loading more streams
- Quick access to search and theme toggle

### Stream Screen

- Live stream playback with native controls
- Picture-in-Picture support on iOS
- Native chat rendering with Kick's real-time WebSocket API
- Optional 7TV emote rendering toggle available under Settings → Chat Preferences
- Follow/Unfollow streamers
- Automatic orientation handling for fullscreen

### Search Screen

- Real-time channel search
- Live status indicators
- Follower count display
- Verified channel badges

### Followed Screen

- List of followed channels
- Live status and viewer counts
- Thumbnail previews for live channels
- Quick access to streams

## Environment Configuration

| Variable | Description |
| -------- | ----------- |
| `EXPO_PUBLIC_TYPESENSE_SEARCH_KEY` | Read-only Typesense search key used for local development builds. Required for the search screen. |
| `EXPO_PUBLIC_KICK_CLIENT_ID` | Kick OAuth client identifier used when initiating Expo AuthSession sign-in flows. Required for authenticated features. |
| `EXPO_PUBLIC_KICK_AUTHORIZE_URL` | Optional override for the Kick authorization endpoint. Defaults to `https://kick.com/oauth/authorize`. |
| `EXPO_PUBLIC_KICK_SCOPE` | Space-delimited OAuth scopes requested during sign-in. Defaults to `user:read`. |
| `EXPO_PUBLIC_KICK_PROXY_URL` | Base URL for your OAuth proxy that handles token exchange and refresh flows. Must expose `/token` and `/refresh` endpoints mirroring Kick's OAuth responses. |

Create a `.env` file (or configure your preferred secrets manager) and export the variable before starting Expo:

```bash
EXPO_PUBLIC_TYPESENSE_SEARCH_KEY=your_typesense_search_key_here
EXPO_PUBLIC_KICK_CLIENT_ID=your_kick_client_id
EXPO_PUBLIC_KICK_AUTHORIZE_URL=https://kick.com/oauth/authorize
EXPO_PUBLIC_KICK_SCOPE="user:read chat:write"
EXPO_PUBLIC_KICK_PROXY_URL=https://your-proxy.example.com
```

If any required variable is missing the app will surface an informative error. This prevents accidentally running a build with compromised or undefined secrets.

The OAuth proxy should forward authorization codes to Kick's `/oauth/token` endpoint and return the resulting `access_token`, `refresh_token`, `expires_in`, and optional `profile` payload. The proxy's `/refresh` endpoint must accept a JSON body containing `{ "refreshToken": "..." }` and return the same structure so the app can silently renew sessions.

## API Integration

The app uses the following Kick.com API endpoints:

- Channel Info: `https://kick.com/api/v2/channels/{username}`
- Live Streams: `https://kick.com/stream/livestreams/tr`
- Search: `https://search.kick.com/multi_search`

For production builds, proxy search requests through a secure backend (e.g., a serverless function or API gateway) so the mobile app never bundles private Typesense keys. After moving the key server-side, regenerate the compromised search key in Typesense and store only the new server-side credential.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Kick.com](https://kick.com) for the streaming platform
- [Expo](https://expo.dev) for the development framework
- [NativeWind](https://nativewind.dev) for the styling solution
