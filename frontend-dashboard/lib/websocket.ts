'use client';

import { io, Socket } from 'socket.io-client';

export interface QuestUpdate {
  id: string;
  type: 'quest_created' | 'quest_updated' | 'quest_completed' | 'quest_deleted';
  quest: any;
  timestamp: string;
}

export interface VibeUpdate {
  id: string;
  type: 'vibe_created' | 'vibe_updated' | 'vibe_liked' | 'vibe_boosted' | 'vibe_deleted';
  vibe: any;
  timestamp: string;
}

export interface LocationUpdate {
  userId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: string;
}

export interface NotificationUpdate {
  id: string;
  type: 'quest_nearby' | 'quest_reminder' | 'achievement_unlocked' | 'social_interaction';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    
    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 WebSocket connection error:', error);
      this.handleReconnect();
    });

    // Quest updates
    this.socket.on('quest_update', (data: QuestUpdate) => {
      console.log('📋 Quest update received:', data);
      this.emit('quest_update', data);
    });

    // Vibe updates
    this.socket.on('vibe_update', (data: VibeUpdate) => {
      console.log('⚡ Vibe update received:', data);
      this.emit('vibe_update', data);
    });

    // Location updates (for nearby users)
    this.socket.on('location_update', (data: LocationUpdate) => {
      this.emit('location_update', data);
    });

    // Notifications
    this.socket.on('notification', (data: NotificationUpdate) => {
      console.log('🔔 Notification received:', data);
      this.emit('notification', data);
    });

    // Real-time analytics
    this.socket.on('analytics_update', (data: any) => {
      this.emit('analytics_update', data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection_failed', { attempts: this.reconnectAttempts });
    }
  }

  // Subscribe to events
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Unsubscribe from events
  off(event: string, callback?: Function) {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  // Emit events to listeners
  private emit(event: string, data: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  // Send location updates
  sendLocationUpdate(location: { latitude: number; longitude: number; accuracy?: number }) {
    if (this.socket && this.isConnected) {
      this.socket.emit('location_update', {
        location,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Join location-based rooms for nearby updates
  joinLocationRoom(latitude: number, longitude: number, radius: number = 5) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_location_room', {
        latitude,
        longitude,
        radius
      });
    }
  }

  // Leave location-based rooms
  leaveLocationRoom() {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_location_room');
    }
  }

  // Track user interactions for analytics
  trackInteraction(type: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit('track_interaction', {
        type,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socket: this.socket?.connected || false
    };
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!wsService) {
    wsService = new WebSocketService();
  }
  return wsService;
};

export default WebSocketService;
