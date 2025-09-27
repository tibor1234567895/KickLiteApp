import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSessionResult, makeRedirectUri, startAsync } from 'expo-auth-session';
import Constants from 'expo-constants';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { configureAuthToken } from '../services/api';
import { AuthTokens, KickUserProfile } from '../types';

const TOKEN_STORAGE_KEY = '@kicklite/tokens';
const PROFILE_STORAGE_KEY = '@kicklite/profile';
const ONE_MINUTE_IN_MS = 60 * 1000;
const DEFAULT_TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour

const KICK_AUTHORIZE_URL =
  process.env.EXPO_PUBLIC_KICK_AUTHORIZE_URL ?? 'https://kick.com/oauth/authorize';
const KICK_CLIENT_ID = process.env.EXPO_PUBLIC_KICK_CLIENT_ID ?? '';
const KICK_SCOPE = process.env.EXPO_PUBLIC_KICK_SCOPE ?? 'user:read';
const KICK_PROXY_URL = process.env.EXPO_PUBLIC_KICK_PROXY_URL ?? '';

interface AuthContextValue {
  tokens: AuthTokens | null;
  profile: KickUserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: (options?: SignOutOptions) => Promise<void>;
  refresh: () => Promise<void>;
}

interface RefreshOptions {
  silent?: boolean;
}

interface SignOutOptions {
  preserveError?: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getProxyEndpoint = (path: string) => {
  const base = KICK_PROXY_URL.replace(/\/$/, '');
  return `${base}${path}`;
};

const parseTokens = (value: string | null): AuthTokens | null => {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as AuthTokens;
    if (
      typeof parsed.accessToken === 'string' &&
      typeof parsed.refreshToken === 'string' &&
      typeof parsed.expiresAt === 'number'
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to parse stored auth tokens', error);
  }

  return null;
};

const parseProfile = (value: string | null): KickUserProfile | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as KickUserProfile;
  } catch (error) {
    console.warn('Failed to parse stored profile', error);
    return null;
  }
};

