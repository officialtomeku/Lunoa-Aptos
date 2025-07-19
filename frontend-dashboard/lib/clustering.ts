'use client';

import Supercluster from 'supercluster';

export interface ClusterPoint {
  type: 'Feature';
  properties: {
    cluster?: boolean;
    cluster_id?: number;
    point_count?: number;
    point_count_abbreviated?: string;
    id: string;
    title: string;
    type: 'quest' | 'vibe';
    questType?: 'exploration' | 'social' | 'challenge' | 'business';
    vibeType?: 'photo' | 'video' | 'audio' | 'text';
    difficulty?: 'easy' | 'medium' | 'hard';
    reward?: number;
    likes?: number;
    boosts?: number;
    status?: string;
    creator?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface ClusterBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

class ClusteringService {
  private questCluster: Supercluster;
  private vibeCluster: Supercluster;
  private combinedCluster: Supercluster;

  constructor() {
    // Initialize separate clusters for different data types
    this.questCluster = new Supercluster({
      radius: 60, // Cluster radius in pixels
      maxZoom: 16, // Max zoom to cluster points on
      minZoom: 0, // Min zoom to cluster points on
      minPoints: 2, // Minimum points to form a cluster
      nodeSize: 64, // Size of the KD-tree leaf node
    });

    this.vibeCluster = new Supercluster({
      radius: 40, // Smaller radius for vibes
      maxZoom: 18,
      minZoom: 0,
      minPoints: 3,
      nodeSize: 64,
    });

    this.combinedCluster = new Supercluster({
      radius: 50,
      maxZoom: 17,
      minZoom: 0,
      minPoints: 2,
      nodeSize: 64,
    });
  }

  // Convert quest data to cluster points
  private questsToClusterPoints(quests: any[]): ClusterPoint[] {
    return quests.map(quest => ({
      type: 'Feature' as const,
      properties: {
        id: quest.id,
        title: quest.title,
        type: 'quest' as const,
        questType: quest.type,
        difficulty: quest.difficulty,
        reward: quest.reward,
        status: quest.status,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [quest.location.longitude, quest.location.latitude],
      },
    }));
  }

  // Convert vibe data to cluster points
  private vibesToClusterPoints(vibes: any[]): ClusterPoint[] {
    return vibes.map(vibe => ({
      type: 'Feature' as const,
      properties: {
        id: vibe.id,
        title: vibe.title,
        type: 'vibe' as const,
        vibeType: vibe.type,
        likes: vibe.likes,
        boosts: vibe.boosts,
        creator: vibe.creator,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [vibe.location.longitude, vibe.location.latitude],
      },
    }));
  }

  // Load quest data into cluster
  loadQuests(quests: any[]) {
    const points = this.questsToClusterPoints(quests);
    this.questCluster.load(points);
  }

  // Load vibe data into cluster
  loadVibes(vibes: any[]) {
    const points = this.vibesToClusterPoints(vibes);
    this.vibeCluster.load(points);
  }

  // Load combined data into cluster
  loadCombinedData(quests: any[], vibes: any[]) {
    const questPoints = this.questsToClusterPoints(quests);
    const vibePoints = this.vibesToClusterPoints(vibes);
    const allPoints = [...questPoints, ...vibePoints];
    this.combinedCluster.load(allPoints);
  }

  // Get quest clusters for current map view
  getQuestClusters(bounds: ClusterBounds, zoom: number): ClusterPoint[] {
    return this.questCluster.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      Math.floor(zoom)
    );
  }

  // Get vibe clusters for current map view
  getVibeClusters(bounds: ClusterBounds, zoom: number): ClusterPoint[] {
    return this.vibeCluster.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      Math.floor(zoom)
    );
  }

  // Get combined clusters for current map view
  getCombinedClusters(bounds: ClusterBounds, zoom: number): ClusterPoint[] {
    return this.combinedCluster.getClusters(
      [bounds.west, bounds.south, bounds.east, bounds.north],
      Math.floor(zoom)
    );
  }

  // Get cluster expansion bounds
  getClusterExpansionZoom(clusterId: number, type: 'quest' | 'vibe' | 'combined' = 'combined'): number {
    const cluster = type === 'quest' ? this.questCluster : 
                   type === 'vibe' ? this.vibeCluster : this.combinedCluster;
    return cluster.getClusterExpansionZoom(clusterId);
  }

  // Get cluster children (points that make up a cluster)
  getClusterChildren(clusterId: number, type: 'quest' | 'vibe' | 'combined' = 'combined'): ClusterPoint[] {
    const cluster = type === 'quest' ? this.questCluster : 
                   type === 'vibe' ? this.vibeCluster : this.combinedCluster;
    return cluster.getChildren(clusterId);
  }

  // Get cluster leaves (all points in a cluster, including sub-clusters)
  getClusterLeaves(
    clusterId: number, 
    limit: number = 10, 
    offset: number = 0,
    type: 'quest' | 'vibe' | 'combined' = 'combined'
  ): ClusterPoint[] {
    const cluster = type === 'quest' ? this.questCluster : 
                   type === 'vibe' ? this.vibeCluster : this.combinedCluster;
    return cluster.getLeaves(clusterId, limit, offset);
  }

  // Generate cluster statistics
  getClusterStats(bounds: ClusterBounds, zoom: number) {
    const questClusters = this.getQuestClusters(bounds, zoom);
    const vibeClusters = this.getVibeClusters(bounds, zoom);
    const combinedClusters = this.getCombinedClusters(bounds, zoom);

    const questStats = this.analyzeClusterData(questClusters);
    const vibeStats = this.analyzeClusterData(vibeClusters);
    const combinedStats = this.analyzeClusterData(combinedClusters);

    return {
      quests: questStats,
      vibes: vibeStats,
      combined: combinedStats,
      totalVisible: questClusters.length + vibeClusters.length,
    };
  }

