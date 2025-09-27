import Constants from 'expo-constants';

export interface ChannelSearchResult {
  username: string;
  followers_count: number;
  is_live: boolean;
  verified: boolean;
}

const TYPESENSE_SEARCH_URL = 'https://search.kick.com/multi_search';
const MISSING_KEY_ERROR =
  'Missing Typesense search key. Set EXPO_PUBLIC_TYPESENSE_SEARCH_KEY in your environment before running the app.';

const getTypesenseSearchKey = (): string => {
  const extra = (Constants.expoConfig ?? Constants.manifest)?.extra as
    | { typesenseSearchKey?: string }
    | undefined;

  const key = extra?.typesenseSearchKey;

  if (!key) {
    throw new Error(MISSING_KEY_ERROR);
  }

  return key;
};

export const searchChannels = async (query: string): Promise<ChannelSearchResult[]> => {
  if (!query.trim()) {
    return [];
  }

  const apiKey = getTypesenseSearchKey();

  const response = await fetch(TYPESENSE_SEARCH_URL, {
    method: 'POST',
    headers: {
      'content-type': 'text/plain;charset=UTF-8',
      'x-typesense-api-key': apiKey,
    },
    body: JSON.stringify({
      searches: [
        { preset: 'category_search', q: query },
        { preset: 'channel_search', q: query },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  const data = await response.json();

  const channelHits = data?.results?.[1]?.hits ?? [];

  return channelHits.map((hit: any) => ({
    username: hit.document?.username,
    followers_count: hit.document?.followers_count ?? 0,
    is_live: Boolean(hit.document?.is_live),
    verified: Boolean(hit.document?.verified),
  }));
};
