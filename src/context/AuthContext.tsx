import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
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
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';

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
  id: string; // Firebase UID
  name: string;
  email: string;
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
  isLoggedIn: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  isModalOpen: boolean;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'login' | 'register' | 'profile' | 'inquiry'>('login');

  // Load customer profile from Firestore
  const loadCustomerProfile = useCallback(async (fUser: FirebaseUser) => {
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
        const profile: AuthUser = {
          id: fUser.uid,
          name: data.fullName || fUser.displayName || 'Valued Customer',
          email: fUser.email || data.email || '',
          accountType: data.accountType || 'Personal / Recreational',
          phone: data.phone || '',
          deliveryAddress: data.deliveryAddress || '',
          savedAddresses: data.savedAddresses || [],
          defaultShippingAddress: data.defaultShippingAddress || undefined,
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || undefined,
          emailVerified: fUser.emailVerified || data.emailVerified || false,
        };
        setUser(profile);
      } else {
        // Document does not exist yet (e.g. Google Sign In first time)
        const initialProfile: AuthUser = {
          id: fUser.uid,
          name: fUser.displayName || 'Valued Customer',
          email: fUser.email || '',
          accountType: 'Personal / Recreational',
          createdAt: new Date().toISOString(),
          emailVerified: fUser.emailVerified,
          savedAddresses: [],
        };
        try {
          await setDoc(userDocRef, {
            customerId: fUser.uid,
            fullName: initialProfile.name,
            email: initialProfile.email,
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
      console.warn('[AuthContext] Firestore profile sync notice (falling back to auth info):', err);
      // Fallback to basic Firebase user info
      setUser({
        id: fUser.uid,
        name: fUser.displayName || 'Valued Customer',
        email: fUser.email || '',
        accountType: 'Personal / Recreational',
        createdAt: new Date().toISOString(),
        emailVerified: fUser.emailVerified,
      });
    }
  }, []);

  // Listen to Firebase Authentication State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFirebaseUser) => {
      setIsLoading(true);
      if (currentFirebaseUser) {
        setFirebaseUser(currentFirebaseUser);
        await loadCustomerProfile(currentFirebaseUser);
      } else {
        setFirebaseUser(null);
        setUser(null);
        setToken(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [loadCustomerProfile]);

  const openAccountModal = (tab: 'login' | 'register' | 'profile' | 'inquiry' = 'login') => {
    setModalTab(tab);
    setIsModalOpen(true);
  };

  const closeAccountModal = () => {
    setIsModalOpen(false);
  };

  // 1. Customer Registration
  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const emailClean = payload.email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(auth, emailClean, payload.password);
      const fUser = cred.user;

      // Update Firebase display name
      if (payload.name) {
        await updateFirebaseProfile(fUser, { displayName: payload.name.trim() });
      }

      // Create Customer Document in Firestore
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

      // Send Firebase Email Verification
      try {
        await sendEmailVerification(fUser);
      } catch (e) {
        console.warn('[Auth] Verification email rate limited or deferred:', e);
      }

      await loadCustomerProfile(fUser);

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
    try {
      const emailClean = email.trim().toLowerCase();
      const cred = await signInWithEmailAndPassword(auth, emailClean, password);
      // Reload user to verify recent email confirmation
      await cred.user.reload();
      await loadCustomerProfile(auth.currentUser || cred.user);

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
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await loadCustomerProfile(cred.user);
      return { success: true };
    } catch (err: any) {
      console.error('[Google Auth Error]', err);
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Sign-in cancelled.' };
      }
      return { success: false, error: err.message || 'Google Sign-In failed.' };
    }
  };

  // 4. Logout
  const logout = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error('[Logout Error]', err);
    }
  };

  // 5. Resend Verification Email
  const resendVerificationEmail = async (): Promise<{ success: boolean; error?: string }> => {
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
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
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

  // 8. Update Profile in Firestore
  const updateProfile = async (data: Partial<AuthUser>): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser || !user) {
      return { success: false, error: 'Not authenticated' };
    }

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

      // If name changed, update Firebase Auth profile as well
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
    if (!auth.currentUser || !user) {
      return { success: false, error: 'Not authenticated' };
    }

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

      setUser((prev) => (prev ? { ...prev, savedAddresses: updatedAddresses, defaultShippingAddress: defaultAddr } : null));
      return { success: true };
    } catch (err: any) {
      console.error('[Save Address Error]', err);
      return { success: false, error: err.message || 'Failed to save address.' };
    }
  };

  // 10. Delete Delivery Address
  const deleteDeliveryAddress = async (addressIndex: number): Promise<{ success: boolean; error?: string }> => {
    if (!auth.currentUser || !user) return { success: false, error: 'Not authenticated' };

    try {
      const existing = user.savedAddresses || [];
      const updated = existing.filter((_, idx) => idx !== addressIndex);
      const defaultAddr = updated.find((a) => a.isDefault) || updated[0];

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

      setUser((prev) => (prev ? { ...prev, savedAddresses: updated, defaultShippingAddress: defaultAddr } : null));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete address.' };
    }
  };

  // 11. Fetch Customer Orders (from Firestore + Server Sync)
  const getMyOrders = async (): Promise<MemberOrder[]> => {
    if (!auth.currentUser || !user) return [];

    const ordersMap = new Map<string, MemberOrder>();

    // 1. Fetch from Firestore subcollection: /customers/{uid}/orders
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

            // Auto-persist linked order into customer's Firestore account
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
    } catch (err) {
      console.warn('[GetMyOrders] Backend sync notice:', err);
    }

    return Array.from(ordersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  // 12. Claim Guest Order by Order ID
  const claimGuestOrder = async (orderId: string, email: string): Promise<{ success: boolean; error?: string; order?: MemberOrder }> => {
    if (!auth.currentUser || !user) {
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

      // Save to customer's Firestore orders subcollection
      try {
        await setDoc(doc(db, 'customers', auth.currentUser.uid, 'orders', cleanOrderId), {
          ...claimedOrder,
          customerId: auth.currentUser.uid,
          customerEmail: user.email,
        });
      } catch (setErr) {
        handleFirestoreError(setErr, OperationType.CREATE, `customers/${auth.currentUser.uid}/orders/${cleanOrderId}`);
      }

      return { success: true, order: claimedOrder };
    } catch (err: any) {
      console.error('[Claim Order Error]', err);
      return { success: false, error: err.message || 'Failed to claim order.' };
    }
  };

  // 13. Save order upon checkout completion
  const saveOrderToAccount = async (orderData: any): Promise<boolean> => {
    if (!auth.currentUser || !user) return false;

    try {
      const orderId = orderData.orderId;
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
        shippingAddress:
          typeof orderData.shipping === 'string'
            ? orderData.shipping
            : `${orderData.billing?.address || ''}, ${orderData.billing?.city || ''}, ${orderData.billing?.state || ''} ${orderData.billing?.zipCode || ''}, ${orderData.billing?.country || 'United States'}`,
        items: (orderData.items || []).map((item: any) => ({
          id: item.id || item.productId,
          name: item.name,
          variant: item.variant || item.weight || 'Standard',
          quantity: item.quantity,
          price: item.price,
          total: item.total || item.price * item.quantity,
          image: item.image,
        })),
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
    } catch (err) {
      console.error('[SaveOrderToAccount Error]', err);
      return false;
    }
  };

  const isEmailVerified = Boolean(firebaseUser?.emailVerified || user?.emailVerified);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        token,
        isLoggedIn: Boolean(user && firebaseUser),
        isLoading,
        isEmailVerified,
        isModalOpen,
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
