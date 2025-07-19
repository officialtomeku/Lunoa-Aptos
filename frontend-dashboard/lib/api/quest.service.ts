'use client';

import { apiClient } from '../api';

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'exploration' | 'social' | 'challenge' | 'business';
  difficulty: 'easy' | 'medium' | 'hard';
  reward: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: 'available' | 'active' | 'completed';
  participants: number;
  maxParticipants?: number;
  timeLimit?: string;
  requirements?: string[];
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface QuestFilters {
  types?: string[];
  difficulty?: string[];
  minReward?: number;
  maxReward?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  status?: string[];
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface QuestParticipation {
  questId: string;
  userId: string;
  status: 'joined' | 'in_progress' | 'completed' | 'abandoned';
  joinedAt: string;
  completedAt?: string;
  progress?: any;
}

export interface QuestCheckIn {
  questId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: string;
  notes?: string;
}

class QuestService {
  // Get all quests with optional filters
  async getQuests(filters?: QuestFilters): Promise<Quest[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.types?.length) params.append('types', filters.types.join(','));
        if (filters.difficulty?.length) params.append('difficulty', filters.difficulty.join(','));
        if (filters.minReward) params.append('minReward', filters.minReward.toString());
        if (filters.maxReward) params.append('maxReward', filters.maxReward.toString());
        if (filters.latitude) params.append('latitude', filters.latitude.toString());
        if (filters.longitude) params.append('longitude', filters.longitude.toString());
        if (filters.radius) params.append('radius', filters.radius.toString());
        if (filters.status?.length) params.append('status', filters.status.join(','));
        if (filters.search) params.append('search', filters.search);
        if (filters.tags?.length) params.append('tags', filters.tags.join(','));
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.offset) params.append('offset', filters.offset.toString());
      }

      const response = await apiClient.get(`/quests?${params.toString()}`);
      return response.data.quests || [];
    } catch (error) {
      console.error('Error fetching quests:', error);
      return [];
    }
  }

  // Get nearby quests based on location
  async getNearbyQuests(
    latitude: number, 
    longitude: number, 
    radius: number = 5,
    filters?: Omit<QuestFilters, 'latitude' | 'longitude' | 'radius'>
  ): Promise<Quest[]> {
    return this.getQuests({
      ...filters,
      latitude,
      longitude,
      radius
    });
  }

  // Get quest by ID
  async getQuestById(id: string): Promise<Quest | null> {
    try {
      const response = await apiClient.get(`/quests/${id}`);
      return response.data.quest || null;
    } catch (error) {
      console.error('Error fetching quest:', error);
      return null;
    }
  }

  // Create new quest
  async createQuest(questData: Omit<Quest, 'id' | 'createdAt' | 'updatedAt' | 'participants'>): Promise<Quest | null> {
    try {
      const response = await apiClient.post('/quests', questData);
      return response.data.quest || null;
    } catch (error) {
      console.error('Error creating quest:', error);
      return null;
    }
  }

  // Update quest
  async updateQuest(id: string, updates: Partial<Quest>): Promise<Quest | null> {
    try {
      const response = await apiClient.put(`/quests/${id}`, updates);
      return response.data.quest || null;
    } catch (error) {
      console.error('Error updating quest:', error);
      return null;
    }
  }

  // Delete quest
  async deleteQuest(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/quests/${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting quest:', error);
      return false;
    }
  }

  // Join quest
  async joinQuest(questId: string): Promise<QuestParticipation | null> {
    try {
      const response = await apiClient.post(`/quests/${questId}/join`);
      return response.data.participation || null;
    } catch (error) {
      console.error('Error joining quest:', error);
      return null;
    }
  }

  // Leave quest
  async leaveQuest(questId: string): Promise<boolean> {
    try {
      await apiClient.post(`/quests/${questId}/leave`);
      return true;
    } catch (error) {
      console.error('Error leaving quest:', error);
      return false;
    }
  }

  // Check in to quest location
  async checkInToQuest(questId: string, checkInData: Omit<QuestCheckIn, 'questId'>): Promise<boolean> {
    try {
      await apiClient.post(`/quests/${questId}/checkin`, checkInData);
      return true;
    } catch (error) {
      console.error('Error checking in to quest:', error);
      return false;
    }
  }

  // Complete quest
  async completeQuest(questId: string, completionData?: any): Promise<boolean> {
    try {
      await apiClient.post(`/quests/${questId}/complete`, completionData);
      return true;
    } catch (error) {
      console.error('Error completing quest:', error);
      return false;
    }
  }

  // Get user's quest participations
  async getUserQuests(status?: string): Promise<QuestParticipation[]> {
    try {
      const params = status ? `?status=${status}` : '';
      const response = await apiClient.get(`/user/quests${params}`);
      return response.data.participations || [];
    } catch (error) {
      console.error('Error fetching user quests:', error);
      return [];
    }
  }

  // Get quest statistics
  async getQuestStats(questId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/quests/${questId}/stats`);
      return response.data.stats || {};
    } catch (error) {
      console.error('Error fetching quest stats:', error);
      return {};
    }
  }

  // Search quests
  async searchQuests(query: string, filters?: QuestFilters): Promise<Quest[]> {
    return this.getQuests({
      ...filters,
      search: query
    });
  }

  // Get trending quests
  async getTrendingQuests(limit: number = 10): Promise<Quest[]> {
    try {
      const response = await apiClient.get(`/quests/trending?limit=${limit}`);
      return response.data.quests || [];
    } catch (error) {
      console.error('Error fetching trending quests:', error);
      return [];
    }
  }

  // Get recommended quests for user
  async getRecommendedQuests(limit: number = 10): Promise<Quest[]> {
    try {
      const response = await apiClient.get(`/quests/recommended?limit=${limit}`);
      return response.data.quests || [];
    } catch (error) {
      console.error('Error fetching recommended quests:', error);
      return [];
    }
  }
}

// Singleton instance
let questService: QuestService | null = null;

export const getQuestService = (): QuestService => {
  if (!questService) {
    questService = new QuestService();
  }
  return questService;
};

export default QuestService;
