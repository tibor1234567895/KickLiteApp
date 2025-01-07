import axios from 'axios';
import { ApiResponse, Channel, LivestreamsResponse } from '../types';

const BASE_URL = 'https://kick.com/api/v2';
const STREAM_URL = 'https://kick.com';

const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

export const getChannelInfo = async (username: string): Promise<Channel> => {
  try {
    const response = await axios.get<Channel>(`${BASE_URL}/channels/${username}`, { headers });
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
    const response = await axios.get<LivestreamsResponse>(
      `${STREAM_URL}/stream/livestreams/tr`,
      {
        params: {
          page,
          limit,
          sort: 'desc',
        },
        headers,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch livestreams');
    }
    throw new Error('An unexpected error occurred');
  }
}; 