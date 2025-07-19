import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient, { authApi, dashboardAPI } from './api';
import { WalletService, WalletType, ConnectedWallet, WalletConnectionResult } from './wallet';

// Types for our store
export interface User {
  id: string;
  walletAddress?: string;
  username?: string;
  full_name?: string;
  email?: string;
  avatar?: string;
  reputation: number;
  questsCompleted: number;
  tokensEarned: number;
  vibesCreated: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalQuests: number;
  completedQuests: number;
  totalRewards: number;
  platformGrowth: {
    usersThisMonth: number;
    questsThisMonth: number;
    rewardsThisMonth: number;
  };
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface TokenBalance {
  address: string;
  balance: number;
  lockedBalance: number;
  availableBalance: number;
  lastUpdated: string;
}

// Main dashboard store
interface DashboardStore {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  
  // Dashboard data
  dashboardMetrics: DashboardMetrics | null;
  notifications: Notification[];
  unreadCount: number;
  tokenBalance: TokenBalance | null;
  
  // Wallet state
  connectedWallet: ConnectedWallet | null;
  walletLoading: boolean;
  
  // UI state
  sidebarOpen: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setDashboardMetrics: (metrics: DashboardMetrics) => void;
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setTokenBalance: (balance: TokenBalance) => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Wallet actions
  setConnectedWallet: (wallet: ConnectedWallet | null) => void;
  setWalletLoading: (loading: boolean) => void;
  connectWallet: (walletType: WalletType) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  
  // Authentication actions
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (userData: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  
  // Async actions
  fetchDashboardData: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => void;
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      dashboardMetrics: null,
      notifications: [],
      unreadCount: 0,
      tokenBalance: null,
      connectedWallet: null,
      walletLoading: false,
      sidebarOpen: true,
      loading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setDashboardMetrics: (metrics) => set({ dashboardMetrics: metrics }),
      setNotifications: (notifications) => set({ notifications }),
      setUnreadCount: (count) => set({ unreadCount: count }),
      setTokenBalance: (balance) => set({ tokenBalance: balance }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      
      // Wallet actions
      setConnectedWallet: (wallet) => set({ connectedWallet: wallet }),
      setWalletLoading: (loading) => set({ walletLoading: loading }),
      
      connectWallet: async (walletType: WalletType) => {
        set({ walletLoading: true, error: null });
        try {
          const walletService = WalletService.getInstance();
          const result: WalletConnectionResult = await walletService.connectWallet(walletType);
          
          if (result.success && result.wallet && result.user && result.accessToken) {
            // Store auth data
            localStorage.setItem('user', JSON.stringify(result.user));
            localStorage.setItem('token', result.accessToken);
            
            // Update store state
            set({ 
              connectedWallet: result.wallet,
              user: result.user,
              isAuthenticated: true,
              walletLoading: false
            });
          } else {
            throw new Error(result.error || 'Failed to connect wallet');
          }
        } catch (error) {
          console.error('Wallet connection failed:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to connect wallet',
            walletLoading: false
          });
          throw error;
        }
      },
      
      disconnectWallet: async () => {
        try {
          const walletService = WalletService.getInstance();
          await walletService.disconnect();
          
          // Clear auth data
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          
          // Reset store state
          set({ 
            connectedWallet: null,
            user: null,
            isAuthenticated: false
          });
        } catch (error) {
          console.error('Wallet disconnect failed:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to disconnect wallet' });
        }
      },

      // Authentication actions
      login: async (email: string, password: string, rememberMe: boolean = false) => {
        set({ loading: true });
        try {
          const response = await authApi.login(email, password);
          
          const { user, token } = response;
          
          // Store auth data
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', token);
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          
          set({ 
            user, 
            isAuthenticated: true, 
            loading: false 
          });
          
          // Fetch initial data after login
          get().fetchDashboardData();
        } catch (error: any) {
          set({ loading: false });
          throw new Error(error.response?.data?.message || 'Login failed');
        }
      },

