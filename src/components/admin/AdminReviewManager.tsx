/**
 * src/components/admin/AdminReviewManager.tsx
 *
 * Administrator dashboard for moderating customer product reviews,
 * verifying purchases, publishing responses, and featuring homepage testimonials.
 */

import React, { useState, useEffect } from 'react';
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  MessageSquare,
  Award,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Image as ImageIcon,
  Send,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { ProductReview, ReviewStatus } from '../../types/review';
import { products } from '../../data/products';

export default function AdminReviewManager() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'all'>('all');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedRating, setSelectedRating] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Response Modal State
  const [respondingToReview, setRespondingToReview] = useState<ProductReview | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [responderName, setResponderName] = useState<string>('Global Herbs Dispatch Management');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState<boolean>(false);

  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (selectedProductId !== 'all') params.set('productId', selectedProductId);
      if (selectedRating !== 'all') params.set('minRating', selectedRating);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setReviews(data.reviews || []);
          if (data.counts) setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('[Admin Reviews] Error loading reviews:', err);
      showToast('Error loading reviews from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [statusFilter, selectedProductId, selectedRating]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReviews();
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        showToast('Review approved and published to live storefront.');
        loadReviews();
      }
    } catch {
      showToast('Failed to approve review.');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}/reject`, { method: 'POST' });
      if (res.ok) {
        showToast('Review rejected.');
        loadReviews();
      }
    } catch {
      showToast('Failed to reject review.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer review?')) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Review deleted permanently.');
        loadReviews();
      }
    } catch {
      showToast('Failed to delete review.');
    }
  };

  const handleToggleFeature = async (id: string, currentVal?: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !currentVal }),
      });
      if (res.ok) {
        showToast(!currentVal ? 'Review featured on homepage.' : 'Review unfeatured from homepage.');
        loadReviews();
      }
    } catch {
      showToast('Failed to update featured status.');
    }
  };

  const openResponseModal = (rev: ProductReview) => {
    setRespondingToReview(rev);
    setResponseText(rev.adminResponse?.response || '');
    setResponderName(rev.adminResponse?.responderName || 'Global Herbs Dispatch Management');
  };

  const handleSaveResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingToReview || !responseText.trim()) return;

    setIsSubmittingResponse(true);
    try {
      const res = await fetch(`/api/admin/reviews/${respondingToReview.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: responseText.trim(),
          responderName: responderName.trim() || 'Global Herbs Dispatch Management',
        }),
      });
      if (res.ok) {
        showToast('Official response attached to review.');
        setRespondingToReview(null);
        setResponseText('');
        loadReviews();
      }
    } catch {
      showToast('Failed to save official response.');
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white border border-emerald-500 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Total Reviews
          </span>
          <span className="text-2xl font-black text-white">{counts.all}</span>
        </div>

        <div className="bg-gray-800 border border-amber-500/40 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <AlertCircle size={12} />
            Pending Moderation
          </span>
          <span className="text-2xl font-black text-amber-400">{counts.pending}</span>
        </div>

        <div className="bg-gray-800 border border-emerald-500/40 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
            Approved &amp; Live
          </span>
          <span className="text-2xl font-black text-emerald-400">{counts.approved}</span>
        </div>

        <div className="bg-gray-800 border border-gray-700/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
            Rejected
          </span>
          <span className="text-2xl font-black text-red-400">{counts.rejected}</span>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="bg-gray-800/90 border border-gray-700 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-700/60 overflow-x-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {st === 'all' ? `All (${counts.all})` : `${st} (${counts[st]})`}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-grow max-w-md">
            <div className="relative flex-grow">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search author, comment, email..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Refresh Button */}
          <button
            onClick={loadReviews}
            disabled={isLoading}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition cursor-pointer self-start md:self-auto"
            title="Refresh list"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-700/60 text-xs">
          <div>
            <label className="text-gray-400 block mb-1 font-semibold">Filter by Product:</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-emerald-500"
            >
              <option value="all">All Products ({products.length})</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 block mb-1 font-semibold">Filter by Rating:</label>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-emerald-500"
            >
              <option value="all">All Star Ratings (1★ – 5★)</option>
              <option value="5">5 Stars Only</option>
              <option value="4">4 Stars &amp; Above</option>
              <option value="3">3 Stars &amp; Above</option>
              <option value="2">2 Stars &amp; Below</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Table / Cards */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 text-xs space-y-2">
            <RefreshCw size={24} className="animate-spin mx-auto text-emerald-400" />
            <p>Loading customer reviews from database...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs space-y-2">
            <CheckCircle2 size={24} className="mx-auto text-gray-500" />
            <p className="font-bold text-gray-300">No reviews found matching the selected filters.</p>
            <p className="text-gray-500">New customer reviews will appear here in Pending status.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/80">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className={`p-5 transition ${
                  rev.status === 'pending'
                    ? 'bg-amber-950/20 hover:bg-amber-950/30'
                    : rev.status === 'rejected'
                    ? 'bg-red-950/10 hover:bg-red-950/20 opacity-75'
                    : 'hover:bg-gray-750'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-2 flex-grow">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider border ${
                          rev.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : rev.status === 'pending'
                            ? 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse'
                            : 'bg-red-950 text-red-300 border-red-700'
                        }`}
                      >
                        {rev.status}
                      </span>

                      {/* Verified Buyer Badge */}
                      {rev.verified && (
                        <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <ShieldCheck size={11} />
                          Verified Order {rev.orderId ? `(${rev.orderId})` : ''}
                        </span>
                      )}

                      {/* Featured on Home Badge */}
                      {rev.featuredOnHome && (
                        <span className="bg-amber-900/60 text-amber-300 border border-amber-700/60 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Award size={11} />
                          Homepage Featured
                        </span>
                      )}

                      {/* Stars */}
                      <div className="flex text-amber-400 ml-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            fill={i < rev.rating ? 'currentColor' : 'none'}
                            className={i < rev.rating ? 'text-amber-400' : 'text-gray-600'}
                          />
                        ))}
                      </div>

                      <span className="text-xs font-bold text-gray-300">
                        {rev.rating} of 5 Stars
                      </span>

                      <span className="text-[11px] text-gray-400 ml-auto">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Reviewer & Product */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-white text-sm">{rev.author}</span>
                      {rev.email && (
                        <span className="text-gray-400 text-xs">({rev.email})</span>
                      )}
                      <span className="text-gray-500">•</span>
                      <a
                        href={`/products/${rev.productSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                      >
                        <span>{rev.productName}</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>

                    {/* Title & Comment */}
                    {rev.title && (
                      <h4 className="font-bold text-xs text-white">"{rev.title}"</h4>
                    )}
                    <p className="text-xs text-gray-300 leading-relaxed font-normal bg-gray-900/60 p-3 rounded-xl border border-gray-700/50">
                      {rev.comment}
                    </p>

                    {/* Customer Photo */}
                    {rev.imageUrl && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setPreviewImage(rev.imageUrl!)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-gray-900 border border-gray-700 px-2.5 py-1 rounded-lg"
                        >
                          <ImageIcon size={12} />
                          <span>View Customer Photo</span>
                        </button>
                      </div>
                    )}

                    {/* Admin Response Preview */}
                    {rev.adminResponse && (
                      <div className="mt-2 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400">
                          <span className="flex items-center gap-1">
                            <MessageSquare size={11} />
                            Official Response from {rev.adminResponse.responderName}:
                          </span>
                          <span>{new Date(rev.adminResponse.respondedAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-emerald-100 font-medium">
                          "{rev.adminResponse.response}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex lg:flex-col items-center gap-2 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-700">
                    {rev.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(rev.id)}
                        className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow"
                      >
                        <CheckCircle2 size={13} />
                        <span>Approve</span>
                      </button>
                    )}

                    {rev.status !== 'rejected' && (
                      <button
                        onClick={() => handleReject(rev.id)}
                        className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        <XCircle size={13} />
                        <span>Reject</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleFeature(rev.id, rev.featuredOnHome)}
                      className={`w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        rev.featuredOnHome
                          ? 'bg-amber-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                      title="Toggle showcase in homepage customer testimonials"
                    >
                      <Award size={13} />
                      <span>{rev.featuredOnHome ? 'Featured ★' : 'Feature'}</span>
                    </button>

                    <button
                      onClick={() => openResponseModal(rev)}
                      className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <MessageSquare size={13} />
                      <span>{rev.adminResponse ? 'Edit Reply' : 'Reply'}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(rev.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition cursor-pointer"
                      title="Permanently delete review"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Response Modal */}
      {respondingToReview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-850 border border-gray-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-left">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-heading font-bold text-white text-base">
                  Official Administrative Response
                </h3>
                <p className="text-xs text-gray-400">
                  Replying to <strong>{respondingToReview.author}</strong> on {respondingToReview.productName}
                </p>
              </div>
              <button
                onClick={() => setRespondingToReview(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-gray-900 rounded-xl text-xs text-gray-300 border border-gray-800">
              <span className="font-bold text-gray-400 block mb-1">Customer Review:</span>
              "{respondingToReview.comment}"
            </div>

            <form onSubmit={handleSaveResponse} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Representative / Department Title
                </label>
                <input
                  type="text"
                  value={responderName}
                  onChange={(e) => setResponderName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Official Public Response
                </label>
                <textarea
                  rows={4}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Thank you for your feedback! We appreciate..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-white focus:outline-emerald-500 leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRespondingToReview(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResponse || !responseText.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{isSubmittingResponse ? 'Publishing...' : 'Publish Response'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Photo Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-gray-900 rounded-2xl p-2 border border-gray-700">
            <img
              src={previewImage}
              alt="Customer submission"
              className="max-h-[80vh] w-auto rounded-xl object-contain mx-auto"
            />
            <p className="text-center text-xs text-gray-400 mt-2">Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
