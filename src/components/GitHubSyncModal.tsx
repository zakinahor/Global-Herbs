import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, GitPullRequest, RefreshCw, CheckCircle2, AlertCircle, ExternalLink, X } from 'lucide-react';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GitStatus {
  branch: string;
  latestCommit: string;
  uncommittedChanges: number;
  repository: string;
  targetRepo: string;
}

export default function GitHubSyncModal({ isOpen, onClose }: GitHubSyncModalProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/git/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setResult(null);
    }
  }, [isOpen]);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch('/api/git/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: syncMessage || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: data.message || 'Synced successfully to zakinahor/Global-Herbs!' });
        setSyncMessage('');
        fetchStatus();
      } else {
        setResult({ success: false, message: data.error || 'Failed to sync with repository.' });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Network error while attempting sync.' });
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 text-left">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden relative animate-fade-in">
        {/* Header */}
        <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 flex items-center justify-center text-white">
              <GitPullRequest size={18} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-sm uppercase tracking-wide">
                Direct GitHub Sync
              </h3>
              <p className="text-[11px] text-gray-400 font-mono">
                zakinahor / Global-Herbs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Target Info */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-700" />
                Target Repository Connected
              </span>
              <a
                href="https://github.com/zakinahor/Global-Herbs"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-emerald-800 hover:text-emerald-950 font-bold inline-flex items-center gap-1 hover:underline"
              >
                <span>View on GitHub</span>
                <ExternalLink size={11} />
              </a>
            </div>
            <p className="text-[11px] text-emerald-800">
              Changes push directly to your existing <strong>Global-Herbs</strong> repo without creating new repositories.
            </p>
          </div>

          {/* Repo Status */}
          <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/70 space-y-2">
            <div className="flex items-center justify-between text-gray-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <GitBranch size={13} className="text-gray-600" />
                Branch:
              </span>
              <span className="font-mono text-gray-900 font-bold bg-white px-2 py-0.5 rounded border border-gray-200">
                {status?.branch || 'main'}
              </span>
            </div>

            <div className="flex items-start justify-between text-gray-500 font-semibold">
              <span className="flex items-center gap-1.5 pt-0.5">
                <GitCommit size={13} className="text-gray-600" />
                Latest Commit:
              </span>
              <span className="font-mono text-[11px] text-gray-800 font-medium text-right max-w-[240px] truncate">
                {loading ? 'Checking...' : status?.latestCommit || 'Initial commit'}
              </span>
            </div>
          </div>

          {/* Custom Message Input */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
              Commit Message (Optional)
            </label>
            <input
              type="text"
              value={syncMessage}
              onChange={(e) => setSyncMessage(e.target.value)}
              placeholder="e.g., Update mobile styles & SEO tags"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-700 bg-white"
            />
          </div>

          {/* Feedback */}
          {result && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                result.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                  : 'bg-red-50 text-red-900 border-red-200'
              }`}
            >
              {result.success ? <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" /> : <AlertCircle size={16} className="text-red-600 flex-shrink-0" />}
              <span>{result.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Syncing to GitHub...' : 'Sync Direct to GitHub'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