const resolveExpiry = (expiresIn: unknown, fallback?: number) => {
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) {
    return Date.now() + expiresIn * 1000;
  }

  return fallback ?? Date.now() + DEFAULT_TOKEN_LIFETIME;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [profile, setProfile] = useState<KickUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const persistSession = useCallback(
    async (nextTokens: AuthTokens, nextProfile?: KickUserProfile | null) => {
      setTokens(nextTokens);
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(nextTokens));

      if (typeof nextProfile !== 'undefined') {
        setProfile(nextProfile);
        if (nextProfile) {
          await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
        } else {
          await AsyncStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      }
    },
    []
  );

  const signOut = useCallback(async (options?: SignOutOptions) => {
    setLoading(true);
    if (!options?.preserveError) {
      setError(null);
    }
    clearRefreshTimer();
    try {
      setTokens(null);
      setProfile(null);
      configureAuthToken(null);
      await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, PROFILE_STORAGE_KEY]);
    } catch (storageError) {
      console.error('Failed to sign out', storageError);
    } finally {
      setLoading(false);
    }
  }, [clearRefreshTimer]);

  const refreshAuthTokens = useCallback(
    async (
      existingTokens?: AuthTokens | null,
      existingProfile?: KickUserProfile | null,
      options?: RefreshOptions
    ) => {
      const activeTokens = existingTokens ?? tokens;
      const activeProfile = existingProfile ?? profile;

      if (!activeTokens?.refreshToken) {
        await signOut();
        return;
      }

      if (!KICK_PROXY_URL) {
        setError('Kick proxy URL is not configured');
        await signOut({ preserveError: true });
        return;
      }

      if (!options?.silent) {
        setLoading(true);
      }

      try {
        setError(null);
        const response = await fetch(getProxyEndpoint('/refresh'), {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: activeTokens.refreshToken }),
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to refresh session');
        }

        if (!payload?.access_token) {
          throw new Error('Kick refresh did not return an access token');
        }

        const updatedTokens: AuthTokens = {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token ?? activeTokens.refreshToken,
          expiresAt: resolveExpiry(payload?.expires_in, activeTokens.expiresAt),
        };
        const updatedProfile: KickUserProfile | null = payload.profile ?? activeProfile ?? null;

        await persistSession(updatedTokens, updatedProfile);
      } catch (refreshError) {
        const message =
          refreshError instanceof Error ? refreshError.message : 'Failed to refresh session';
        setError(message);
        await signOut({ preserveError: true });
        throw refreshError;
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [persistSession, profile, signOut, tokens]
  );

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [[, storedTokens], [, storedProfile]] = await AsyncStorage.multiGet([
          TOKEN_STORAGE_KEY,
          PROFILE_STORAGE_KEY,
        ]);

        const parsedProfile = parseProfile(storedProfile);
        if (parsedProfile) {
          setProfile(parsedProfile);
        }

        const parsedTokens = parseTokens(storedTokens);
        if (parsedTokens) {
          setTokens(parsedTokens);
          if (parsedTokens.expiresAt <= Date.now()) {
            await refreshAuthTokens(parsedTokens, parsedProfile ?? null, { silent: true });
          }
        }
      } catch (bootError) {
        console.error('Failed to restore session', bootError);
        setError('Failed to restore session');
        await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, PROFILE_STORAGE_KEY]);
        setTokens(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [refreshAuthTokens]);

  useEffect(() => {
    configureAuthToken(tokens?.accessToken ?? null);
    clearRefreshTimer();

    if (!tokens) {
      return;
    }

    const msUntilRefresh = tokens.expiresAt - Date.now() - ONE_MINUTE_IN_MS;

    if (msUntilRefresh <= 0) {
      refreshAuthTokens(undefined, undefined, { silent: true }).catch(() => undefined);
      return;
    }

    refreshTimer.current = setTimeout(() => {
      refreshAuthTokens(undefined, undefined, { silent: true }).catch(() => undefined);
    }, msUntilRefresh);

    return () => {
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, refreshAuthTokens, tokens]);

  const signIn = useCallback(async () => {
    if (!KICK_CLIENT_ID || !KICK_PROXY_URL) {
      setError('Kick OAuth is not fully configured');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isExpoHosted = Constants.appOwnership === 'expo';
      const useProxy = Platform.OS === 'web' ? false : isExpoHosted;
      const redirectUri = makeRedirectUri({
        path: 'auth/kick',
        useProxy,
        scheme: useProxy ? undefined : 'kicklite',
      });

      const params = new URLSearchParams({
        client_id: KICK_CLIENT_ID,
        response_type: 'code',
        scope: KICK_SCOPE,
        redirect_uri: redirectUri,
      });

      const authUrl = `${KICK_AUTHORIZE_URL}?${params.toString()}`;

      const authResult = (await startAsync({
        authUrl,
        returnUrl: redirectUri,
      })) as AuthSessionResult & {
        params: Record<string, string | undefined>;
      };

      if (authResult.type !== 'success') {
        if (authResult.type === 'error' || authResult.type === 'dismiss') {
          setError(authResult.params?.error ?? 'Authentication was cancelled');
        }
        setLoading(false);
        return;
      }

      const { code, error: authError } = authResult.params ?? {};

      if (authError) {
        throw new Error(authError);
      }

      if (!code) {
        throw new Error('No authorization code returned from Kick');
      }

      const response = await fetch(getProxyEndpoint('/token'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, redirectUri }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to exchange authorization code');
      }

      if (!payload?.access_token || !payload?.refresh_token) {
        throw new Error('Kick token exchange returned an invalid response');
      }

      const nextTokens: AuthTokens = {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        expiresAt: resolveExpiry(payload?.expires_in),
      };
      const profileData: KickUserProfile | null = payload.profile ?? null;

      await persistSession(nextTokens, profileData);
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : 'An unknown authentication error occurred';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      tokens,
      profile,
      loading,
      error,
      isAuthenticated: Boolean(tokens?.accessToken),
      signIn,
      signOut,
      refresh: () => refreshAuthTokens(undefined, undefined, { silent: false }),
    }),
    [error, loading, profile, refreshAuthTokens, signIn, signOut, tokens]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
