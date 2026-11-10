import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  updatePassword as updateFirebasePassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  supabase,
  isSupabaseConfigured,
  getProfile as getSupabaseProfile,
  upsertProfile as upsertSupabaseProfile,
  getOrdersByUser as getSupabaseOrdersByUser,
  insertOrder as insertSupabaseOrder,
  uploadFileToSupabase,
  StorageBucket,
  SupabaseOrder,
} from '../lib/supabase';

export interface SavedAddress {
  id?: string;
  name?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface AuthUser {
  id: string; // Auth User ID (Firebase UID or Supabase UUID)
  name: string;
  email: string;
  role: 'customer' | 'admin';
  accountType: string;
  phone?: string;
  deliveryAddress?: string;
  savedAddresses?: SavedAddress[];
  defaultShippingAddress?: SavedAddress;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  emailVerified: boolean;
  provider?: 'supabase' | 'firebase';
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
    productId?: number | string;
    name: string;
    variant?: string;
    quantity: number;
    price: number;
    total: number;
    image?: string;
  }>;
  subtotal: number;
  discount: number;
  shippingCost: number;
  orderTotal: number;
  currency: string;
  paymentMethod: string;
  paymentStatus?: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  role: 'customer' | 'admin';
  isAdmin: boolean;
  isLoggedIn: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  isModalOpen: boolean;
  isSupabaseActive: boolean;
  modalTab: 'login' | 'register' | 'profile' | 'inquiry';
  openAccountModal: (tab?: 'login' | 'register' | 'profile' | 'inquiry') => void;
  closeAccountModal: () => void;
  setModalTab: (tab: 'login' | 'register' | 'profile' | 'inquiry') => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  saveDeliveryAddress: (address: SavedAddress) => Promise<{ success: boolean; error?: string }>;
  deleteDeliveryAddress: (addressIndex: number) => Promise<{ success: boolean; error?: string }>;
  getMyOrders: () => Promise<MemberOrder[]>;
  claimGuestOrder: (orderId: string, email: string) => Promise<{ success: boolean; error?: string; order?: MemberOrder }>;
  saveOrderToAccount: (orderData: any) => Promise<boolean>;
  uploadCustomerDocument: (
    file: File,
    bucket?: StorageBucket,
    customPath?: string
  ) => Promise<{ success: boolean; url?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'login' | 'register' | 'profile' | 'inquiry'>('login');

  const isSupabaseActive = isSupabaseConfigured();

  // Load customer profile from Firestore (Firebase Fallback)
  const loadFirebaseCustomerProfile = useCallback(async (fUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'customers', fUser.uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (docErr) {
        handleFirestoreError(docErr, OperationType.GET, `customers/${fUser.uid}`);
      }

      const idToken = await fUser.getIdToken();
      setToken(idToken);

      if (userDocSnap && userDocSnap.exists()) {
        const data = userDocSnap.data();
        const userRole: 'customer' | 'admin' =
          data.role === 'admin' || data.accountType === 'Administrator' ? 'admin' : 'customer';

        const profile: AuthUser = {
          id: fUser.uid,
          name: data.fullName || fUser.displayName || 'Valued Customer',
          email: fUser.email || data.email || '',
          role: userRole,
          accountType: data.accountType || 'Personal / Recreational',
          phone: data.phone || '',
          deliveryAddress: data.deliveryAddress || '',
          savedAddresses: data.savedAddresses || [],
          defaultShippingAddress: data.defaultShippingAddress || undefined,
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
          emailVerified: fUser.emailVerified || data.emailVerified || false,
          provider: 'firebase',
        };
        setUser(profile);
      } else {
        const initialProfile: AuthUser = {
          id: fUser.uid,
          name: fUser.displayName || 'Valued Customer',
          email: fUser.email || '',
          role: 'customer',
          accountType: 'Personal / Recreational',
          createdAt: new Date().toISOString(),
          emailVerified: fUser.emailVerified,
          savedAddresses: [],
          provider: 'firebase',
        };
        try {
          await setDoc(userDocRef, {
            customerId: fUser.uid,
            fullName: initialProfile.name,
            email: initialProfile.email,
            role: 'customer',
            createdAt: initialProfile.createdAt,
            emailVerified: initialProfile.emailVerified,
            accountType: initialProfile.accountType,
            savedAddresses: [],
          });
        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.CREATE, `customers/${fUser.uid}`);
        }
        setUser(initialProfile);
      }
    } catch (err) {
      console.warn('[AuthContext] Firestore profile sync notice (falling back to basic auth info):', err);
      setUser({
        id: fUser.uid,
        name: fUser.displayName || 'Valued Customer',
        email: fUser.email || '',
        role: 'customer',
        accountType: 'Personal / Recreational',
        createdAt: new Date().toISOString(),
        emailVerified: fUser.emailVerified,
        provider: 'firebase',
      });
    }
  }, []);

  // Load customer profile from Supabase
  const loadSupabaseProfile = useCallback(async (supabaseUser: any, sessionToken?: string) => {
    try {
      if (sessionToken) setToken(sessionToken);
      const dbProfile = await getSupabaseProfile(supabaseUser.id);

      const userRole: 'customer' | 'admin' =
        dbProfile?.role === 'admin' ||
        supabaseUser.user_metadata?.role === 'admin' ||
        supabaseUser.app_metadata?.role === 'admin'
          ? 'admin'
          : 'customer';

      if (dbProfile) {
        setUser({
          id: supabaseUser.id,
          name: dbProfile.full_name || supabaseUser.user_metadata?.full_name || 'Valued Customer',
          email: dbProfile.email || supabaseUser.email || '',
          role: userRole,
          accountType: dbProfile.account_type || supabaseUser.user_metadata?.account_type || 'Personal / Recreational',
          phone: dbProfile.phone || supabaseUser.user_metadata?.phone || '',
          deliveryAddress: dbProfile.delivery_address || '',
          savedAddresses: dbProfile.saved_addresses || [],
          notes: dbProfile.notes || '',
          createdAt: dbProfile.created_at || supabaseUser.created_at || new Date().toISOString(),
          updatedAt: dbProfile.updated_at,
          emailVerified: Boolean(supabaseUser.email_confirmed_at || dbProfile.email_verified),
          provider: 'supabase',
        });
      } else {
        const fallbackName =
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.user_metadata?.name ||
          supabaseUser.email?.split('@')[0] ||
          'Valued Customer';

        const newProfile: AuthUser = {
          id: supabaseUser.id,
          name: fallbackName,
          email: supabaseUser.email || '',
          role: userRole,
          accountType: supabaseUser.user_metadata?.account_type || 'Personal / Recreational',
          createdAt: supabaseUser.created_at || new Date().toISOString(),
          emailVerified: Boolean(supabaseUser.email_confirmed_at),
          savedAddresses: [],
          provider: 'supabase',
        };

        // Create initial profile in Supabase table
        await upsertSupabaseProfile({
          id: supabaseUser.id,
          full_name: newProfile.name,
          email: newProfile.email,
          role: userRole,
          account_type: newProfile.accountType,
          created_at: newProfile.createdAt,
          saved_addresses: [],
        });

        setUser(newProfile);
      }
    } catch (err) {
      console.error('[AuthContext] Error loading Supabase profile:', err);
      const fallbackRole: 'customer' | 'admin' =
        supabaseUser.user_metadata?.role === 'admin' || supabaseUser.app_metadata?.role === 'admin'
          ? 'admin'
          : 'customer';
      setUser({
        id: supabaseUser.id,
        name: supabaseUser.user_metadata?.full_name || 'Valued Customer',
        email: supabaseUser.email || '',
        role: fallbackRole,
        accountType: 'Personal / Recreational',
        createdAt: new Date().toISOString(),
        emailVerified: Boolean(supabaseUser.email_confirmed_at),
        provider: 'supabase',
      });
    }
  }, []);

  // Listen to Authentication State (Supabase or Firebase)
  useEffect(() => {
    let isMounted = true;

    if (isSupabaseActive) {
      // 1. Primary: Supabase Authentication
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session?.user) {
          loadSupabaseProfile(session.user, session.access_token).finally(() => {
            if (isMounted) setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          await loadSupabaseProfile(session.user, session.access_token);
        } else {
          setUser(null);
          setToken(null);
        }
        setIsLoading(false);
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      // 2. Secondary: Firebase Authentication
      const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
        if (!isMounted) return;
        setIsLoading(true);
        if (currentFirebaseUser) {
          setFirebaseUser(currentFirebaseUser);
          await loadFirebaseCustomerProfile(currentFirebaseUser);
        } else {
          setFirebaseUser(null);
          setUser(null);
          setToken(null);
        }
        setIsLoading(false);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }
  }, [isSupabaseActive, loadFirebaseCustomerProfile, loadSupabaseProfile]);

  const openAccountModal = (tab: 'login' | 'register' | 'profile' | 'inquiry' = 'login') => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const closeAccountModal = () => {
    setIsModalOpen(false);
  };

  // 1. Customer Registration
  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string; message?: string }> => {
    const emailClean = payload.email.trim().toLowerCase();

    // Supabase Registration
    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: emailClean,
          password: payload.password,
          options: {
            data: {
              full_name: payload.name.trim(),
              account_type: payload.accountType || 'Personal / Recreational',
              phone: payload.phone?.trim() || '',
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          await upsertSupabaseProfile({
            id: data.user.id,
            full_name: payload.name.trim(),
            email: emailClean,
            phone: payload.phone ? payload.phone.trim() : '',
            account_type: payload.accountType || 'Personal / Recreational',
            delivery_address: payload.deliveryAddress ? payload.deliveryAddress.trim() : '',
            notes: payload.notes ? payload.notes.trim() : '',
            saved_addresses: payload.deliveryAddress
              ? [
                  {
                    id: 'addr-default',
                    name: payload.name.trim(),
                    street1: payload.deliveryAddress.trim(),
                    city: '',
                    state: '',
                    zipCode: '',
                    country: 'United States',
                    isDefault: true,
                  },
                ]
              : [],
          });

          // Automatically notify administrator of new customer registration (non-blocking)
          try {
            fetch('/api/auth/notify-registration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: payload.name.trim(),
                email: emailClean,
                phone: payload.phone ? payload.phone.trim() : undefined,
                accountStatus: 'Active (Supabase Verified / Pending)',
                accountType: payload.accountType || 'Personal / Recreational',
                customerId: data.user.id,
              }),
            }).catch((notifErr) => {
              console.warn('[Auth] Non-blocking admin notification dispatch warning:', notifErr);
            });
          } catch (err) {
            console.warn('[Auth] Failed to dispatch admin notification:', err);
          }

          if (data.session) {
            await loadSupabaseProfile(data.user, data.session.access_token);
          }
        }

        return {
          success: true,
          message: 'Account created successfully! Check your inbox for verification details.',
        };
      } catch (err: any) {
        console.error('[Supabase Register Error]', err);
        return { success: false, error: err.message || 'Failed to register account via Supabase.' };
      }
    }

    // Firebase Registration Fallback
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailClean, payload.password);
      const fUser = cred.user;

      if (payload.name) {
        await updateFirebaseProfile(fUser, { displayName: payload.name.trim() });
      }

      const customerDoc = {
        customerId: fUser.uid,
        fullName: payload.name.trim(),
        email: emailClean,
        phone: payload.phone ? payload.phone.trim() : '',
        accountType: payload.accountType || 'Personal / Recreational',
        deliveryAddress: payload.deliveryAddress ? payload.deliveryAddress.trim() : '',
        notes: payload.notes ? payload.notes.trim() : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: false,
        savedAddresses: payload.deliveryAddress
          ? [
              {
                id: 'addr-default',
                name: payload.name.trim(),
                street1: payload.deliveryAddress.trim(),
                city: '',
                state: '',
                zipCode: '',
                country: 'United States',
                isDefault: true,
              },
            ]
          : [],
      };

      try {
        await setDoc(doc(db, 'customers', fUser.uid), customerDoc);
      } catch (setErr) {
        handleFirestoreError(setErr, OperationType.CREATE, `customers/${fUser.uid}`);
      }

      try {
        await sendEmailVerification(fUser);
      } catch (e) {
        console.warn('[Auth] Verification email rate limited or deferred:', e);
      }

      try {
        fetch('/api/auth/notify-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: payload.name.trim(),
            email: emailClean,
            phone: payload.phone ? payload.phone.trim() : undefined,
            accountStatus: 'Active (Email Verification Pending)',
            accountType: payload.accountType || 'Personal / Recreational',
            customerId: fUser.uid,
          }),
        }).catch((notifErr) => {
          console.warn('[Auth] Non-blocking admin notification dispatch warning:', notifErr);
        });
      } catch (err) {
        console.warn('[Auth] Failed to dispatch admin notification:', err);
      }

      await loadFirebaseCustomerProfile(fUser);

      return {
        success: true,
        message: 'Account created successfully! A verification email has been sent to your inbox.',
      };
    } catch (err: any) {
      console.error('[Registration Error]', err);
      let errorMsg = 'Failed to register account.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'An account with this email address already exists. Please log in.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak. Please use at least 6 characters with mixed symbols/numbers.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      }
      return { success: false, error: errorMsg };
    }
  };

  // 2. Email & Password Login
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    const emailClean = email.trim().toLowerCase();

    // Supabase Login
    if (isSupabaseActive) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailClean,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user && data.session) {
          await loadSupabaseProfile(data.user, data.session.access_token);
        }

        return {
          success: true,
          message: 'Welcome back to Global Herbs!',
        };
      } catch (err: any) {
        console.error('[Supabase Login Error]', err);
        return { success: false, error: err.message || 'Login failed. Please verify your credentials.' };
      }
    }

    // Firebase Login Fallback
    try {
      const cred = await signInWithEmailAndPassword(auth, emailClean, password);
      await cred.user.reload();
      await loadFirebaseCustomerProfile(auth.currentUser || cred.user);

      return {
        success: true,
        message: 'Welcome back to Global Herbs!',
      };
    } catch (err: any) {
      console.error('[Login Error]', err);
      let errorMsg = 'Invalid email address or password.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMsg = 'Invalid email address or password. Please verify your credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Access temporarily disabled due to multiple failed login attempts. Please reset your password or try again later.';
      }
      return { success: false, error: errorMsg };
    }
  };

  // 3. Google Sign-In
  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseActive) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/account`,
          },
        });
        if (error) {
          let msg = error.message;
          if (msg.toLowerCase().includes('unsupported provider') || msg.toLowerCase().includes('not enabled')) {
            msg = 'Google Sign-In is not enabled in your Supabase project yet. In your Supabase Dashboard, go to Authentication > Providers > Google to enable it, or log in with your email and password.';
          }
          return { success: false, error: msg };
        }
        return { success: true };
      } catch (err: any) {
        console.error('[Supabase Google Auth Error]', err);
        return { success: false, error: err.message || 'Google Sign-In failed.' };
      }
    }

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await loadFirebaseCustomerProfile(cred.user);
      return { success: true };
    } catch (err: any) {
      console.error('[Google Auth Error]', err);
      let errorMsg = 'Google Sign-In failed. Please try again or log in with your email and password.';
      if (err.code === 'auth/popup-closed-by-user') {
        errorMsg = 'Sign-in popup was closed before completing.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errorMsg = 'Sign-in request was cancelled.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMsg = 'The Google sign-in popup was blocked by your browser. Please allow popups for globalherbs.site, or sign in using your email and password.';
      } else if (err.code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'globalherbs.site';
        errorMsg = `This domain (${currentDomain}) is not authorized for Google Sign-In in Firebase. Please add '${currentDomain}' in Firebase Console > Authentication > Settings > Authorized Domains, or sign in with your email and password.`;
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'Google Sign-In provider is currently disabled in your Firebase console. Please enable the Google provider in Firebase Authentication > Sign-in method, or sign in with your email and password.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      return { success: false, error: errorMsg };
    }
  };

  // 4. Logout
  const logout = async () => {
    try {
      if (isSupabaseActive) {
        await supabase.auth.signOut();
      } else {
        await firebaseSignOut(auth);
      }
      setFirebaseUser(null);
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error('[Logout Error]', err);
    }
  };

  // 5. Resend Verification Email
  const resendVerificationEmail = async (): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseActive) {
      if (!user?.email) return { success: false, error: 'User email not found.' };
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: user.email,
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to resend confirmation email.' };
      }
    }

    if (!auth.currentUser) {
      return { success: false, error: 'You must be logged in to request a verification email.' };
    }
    try {
      await sendEmailVerification(auth.currentUser);
      return { success: true };
    } catch (err: any) {
      console.error('[Resend Verification Error]', err);
      if (err.code === 'auth/too-many-requests') {
        return { success: false, error: 'Please wait a few moments before requesting another verification email.' };
      }
      return { success: false, error: err.message || 'Failed to send verification email.' };
    }
  };

  // 6. Reset Password
  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (isSupabaseActive) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/account`,
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to send password reset email.' };
      }
    }

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return { success: true };
    } catch (err: any) {
      console.error('[Password Reset Error]', err);
      let msg = 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No customer account found with this email address.';
      }
      return { success: false, error: msg };
    }
  };

  // 7. Change Password
  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseActive) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Password update failed.' };
      }
    }

    if (!auth.currentUser) {
      return { success: false, error: 'You must be signed in to change your password.' };
    }
    try {
      await updateFirebasePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (err: any) {
      console.error('[Change Password Error]', err);
      if (err.code === 'auth/requires-recent-login') {
        return { success: false, error: 'For security reasons, please log out and log in again before changing your password.' };
      }
      return { success: false, error: err.message || 'Password update failed.' };
    }
  };

  // 8. Update Profile
  const updateProfile = async (data: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    if (isSupabaseActive) {
      try {
        await upsertSupabaseProfile({
          id: user.id,
          full_name: data.name !== undefined ? data.name.trim() : user.name,
          phone: data.phone !== undefined ? data.phone.trim() : user.phone,
          delivery_address: data.deliveryAddress !== undefined ? data.deliveryAddress.trim() : user.deliveryAddress,
          notes: data.notes !== undefined ? data.notes.trim() : user.notes,
        });

        setUser((prev) => (prev ? { ...prev, ...data } : null));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update profile in Supabase.' };
      }
    }

    if (!auth.currentUser) return { success: false, error: 'Not authenticated' };

    try {
      const userDocRef = doc(db, 'customers', auth.currentUser.uid);
      const updatePayload: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };

      if (data.name !== undefined) updatePayload.fullName = data.name.trim();
      if (data.phone !== undefined) updatePayload.phone = data.phone.trim();
      if (data.deliveryAddress !== undefined) updatePayload.deliveryAddress = data.deliveryAddress.trim();
      if (data.notes !== undefined) updatePayload.notes = data.notes.trim();

      try {
        await setDoc(userDocRef, updatePayload, { merge: true });
      } catch (setErr) {
        handleFirestoreError(setErr, OperationType.UPDATE, `customers/${auth.currentUser.uid}`);
      }

      if (data.name) {
        await updateFirebaseProfile(auth.currentUser, { displayName: data.name.trim() });
      }

      setUser((prev) => (prev ? { ...prev, ...data } : null));
      return { success: true };
    } catch (err: any) {
      console.error('[Update Profile Error]', err);
      return { success: false, error: err.message || 'Failed to update customer profile.' };
    }
  };

  // 9. Save Delivery Address
  const saveDeliveryAddress = async (address: SavedAddress): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const existingAddresses = user.savedAddresses || [];
      const newAddressId = address.id || `addr-${Date.now()}`;
      const cleanAddress: SavedAddress = {
        ...address,
        id: newAddressId,
        isDefault: address.isDefault || existingAddresses.length === 0,
      };

      let updatedAddresses: SavedAddress[];
      const existingIndex = existingAddresses.findIndex((a) => a.id === newAddressId);

      if (existingIndex > -1) {
        updatedAddresses = existingAddresses.map((a, idx) =>
          idx === existingIndex ? cleanAddress : cleanAddress.isDefault ? { ...a, isDefault: false } : a
        );
      } else {
        if (cleanAddress.isDefault) {
          updatedAddresses = existingAddresses.map((a) => ({ ...a, isDefault: false })).concat(cleanAddress);
        } else {
          updatedAddresses = [...existingAddresses, cleanAddress];
        }
      }

      const defaultAddr = updatedAddresses.find((a) => a.isDefault) || updatedAddresses[0];

      if (isSupabaseActive) {
        await upsertSupabaseProfile({
          id: user.id,
          saved_addresses: updatedAddresses,
        });
      } else if (auth.currentUser) {
        try {
          await setDoc(
            doc(db, 'customers', auth.currentUser.uid),
            {
              savedAddresses: updatedAddresses,
              defaultShippingAddress: defaultAddr || null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.UPDATE, `customers/${auth.currentUser.uid}`);
        }
      }

      setUser((prev) => (prev ? { ...prev, savedAddresses: updatedAddresses, defaultShippingAddress: defaultAddr } : null));
      return { success: true };
    } catch (err: any) {
      console.error('[Save Address Error]', err);
      return { success: false, error: err.message || 'Failed to save address.' };
    }
  };

  // 10. Delete Delivery Address
  const deleteDeliveryAddress = async (addressIndex: number): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      const existing = user.savedAddresses || [];
      const updated = existing.filter((_, idx) => idx !== addressIndex);
      const defaultAddr = updated.find((a) => a.isDefault) || updated[0];

      if (isSupabaseActive) {
        await upsertSupabaseProfile({
          id: user.id,
          saved_addresses: updated,
        });
      } else if (auth.currentUser) {
        try {
          await setDoc(
            doc(db, 'customers', auth.currentUser.uid),
            {
              savedAddresses: updated,
              defaultShippingAddress: defaultAddr || null,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.UPDATE, `customers/${auth.currentUser.uid}`);
        }
      }

      setUser((prev) => (prev ? { ...prev, savedAddresses: updated, defaultShippingAddress: defaultAddr } : null));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete address.' };
    }
  };

  // 11. Fetch Customer Orders (from Supabase or Firestore + Server Sync)
  const getMyOrders = async (): Promise<MemberOrder[]> => {
    if (!user) return [];

    const ordersMap = new Map<string, MemberOrder>();

    // 1. Fetch from Supabase if configured
    if (isSupabaseActive) {
      try {
        const sbOrders = await getSupabaseOrdersByUser(user.id, user.email);
        for (const o of sbOrders) {
          ordersMap.set(o.order_id, {
            orderId: o.order_id,
            date: o.created_at ? new Date(o.created_at).toLocaleDateString() : 'Recent',
            status: o.status || 'Received & Stealth Processing',
            trackingNumber: o.tracking_number || '',
            carrier: o.carrier || 'Priority Stealth Express Courier',
            estimatedDelivery: o.estimated_delivery || '2-3 Business Days',
            shippingAddress: o.shipping_address || '',
            items: o.items || [],
            subtotal: o.subtotal || 0,
            discount: o.discount || 0,
            shippingCost: o.shipping_cost || 0,
            orderTotal: o.total || 0,
            currency: o.currency || 'USD',
            paymentMethod: o.payment_method || 'btc',
            paymentStatus: o.payment_status,
            createdAt: o.created_at || new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('[GetMyOrders] Supabase fetch error:', err);
      }
    } else if (auth.currentUser) {
      // Fetch from Firestore subcollection: /customers/{uid}/orders
      try {
        const ordersColRef = collection(db, 'customers', auth.currentUser.uid, 'orders');
        const q = query(ordersColRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          ordersMap.set(d.orderId, {
            orderId: d.orderId,
            date: d.date || new Date(d.createdAt).toLocaleDateString(),
            status: d.status || 'Received & Stealth Processing',
            trackingNumber: d.trackingNumber || '',
            carrier: d.carrier || 'Priority Stealth Express Courier',
            estimatedDelivery: d.estimatedDelivery || '2-3 Business Days',
            shippingAddress: d.shippingAddress || '',
            items: d.items || [],
            subtotal: d.subtotal || 0,
            discount: d.discount || 0,
            shippingCost: d.shippingCost || 0,
            orderTotal: d.orderTotal || 0,
            currency: d.currency || 'USD',
            paymentMethod: d.paymentMethod || 'btc',
            paymentStatus: d.paymentStatus,
            createdAt: d.createdAt || new Date().toISOString(),
          });
        });
      } catch (err) {
        console.warn('[GetMyOrders] Firestore query notice:', err);
      }
    }

    // 2. Fetch from backend orders API for any guest orders matched to this email
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        for (const order of data.orders) {
          if (!ordersMap.has(order.orderId)) {
            const memberOrder: MemberOrder = {
              orderId: order.orderId,
              date: order.date,
              status: order.status,
              trackingNumber: order.trackingNumber || '',
              carrier: order.carrier || 'Priority Stealth Express Courier',
              estimatedDelivery: order.estimatedDelivery || '2-3 Business Days',
              shippingAddress: order.shippingAddress || '',
              items: order.items || [],
              subtotal: order.subtotal || 0,
              discount: order.discount || 0,
              shippingCost: order.shippingCost || 0,
              orderTotal: order.orderTotal || 0,
              currency: order.currency || 'USD',
              paymentMethod: order.paymentMethod || 'btc',
              paymentStatus: order.paymentStatus,
              createdAt: order.createdAt || new Date().toISOString(),
            };
            ordersMap.set(order.orderId, memberOrder);

            // Auto-persist linked order into customer's store
            if (isSupabaseActive) {
              insertSupabaseOrder({
                order_id: order.orderId,
                user_id: user.id,
                customer_name: user.name,
                customer_email: user.email,
                shipping_address: memberOrder.shippingAddress,
                items: memberOrder.items,
                subtotal: memberOrder.subtotal,
                discount: memberOrder.discount,
                shipping_cost: memberOrder.shippingCost,
                tax: 0,
                total: memberOrder.orderTotal,
                currency: memberOrder.currency,
                payment_method: memberOrder.paymentMethod,
                payment_status: memberOrder.paymentStatus || 'Completed',
                status: memberOrder.status,
                tracking_number: memberOrder.trackingNumber,
                carrier: memberOrder.carrier,
                estimated_delivery: memberOrder.estimatedDelivery,
                created_at: memberOrder.createdAt,
              }).catch(() => {});
            } else if (auth.currentUser) {
              try {
                await setDoc(doc(db, 'customers', auth.currentUser.uid, 'orders', order.orderId), {
                  ...memberOrder,
                  customerId: auth.currentUser.uid,
                  customerEmail: user.email,
                });
              } catch {
                // Ignore subcollection sync errors if rules restrict write
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[GetMyOrders] Backend sync notice:', err);
    }

    return Array.from(ordersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  // 12. Claim Guest Order by Order ID
  const claimGuestOrder = async (orderId: string, email: string): Promise<{ success: boolean; error?: string; order?: MemberOrder }> => {
    if (!user) {
      return { success: false, error: 'Please sign in to claim this order.' };
    }

    const cleanOrderId = orderId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail !== user.email.toLowerCase()) {
      return {
        success: false,
        error: 'Order ownership verification failed: The email address on the order must match your verified customer account.',
      };
    }

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(cleanOrderId)}?email=${encodeURIComponent(cleanEmail)}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.order) {
        return { success: false, error: data?.error || 'Order not found with provided ID and email.' };
      }

      const order = data.order;
      const claimedOrder: MemberOrder = {
        orderId: order.orderId,
        date: order.date,
        status: order.status,
        trackingNumber: order.trackingNumber || '',
        carrier: order.carrier || 'Priority Stealth Express Courier',
        estimatedDelivery: order.estimatedDelivery || '2-3 Business Days',
        shippingAddress: order.shippingAddress || '',
        items: order.items || [],
        subtotal: order.subtotal || 0,
        discount: order.discount || 0,
        shippingCost: order.shippingCost || 0,
        orderTotal: order.orderTotal || 0,
        currency: order.currency || 'USD',
        paymentMethod: order.paymentMethod || 'btc',
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt || new Date().toISOString(),
      };

      if (isSupabaseActive) {
        await insertSupabaseOrder({
          order_id: cleanOrderId,
          user_id: user.id,
          customer_name: user.name,
          customer_email: user.email,
          shipping_address: claimedOrder.shippingAddress,
          items: claimedOrder.items,
          subtotal: claimedOrder.subtotal,
          discount: claimedOrder.discount,
          shipping_cost: claimedOrder.shippingCost,
          tax: 0,
          total: claimedOrder.orderTotal,
          currency: claimedOrder.currency,
          payment_method: claimedOrder.paymentMethod,
          payment_status: claimedOrder.paymentStatus || 'Completed',
          status: claimedOrder.status,
          tracking_number: claimedOrder.trackingNumber,
          carrier: claimedOrder.carrier,
          estimated_delivery: claimedOrder.estimatedDelivery,
          created_at: claimedOrder.createdAt,
        });
      } else if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'customers', auth.currentUser.uid, 'orders', cleanOrderId), {
            ...claimedOrder,
            customerId: auth.currentUser.uid,
            customerEmail: user.email,
          });
        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.CREATE, `customers/${auth.currentUser.uid}/orders/${cleanOrderId}`);
        }
      }

      return { success: true, order: claimedOrder };
    } catch (err: any) {
      console.error('[Claim Order Error]', err);
      return { success: false, error: err.message || 'Failed to claim order.' };
    }
  };

  // 13. Save order upon checkout completion
  const saveOrderToAccount = async (orderData: any): Promise<boolean> => {
    if (!user) return false;

    try {
      const orderId = orderData.orderId;
      const shippingStr =
        typeof orderData.shipping === 'string'
          ? orderData.shipping
          : `${orderData.billing?.address || ''}, ${orderData.billing?.city || ''}, ${orderData.billing?.state || ''} ${orderData.billing?.zipCode || ''}, ${orderData.billing?.country || 'United States'}`;

      const itemsList = (orderData.items || []).map((item: any) => ({
        id: item.id || item.productId,
        name: item.name,
        variant: item.variant || item.weight || 'Standard',
        quantity: item.quantity,
        price: item.price,
        total: item.total || item.price * item.quantity,
        image: item.image,
      }));

      if (isSupabaseActive) {
        await insertSupabaseOrder({
          order_id: orderId,
          user_id: user.id,
          customer_name: orderData.billing?.name || user.name,
          customer_email: user.email,
          customer_phone: orderData.billing?.phone || user.phone,
          shipping_address: shippingStr,
          items: itemsList,
          subtotal: orderData.subtotal || 0,
          discount: orderData.discount || 0,
          shipping_cost: orderData.shippingCost || 0,
          tax: orderData.tax || 0,
          total: orderData.total || orderData.orderTotal || 0,
          currency: orderData.currency || 'USD',
          payment_method: orderData.paymentMethod || 'btc',
          payment_status: 'Awaiting Payment Confirmation / Stealth Dispatch Queued',
          status: 'Received & Stealth Processing',
          tracking_number: orderData.trackingNumber || `GH-TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
          carrier: 'Priority Stealth Express Courier',
          estimated_delivery: '2-3 Business Days',
          coupon_code: orderData.couponCode,
          notes: orderData.notes,
          created_at: new Date().toISOString(),
        });
        return true;
      }

      if (auth.currentUser) {
        const customerOrderRecord = {
          orderId,
          customerId: auth.currentUser.uid,
          customerEmail: user.email,
          customerName: orderData.billing?.name || user.name,
          date: orderData.date || new Date().toLocaleDateString(),
          status: 'Received & Stealth Processing',
          trackingNumber: orderData.trackingNumber || `GH-TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
          carrier: 'Priority Stealth Express Courier',
          estimatedDelivery: '2-3 Business Days',
          shippingAddress: shippingStr,
          items: itemsList,
          subtotal: orderData.subtotal || 0,
          discount: orderData.discount || 0,
          shippingCost: orderData.shippingCost || 0,
          orderTotal: orderData.total || orderData.orderTotal || 0,
          currency: orderData.currency || 'USD',
          paymentMethod: orderData.paymentMethod || 'btc',
          paymentStatus: 'Awaiting Payment Confirmation / Stealth Dispatch Queued',
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'customers', auth.currentUser.uid, 'orders', orderId), customerOrderRecord);
        } catch (setErr) {
          handleFirestoreError(setErr, OperationType.CREATE, `customers/${auth.currentUser.uid}/orders/${orderId}`);
        }
        return true;
      }

      return false;
    } catch (err) {
      console.error('[SaveOrderToAccount Error]', err);
      return false;
    }
  };

  // 14. Document Upload to Supabase Storage
  const uploadCustomerDocument = async (
    file: File,
    bucket: StorageBucket = 'customer-documents',
    customPath?: string
  ): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Customer must be signed in to upload documents.' };
    }

    const cleanExt = file.name.split('.').pop() || 'bin';
    const cleanFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
    const filePath = customPath || `${user.id}/${cleanFileName}`;

    return await uploadFileToSupabase(bucket, filePath, file);
  };

  const isEmailVerified = Boolean(
    isSupabaseActive ? user?.emailVerified : firebaseUser?.emailVerified || user?.emailVerified
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        token,
        role: user?.role || 'customer',
        isAdmin: Boolean(user?.role === 'admin'),
        isLoggedIn: Boolean(user),
        isLoading,
        isEmailVerified,
        isModalOpen,
        isSupabaseActive,
        modalTab,
        openAccountModal,
        closeAccountModal,
        setModalTab,
        login,
        loginWithGoogle,
        register,
        logout,
        resendVerificationEmail,
        resetPassword,
        changePassword,
        updateProfile,
        saveDeliveryAddress,
        deleteDeliveryAddress,
        getMyOrders,
        claimGuestOrder,
        saveOrderToAccount,
        uploadCustomerDocument,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
