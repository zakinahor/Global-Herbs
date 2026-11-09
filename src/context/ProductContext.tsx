import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Category } from '../types';
import { products as initialProducts, categories as initialCategories } from '../data/products';
import {
  isSupabaseConfigured,
  fetchProductsFromSupabase,
  updateProductInSupabase,
  createProductInSupabase,
  deleteProductInSupabase,
} from '../lib/supabase';

interface ProductContextType {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  updateProduct: (id: number, updates: Partial<Product>) => Promise<{ success: boolean; error?: string }>;
  addProduct: (product: Partial<Product>) => Promise<{ success: boolean; product?: Product; error?: string }>;
  deleteProduct: (id: number) => Promise<{ success: boolean; error?: string }>;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories] = useState<Category[]>(initialCategories);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync products from Supabase on mount if configured
  const refreshProducts = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      setIsLoading(true);
      const sbProducts = await fetchProductsFromSupabase();
      if (sbProducts && sbProducts.length > 0) {
        // Merge Supabase products with catalog so any edits made in Supabase take priority
        setProducts((prev) => {
          const map = new Map<number, Product>();
          // Start with initial products
          prev.forEach((p) => map.set(p.id, p));
          // Apply Supabase products (which contain admin modifications or newly added products)
          sbProducts.forEach((p) => map.set(p.id, p));
          return Array.from(map.values()).sort((a, b) => a.id - b.id);
        });
      }
    } catch (err) {
      console.warn('[ProductContext] Error syncing products from Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const updateProduct = async (
    id: number,
    updates: Partial<Product>
  ): Promise<{ success: boolean; error?: string }> => {
    // 1. Optimistically update local state so storefront updates immediately
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    // 2. Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      const res = await updateProductInSupabase(id, updates);
      if (!res.success) {
        console.error('[ProductContext] Failed to update product in Supabase:', res.error);
        return res;
      }
    }

    return { success: true };
  };

  const addProduct = async (
    newProduct: Partial<Product>
  ): Promise<{ success: boolean; product?: Product; error?: string }> => {
    const nextId = newProduct.id || Math.max(...products.map((p) => p.id), 1000) + 1;
    const cleanSlug =
      newProduct.slug ||
      (newProduct.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const completeProduct: Product = {
      id: nextId,
      name: newProduct.name || 'New Botanical Herb',
      slug: cleanSlug,
      category: newProduct.category || 'Flowers',
      categorySlug: newProduct.categorySlug || 'flowers',
      price: newProduct.price !== undefined ? Number(newProduct.price) : 25,
      originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : undefined,
      onSale: Boolean(newProduct.onSale),
      inStock: newProduct.inStock !== undefined ? Boolean(newProduct.inStock) : true,
      image: newProduct.image || 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=800&auto=format&fit=crop&q=80',
      description: newProduct.description || 'Premium curated botanical product from Global Herbs.',
      sku: newProduct.sku || `GH-SKU-${nextId}`,
      weight: newProduct.weight || '3.5g',
      weights: newProduct.weights || ['3.5g', '7g', '14g', '28g'],
      strainType: newProduct.strainType || 'Hybrid',
      potency: newProduct.potency || '28% Total Cannabinoids',
      inventory: newProduct.inventory ?? 100,
    };

    // Update local state
    setProducts((prev) => [...prev, completeProduct]);

    // Persist to Supabase
    if (isSupabaseConfigured()) {
      const res = await createProductInSupabase(completeProduct);
      if (!res.success) {
        return { success: false, error: res.error };
      }
      return { success: true, product: res.product || completeProduct };
    }

    return { success: true, product: completeProduct };
  };

  const deleteProduct = async (id: number): Promise<{ success: boolean; error?: string }> => {
    // Optimistically remove from state
    setProducts((prev) => prev.filter((p) => p.id !== id));

    if (isSupabaseConfigured()) {
      const res = await deleteProductInSupabase(id);
      if (!res.success) {
        return res;
      }
    }

    return { success: true };
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        categories,
        isLoading,
        updateProduct,
        addProduct,
        deleteProduct,
        refreshProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
