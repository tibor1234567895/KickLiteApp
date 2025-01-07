export interface LivestreamsResponse {
  data: LivestreamItem[];
  first_page_url: string;
  from: number;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
}

export interface LivestreamItem {
  id: number;
  slug: string;
  channel_id: number;
  created_at: string;
  session_title: string;
  is_live: boolean;
  risk_level_id: number | null;
  start_time: string;
  viewer_count: number;
  language: string;
  is_mature: boolean;
  thumbnail: {
    srcset: string;
    src: string;
  };
  channel: Channel;
}

export interface Channel {
  id: number;
  user_id: number;
  slug: string;
  playback_url: string;
  livestream?: Livestream;
  user: User;
}

export interface Livestream {
  id: number;
  slug: string;
  session_title: string;
  is_live: boolean;
  viewer_count: number;
  thumbnail: {
    url: string;
  };
}

export interface User {
  id: number;
  username: string;
  profile_pic: string;
}

export interface ApiResponse {
  success: boolean;
  error?: string;
  data?: Channel;
}

export type RootStackParamList = {
  Home: undefined;
  Stream: { username: string };
  Followed: undefined;
  Search: undefined;
}; 