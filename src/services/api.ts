import axios from 'axios';

import { Channel, LivestreamsResponse } from '../types';

const BASE_URL = 'https://kick.com/api/v2';
const STREAM_URL = 'https://kick.com';

let authToken: string | null = null;

export const configureAuthToken = (token: string | null) => {
  authToken = token;
};

const buildHeaders = () => ({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

export const getChannelInfo = async (username: string): Promise<Channel> => {
  try {
    const response = await axios.get<Channel>(`${BASE_URL}/channels/${username}`, {
      headers: buildHeaders(),
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch channel info');
    }
    throw new Error('An unexpected error occurred');
  }
};

export const getLivestreams = async (page = 1, limit = 24): Promise<LivestreamsResponse> => {
  try {
    const response = await axios.get<LivestreamsResponse>(`${STREAM_URL}/stream/livestreams/tr`, {
      params: {
        page,
        limit,
        sort: 'desc',
      },
      headers: buildHeaders(),
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch livestreams');
    }
    throw new Error('An unexpected error occurred');
  }
};
