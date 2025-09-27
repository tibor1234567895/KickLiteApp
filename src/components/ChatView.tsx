import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { usePreferences } from '../context/PreferencesContext';
import { useTheme } from '../context/ThemeContext';

interface ChatViewProps {
  channelId: number;
  username: string;
}

interface KickChatMessage {
  id: string;
  content: string;
  sender: {
    username: string;
    slug?: string;
    color?: string | null;
    identity_badges?: { id: number; icon?: string | null }[];
  };
  created_at?: string;
}

interface SevenTVEmoteHostFile {
  name: string;
  format: string;
}

interface SevenTVEmoteHost {
  url: string;
  files?: SevenTVEmoteHostFile[];
}

interface SevenTVEmoteData {
  host: SevenTVEmoteHost;
}

interface SevenTVEmote {
  name: string;
  data?: SevenTVEmoteData;
}

interface SevenTVEmoteSetResponse {
  emotes?: SevenTVEmote[];
}

interface SevenTVUserResponse {
  emote_set?: SevenTVEmoteSetResponse;
}

type EmoteMap = Record<string, string>;

type MessagePart = { type: 'text'; content: string } | { type: 'emote'; code: string; url: string };

const HEARTBEAT_INTERVAL = 25_000;
const MESSAGE_HISTORY_LIMIT = 300;

function buildEmoteUrl(host?: SevenTVEmoteHost): string | null {
  if (!host) {
    return null;
  }

  const base = host.url.startsWith('http') ? host.url : `https:${host.url}`;
  const preferred = host.files?.find((file) => file.format === 'WEBP' && file.name === '2x.webp');
  const fallback = host.files?.find((file) => file.format === 'WEBP');
  const file = preferred ?? fallback;

  if (!file) {
    return null;
  }

  return `${base}/${file.name}`;
}

function extractEmoteMap(sets: SevenTVEmoteSetResponse[]): EmoteMap {
  return sets.reduce<EmoteMap>((acc, set) => {
    set.emotes?.forEach((emote) => {
      const url = buildEmoteUrl(emote.data?.host);
      if (url) {
        acc[emote.name] = url;
      }
    });
    return acc;
  }, {});
}

function normalizeToken(token: string): { core: string; leading: string; trailing: string } {
  if (!token.trim()) {
    return { core: token, leading: '', trailing: '' };
  }

  const trimmed = token.trim();
  const leadingLength = token.indexOf(trimmed);
  const trailingLength = token.length - leadingLength - trimmed.length;
  const leading = leadingLength > 0 ? token.slice(0, leadingLength) : '';
  const trailing = trailingLength > 0 ? token.slice(token.length - trailingLength) : '';
  const core = trimmed.replace(/^[^\w:()]+|[^\w:()]+$/g, '');
  return { core, leading, trailing };
}

function splitMessageContent(content: string, emotes: EmoteMap): MessagePart[] {
  if (!content) {
    return [];
  }

  const tokens = content.split(/(\s+)/);
  const parts: MessagePart[] = [];

  tokens.forEach((token) => {
    if (token.length === 0) {
      return;
    }

    if (/^\s+$/.test(token)) {
      parts.push({ type: 'text', content: token });
      return;
    }

    const { core, leading, trailing } = normalizeToken(token);
    const emoteUrl = emotes[core];

    if (emoteUrl) {
      if (leading) {
        parts.push({ type: 'text', content: leading });
      }
      parts.push({ type: 'emote', code: core, url: emoteUrl });
      if (trailing) {
        parts.push({ type: 'text', content: trailing });
      }
    } else {
      parts.push({ type: 'text', content: token });
    }
  });

  return parts;
}

function createRef() {
  return Date.now().toString();
}

