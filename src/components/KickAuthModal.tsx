import type { AuthRequest, AuthSessionResult } from 'expo-auth-session';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

interface KickAuthModalProps {
  visible: boolean;
  authorizeUrl: string | null;
  redirectUri: string;
  request: AuthRequest | null;
  onComplete: (result: AuthSessionResult) => void;
  onCancel: () => void;
}

const KickAuthModal: React.FC<KickAuthModalProps> = ({
  visible,
  authorizeUrl,
  redirectUri,
  request,
  onComplete,
  onCancel,
}) => {
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      hasCompletedRef.current = false;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    if (!hasCompletedRef.current) {
      onCancel();
    }
  }, [onCancel]);

  const maybeHandleRedirect = useCallback(
    (url?: string | null) => {
      if (!request || !url) {
        return false;
      }

      if (!redirectUri) {
        return false;
      }

      if (url.startsWith(redirectUri)) {
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete(request.parseReturnUrl(url));
        }
        return true;
      }

      return false;
    },
    [onComplete, redirectUri, request]
  );

  const handleNavigationStateChange = useCallback(
    (event: WebViewNavigation) => {
      maybeHandleRedirect(event.url);
    },
    [maybeHandleRedirect]
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (event: WebViewNavigation) => {
      if (maybeHandleRedirect(event.url)) {
        return false;
      }
      return true;
    },
    [maybeHandleRedirect]
  );

  const renderLoading = useCallback(
    () => (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    ),
    []
  );

  const webViewSource = useMemo(() => {
    if (!authorizeUrl) {
      return null;
    }

    return { uri: authorizeUrl };
  }, [authorizeUrl]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Sign in with Kick</Text>
          <View style={styles.headerSpacer} />
        </View>

        {webViewSource ? (
          <WebView
            source={webViewSource}
            startInLoadingState
            renderLoading={renderLoading}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onNavigationStateChange={handleNavigationStateChange}
            style={styles.webView}
          />
        ) : (
          <View style={styles.loader}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeButtonText: {
    color: '#60a5fa',
    fontSize: 16,
  },
  headerSpacer: {
    width: 60,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
});

export default KickAuthModal;
