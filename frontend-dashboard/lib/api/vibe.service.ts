'use client';

import { apiClient } from '../api';

export interface Vibe {
  id: string;
  title: string;
  description?: string;
  creator: string;
  creatorId: string;
  type: 'photo' | 'video' | 'audio' | 'text';
  content: {
    url?: string;
    text?: string;
    thumbnail?: string;
  };
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  likes: number;
  boosts: number;
  comments: number;
  shares: number;
  tags?: string[];
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isBoosted?: boolean;
}

export interface VibeFilters {
  types?: string[];
  creators?: string[];
  latitude?: number;
  longitude?: number;
  radius?: number;
  search?: string;
  tags?: string[];
  minLikes?: number;
  sortBy?: 'recent' | 'popular' | 'trending' | 'nearby';
  limit?: number;
  offset?: number;
}

export interface VibeInteraction {
  vibeId: string;
  userId: string;
  type: 'like' | 'boost' | 'comment' | 'share';
  timestamp: string;
  data?: any;
}

export interface VibeComment {
  id: string;
  vibeId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
}

class VibeService {
  // Get all vibes with optional filters
  async getVibes(filters?: VibeFilters): Promise<Vibe[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.types?.length) params.append('types', filters.types.join(','));
        if (filters.creators?.length) params.append('creators', filters.creators.join(','));
        if (filters.latitude) params.append('latitude', filters.latitude.toString());
        if (filters.longitude) params.append('longitude', filters.longitude.toString());
        if (filters.radius) params.append('radius', filters.radius.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.tags?.length) params.append('tags', filters.tags.join(','));
        if (filters.minLikes) params.append('minLikes', filters.minLikes.toString());
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.offset) params.append('offset', filters.offset.toString());
      }

      const response = await apiClient.get(`/vibes?${params.toString()}`);
      return response.data.vibes || [];
    } catch (error) {
      console.error('Error fetching vibes:', error);
      return [];
    }
  }

  // Get nearby vibes based on location
  async getNearbyVibes(
    latitude: number, 
    longitude: number, 
    radius: number = 5,
    filters?: Omit<VibeFilters, 'latitude' | 'longitude' | 'radius'>
  ): Promise<Vibe[]> {
    return this.getVibes({
      ...filters,
      latitude,
      longitude,
      radius
    });
  }

  // Get vibe by ID
  async getVibeById(id: string): Promise<Vibe | null> {
    try {
      const response = await apiClient.get(`/vibes/${id}`);
      return response.data.vibe || null;
    } catch (error) {
      console.error('Error fetching vibe:', error);
      return null;
    }
  }

  // Create new vibe
  async createVibe(vibeData: Omit<Vibe, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'boosts' | 'comments' | 'shares'>): Promise<Vibe | null> {
    try {
      const response = await apiClient.post('/vibes', vibeData);
      return response.data.vibe || null;
    } catch (error) {
      console.error('Error creating vibe:', error);
      return null;
    }
  }

  // Update vibe
  async updateVibe(id: string, updates: Partial<Vibe>): Promise<Vibe | null> {
    try {
      const response = await apiClient.put(`/vibes/${id}`, updates);
      return response.data.vibe || null;
    } catch (error) {
      console.error('Error updating vibe:', error);
      return null;
    }
  }

  // Delete vibe
  async deleteVibe(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/vibes/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting vibe:', error);
      return false;
    }
  }

  // Like/unlike vibe
  async toggleLike(vibeId: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`/vibes/${vibeId}/like`);
      return response.data.liked || false;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  }

  // Boost/unboost vibe
  async toggleBoost(vibeId: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`/vibes/${vibeId}/boost`);
      return response.data.boosted || false;
    } catch (error) {
      console.error('Error toggling boost:', error);
      return false;
    }
  }

  // Share vibe
  async shareVibe(vibeId: string, platform?: string): Promise<boolean> {
    try {
      await apiClient.post(`/vibes/${vibeId}/share`, { platform });
      return true;
    } catch (error) {
      console.error('Error sharing vibe:', error);
      return false;
    }
  }

  // Get vibe comments
  async getVibeComments(vibeId: string, limit?: number, offset?: number): Promise<VibeComment[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      const response = await apiClient.get(`/vibes/${vibeId}/comments?${params.toString()}`);
      return response.data.comments || [];
    } catch (error) {
      console.error('Error fetching vibe comments:', error);
      return [];
    }
  }

  // Add comment to vibe
  async addComment(vibeId: string, content: string): Promise<VibeComment | null> {
    try {
      const response = await apiClient.post(`/vibes/${vibeId}/comments`, { content });
      return response.data.comment || null;
    } catch (error) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  // Delete comment
  async deleteComment(vibeId: string, commentId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/vibes/${vibeId}/comments/${commentId}`);
      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // Get trending vibes
  async getTrendingVibes(limit: number = 10): Promise<Vibe[]> {
    try {
      const response = await apiClient.get(`/vibes/trending?limit=${limit}`);
      return response.data.vibes || [];
    } catch (error) {
      console.error('Error fetching trending vibes:', error);
      return [];
    }
  }

  // Get user's vibes
  async getUserVibes(userId?: string, limit?: number, offset?: number): Promise<Vibe[]> {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());
      
      const response = await apiClient.get(`/vibes/user?${params.toString()}`);
      return response.data.vibes || [];
    } catch (error) {
      console.error('Error fetching user vibes:', error);
      return [];
    }
  }

  // Search vibes
  async searchVibes(query: string, filters?: VibeFilters): Promise<Vibe[]> {
    return this.getVibes({
      ...filters,
      search: query
    });
  }

  // Get vibe statistics
  async getVibeStats(vibeId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/vibes/${vibeId}/stats`);
      return response.data.stats || {};
    } catch (error) {
      console.error('Error fetching vibe stats:', error);
      return {};
    }
  }

  // Upload vibe content (photo/video/audio)
  async uploadVibeContent(file: File, type: 'photo' | 'video' | 'audio'): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await apiClient.post('/vibes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.url || null;
    } catch (error) {
      console.error('Error uploading vibe content:', error);
      return null;
    }
  }

  // Report vibe
  async reportVibe(vibeId: string, reason: string, details?: string): Promise<boolean> {
    try {
      await apiClient.post(`/vibes/${vibeId}/report`, { reason, details });
      return true;
    } catch (error) {
      console.error('Error reporting vibe:', error);
      return false;
    }
  }
}

// Singleton instance
let vibeService: VibeService | null = null;

export const getVibeService = (): VibeService => {
  if (!vibeService) {
    vibeService = new VibeService();
  }
  return vibeService;
};

export default VibeService;
