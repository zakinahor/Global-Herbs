import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  accountType: string;
  phone?: string;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  accountType?: string;
  phone?: string;
  deliveryAddress?: string;
  notes?: string;
}

export interface MemberOrder {
  orderId: string;
  date: string;
  status: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
  shippingAddress: string;
  items: Array<{
    id?: string;
    name: string;
    variant?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  shippingCost: number;
  orderTotal: number;
  paymentMethod: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isModalOpen: boolean;
  modalTab: 'login' | 'register' | 'profile' | 'inquiry';
  openAccountModal: (tab?: 'login' | 'register' | 'profile' | 'inquiry') => void;
  closeAccountModal: () => void;
  setModalTab: (tab: 'login' | 'register' | 'profile' | 'inquiry') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  getMyOrders: () => Promise<MemberOrder[]>;
}

const STORAGE_USER_KEY = 'gh_dispensary_user';
const STORAGE_TOKEN_KEY = 'gh_dispensary_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'login' | 'register' | 'profile' | 'inquiry'>('login');

  // Load stored credentials on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(STORAGE_USER_KEY);
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);

      if (savedUser && savedToken) {
        const parsed = JSON.parse(savedUser) as AuthUser;
        setUser(parsed);
        setToken(savedToken);

        // Verify with server in background
        fetch(`/api/auth/me?email=${encodeURIComponent(parsed.email)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.user) {
              setUser(data.user);
              localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
            }
          })
          .catch(() => {
            // Keep local state if server check times out
          });
      }
    } catch (err) {
      console.error('[AuthContext] Error loading user session', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openAccountModal = (tab?: 'login' | 'register' | 'profile' | 'inquiry') => {
    if (tab) {
      setModalTab(tab);
    } else {
      setModalTab(user ? 'profile' : 'login');
    }
    setIsModalOpen(true);
  };

  const closeAccountModal = () => {
    setIsModalOpen(false);
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
        localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
        setModalTab('profile');
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Login failed. Please check your credentials.' };
      }
    } catch (err) {
      return { success: false, error: 'Network connection error. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(data.user));
        localStorage.setItem(STORAGE_TOKEN_KEY, data.token);
        setModalTab('profile');
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Registration failed. Please try again.' };
      }
    } catch (err) {
      return { success: false, error: 'Network error during registration. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    setModalTab('login');
  };

  const updateProfile = async (data: Partial<AuthUser>) => {
    if (!user) return { success: false, error: 'User is not logged in.' };

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          ...data,
        }),
      });

      const result = await response.json();
      if (response.ok && result.success && result.user) {
        setUser(result.user);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.user));
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to update profile.' };
      }
    } catch {
      return { success: false, error: 'Network error updating profile.' };
    }
  };

  const getMyOrders = async (): Promise<MemberOrder[]> => {
    if (!user) return [];
    try {
      const response = await fetch(`/api/auth/my-orders?email=${encodeURIComponent(user.email)}`);
      const data = await response.json();
      if (response.ok && data.success && Array.isArray(data.orders)) {
        return data.orders;
      }
      return [];
    } catch {
      return [];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: Boolean(user),
        isLoading,
        isModalOpen,
        modalTab,
        openAccountModal,
        closeAccountModal,
        setModalTab,
        login,
        register,
        logout,
        updateProfile,
        getMyOrders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
