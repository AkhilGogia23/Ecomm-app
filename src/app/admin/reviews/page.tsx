"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Check, X, Trash2, MessageSquare } from "lucide-react";
import Tabs from "@/components/ui/Tabs";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/store/toast";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  adminReply: string | null;
  isApproved: boolean;
  isRejected: boolean;
  createdAt: string;
  product: { id: string; title: string };
  user: { name: string; email: string };
}

function ReviewList({ status }: { status: "pending" | "approved" | "rejected" | "all" }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status });
      if (ratingFilter) params.set("rating", ratingFilter);
      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      const json = await res.json();
      if (json.success) setReviews(json.data);
    } finally {
      setLoading(false);
    }
  }, [status, ratingFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    fetchReviews();
  }, [fetchReviews]);

  async function handleAction(review: Review, action: "approve" | "reject") {
    const res = await fetch(`/api/admin/reviews/${review.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(action === "approve" ? "Review approved" : "Review rejected");
      fetchReviews();
    } else {
      toast.error(json.error ?? "Failed to update review");
    }
  }

  async function handleReply() {
    if (!replyTarget) return;
    const res = await fetch(`/api/admin/reviews/${replyTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminReply: replyText }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Reply added");
      setReplyTarget(null);
      setReplyText("");
      fetchReviews();
    } else {
      toast.error(json.error ?? "Failed to add reply");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/admin/reviews/${deleteTarget.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Review deleted");
      setDeleteTarget(null);
      fetchReviews();
    } else {
      toast.error(json.error ?? "Failed to delete review");
    }
  }

  async function handleBulkApprove() {
    if (selected.size === 0) return;
    const res = await fetch("/api/admin/reviews/bulk-approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(`${json.data.count} reviews approved`);
      setSelected(new Set());
      fetchReviews();
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          placeholder="All ratings"
          options={[5, 4, 3, 2, 1].map((r) => ({ label: `${r} stars`, value: String(r) }))}
          className="w-40"
        />
        {status === "pending" && selected.size > 0 && (
          <Button size="sm" onClick={handleBulkApprove}>
            Approve {selected.size} selected
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState title="No reviews found" />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {status === "pending" && (
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="mt-1" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{r.product.title}</p>
                    <p className="text-xs text-gray-500 dark:text-neutral-400">
                      {r.user.name} · {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                    <div className="mt-1 flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-current" : ""}`} />
                      ))}
                    </div>
                    {r.title && <p className="mt-1 text-sm font-medium text-gray-800 dark:text-neutral-200">{r.title}</p>}
                    {r.comment && <p className="mt-0.5 text-sm text-gray-600 dark:text-neutral-300">{r.comment}</p>}
                    {r.adminReply && (
                      <div className="mt-2 rounded-md bg-gray-50 p-2 text-xs text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
                        <strong>Admin reply:</strong> {r.adminReply}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!r.isApproved && (
                    <button onClick={() => handleAction(r, "approve")} className="rounded-md p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-950" aria-label="Approve">
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {!r.isRejected && (
                    <button onClick={() => handleAction(r, "reject")} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label="Reject">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setReplyTarget(r);
                      setReplyText(r.adminReply ?? "");
                    }}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    aria-label="Reply"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(r)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!replyTarget}
        onClose={() => setReplyTarget(null)}
        title="Reply to Review"
        footer={
          <>
            <Button variant="outline" onClick={() => setReplyTarget(null)}>Cancel</Button>
            <Button onClick={handleReply}>Save Reply</Button>
          </>
        }
      >
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete review"
        description="Are you sure you want to permanently delete this review?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function AdminReviewsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Reviews</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400">Moderate customer product reviews</p>
      </div>

      <Tabs
        tabs={[
          { key: "pending", label: "Pending Approval", content: <ReviewList status="pending" /> },
          { key: "approved", label: "Approved", content: <ReviewList status="approved" /> },
          { key: "rejected", label: "Rejected", content: <ReviewList status="rejected" /> },
          { key: "all", label: "All", content: <ReviewList status="all" /> },
        ]}
      />
    </div>
  );
}
