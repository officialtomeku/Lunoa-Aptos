'use client';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface SecurityEvent {
  type: 'rate_limit_exceeded' | 'suspicious_activity' | 'location_spam' | 'invalid_request';
  timestamp: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

export interface LocationRequest {
  timestamp: string;
  accuracy?: number;
  source: 'gps' | 'network' | 'manual';
  requestId: string;
}

class SecurityService {
  private rateLimiters: Map<string, { requests: number[]; blocked: boolean; blockedUntil?: number }> = new Map();
  private locationRequests: LocationRequest[] = [];
  private securityEvents: SecurityEvent[] = [];
  private maxLocationHistory = 100;
  private suspiciousActivityThreshold = 10;

  // Rate limiting configurations
  private configs: Record<string, RateLimitConfig> = {
    location_tracking: {
      maxRequests: 60, // 60 requests per minute
      windowMs: 60 * 1000,
      blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
    },
    api_calls: {
      maxRequests: 100, // 100 API calls per minute
      windowMs: 60 * 1000,
      blockDurationMs: 2 * 60 * 1000, // Block for 2 minutes
    },
    search_requests: {
      maxRequests: 30, // 30 searches per minute
      windowMs: 60 * 1000,
      blockDurationMs: 1 * 60 * 1000, // Block for 1 minute
    },
    websocket_messages: {
      maxRequests: 200, // 200 messages per minute
      windowMs: 60 * 1000,
      blockDurationMs: 30 * 1000, // Block for 30 seconds
    },
  };

  constructor() {
    this.setupCleanupInterval();
  }

  private setupCleanupInterval() {
    // Clean up old data every 5 minutes
    setInterval(() => {
      this.cleanupOldData();
    }, 5 * 60 * 1000);
  }

  private cleanupOldData() {
    const now = Date.now();
    
    // Clean up rate limiter data
    this.rateLimiters.forEach((limiter, key) => {
      const config = this.configs[key];
      if (config) {
        limiter.requests = limiter.requests.filter(
          timestamp => now - timestamp < config.windowMs
        );
        
        // Unblock if block duration has passed
        if (limiter.blocked && limiter.blockedUntil && now > limiter.blockedUntil) {
          limiter.blocked = false;
          limiter.blockedUntil = undefined;
        }
      }
    });

    // Clean up old location requests
    const oneHourAgo = now - (60 * 60 * 1000);
    this.locationRequests = this.locationRequests.filter(
      req => new Date(req.timestamp).getTime() > oneHourAgo
    );

    // Clean up old security events
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    this.securityEvents = this.securityEvents.filter(
      event => new Date(event.timestamp).getTime() > oneDayAgo
    );
  }

  // Check if request is allowed under rate limit
  checkRateLimit(type: string, identifier: string = 'default'): boolean {
    const key = `${type}_${identifier}`;
    const config = this.configs[type];
    
    if (!config) {
      console.warn(`No rate limit config found for type: ${type}`);
      return true;
    }

    const now = Date.now();
    let limiter = this.rateLimiters.get(key);

    if (!limiter) {
      limiter = { requests: [], blocked: false };
      this.rateLimiters.set(key, limiter);
    }

    // Check if currently blocked
    if (limiter.blocked) {
      if (limiter.blockedUntil && now > limiter.blockedUntil) {
        limiter.blocked = false;
        limiter.blockedUntil = undefined;
      } else {
        this.logSecurityEvent('rate_limit_exceeded', {
          type,
          identifier,
          blocked: true,
        }, 'medium');
        return false;
      }
    }

    // Clean old requests outside the window
    limiter.requests = limiter.requests.filter(
      timestamp => now - timestamp < config.windowMs
    );

    // Check if limit exceeded
    if (limiter.requests.length >= config.maxRequests) {
      limiter.blocked = true;
      limiter.blockedUntil = now + (config.blockDurationMs || config.windowMs);
      
      this.logSecurityEvent('rate_limit_exceeded', {
        type,
        identifier,
        requestCount: limiter.requests.length,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      }, 'high');
      
      return false;
    }

    // Add current request
    limiter.requests.push(now);
    return true;
  }

  // Validate location request
  validateLocationRequest(
    latitude: number,
    longitude: number,
    accuracy?: number,
    source: LocationRequest['source'] = 'gps'
  ): { valid: boolean; reason?: string } {
    // Basic coordinate validation
    if (latitude < -90 || latitude > 90) {
      return { valid: false, reason: 'Invalid latitude' };
    }
    
    if (longitude < -180 || longitude > 180) {
      return { valid: false, reason: 'Invalid longitude' };
    }

    // Check for suspicious accuracy values
    if (accuracy !== undefined) {
      if (accuracy < 0 || accuracy > 10000) {
        this.logSecurityEvent('suspicious_activity', {
          type: 'invalid_accuracy',
          accuracy,
          latitude,
          longitude,
        }, 'medium');
        return { valid: false, reason: 'Suspicious accuracy value' };
      }
    }

    // Check for location spam (too many requests from same location)
    const recentSimilarRequests = this.locationRequests.filter(req => {
      const timeDiff = Date.now() - new Date(req.timestamp).getTime();
      const isRecent = timeDiff < 60 * 1000; // Within last minute
      
      if (!isRecent) return false;
      
      // Check if locations are very similar (within 10 meters)
      const distance = this.calculateDistance(
        latitude, longitude,
        parseFloat(req.requestId.split('_')[1] || '0'),
        parseFloat(req.requestId.split('_')[2] || '0')
      );
      
      return distance < 0.01; // Less than 10 meters
    });

    if (recentSimilarRequests.length > 5) {
      this.logSecurityEvent('location_spam', {
        latitude,
        longitude,
        similarRequestCount: recentSimilarRequests.length,
      }, 'high');
      return { valid: false, reason: 'Location spam detected' };
    }

    // Check for impossible movement speed
    const lastRequest = this.locationRequests[this.locationRequests.length - 1];
    if (lastRequest) {
      const timeDiff = Date.now() - new Date(lastRequest.timestamp).getTime();
      const lastLat = parseFloat(lastRequest.requestId.split('_')[1] || '0');
      const lastLng = parseFloat(lastRequest.requestId.split('_')[2] || '0');
      
      if (timeDiff > 0 && timeDiff < 10 * 1000) { // Within 10 seconds
        const distance = this.calculateDistance(latitude, longitude, lastLat, lastLng);
        const speedKmh = (distance / (timeDiff / 1000)) * 3.6;
        
        // Flag if speed exceeds 300 km/h (impossible for normal travel)
        if (speedKmh > 300) {
          this.logSecurityEvent('suspicious_activity', {
            type: 'impossible_speed',
            speedKmh,
            distance,
            timeDiff,
            currentLocation: { latitude, longitude },
            previousLocation: { latitude: lastLat, longitude: lastLng },
          }, 'high');
          return { valid: false, reason: 'Impossible movement speed detected' };
        }
      }
    }

    // Log valid location request
    const locationRequest: LocationRequest = {
      timestamp: new Date().toISOString(),
      accuracy,
      source,
      requestId: `${Date.now()}_${latitude}_${longitude}`,
    };

    this.locationRequests.push(locationRequest);
    
    // Keep only recent requests
    if (this.locationRequests.length > this.maxLocationHistory) {
      this.locationRequests = this.locationRequests.slice(-this.maxLocationHistory);
    }

    return { valid: true };
  }

  // Calculate distance between two points (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Sanitize user input
  sanitizeInput(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  // Validate API request parameters
  validateApiRequest(params: Record<string, any>): { valid: boolean; sanitized: Record<string, any>; errors: string[] } {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    Object.entries(params).forEach(([key, value]) => {
      switch (key) {
        case 'search':
        case 'query':
          if (typeof value === 'string') {
            sanitized[key] = this.sanitizeInput(value, 200);
            if (value.length > 200) {
              errors.push(`${key} exceeds maximum length`);
            }
          }
          break;
          
        case 'latitude':
        case 'longitude':
          const num = parseFloat(value);
          if (isNaN(num)) {
            errors.push(`${key} must be a valid number`);
          } else if (key === 'latitude' && (num < -90 || num > 90)) {
            errors.push('Latitude must be between -90 and 90');
          } else if (key === 'longitude' && (num < -180 || num > 180)) {
            errors.push('Longitude must be between -180 and 180');
          } else {
            sanitized[key] = num;
          }
          break;
          
        case 'radius':
        case 'limit':
        case 'offset':
          const intVal = parseInt(value);
          if (isNaN(intVal) || intVal < 0) {
            errors.push(`${key} must be a positive integer`);
          } else if (key === 'radius' && intVal > 100) {
            errors.push('Radius cannot exceed 100km');
          } else if (key === 'limit' && intVal > 100) {
            errors.push('Limit cannot exceed 100');
          } else {
            sanitized[key] = intVal;
          }
          break;
          
        default:
          if (typeof value === 'string') {
            sanitized[key] = this.sanitizeInput(value);
          } else {
            sanitized[key] = value;
          }
      }
    });

    return {
      valid: errors.length === 0,
      sanitized,
      errors,
    };
  }

  // Log security events
  private logSecurityEvent(
    type: SecurityEvent['type'],
    details: Record<string, any>,
    severity: SecurityEvent['severity']
  ) {
    const event: SecurityEvent = {
      type,
      timestamp: new Date().toISOString(),
      details,
      severity,
    };

    this.securityEvents.push(event);
    
    // Log to console for development
    if (severity === 'high') {
      console.warn('🚨 High severity security event:', event);
    } else if (severity === 'medium') {
      console.warn('⚠️ Medium severity security event:', event);
    }

    // Send to backend for monitoring
    this.reportSecurityEvent(event);
  }

  // Report security event to backend
  private async reportSecurityEvent(event: SecurityEvent) {
    try {
      await fetch('/api/security/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to report security event:', error);
    }
  }

  // Get security statistics
  getSecurityStats(): {
    rateLimitViolations: number;
    suspiciousActivities: number;
    locationSpamAttempts: number;
    totalEvents: number;
    recentEvents: SecurityEvent[];
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentEvents = this.securityEvents.filter(
      event => new Date(event.timestamp).getTime() > oneHourAgo
    );

    return {
      rateLimitViolations: recentEvents.filter(e => e.type === 'rate_limit_exceeded').length,
      suspiciousActivities: recentEvents.filter(e => e.type === 'suspicious_activity').length,
      locationSpamAttempts: recentEvents.filter(e => e.type === 'location_spam').length,
      totalEvents: recentEvents.length,
      recentEvents: recentEvents.slice(-10), // Last 10 events
    };
  }

  // Check if user/IP is currently blocked
  isBlocked(type: string, identifier: string = 'default'): boolean {
    const key = `${type}_${identifier}`;
    const limiter = this.rateLimiters.get(key);
    
    if (!limiter || !limiter.blocked) return false;
    
    const now = Date.now();
    if (limiter.blockedUntil && now > limiter.blockedUntil) {
      limiter.blocked = false;
      limiter.blockedUntil = undefined;
      return false;
    }
    
    return true;
  }

  // Get remaining requests for rate limit
  getRemainingRequests(type: string, identifier: string = 'default'): number {
    const key = `${type}_${identifier}`;
    const config = this.configs[type];
    const limiter = this.rateLimiters.get(key);
    
    if (!config || !limiter) return config?.maxRequests || 0;
    
    const now = Date.now();
    const validRequests = limiter.requests.filter(
      timestamp => now - timestamp < config.windowMs
    );
    
    return Math.max(0, config.maxRequests - validRequests.length);
  }

  // Update rate limit configuration
  updateRateLimitConfig(type: string, config: RateLimitConfig) {
    this.configs[type] = config;
  }

  // Clear security data (for testing)
  clearSecurityData() {
    this.rateLimiters.clear();
    this.locationRequests = [];
    this.securityEvents = [];
  }
}

// Singleton instance
let securityService: SecurityService | null = null;

export const getSecurityService = (): SecurityService => {
  if (!securityService) {
    securityService = new SecurityService();
  }
  return securityService;
};

// Convenience functions
export const checkRateLimit = (type: string, identifier?: string): boolean => {
  return getSecurityService().checkRateLimit(type, identifier);
};

export const validateLocation = (
  latitude: number,
  longitude: number,
  accuracy?: number,
  source?: LocationRequest['source']
) => {
  return getSecurityService().validateLocationRequest(latitude, longitude, accuracy, source);
};

export const sanitizeInput = (input: string, maxLength?: number): string => {
  return getSecurityService().sanitizeInput(input, maxLength);
};

export default SecurityService;