  private analyzeClusterData(clusters: ClusterPoint[]) {
    const totalClusters = clusters.filter(c => c.properties.cluster).length;
    const totalPoints = clusters.filter(c => !c.properties.cluster).length;
    const totalItems = clusters.reduce((sum, c) => {
      return sum + (c.properties.point_count || 1);
    }, 0);

    return {
      clusters: totalClusters,
      points: totalPoints,
      totalItems,
      visible: clusters.length,
    };
  }

  // Smart clustering based on data density
  getAdaptiveClusters(
    bounds: ClusterBounds, 
    zoom: number, 
    options: {
      showQuests: boolean;
      showVibes: boolean;
      maxClusters?: number;
      minClusterSize?: number;
    }
  ): {
    questClusters: ClusterPoint[];
    vibeClusters: ClusterPoint[];
    combinedClusters: ClusterPoint[];
    recommendation: 'separate' | 'combined';
  } {
    const questClusters = options.showQuests ? this.getQuestClusters(bounds, zoom) : [];
    const vibeClusters = options.showVibes ? this.getVibeClusters(bounds, zoom) : [];
    const combinedClusters = this.getCombinedClusters(bounds, zoom);

    // Determine best clustering strategy based on density
    const totalSeparate = questClusters.length + vibeClusters.length;
    const totalCombined = combinedClusters.length;
    const maxClusters = options.maxClusters || 50;

    const recommendation = totalSeparate <= maxClusters ? 'separate' : 'combined';

    return {
      questClusters,
      vibeClusters,
      combinedClusters,
      recommendation,
    };
  }

  // Filter clusters based on criteria
  filterClusters(
    clusters: ClusterPoint[], 
    filters: {
      questTypes?: string[];
      vibeTypes?: string[];
      difficulty?: string[];
      minReward?: number;
      maxReward?: number;
      minLikes?: number;
      status?: string[];
    }
  ): ClusterPoint[] {
    return clusters.filter(cluster => {
      const props = cluster.properties;

      // Skip cluster nodes, only filter individual points
      if (props.cluster) return true;

      // Quest filters
      if (props.type === 'quest') {
        if (filters.questTypes && !filters.questTypes.includes(props.questType!)) return false;
        if (filters.difficulty && !filters.difficulty.includes(props.difficulty!)) return false;
        if (filters.minReward && props.reward! < filters.minReward) return false;
        if (filters.maxReward && props.reward! > filters.maxReward) return false;
        if (filters.status && !filters.status.includes(props.status!)) return false;
      }

      // Vibe filters
      if (props.type === 'vibe') {
        if (filters.vibeTypes && !filters.vibeTypes.includes(props.vibeType!)) return false;
        if (filters.minLikes && props.likes! < filters.minLikes) return false;
      }

      return true;
    });
  }

  // Get cluster bounds for fitting map view
  getClusterBounds(clusters: ClusterPoint[]): ClusterBounds | null {
    if (clusters.length === 0) return null;

    let north = -90, south = 90, east = -180, west = 180;

    clusters.forEach(cluster => {
      const [lng, lat] = cluster.geometry.coordinates;
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    });

    // Add padding
    const latPadding = (north - south) * 0.1;
    const lngPadding = (east - west) * 0.1;

    return {
      north: north + latPadding,
      south: south - latPadding,
      east: east + lngPadding,
      west: west - lngPadding,
    };
  }

  // Generate cluster colors based on type and properties
  getClusterColor(cluster: ClusterPoint): string {
    if (cluster.properties.cluster) {
      // Cluster node - color based on dominant type
      const pointCount = cluster.properties.point_count || 0;
      if (pointCount < 10) return '#3b82f6'; // Blue
      if (pointCount < 50) return '#f59e0b'; // Orange
      return '#ef4444'; // Red
    }

    // Individual point - color based on type
    if (cluster.properties.type === 'quest') {
      const questType = cluster.properties.questType;
      switch (questType) {
        case 'exploration': return '#10b981'; // Green
        case 'social': return '#3b82f6'; // Blue
        case 'challenge': return '#f59e0b'; // Orange
        case 'business': return '#8b5cf6'; // Purple
        default: return '#6b7280'; // Gray
      }
    }

    if (cluster.properties.type === 'vibe') {
      return '#ec4899'; // Pink
    }

    return '#6b7280'; // Default gray
  }

  // Get cluster size based on point count
  getClusterSize(cluster: ClusterPoint): number {
    if (!cluster.properties.cluster) return 40; // Individual point size

    const pointCount = cluster.properties.point_count || 0;
    if (pointCount < 10) return 50;
    if (pointCount < 50) return 60;
    if (pointCount < 100) return 70;
    return 80;
  }

  // Clear all cluster data
  clearAll() {
    this.questCluster = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
      minPoints: 2,
      nodeSize: 64,
    });

    this.vibeCluster = new Supercluster({
      radius: 40,
      maxZoom: 18,
      minZoom: 0,
      minPoints: 3,
      nodeSize: 64,
    });

    this.combinedCluster = new Supercluster({
      radius: 50,
      maxZoom: 17,
      minZoom: 0,
      minPoints: 2,
      nodeSize: 64,
    });
  }
}

// Singleton instance
let clusteringService: ClusteringService | null = null;

export const getClusteringService = (): ClusteringService => {
  if (!clusteringService) {
    clusteringService = new ClusteringService();
  }
  return clusteringService;
};

export default ClusteringService;
