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