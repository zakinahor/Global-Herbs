/**
 * src/lib/supabase.ts
 *
 * Supabase client configuration, database repository helpers,
 * authentication wrappers, and storage utilities for Global Herbs.
 */

import { createClient, SupabaseClient, User as SupabaseUser, Session } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Returns true if real Supabase credentials have been configured
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl.includes('.supabase.co') &&
    supabaseAnonKey.length > 20
  );
}

// Fallback dummy credentials to prevent createClient from throwing at module initialization time
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : fallbackUrl,
  isSupabaseConfigured() ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface SupabaseProfile {
  id: string; // references auth.users.id
  full_name: string;
  email: string;
  phone?: string;
  account_type?: string;
  delivery_address?: string;
  notes?: string;
  email_verified?: boolean;
  saved_addresses?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseOrder {
  id?: string;
  order_id: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address: string;
  billing_address?: string;
  items: any[];
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax: number;
  total: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  status: string;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery?: string;
  coupon_code?: string;
  notes?: string;
  created_at?: string;
}

export interface SupabaseSubmission {
  id?: string;
  submission_id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  type: string;
  product_reference?: string;
  created_at?: string;
}

export interface SupabaseReview {
  id?: string;
  product_id: number;
  product_name: string;
  author: string;
  email?: string;
  rating: number;
  comment: string;
  status?: string;
  created_at?: string;
}

// ============================================================================
// DATABASE SERVICE METHODS
// ============================================================================

/**
 * Fetch profile for a customer by user ID
 */
export async function getProfile(userId: string): Promise<SupabaseProfile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase DB] Error fetching profile:', error.message);
      return null;
    }
    return data as SupabaseProfile;
  } catch (err) {
    console.error('[Supabase DB] Exception fetching profile:', err);
    return null;
  }
}

/**
 * Upsert customer profile
 */
export async function upsertProfile(profile: Partial<SupabaseProfile> & { id: string }): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        ...profile,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[Supabase DB] Error upserting profile:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase DB] Exception upserting profile:', err);
    return false;
  }
}

/**
 * Fetch customer orders from Supabase by user ID or customer email
 */
export async function getOrdersByUser(userId: string, email?: string): Promise<SupabaseOrder[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (email) {
      query = query.or(`user_id.eq.${userId},customer_email.eq.${email.trim().toLowerCase()}`);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase DB] Error fetching user orders:', error.message);
      return [];
    }
    return (data || []) as SupabaseOrder[];
  } catch (err) {
    console.error('[Supabase DB] Exception fetching orders:', err);
    return [];
  }
}

/**
 * Save new order into Supabase
 */
export async function insertOrder(order: SupabaseOrder): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from('orders')
      .insert([order]);

    if (error) {
      console.error('[Supabase DB] Error inserting order:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase DB] Exception inserting order:', err);
    return false;
  }
}

/**
 * Save contact submission or product enquiry
 */
export async function insertContactSubmission(submission: SupabaseSubmission): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from('contact_submissions')
      .insert([submission]);

    if (error) {
      console.warn('[Supabase DB] Error recording submission:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase DB] Exception recording submission:', err);
    return false;
  }
}

/**
 * Save newsletter subscriber
 */
export async function insertNewsletterSubscriber(email: string, couponCode = 'HERBS15OFF'): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        { email: email.trim().toLowerCase(), coupon_code: couponCode, updated_at: new Date().toISOString() },
        { onConflict: 'email' }
      );

    if (error) {
      console.warn('[Supabase DB] Error recording newsletter subscriber:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase DB] Exception recording newsletter subscriber:', err);
    return false;
  }
}

// ============================================================================
// STORAGE SERVICE METHODS
// ============================================================================

export type StorageBucket = 'product-images' | 'customer-documents' | 'public-assets';

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFileToSupabase(
  bucket: StorageBucket,
  filePath: string,
  file: File | Blob,
  options?: { cacheControl?: string; upsert?: boolean }
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' };
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert ?? true,
      });

    if (error) {
      console.error('[Supabase Storage] Upload error:', error.message);
      return { success: false, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error('[Supabase Storage] Upload exception:', err);
    return { success: false, error: err?.message || 'Storage upload failed' };
  }
}

/**
 * Get public URL for a file in Supabase Storage
 */
export function getSupabasePublicUrl(bucket: StorageBucket, filePath: string): string {
  if (!isSupabaseConfigured()) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Remove a file from Supabase Storage
 */
export async function deleteSupabaseFile(bucket: StorageBucket, filePaths: string[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.storage.from(bucket).remove(filePaths);
    if (error) {
      console.error('[Supabase Storage] Delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Storage] Delete exception:', err);
    return false;
  }
}
