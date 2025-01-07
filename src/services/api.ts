import axios from 'axios';
import { ApiResponse, Channel } from '../types';

const BASE_URL = 'https://kick.com/api/v2';

export const getChannelInfo = async (username: string): Promise<Channel> => {
  try {
    const response = await axios.get<Channel>(`${BASE_URL}/channels/${username}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to fetch channel info');
    }
    throw new Error('An unexpected error occurred');
  }
}; 