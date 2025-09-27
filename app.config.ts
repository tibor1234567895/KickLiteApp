import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

const baseConfig: ExpoConfig = {
  name: 'KickLiteApp',
  slug: 'KickLiteApp',
  version: '1.0.0',
  web: {
    favicon: './assets/favicon.png',
  },
  experiments: {
    tsconfigPaths: true,
  },
  plugins: [],
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
  },
  android: {
    package: 'com.kicklite.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    permissions: ['INTERNET'],
  },
  extra: {
    eas: {
      projectId: '3413d430-b93a-4acc-9d48-d3f7e6cb892a',
    },
  },
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...baseConfig,
  ...config,
  extra: {
    ...baseConfig.extra,
    ...config.extra,
    typesenseSearchKey: process.env.EXPO_PUBLIC_TYPESENSE_SEARCH_KEY,
  },
});