export default function ChatView({ channelId, username }: ChatViewProps) {
  const { colors } = useTheme();
  const {
    chatPreferences: { enableSevenTvEmotes },
  } = usePreferences();
  const socketRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [messages, setMessages] = useState<KickChatMessage[]>([]);
  const [emoteMap, setEmoteMap] = useState<EmoteMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>(
    'connecting'
  );
  const connectionStateRef = useRef<'connecting' | 'connected' | 'error'>(connectionState);

  const updateConnectionState = useCallback((state: 'connecting' | 'connected' | 'error') => {
    connectionStateRef.current = state;
    setConnectionState(state);
  }, []);

  const loadEmotes = useCallback(async () => {
    try {
      const [globalResponse, channelResponse] = await Promise.all([
        fetch('https://7tv.io/v3/emote-sets/global'),
        fetch(`https://7tv.io/v3/users/kick/${username}`),
      ]);

      if (!globalResponse.ok) {
        throw new Error('Failed to load global emotes');
      }

      const globalData: SevenTVEmoteSetResponse = await globalResponse.json();
      let channelSet: SevenTVEmoteSetResponse = {};

      if (channelResponse.ok) {
        const channelData: SevenTVUserResponse = await channelResponse.json();
        channelSet = channelData.emote_set ?? {};
      }

      setEmoteMap(extractEmoteMap([globalData, channelSet]));
    } catch (err) {
      console.warn('Failed to load 7TV emotes', err);
      setEmoteMap({});
    }
  }, [username]);

  const teardownSocket = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  const connectSocket = useCallback(() => {
    teardownSocket();
    try {
      const socket = new WebSocket(
        'wss://ws-relay.kick.com/websocket?client=kick-lite&version=1.0&vsn=2.0.0'
      );
      socketRef.current = socket;
      updateConnectionState('connecting');

      socket.onopen = () => {
        updateConnectionState('connected');
        setError(null);
        const joinPayload = {
          event: 'phx_join',
          payload: { token: null },
          ref: createRef(),
          topic: `room:chat:${channelId}`,
        };
        socket.send(JSON.stringify(joinPayload));
        heartbeatRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                event: 'heartbeat',
                payload: {},
                ref: createRef(),
                topic: 'phoenix',
              })
            );
          }
        }, HEARTBEAT_INTERVAL);
      };

      socket.onerror = (event) => {
        console.warn('Kick chat socket error', event);
        setError('Unable to connect to chat');
        updateConnectionState('error');
        setLoading(false);
      };

      socket.onclose = () => {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        if (connectionStateRef.current !== 'error') {
          updateConnectionState('error');
          setError('Chat disconnected');
        }
        setLoading(false);
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectSocket();
          }, 5000);
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data || typeof data !== 'object') {
            return;
          }

          if (data.event === 'message' || data.event === 'new_message') {
            const payload = data.payload?.data ?? data.payload;
            const message: KickChatMessage | undefined = payload?.message ?? payload;

            if (message?.content && message?.sender?.username) {
              setMessages((prev) => {
                const next = [
                  ...prev,
                  {
                    id: message.id ?? `${Date.now()}`,
                    content: message.content,
                    sender: message.sender,
                    created_at: message.created_at,
                  },
                ];
                if (next.length > MESSAGE_HISTORY_LIMIT) {
                  next.splice(0, next.length - MESSAGE_HISTORY_LIMIT);
                }
                return next;
              });
            }
          }
        } catch (err) {
          console.warn('Failed to parse chat message', err);
        }
      };
    } catch (err) {
      console.warn('Kick chat socket failed to initialize', err);
      setError('Unable to connect to chat');
      updateConnectionState('error');
      setLoading(false);
    }
  }, [channelId, teardownSocket, updateConnectionState]);

  useEffect(() => {
    if (enableSevenTvEmotes) {
      loadEmotes();
    } else {
      setEmoteMap({});
    }
  }, [enableSevenTvEmotes, loadEmotes]);

  useEffect(() => {
    connectSocket();

    return () => {
      teardownSocket();
    };
  }, [connectSocket, teardownSocket]);

  useEffect(() => {
    if (connectionState === 'connected' && loading) {
      setLoading(false);
    }
  }, [connectionState, loading]);

  const renderMessage = useCallback<ListRenderItem<KickChatMessage>>(
    ({ item }) => {
      const messageParts = splitMessageContent(item.content, emoteMap);
      return (
        <View style={styles.messageRow}>
          <Text style={[styles.username, { color: item.sender.color ?? colors.primary }]}>
            {item.sender.username}
            {': '}
          </Text>
          <View style={styles.messageContent}>
            {messageParts.length > 0 ? (
              messageParts.map((part, index) => {
                if (part.type === 'text') {
                  return (
                    <Text
                      key={`${item.id}-text-${index}`}
                      style={[styles.messageText, { color: colors.text }]}>
                      {part.content}
                    </Text>
                  );
                }

                return (
                  <Image
                    key={`${item.id}-emote-${index}`}
                    source={{ uri: part.url }}
                    style={styles.emote}
                    resizeMode="contain"
                  />
                );
              })
            ) : (
              <Text style={[styles.messageText, { color: colors.text }]}>{item.content}</Text>
            )}
          </View>
        </View>
      );
    },
    [colors.primary, colors.text, emoteMap]
  );

  const listEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.tertiaryText }]}>
          No chat messages yet.
        </Text>
      </View>
    ),
    [colors.tertiaryText]
  );

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.backgroundSecondary ?? colors.background },
      ]}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={listEmptyComponent}
        style={styles.list}
        initialNumToRender={20}
        maxToRenderPerBatch={40}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  username: {
    fontWeight: '600',
  },
  messageContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emote: {
    width: 32,
    height: 32,
    marginHorizontal: 2,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 14,
  },
  emptyList: {
    flexGrow: 1,
  },
});
