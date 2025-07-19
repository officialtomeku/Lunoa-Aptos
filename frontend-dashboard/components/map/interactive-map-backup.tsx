'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Filter,
  Layers,
  Target,
  Zap,
  Trophy,
  Users,
  Star,
  Route,
  Share,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Heart,
  MessageCircle,
  X,
  Plus,
  Minus,
  Locate,
  Settings
} from 'lucide-react';

// Mapbox access token - you'll need to set this in your environment
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibHVub2EtZGV2IiwiYSI6ImNrZjJ3eDJxejBhZmIyeW50a2oxaWw2c2cifQ.example'; // Replace with your token

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
  likes: number;
  boosts: number;
  timestamp: string;
}

interface MapFilters {
  questTypes: string[];
  difficulty: string[];
  showQuests: boolean;
  showVibes: boolean;
  showCompleted: boolean;
  maxDistance: number;
  priceRange: [number, number];
  searchQuery: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface RouteInfo {
  distance: string;
  duration: string;
  steps: string[];
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
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);
  const [mapboxConfigured, setMapboxConfigured] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [nearbyRecommendations, setNearbyRecommendations] = useState<(Quest | Vibe)[]>([]);
  const [clusteredMarkers, setClusteredMarkers] = useState<any[]>([]);
  const [filters, setFilters] = useState<MapFilters>({
    questTypes: ['exploration', 'social', 'challenge', 'business'],
    difficulty: ['easy', 'medium', 'hard'],
    showQuests: true,
    showVibes: true,
    showCompleted: false,
    maxDistance: 10,
    priceRange: [0, 500],
    searchQuery: ''
  });

  // Mock data - replace with real data from your backend
  const mockQuests: Quest[] = [
    {
      id: '1',
      title: 'Discover Coffee Culture',
      description: 'Visit 3 local coffee shops and rate them',
      type: 'exploration',
      difficulty: 'easy',
      reward: 50,
      location: { latitude: 37.7749, longitude: -122.4194, address: 'San Francisco, CA' },
      status: 'available',
      participants: 12,
      timeLimit: '24h'
    },
    {
      id: '2',
      title: 'Street Art Photography',
      description: 'Capture 5 unique murals in the Mission District',
      type: 'challenge',
      difficulty: 'medium',
      reward: 100,
      location: { latitude: 37.7599, longitude: -122.4148, address: 'Mission District, SF' },
      status: 'active',
      participants: 8,
      timeLimit: '48h'
    },
    {
      id: '3',
      title: 'Business Networking Event',
      description: 'Attend the startup mixer and connect with 5 entrepreneurs',
      type: 'business',
      difficulty: 'hard',
      reward: 200,
      location: { latitude: 37.7849, longitude: -122.4094, address: 'SOMA, San Francisco' },
      status: 'available',
      participants: 25,
      timeLimit: '6h'
    }
  ];

  const mockVibes: Vibe[] = [
    {
      id: '1',
      title: 'Golden Gate Sunset',
      creator: 'photographer_jane',
      type: 'photo',
      location: { latitude: 37.8199, longitude: -122.4783, address: 'Golden Gate Bridge' },
      likes: 234,
      boosts: 12,
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      title: 'Amazing Tacos!',
      creator: 'foodie_mike',
      type: 'photo',
      location: { latitude: 37.7749, longitude: -122.4294, address: 'Tenderloin, SF' },
      likes: 89,
      boosts: 5,
      timestamp: '4 hours ago'
    }
  ];

  // Check Mapbox configuration on mount
  useEffect(() => {
    if (MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('example')) {
      setMapboxConfigured(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    // Early return if Mapbox token is not configured
    if (!mapboxConfigured) {
      return;
    }
    
    if (map.current || !mapContainer.current) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-122.4194, 37.7749], // San Francisco
        zoom: 12,
        attributionControl: false
      });
    } catch (error) {
      console.error('Failed to initialize map:', error);
      return;
    }

    map.current.on('load', () => {
      setIsLoaded(true);
      addMarkersToMap();
    });

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setUserLocation(coords);
          
