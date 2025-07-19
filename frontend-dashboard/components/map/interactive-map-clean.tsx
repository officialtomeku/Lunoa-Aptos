'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Target, 
  Layers,
  Search,
  Navigation,
  MapPin,
  Heart,
  Share,
  Route,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Mock data interfaces
interface Quest {
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
  latitude: number;
  longitude: number;
  address: string;
  status: 'available' | 'active' | 'completed';
  participants: number;
  timeLimit?: string;
}

interface Vibe {
  id: string;
  title: string;
  creator: string;
  type: 'photo' | 'video' | 'audio' | 'text';
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  latitude: number;
  longitude: number;
  address: string;
  likes: number;
  boosts: number;
  timestamp: string;
}

interface InteractiveMapProps {
  className?: string;
  height?: number;
  showControls?: boolean;
  onQuestClick?: (quest: Quest) => void;
  onVibeClick?: (vibe: Vibe) => void;
}

export function InteractiveMap({ 
  className = '',
  height = 500,
  showControls = true,
  onQuestClick,
  onVibeClick
}: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map without Mapbox token for now (will show fallback)
    try {
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      
      if (!mapboxToken) {
        console.warn('Mapbox token not found, showing fallback map');
        setIsLoaded(true);
        return;
      }

      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-74.006, 40.7128], // NYC coordinates
        zoom: 12,
      });

      map.current.on('load', () => {
        setIsLoaded(true);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      setIsLoaded(true); // Show fallback
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg overflow-hidden bg-gray-100"
        style={{ height: `${height}px` }}
      >
        {/* Fallback content when map doesn't load */}
        {!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Interactive Map</h3>
              <p className="text-sm text-gray-500">
                Map will load when Mapbox token is configured
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Map Controls */}
      {showControls && (
        <div className="absolute top-4 left-4 space-y-2">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4" />
              <span className="text-sm font-medium">Controls</span>
            </div>
            
            <div className="space-y-2">
              <Button size="sm" variant="outline" className="w-full">
                <Target className="h-4 w-4 mr-1" />
                Center
              </Button>
              
              <Button size="sm" variant="outline" className="w-full">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Legend */}
      {showControls && (
        <div className="absolute bottom-4 left-4">
          <Card className="p-3">
            <div className="text-xs font-medium mb-2">Legend</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span>Quests</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                <span>Vibes</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveMap;
