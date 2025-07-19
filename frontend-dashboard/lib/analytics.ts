'use client';

import { getWebSocketService } from './websocket';

export interface AnalyticsEvent {
  type: string;
  category: 'map' | 'quest' | 'vibe' | 'user' | 'navigation' | 'interaction';
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: string;
  sessionId: string;
  userId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
  type: 'quest_view' | 'quest_join' | 'vibe_create' | 'vibe_like' | 'user_location';
  timestamp: string;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  pageViews: number;
  interactions: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  device: {
    userAgent: string;
    screen: {
      width: number;
      height: number;
    };
    viewport: {
      width: number;
      height: number;
    };
  };
}

class AnalyticsService {
  private sessionId: string;
  private session: UserSession;
  private eventQueue: AnalyticsEvent[] = [];
  private isOnline: boolean = true;
  private flushInterval: NodeJS.Timeout | null = null;
  private wsService = getWebSocketService();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.session = this.initializeSession();
    this.setupEventListeners();
    this.startSession();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeSession(): UserSession {
    return {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      pageViews: 0,
      interactions: 0,
      device: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        screen: {
          width: typeof screen !== 'undefined' ? screen.width : 0,
          height: typeof screen !== 'undefined' ? screen.height : 0,
        },
        viewport: {
          width: typeof window !== 'undefined' ? window.innerWidth : 0,
          height: typeof window !== 'undefined' ? window.innerHeight : 0,
        },
      },
    };
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('session', 'user', 'page_hidden');
      } else {
        this.track('session', 'user', 'page_visible');
      }
    });

    // Track online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.track('session', 'user', 'online');
      this.flushEvents();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.track('session', 'user', 'offline');
    });

    // Track window resize
    window.addEventListener('resize', () => {
      this.session.device.viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      this.track('session', 'user', 'window_resize', undefined, undefined, {
        viewport: this.session.device.viewport,
      });
    });

    // Track beforeunload for session end
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Auto-flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000);
  }

  private startSession() {
    this.track('session', 'user', 'session_start');
  }

  private endSession() {
    this.session.endTime = new Date().toISOString();
    this.session.duration = new Date().getTime() - new Date(this.session.startTime).getTime();
    
    this.track('session', 'user', 'session_end', undefined, this.session.duration, {
      session: this.session,
    });
    
    this.flushEvents();
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  // Main tracking method
  track(
    type: string,
    category: AnalyticsEvent['category'],
    action: string,
    label?: string,
    value?: number,
    properties?: Record<string, any>,
    location?: { latitude: number; longitude: number }
  ) {
    const event: AnalyticsEvent = {
      type,
      category,
      action,
      label,
      value,
      properties,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.getCurrentUserId(),
      location,
    };

    this.eventQueue.push(event);
    this.updateSessionStats(category, action);

    // Send to WebSocket for real-time analytics
    this.wsService.trackInteraction(type, event);

    // Auto-flush if queue gets too large
    if (this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  private updateSessionStats(category: string, action: string) {
    if (action === 'page_view') {
      this.session.pageViews++;
    } else if (category !== 'session') {
      this.session.interactions++;
    }
  }

  private getCurrentUserId(): string | undefined {
    // Get user ID from your auth system
    if (typeof localStorage !== 'undefined') {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          return JSON.parse(user).id;
        } catch (e) {
          return undefined;
        }
      }
    }
    return undefined;
  }

  // Flush events to backend
  private async flushEvents() {
    if (this.eventQueue.length === 0 || !this.isOnline) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send to backend analytics endpoint
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      });
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue events if failed
      this.eventQueue.unshift(...events);
    }
  }

  // Map-specific tracking methods
  trackMapInteraction(action: string, properties?: Record<string, any>, location?: { latitude: number; longitude: number }) {
    this.track('map_interaction', 'map', action, undefined, undefined, properties, location);
  }

  trackQuestInteraction(action: string, questId: string, properties?: Record<string, any>) {
    this.track('quest_interaction', 'quest', action, questId, undefined, properties);
  }

  trackVibeInteraction(action: string, vibeId: string, properties?: Record<string, any>) {
    this.track('vibe_interaction', 'vibe', action, vibeId, undefined, properties);
  }

  trackNavigation(page: string, referrer?: string) {
    this.track('page_view', 'navigation', 'page_view', page, undefined, { referrer });
  }

  trackSearch(query: string, category: string, results: number) {
    this.track('search', 'interaction', 'search_query', query, results, { category });
  }

  trackFilter(filterType: string, filterValue: any, resultCount: number) {
    this.track('filter', 'interaction', 'filter_applied', filterType, resultCount, { filterValue });
  }

  trackLocation(latitude: number, longitude: number, accuracy?: number) {
    this.track('location_update', 'user', 'location_tracked', undefined, accuracy, undefined, {
      latitude,
      longitude,
    });
    
    // Update session location
    this.session.location = { latitude, longitude };
  }

  trackError(error: string, context?: string, properties?: Record<string, any>) {
    this.track('error', 'user', 'error_occurred', error, undefined, {
      context,
      ...properties,
    });
  }

  trackPerformance(metric: string, value: number, properties?: Record<string, any>) {
    this.track('performance', 'user', metric, undefined, value, properties);
  }

  // Heatmap data collection
  trackHeatmapPoint(
    latitude: number,
    longitude: number,
    type: HeatmapPoint['type'],
    intensity: number = 1
  ) {
    const heatmapPoint: HeatmapPoint = {
      latitude,
      longitude,
      intensity,
      type,
      timestamp: new Date().toISOString(),
    };

    this.track('heatmap_point', 'map', 'heatmap_data', type, intensity, heatmapPoint, {
      latitude,
      longitude,
    });
  }

  // Get analytics data (for dashboard)
  async getAnalytics(timeRange: string = '24h'): Promise<any> {
    try {
      const response = await fetch(`/api/analytics/dashboard?range=${timeRange}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return null;
    }
  }

  // Get heatmap data
  async getHeatmapData(
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    },
    type?: HeatmapPoint['type']
  ): Promise<HeatmapPoint[]> {
    try {
      const params = new URLSearchParams({
        north: bounds.north.toString(),
        south: bounds.south.toString(),
        east: bounds.east.toString(),
        west: bounds.west.toString(),
      });
      
      if (type) params.append('type', type);

      const response = await fetch(`/api/analytics/heatmap?${params.toString()}`);
      const data = await response.json();
      return data.points || [];
    } catch (error) {
      console.error('Failed to fetch heatmap data:', error);
      return [];
    }
  }

  // Set user ID when user logs in
  setUserId(userId: string) {
    this.session.userId = userId;
    this.track('user', 'user', 'user_identified', userId);
  }

  // Get current session info
  getSession(): UserSession {
    return { ...this.session };
  }

  // Manual flush
  flush() {
    this.flushEvents();
  }
}

// Singleton instance
let analyticsService: AnalyticsService | null = null;

export const getAnalyticsService = (): AnalyticsService => {
  if (!analyticsService && typeof window !== 'undefined') {
    analyticsService = new AnalyticsService();
  }
  return analyticsService!;
};

// Convenience functions for common tracking
export const trackMapView = (location?: { latitude: number; longitude: number }) => {
  getAnalyticsService()?.trackMapInteraction('map_view', undefined, location);
};

export const trackQuestClick = (questId: string, location?: { latitude: number; longitude: number }) => {
  getAnalyticsService()?.trackQuestInteraction('quest_click', questId, { location });
};

export const trackVibeClick = (vibeId: string, location?: { latitude: number; longitude: number }) => {
  getAnalyticsService()?.trackVibeInteraction('vibe_click', vibeId, { location });
};

export const trackSearch = (query: string, category: string, results: number) => {
  getAnalyticsService()?.trackSearch(query, category, results);
};

export const trackFilter = (filterType: string, filterValue: any, resultCount: number) => {
  getAnalyticsService()?.trackFilter(filterType, filterValue, resultCount);
};

export default AnalyticsService;