          // Add user location marker
          if (map.current) {
            new mapboxgl.Marker({ color: '#3b82f6' })
              .setLngLat([coords.longitude, coords.latitude])
              .addTo(map.current);
            
            map.current.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14 });
          }
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Add markers to map
  const addMarkersToMap = useCallback(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.custom-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add quest markers
    if (filters.showQuests) {
      mockQuests.forEach((quest) => {
        const el = document.createElement('div');
        el.className = 'custom-marker quest-marker';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '16px';
        el.style.color = 'white';
        el.style.fontWeight = 'bold';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';

        // Color based on quest type and difficulty
        const colors = {
          exploration: '#10b981',
          social: '#3b82f6',
          challenge: '#f59e0b',
          business: '#8b5cf6'
        };
        el.style.backgroundColor = colors[quest.type];

        // Icon based on quest type
        const icons = {
          exploration: '🗺️',
          social: '👥',
          challenge: '🏆',
          business: '💼'
        };
        el.innerHTML = icons[quest.type];

        el.addEventListener('click', () => {
          setSelectedQuest(quest);
          onQuestClick?.(quest);
        });

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-3 max-w-xs">
              <h3 class="font-bold text-sm mb-1">${quest.title}</h3>
              <p class="text-xs text-gray-600 mb-2">${quest.description}</p>
              <div class="flex items-center justify-between text-xs">
                <span class="bg-${quest.difficulty === 'easy' ? 'green' : quest.difficulty === 'medium' ? 'yellow' : 'red'}-100 text-${quest.difficulty === 'easy' ? 'green' : quest.difficulty === 'medium' ? 'yellow' : 'red'}-800 px-2 py-1 rounded">${quest.difficulty}</span>
                <span class="font-bold text-green-600">${quest.reward} $LUNOA</span>
              </div>
            </div>
          `);

        new mapboxgl.Marker(el)
          .setLngLat([quest.location.longitude, quest.location.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      });
    }

    // Add vibe markers
    if (filters.showVibes) {
      mockVibes.forEach((vibe) => {
        const el = document.createElement('div');
        el.className = 'custom-marker vibe-marker';
        el.style.width = '30px';
        el.style.height = '30px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '14px';
        el.style.backgroundColor = '#ec4899';
        el.style.color = 'white';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

        const icons = {
          photo: '📸',
          video: '🎥',
          audio: '🎵',
          text: '📝'
        };
        el.innerHTML = icons[vibe.type];

        el.addEventListener('click', () => {
          setSelectedVibe(vibe);
          onVibeClick?.(vibe);
        });

        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-3 max-w-xs">
              <h3 class="font-bold text-sm mb-1">${vibe.title}</h3>
              <p class="text-xs text-gray-600 mb-2">by @${vibe.creator}</p>
              <div class="flex items-center justify-between text-xs">
                <span class="flex items-center gap-1">❤️ ${vibe.likes}</span>
                <span class="flex items-center gap-1">⚡ ${vibe.boosts}</span>
                <span class="text-gray-500">${vibe.timestamp}</span>
              </div>
            </div>
          `);

        new mapboxgl.Marker(el)
          .setLngLat([vibe.location.longitude, vibe.location.latitude])
          .setPopup(popup)
          .addTo(map.current!);
      });
    }
  }, [filters, isLoaded, onQuestClick, onVibeClick]);

  // Update markers when filters change
  useEffect(() => {
    addMarkersToMap();
  }, [addMarkersToMap]);

  const centerOnUser = () => {
    if (userLocation && map.current) {
      map.current.flyTo({ center: [userLocation.longitude, userLocation.latitude], zoom: 16 });
    }
  };

  const toggleFilter = (filterType: keyof MapFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Real-time location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported');
      return;
    }

    setIsTracking(true);
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserLocation(coords);
        
        // Update user marker position
        if (map.current) {
          const userMarker = document.querySelector('.user-location-marker');
          if (userMarker) {
            userMarker.remove();
          }
          
          const el = document.createElement('div');
          el.className = 'user-location-marker';
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#3b82f6';
          el.style.border = '3px solid white';
          el.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
          
          new mapboxgl.Marker(el)
            .setLngLat([coords.longitude, coords.latitude])
            .addTo(map.current);
        }
      },
      (error) => {
        console.error('Location tracking error:', error);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setIsTracking(false);
    };
  }, []);

  // Stop location tracking
  const stopLocationTracking = () => {
    setIsTracking(false);
  };

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get nearby recommendations
  const getNearbyRecommendations = useCallback(() => {
    if (!userLocation) return;

    const nearby: (Quest | Vibe)[] = [];
    const maxDistance = filters.maxDistance;

    // Check quests
    mockQuests.forEach(quest => {
      const distance = calculateDistance(
        userLocation.latitude, userLocation.longitude,
        quest.location.latitude, quest.location.longitude
      );
      if (distance <= maxDistance) {
        nearby.push(quest);
      }
    });

    // Check vibes
    mockVibes.forEach(vibe => {
      const distance = calculateDistance(
        userLocation.latitude, userLocation.longitude,
        vibe.location.latitude, vibe.location.longitude
      );
      if (distance <= maxDistance) {
        nearby.push(vibe);
      }
    });

    setNearbyRecommendations(nearby);
  }, [userLocation, filters.maxDistance]);

  // Route planning
  const planRoute = async (destination: { latitude: number; longitude: number }) => {
    if (!userLocation) {
      console.error('User location not available for route planning');
      return;
    }

    try {
      // Mock route calculation (replace with actual routing API)
      const distance = calculateDistance(
        userLocation.latitude, userLocation.longitude,
        destination.latitude, destination.longitude
      );
      
      const mockRoute: RouteInfo = {
        distance: `${distance.toFixed(1)} km`,
        duration: `${Math.round(distance * 3)} min`, // Rough estimate
        steps: [
          'Head north on current street',
          'Turn right at the intersection',
          'Continue straight for 500m',
          'Arrive at destination'
        ]
      };
      
      setRouteInfo(mockRoute);
      
      // Add route line to map (simplified)
      if (map.current) {
        const routeCoords = [
          [userLocation.longitude, userLocation.latitude],
          [destination.longitude, destination.latitude]
        ];
        
        if (map.current.getSource('route')) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }
        
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoords
            }
          }
        });
        
        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      }
    } catch (error) {
      console.error('Route planning failed:', error);
    }
  };

  // Check-in functionality
  const checkInToLocation = (quest: Quest) => {
    if (!userLocation) {
      console.error('User location required for check-in');
      return;
    }

    const distance = calculateDistance(
      userLocation.latitude, userLocation.longitude,
      quest.location.latitude, quest.location.longitude
    );

    // Allow check-in within 100 meters
    if (distance <= 0.1) {
      console.log(`Checked in to ${quest.title}`);
      // Here you would typically update the quest status in your backend
    } else {
      console.log(`Too far from ${quest.title}. Distance: ${(distance * 1000).toFixed(0)}m`);
    }
  };

  // Share location functionality
  const shareLocation = () => {
    if (!userLocation) {
      console.error('No location to share');
      return;
    }

    const shareData = {
      title: 'My Location on Lunoa',
      text: `Check out where I am on Lunoa!`,
      url: `https://maps.google.com/?q=${userLocation.latitude},${userLocation.longitude}`
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.url);
      console.log('Location copied to clipboard');
    }
  };

  // Filter quests and vibes based on current filters
  const getFilteredItems = useCallback(() => {
    let filteredQuests = mockQuests;
    let filteredVibes = mockVibes;

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredQuests = filteredQuests.filter(quest => 
        quest.title.toLowerCase().includes(query) ||
        quest.description.toLowerCase().includes(query) ||
        quest.location.address.toLowerCase().includes(query)
      );
      filteredVibes = filteredVibes.filter(vibe => 
        vibe.title.toLowerCase().includes(query) ||
        vibe.creator.toLowerCase().includes(query) ||
        vibe.location.address.toLowerCase().includes(query)
      );
    }

    // Filter by quest type
    filteredQuests = filteredQuests.filter(quest => 
      filters.questTypes.includes(quest.type)
    );

    // Filter by difficulty
    filteredQuests = filteredQuests.filter(quest => 
      filters.difficulty.includes(quest.difficulty)
    );

    // Filter by price range
    filteredQuests = filteredQuests.filter(quest => 
      quest.reward >= filters.priceRange[0] && quest.reward <= filters.priceRange[1]
    );

    // Filter by distance if user location is available
    if (userLocation) {
      filteredQuests = filteredQuests.filter(quest => {
        const distance = calculateDistance(
          userLocation.latitude, userLocation.longitude,
          quest.location.latitude, quest.location.longitude
        );
        return distance <= filters.maxDistance;
      });
      
      filteredVibes = filteredVibes.filter(vibe => {
        const distance = calculateDistance(
          userLocation.latitude, userLocation.longitude,
          vibe.location.latitude, vibe.location.longitude
        );
        return distance <= filters.maxDistance;
      });
    }

    return { quests: filteredQuests, vibes: filteredVibes };
  }, [filters, userLocation]);

  // Update nearby recommendations when location or filters change
  useEffect(() => {
    getNearbyRecommendations();
  }, [getNearbyRecommendations]);

  // Show fallback UI if Mapbox token is not configured
  if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('example')) {
    return (
      <div className={`relative ${className}`}>
        <div 
          className="w-full rounded-lg overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/25"
          style={{ height: `${height}px` }}
        >
          <div className="text-center p-8">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Interactive Map</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Map functionality requires Mapbox configuration.
            </p>
            <div className="text-xs text-muted-foreground">
              Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN in your environment
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg overflow-hidden"
        style={{ height: `${height}px` }}
      />
      
      {/* Enhanced Map Controls */}
      {showControls && (
        <>
          {/* Search Bar */}
          <div className="absolute top-4 left-4 right-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quests, vibes, or locations..."
                  value={filters.searchQuery}
                  onChange={(e) => toggleFilter('searchQuery', e.target.value)}
                  className="pl-10 bg-white/90 backdrop-blur-sm"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white/90 backdrop-blur-sm"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <Card className="absolute top-20 left-4 w-80 max-h-96 overflow-y-auto bg-white/95 backdrop-blur-sm">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Filters & Settings</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowFilters(false)}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Show/Hide Toggles */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-quests"
                      checked={filters.showQuests}
                      onCheckedChange={(checked) => toggleFilter('showQuests', checked)}
                    />
                    <label htmlFor="show-quests" className="text-sm font-medium flex items-center gap-1">
                      <Trophy className="h-4 w-4" /> Show Quests
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-vibes"
                      checked={filters.showVibes}
                      onCheckedChange={(checked) => toggleFilter('showVibes', checked)}
                    />
                    <label htmlFor="show-vibes" className="text-sm font-medium flex items-center gap-1">
                      <Zap className="h-4 w-4" /> Show Vibes
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="show-completed"
                      checked={filters.showCompleted}
                      onCheckedChange={(checked) => toggleFilter('showCompleted', checked)}
                    />
                    <label htmlFor="show-completed" className="text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" /> Show Completed
                    </label>
                  </div>
                </div>

                {/* Quest Type Filters */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Quest Types</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['exploration', 'social', 'challenge', 'business'].map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={filters.questTypes.includes(type)}
                          onCheckedChange={(checked) => {
                            const newTypes = checked 
                              ? [...filters.questTypes, type]
                              : filters.questTypes.filter(t => t !== type);
                            toggleFilter('questTypes', newTypes);
                          }}
                        />
                        <label htmlFor={`type-${type}`} className="text-xs capitalize">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Difficulty Filters */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Difficulty</label>
                  <div className="flex gap-2">
                    {['easy', 'medium', 'hard'].map(diff => (
                      <div key={diff} className="flex items-center space-x-2">
                        <Checkbox
                          id={`diff-${diff}`}
                          checked={filters.difficulty.includes(diff)}
                          onCheckedChange={(checked) => {
                            const newDiff = checked 
                              ? [...filters.difficulty, diff]
                              : filters.difficulty.filter(d => d !== diff);
                            toggleFilter('difficulty', newDiff);
                          }}
                        />
                        <label htmlFor={`diff-${diff}`} className="text-xs capitalize">
                          {diff}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                    <DollarSign className="h-4 w-4" /> Reward Range: {filters.priceRange[0]} - {filters.priceRange[1]} $LUNOA
                  </label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => toggleFilter('priceRange', value as [number, number])}
                    max={500}
                    min={0}
                    step={10}
                    className="w-full"
                  />
                </div>

                {/* Distance Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                    <Target className="h-4 w-4" /> Max Distance: {filters.maxDistance} km
                  </label>
                  <Slider
                    value={[filters.maxDistance]}
                    onValueChange={(value) => toggleFilter('maxDistance', value[0])}
                    max={50}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Location Controls */}
          <div className="absolute top-4 right-4 space-y-2">
            <Button
              variant="outline"
              size="icon"
              onClick={centerOnUser}
              className="bg-white/90 backdrop-blur-sm"
              disabled={!userLocation}
            >
              <Locate className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={isTracking ? stopLocationTracking : startLocationTracking}
              className={`bg-white/90 backdrop-blur-sm ${
                isTracking ? 'bg-blue-100 border-blue-300' : ''
              }`}
            >
              <Navigation className={`h-4 w-4 ${isTracking ? 'text-blue-600' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={shareLocation}
              className="bg-white/90 backdrop-blur-sm"
              disabled={!userLocation}
            >
              <Share className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-20 right-4 space-y-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => map.current?.zoomIn()}
              className="bg-white/90 backdrop-blur-sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => map.current?.zoomOut()}
              className="bg-white/90 backdrop-blur-sm"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          {/* Nearby Recommendations Panel */}
          {nearbyRecommendations.length > 0 && (
            <Card className="absolute bottom-4 left-4 w-80 max-h-48 overflow-y-auto bg-white/95 backdrop-blur-sm">
              <div className="p-3">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                  <Eye className="h-4 w-4" /> Nearby ({nearbyRecommendations.length})
                </h3>
                <div className="space-y-2">
                  {nearbyRecommendations.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-muted-foreground">
                          {'reward' in item ? `${item.reward} $LUNOA` : `by @${item.creator}`}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {'reward' in item && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => planRoute(item.location)}
                              className="h-6 w-6 p-0"
                            >
                              <Route className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => checkInToLocation(item as Quest)}
                              className="h-6 w-6 p-0"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Route Information Panel */}
          {routeInfo && (
            <Card className="absolute bottom-4 right-4 w-64 bg-white/95 backdrop-blur-sm">
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1">
                    <Route className="h-4 w-4" /> Route Info
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setRouteInfo(null)}
                    className="h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Distance:</span>
                    <span className="font-medium">{routeInfo.distance}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{routeInfo.duration}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Quest/Vibe Detail Modal */}
          {selectedQuest && (
            <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-white/95 backdrop-blur-sm z-50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{selectedQuest.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedQuest(null)}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{selectedQuest.description}</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{selectedQuest.reward}</div>
                    <div className="text-xs text-muted-foreground">$LUNOA Reward</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{selectedQuest.participants}</div>
                    <div className="text-xs text-muted-foreground">Participants</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => planRoute(selectedQuest.location)}
                    className="flex-1"
                  >
                    <Route className="h-4 w-4 mr-1" /> Get Directions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkInToLocation(selectedQuest)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" /> Check In
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {selectedVibe && (
            <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 bg-white/95 backdrop-blur-sm z-50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{selectedVibe.title}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedVibe(null)}
                    className="h-6 w-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3">by @{selectedVibe.creator}</p>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-red-500" /> {selectedVibe.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-yellow-500" /> {selectedVibe.boosts}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedVibe.timestamp}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => planRoute(selectedVibe.location)}
                    className="flex-1"
                  >
                    <Route className="h-4 w-4 mr-1" /> Get Directions
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Heart className="h-4 w-4 mr-1" /> Like
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full rounded-lg overflow-hidden"
        style={{ height: `${height}px` }}
      />

      {/* Map Controls */}
      {showControls && (
        <div className="absolute top-4 left-4 space-y-2">
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-quests"
                  checked={filters.showQuests}
                  onChange={(e) => toggleFilter('showQuests', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="show-quests" className="text-xs">Show Quests</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-vibes"
                  checked={filters.showVibes}
                  onChange={(e) => toggleFilter('showVibes', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="show-vibes" className="text-xs">Show Vibes</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-completed"
                  checked={filters.showCompleted}
                  onChange={(e) => toggleFilter('showCompleted', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="show-completed" className="text-xs">Show Completed</label>
              </div>
            </div>
          </Card>

          <Button
            onClick={centerOnUser}
            size="sm"
            variant="outline"
            className="w-full"
            disabled={!userLocation}
          >
            <Target className="h-4 w-4 mr-1" />
            Center on Me
          </Button>
        </div>
      )}

      {/* Legend */}
      {showControls && (
        <div className="absolute bottom-4 left-4">
          <Card className="p-3">
            <div className="text-xs font-medium mb-2">Legend</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">🗺️</div>
                <span>Exploration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">👥</div>
                <span>Social</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs">🏆</div>
                <span>Challenge</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">💼</div>
                <span>Business</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs">📸</div>
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
