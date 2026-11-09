import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Eye,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Tag,
  DollarSign,
  ArrowLeft,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProducts } from '../../context/ProductContext';
import { useCurrency } from '../../context/CurrencyContext';
import { Product } from '../../types';
import { uploadFileToSupabase, isSupabaseConfigured } from '../../lib/supabase';
import SEOHead from '../SEOHead';

export default function AdminProductManager() {
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin, isLoading: authLoading } = useAuth();
  const { products, categories, isLoading: productsLoading, updateProduct, addProduct, deleteProduct, refreshProducts } = useProducts();
  const { formatPrice } = useCurrency();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStock, setSelectedStock] = useState<'all' | 'in_stock' | 'out_of_stock' | 'on_sale'>('all');

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Flowers');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editOriginalPrice, setEditOriginalPrice] = useState<string>('');
  const [editInStock, setEditInStock] = useState<boolean>(true);
  const [editOnSale, setEditOnSale] = useState<boolean>(false);
  const [editInventory, setEditInventory] = useState<number>(100);
  const [editImage, setEditImage] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStrainType, setEditStrainType] = useState('Hybrid');
  const [editPotency, setEditPotency] = useState('');

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Flowers');
  const [newPrice, setNewPrice] = useState<number>(45);
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=800&auto=format&fit=crop&q=80');
  const [newDescription, setNewDescription] = useState('');
  const [newStrainType, setNewStrainType] = useState('Hybrid');
  const [newPotency, setNewPotency] = useState('28% THCA');

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all') {
        const catSlug = selectedCategory.toLowerCase();
        if (p.categorySlug !== catSlug && p.category.toLowerCase() !== catSlug) {
          return false;
        }
      }

      if (selectedStock === 'in_stock' && p.inStock === false) return false;
      if (selectedStock === 'out_of_stock' && p.inStock !== false) return false;
      if (selectedStock === 'on_sale' && !p.onSale) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesCategory = p.category.toLowerCase().includes(query);
        const matchesStrain = p.strainType ? p.strainType.toLowerCase().includes(query) : false;
        const matchesSku = p.sku ? p.sku.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesCategory && !matchesStrain && !matchesSku) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, selectedStock, searchQuery]);

  // Statistics
  const totalCount = products.length;
  const inStockCount = products.filter((p) => p.inStock !== false).length;
  const outOfStockCount = products.filter((p) => p.inStock === false).length;
  const onSaleCount = products.filter((p) => p.onSale).length;

  // Open Edit Modal
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditPrice(p.price);
    setEditOriginalPrice(p.originalPrice ? String(p.originalPrice) : '');
    setEditInStock(p.inStock !== false);
    setEditOnSale(Boolean(p.onSale));
    setEditInventory(p.inventory ?? 100);
    setEditImage(p.image);
    setEditDescription(p.description);
    setEditStrainType(p.strainType || 'Hybrid');
    setEditPotency(p.potency || '');
    setUploadMessage(null);
    setIsEditModalOpen(true);
  };

  // Save Product Updates
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setEditSaving(true);
    const updates: Partial<Product> = {
      name: editName.trim(),
      category: editCategory,
      categorySlug: editCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      price: Number(editPrice),
      originalPrice: editOriginalPrice ? Number(editOriginalPrice) : undefined,
      inStock: editInStock,
      onSale: editOnSale,
      inventory: Number(editInventory),
      image: editImage.trim(),
      description: editDescription.trim(),
      strainType: editStrainType,
      potency: editPotency.trim(),
    };

    const res = await updateProduct(editingProduct.id, updates);
    setEditSaving(false);

    if (res.success) {
      showToast(`Product "${editName}" updated successfully.`);
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } else {
      showToast(res.error || 'Failed to update product.');
    }
  };

  // Quick In-Stock Toggle
  const handleToggleStock = async (product: Product) => {
    const nextStatus = product.inStock === false ? true : false;
    const res = await updateProduct(product.id, { inStock: nextStatus });
    if (res.success) {
      showToast(`"${product.name}" marked as ${nextStatus ? 'In Stock' : 'Out of Stock'}.`);
    } else {
      showToast('Failed to update stock status.');
    }
  };

  // Quick On-Sale Toggle
  const handleToggleSale = async (product: Product) => {
    const nextSale = !product.onSale;
    const res = await updateProduct(product.id, { onSale: nextSale });
    if (res.success) {
      showToast(`"${product.name}" marked as ${nextSale ? 'On Sale' : 'Regular Price'}.`);
    } else {
      showToast('Failed to update sale status.');
    }
  };

  // Delete Product
  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to remove "${product.name}" from the active catalog?`)) {
      return;
    }
    const res = await deleteProduct(product.id);
    if (res.success) {
      showToast(`Product #${product.id} removed from catalog.`);
    } else {
      showToast('Failed to delete product.');
    }
  };

  // Handle Image Upload directly to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadMessage(null);

    const cleanExt = file.name.split('.').pop() || 'jpg';
    const filePath = `products/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;

    const res = await uploadFileToSupabase('product-images', filePath, file);
    setUploadingImage(false);

    if (res.success && res.url) {
      if (isNew) {
        setNewImage(res.url);
      } else {
        setEditImage(res.url);
      }
      setUploadMessage('Image uploaded to Supabase Storage CDN successfully!');
    } else {
      setUploadMessage(res.error || 'Failed to upload image to storage.');
    }
  };

  // Handle Add Product Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAddSaving(true);
    const res = await addProduct({
      name: newName.trim(),
      category: newCategory,
      categorySlug: newCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      price: Number(newPrice),
      image: newImage.trim(),
      description: newDescription.trim() || 'Premium botanical dispensary herb.',
      strainType: newStrainType,
      potency: newPotency.trim(),
      inStock: true,
      onSale: false,
    });
    setAddSaving(false);

    if (res.success) {
      showToast(`Product "${newName}" added to catalog.`);
      setIsAddModalOpen(false);
      setNewName('');
      setNewDescription('');
    } else {
      showToast(res.error || 'Failed to add product.');
    }
  };

  // Access Control Guard
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Verifying Administrator Role...
          </p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="font-heading font-extrabold text-lg text-gray-900">
            Administrator Authentication Required
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            The dispensary management area is restricted to verified administrators. Please sign in with your authorized admin account to continue.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/login?redirect=/admin"
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs"
            >
              Sign In to Management
            </Link>
            <Link
              to="/products"
              className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold uppercase tracking-wider transition"
            >
              Return to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h2 className="font-heading font-extrabold text-lg text-gray-900">
            Access Restricted: Customer Account
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Your account (<strong>{user?.email}</strong>) is currently registered with the <strong>Customer</strong> role. Only accounts with the <strong>Admin</strong> role can view and modify products in the dispensary management area.
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 text-left">
            <strong>Assigning Admin Access:</strong>
            <br />
            In Supabase, execute:
            <code className="block mt-1 font-mono text-[10px] bg-white p-1 rounded border border-amber-300">
              UPDATE public.profiles SET role = 'admin' WHERE email = '{user?.email}';
            </code>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/account"
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs"
            >
              Customer Dashboard
            </Link>
            <Link
              to="/products"
              className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold uppercase tracking-wider transition"
            >
              Browse Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-left">
      <SEOHead
        activePage="admin"
        customTitle="Dispensary Management | Global Herbs Administration"
        customDescription="Private administrator management area for Global Herbs botanical products catalog and customer reviews."
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-700 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Admin Bar */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-900 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <ShieldCheck size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                  <Sparkles size={11} />
                  Administrator Portal
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isSupabaseConfigured()
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {isSupabaseConfigured() ? 'Supabase Synchronized' : 'Local Persistence Mode'}
                </span>
              </div>
              <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-gray-900 tracking-tight">
                Dispensary Product Catalog Management
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Signed in as <strong className="text-gray-800">{user?.name}</strong> ({user?.email}) · Role: <span className="font-bold text-emerald-800 uppercase text-[10px]">Administrator</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>Add New Product</span>
            </button>
            <button
              onClick={refreshProducts}
              disabled={productsLoading}
              className="p-2.5 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl transition cursor-pointer"
              title="Refresh Products from Database"
            >
              <RefreshCw size={15} className={productsLoading ? 'animate-spin text-emerald-800' : ''} />
            </button>
            <Link
              to="/products"
              target="_blank"
              className="px-3.5 py-2.5 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">View Live Store</span>
            </Link>
          </div>
        </div>

        {/* Management Area Tab Navigation */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-1.5 shadow-xs flex items-center gap-2">
          <Link
            to="/admin/products"
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-800 text-white shadow-xs flex items-center gap-2"
          >
            <Package size={14} />
            <span>Product Catalog ({totalCount})</span>
          </Link>
          <Link
            to="/admin/reviews"
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition flex items-center gap-2"
          >
            <MessageSquare size={14} />
            <span>Customer Reviews Moderation</span>
          </Link>
        </div>

        {/* Quick Statistics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Catalog Products
            </span>
            <span className="font-heading font-extrabold text-2xl text-gray-900">
              {totalCount}
            </span>
            <p className="text-[11px] text-gray-500 mt-1">Live botanical items</p>
          </div>

          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
              In Stock &amp; Active
            </span>
            <span className="font-heading font-extrabold text-2xl text-emerald-800">
              {inStockCount}
            </span>
            <p className="text-[11px] text-gray-500 mt-1">Ready for stealth dispatch</p>
          </div>

          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block mb-1">
              Out of Stock
            </span>
            <span className="font-heading font-extrabold text-2xl text-red-700">
              {outOfStockCount}
            </span>
            <p className="text-[11px] text-gray-500 mt-1">Hidden from checkout</p>
          </div>

          <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
              On Sale / Promotional
            </span>
            <span className="font-heading font-extrabold text-2xl text-amber-700">
              {onSaleCount}
            </span>
            <p className="text-[11px] text-gray-500 mt-1">Featured discount items</p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, strain, or category..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 text-gray-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-800 font-semibold cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value as any)}
              className="px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-800 font-semibold cursor-pointer"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock Only</option>
              <option value="out_of_stock">Out of Stock Only</option>
              <option value="on_sale">On Sale Only</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Price</th>
                  <th className="p-3.5 text-center">Stock Status</th>
                  <th className="p-3.5 text-center">On Sale</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      <Package size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-xs font-semibold">No products match your search or filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const isInStock = p.inStock !== false;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition">
                        {/* Product info */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-12 h-12 rounded-xl object-cover border border-gray-200 flex-shrink-0 bg-gray-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?w=800&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-gray-900 block truncate hover:text-emerald-800">
                                {p.name}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                                <span className="font-mono">#{p.id}</span>
                                {p.strainType && <span>· {p.strainType}</span>}
                                {p.potency && <span>· {p.potency}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {p.category}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="p-3.5 text-right">
                          <div className="font-extrabold text-sm text-gray-900">
                            {formatPrice(p.price)}
                          </div>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <span className="text-[10px] text-gray-400 line-through block">
                              {formatPrice(p.originalPrice)}
                            </span>
                          )}
                        </td>

                        {/* In Stock Toggle */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleStock(p)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition cursor-pointer border ${
                              isInStock
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-200 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'
                            }`}
                          >
                            {isInStock ? 'In Stock' : 'Out of Stock'}
                          </button>
                        </td>

                        {/* On Sale Toggle */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleSale(p)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition cursor-pointer border ${
                              p.onSale
                                ? 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                            }`}
                          >
                            {p.onSale ? 'Promo Active' : 'Regular'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-2 text-gray-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Edit Product"
                            >
                              <Edit2 size={14} />
                            </button>
                            <Link
                              to={`/products/${p.slug}`}
                              target="_blank"
                              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                              title="View Live Product Page"
                            >
                              <ExternalLink size={14} />
                            </Link>
                            <button
                              onClick={() => handleDelete(p)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              title="Delete Product"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-auto text-left space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Product Editor
                </span>
                <h3 className="font-heading font-extrabold text-lg text-gray-900">
                  Edit #{editingProduct.id} — {editingProduct.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Product Title / Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-semibold cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Strain Classification
                  </label>
                  <select
                    value={editStrainType}
                    onChange={(e) => setEditStrainType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-semibold cursor-pointer"
                  >
                    <option value="Indica">Indica</option>
                    <option value="Sativa">Sativa</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Indica Dominant">Indica Dominant</option>
                    <option value="Sativa Dominant">Sativa Dominant</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Base Price (USD $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Original Price (Optional Strike-through $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value)}
                    placeholder="e.g. 55"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Potency / Lab THC %
                  </label>
                  <input
                    type="text"
                    value={editPotency}
                    onChange={(e) => setEditPotency(e.target.value)}
                    placeholder="e.g. 29.4% Total Cannabinoids"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Inventory Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editInventory}
                    onChange={(e) => setEditInventory(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-bold"
                  />
                </div>
              </div>

              {/* Status Toggles */}
              <div className="flex items-center gap-6 p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editInStock}
                    onChange={(e) => setEditInStock(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                  />
                  <span className="font-bold text-gray-800">In Stock for Ordering</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editOnSale}
                    onChange={(e) => setEditOnSale(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                  />
                  <span className="font-bold text-gray-800">Feature On Sale Badge</span>
                </label>
              </div>

              {/* Image URL & Supabase Storage File Uploader */}
              <div className="space-y-2">
                <label className="block font-bold text-gray-700 uppercase tracking-wider">
                  Product Image URL &amp; Supabase Storage
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editImage}
                    onChange={(e) => setEditImage(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-mono text-[11px]"
                  />
                  <label className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap border border-gray-300">
                    <UploadCloud size={14} />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, false)}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                {uploadMessage && (
                  <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mt-1">
                    <CheckCircle2 size={12} />
                    <span>{uploadMessage}</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Product Description
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold uppercase tracking-wider transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editSaving ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-auto text-left space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  New Botanical Item
                </span>
                <h3 className="font-heading font-extrabold text-lg text-gray-900">
                  Add Product to Catalog
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Product Title / Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. THCA Strawberry Diesel Indoor Flower"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-semibold cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Strain Classification
                  </label>
                  <select
                    value={newStrainType}
                    onChange={(e) => setNewStrainType(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-semibold cursor-pointer"
                  >
                    <option value="Indica">Indica</option>
                    <option value="Sativa">Sativa</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Price (USD $)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Potency / Lab THC %
                  </label>
                  <input
                    type="text"
                    value={newPotency}
                    onChange={(e) => setNewPotency(e.target.value)}
                    placeholder="e.g. 28% Total Cannabinoids"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900"
                  />
                </div>
              </div>

              {/* Image & Supabase Storage */}
              <div className="space-y-2">
                <label className="block font-bold text-gray-700 uppercase tracking-wider">
                  Product Image
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900 font-mono text-[11px]"
                  />
                  <label className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap border border-gray-300">
                    <UploadCloud size={14} />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, true)}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Enter details on aroma, terpenes, and flavor profile..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 text-gray-900"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold uppercase tracking-wider hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold uppercase tracking-wider transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {addSaving ? 'Adding...' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