      register: async (userData: {
        fullName: string;
        username: string;
        email: string;
        password: string;
      }) => {
        set({ loading: true });
        try {
          const response = await authApi.register(userData);
          
          const { user, token } = response;
          
          // Store auth data
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', token);
          
          set({ 
            user, 
            isAuthenticated: true, 
            loading: false 
          });
          
          // Fetch initial data after registration
          get().fetchDashboardData();
        } catch (error: any) {
          set({ loading: false });
          throw new Error(error.response?.data?.message || 'Registration failed');
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('rememberMe');
          set({ 
            user: null, 
            isAuthenticated: false,
            loading: false,
            // Reset other state
            dashboardMetrics: null,
            notifications: [],
            unreadCount: 0,
            tokenBalance: null,
          });
        }
      },

      initializeAuth: async () => {
        try {
          const storedUser = localStorage.getItem('user');
          const storedToken = localStorage.getItem('token');
          
          if (storedUser && storedToken && storedUser !== 'undefined') {
            try {
              const user = JSON.parse(storedUser);
              
              // Verify token is still valid
              try {
                const profile = await authApi.getProfile();
                set({ 
                  user: profile, 
                  isAuthenticated: true,
                  loading: false 
                });
                
                // Fetch initial data
                get().fetchDashboardData();
              } catch (error) {
                // Token is invalid, clear storage
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('rememberMe');
                set({ 
                  user: null, 
                  isAuthenticated: false,
                  loading: false 
                });
              }
            } catch (parseError) {
              // Invalid JSON in localStorage, clear it
              console.error('Invalid JSON in localStorage:', parseError);
              localStorage.removeItem('user');
              localStorage.removeItem('token');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('rememberMe');
              set({ 
                user: null, 
                isAuthenticated: false,
                loading: false 
              });
            }
          } else {
            set({ loading: false });
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('rememberMe');
          set({ 
            user: null, 
            isAuthenticated: false,
            loading: false 
          });
        }
      },

      // Async actions
      fetchDashboardData: async () => {
        set({ loading: true });
        try {
          // Mock dashboard metrics - replace with actual API call
          const mockMetrics: DashboardMetrics = {
            totalUsers: 12450,
            activeUsers: 3200,
            totalQuests: 890,
            completedQuests: 645,
            totalRewards: 125000,
            platformGrowth: {
              usersThisMonth: 240,
              questsThisMonth: 45,
              rewardsThisMonth: 8900,
            },
          };
          
          const mockTokenBalance: TokenBalance = {
            address: get().user?.walletAddress || '',
            balance: 2450.75,
            lockedBalance: 500.0,
            availableBalance: 1950.75,
            lastUpdated: new Date().toISOString(),
          };

          set({ 
            dashboardMetrics: mockMetrics,
            tokenBalance: mockTokenBalance,
            loading: false 
          });
        } catch (error) {
          set({ 
            error: 'Failed to fetch dashboard data', 
            loading: false 
          });
        }
      },

      fetchNotifications: async () => {
        try {
          // Mock notifications - replace with actual API call
          const mockNotifications: Notification[] = [
            {
              id: '1',
              type: 'quest_completed',
              title: 'Quest Completed!',
              message: 'You completed "Explore Downtown" quest and earned 150 $LUNOA',
              read: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            },
            {
              id: '2',
              type: 'reward_received',
              title: 'Reward Received',
              message: 'You received 50 $LUNOA from quest verification',
              read: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            },
            {
              id: '3',
              type: 'new_follower',
              title: 'New Follower',
              message: 'QuestMaster_42 started following you',
              read: true,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            },
          ];

          const unreadCount = mockNotifications.filter(n => !n.read).length;
          
          set({ 
            notifications: mockNotifications,
            unreadCount 
          });
        } catch (error) {
          set({ error: 'Failed to fetch notifications' });
        }
      },

      markNotificationAsRead: (notificationId: string) => {
        const notifications = get().notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        );
        
        const unreadCount = notifications.filter(n => !n.read).length;
        
        set({ notifications, unreadCount });
      },
    }),
    {
      name: 'lunoa-dashboard-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// Export the hook for use in components
export { useDashboardStore as useStore };
