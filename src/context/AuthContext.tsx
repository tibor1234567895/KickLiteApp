import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRequest, AuthSessionResult, ResponseType, makeRedirectUri } from 'expo-auth-session';
import type { AuthDiscoveryDocument } from 'expo-auth-session';
import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
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

import KickAuthModal from '../components/KickAuthModal';
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
  bootstrapping: boolean;
  authPending: boolean;
  error: string | null;
  missingOAuthConfig: string[];
  isOAuthConfigured: boolean;
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
  const missingOAuthConfig = useMemo(() => {
    const missing: string[] = [];
    if (!KICK_CLIENT_ID) {
      missing.push('EXPO_PUBLIC_KICK_CLIENT_ID');
    }
    if (!KICK_PROXY_URL) {
      missing.push('EXPO_PUBLIC_KICK_PROXY_URL');
    }
    return missing;
  }, []);
  const isOAuthConfigured = missingOAuthConfig.length === 0;
  const configurationErrorMessage = useMemo(
    () =>
      isOAuthConfigured
        ? null
        : `Kick OAuth is missing configuration: ${missingOAuthConfig.join(', ')}`,
    [isOAuthConfigured, missingOAuthConfig]
  );
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [profile, setProfile] = useState<KickUserProfile | null>(null);
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [authPending, setAuthPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(configurationErrorMessage);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingState = useRef<string | null>(null);
  const modalPromiseRef = useRef<{
    resolve: (result: AuthSessionResult & { params?: Record<string, string | undefined> }) => void;
  } | null>(null);
  const [authModalState, setAuthModalState] = useState({
    visible: false,
    authorizeUrl: null as string | null,
    redirectUri: '',
    request: null as AuthRequest | null,
  });

  const resetAuthModal = useCallback(() => {
    setAuthModalState({
      visible: false,
      authorizeUrl: null,
      redirectUri: '',
      request: null,
    });
  }, []);

  const handleModalComplete = useCallback(
    (result: AuthSessionResult & { params?: Record<string, string | undefined> }) => {
      if (modalPromiseRef.current) {
        modalPromiseRef.current.resolve(result);
        modalPromiseRef.current = null;
      }
      resetAuthModal();
    },
    [resetAuthModal]
  );

  const handleModalCancel = useCallback(() => {
    if (modalPromiseRef.current) {
      modalPromiseRef.current.resolve({ type: 'dismiss' } as AuthSessionResult & {
        params?: Record<string, string | undefined>;
      });
      modalPromiseRef.current = null;
    }
    resetAuthModal();
  }, [resetAuthModal]);

  const loading = bootstrapping || authPending;

  useEffect(() => {
    if (!isOAuthConfigured) {
      setError(configurationErrorMessage);
    }
  }, [configurationErrorMessage, isOAuthConfigured]);

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

  const signOut = useCallback(
    async (options?: SignOutOptions) => {
      setAuthPending(true);
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
        setAuthPending(false);
      }
    },
    [clearRefreshTimer]
  );

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
        setError(configurationErrorMessage ?? 'Kick proxy URL is not configured');
        await signOut({ preserveError: true });
        return;
      }

      if (!options?.silent) {
        setAuthPending(true);
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
          setAuthPending(false);
        }
      }
    },
    [configurationErrorMessage, persistSession, profile, signOut, tokens]
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
        setError((current) => current ?? 'Failed to restore session');
        await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, PROFILE_STORAGE_KEY]);
        setTokens(null);
        setProfile(null);
      } finally {
        setBootstrapping(false);
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
    if (!isOAuthConfigured) {
      setError(configurationErrorMessage);
      return;
    }

    setAuthPending(true);
    setError(null);

    try {
      const isExpoHosted = Constants.appOwnership === 'expo';
      const useProxy = Platform.OS === 'web' ? false : isExpoHosted;
      const redirectUri = makeRedirectUri({
        path: 'auth/kick',
        useProxy,
        scheme: useProxy ? undefined : 'kicklite',
      });

      const state = randomUUID();
      pendingState.current = state;

      const request = new AuthRequest({
        clientId: KICK_CLIENT_ID,
        redirectUri,
        responseType: ResponseType.Code,
        usePKCE: false,
        state,
        scopes: KICK_SCOPE.split(' '),
      });
      const discovery = {
        authorizationEndpoint: KICK_AUTHORIZE_URL,
      } satisfies AuthDiscoveryDocument;

      let authResult: AuthSessionResult & {
        params?: Record<string, string | undefined>;
      };

      if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
        const authorizeUrl = await request.makeAuthUrlAsync(discovery);

        authResult = await new Promise((resolve) => {
          modalPromiseRef.current = { resolve };
          setAuthModalState({
            visible: true,
            authorizeUrl,
            redirectUri,
            request,
          });
        });
      } else {
        authResult = (await request.promptAsync(discovery, {
          useProxy,
          redirectUri,
        })) as AuthSessionResult & {
          params?: Record<string, string | undefined>;
        };
      }

      if (authResult.type !== 'success') {
        if (authResult.type === 'error' || authResult.type === 'dismiss') {
          setError(authResult.params?.error ?? 'Authentication was cancelled');
        }
        return;
      }

      const { code, error: authError, state: returnedState } = authResult.params ?? {};

      if (authError) {
        throw new Error(authError);
      }

      if (!returnedState || returnedState !== pendingState.current) {
        throw new Error('Authentication response state mismatch');
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
      setAuthPending(false);
      pendingState.current = null;
    }
  }, [configurationErrorMessage, isOAuthConfigured, persistSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      tokens,
      profile,
      loading,
      bootstrapping,
      authPending,
      error,
      missingOAuthConfig,
      isOAuthConfigured,
      isAuthenticated: Boolean(tokens?.accessToken),
      signIn,
      signOut,
      refresh: () => refreshAuthTokens(undefined, undefined, { silent: false }),
    }),
    [
      authPending,
      bootstrapping,
      error,
      isOAuthConfigured,
      loading,
      missingOAuthConfig,
      profile,
      refreshAuthTokens,
      signIn,
      signOut,
      tokens,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <KickAuthModal
        visible={authModalState.visible}
        authorizeUrl={authModalState.authorizeUrl}
        redirectUri={authModalState.redirectUri}
        request={authModalState.request}
        onComplete={handleModalComplete}
        onCancel={handleModalCancel}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
