"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { sessionService } from "@/services/session.service";
import { reviewService } from "@/services/review.service";
import { PageSpinner } from "@/components/common/Spinner";
import { Badge } from "@/components/common/Badge";
import { StarRating } from "@/components/common/StarRating";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Session, ReviewCreate } from "@/types";
import {
  Calendar, Clock, BookOpen, CheckCircle, XCircle,
  AlertCircle, Star, X, ChevronRight,
} from "lucide-react";
import axios from "axios";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { variant: "gray" | "indigo" | "green" | "red" | "yellow"; label: string }> = {
    pending:   { variant: "yellow", label: "Pending" },
    accepted:  { variant: "indigo", label: "Confirmed" },
    completed: { variant: "green",  label: "Completed" },
    rejected:  { variant: "red",    label: "Rejected" },
    cancelled: { variant: "gray",   label: "Cancelled" },
  };
  const cfg = map[status] ?? { variant: "gray", label: status };
  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
}

function formatSessionTime(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const startT = s.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const endT   = e.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return { date, range: `${startT} – ${endT}` };
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({ session, onClose, onDone }: { session: Session; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const payload: ReviewCreate = { session_id: session.id, rating, comment: comment.trim() || undefined };
      await reviewService.submitReview(payload);
      onDone();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 409) setError("You have already submitted a review for this session.");
        else setError(detail ?? "Failed to submit review.");
      } else setError("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Rate your session</h3>
            <p className="text-sm text-gray-500 truncate max-w-[260px]">{session.offering_title} · {session.tutor_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Rating</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  className={`text-2xl transition-transform hover:scale-110 ${n <= rating ? "text-amber-400" : "text-gray-200"}`}>
                  ★
                </button>
              ))}
              <span className="ml-2 self-center text-sm text-gray-500">{rating}/5</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Comment <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={comment} onChange={(e) => setComment(e.target.value)} rows={3}
              placeholder="Share your experience with this tutor..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({ session, onClose, onDone }: { session: Session; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sessionService.updateStatus(session.id, "cancel", reason.trim() || undefined);
      onDone();
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? "Failed to cancel.") : "Failed to cancel.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h3 className="text-lg font-bold text-gray-900">Cancel Booking</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <p className="text-sm text-gray-600">Are you sure you want to cancel your booking for <strong>{session.offering_title}</strong>?</p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition resize-none" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Keep</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
              {submitting ? "Cancelling…" : "Cancel Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session, onWriteReview, onCancel,
}: { session: Session; onWriteReview: (s: Session) => void; onCancel: (s: Session) => void }) {
  const { date, range } = formatSessionTime(session.scheduled_start, session.scheduled_end);
  const hasReview = !!session.review;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{session.offering_title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">with <span className="font-medium text-indigo-600">{session.tutor_name}</span></p>
        </div>
        {statusBadge(session.status)}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-indigo-400" />{date}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-indigo-400" />{range}</span>
        <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-indigo-400" />{session.duration_minutes} min · {session.subject}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-700">{formatCurrency(session.hourly_rate)}/hr</span>
        <div className="flex gap-2">
          {session.status === "pending" && (
            <button onClick={() => onCancel(session)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
              Cancel
            </button>
          )}
          {session.status === "accepted" && (
            <button onClick={() => onCancel(session)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
              Cancel
            </button>
          )}
          {session.status === "completed" && !hasReview && (
            <button onClick={() => onWriteReview(session)} className="flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
              <Star className="h-3.5 w-3.5" /> Write Review
            </button>
          )}
          {session.status === "completed" && hasReview && session.review && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <StarRating rating={session.review.rating} size="sm" /> Reviewed
            </div>
          )}
          {session.cancellation_reason && (
            <span className="text-xs text-gray-400 italic">{session.cancellation_reason}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ icon, message, cta }: { icon: React.ReactNode; message: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">{icon}</div>
      <p className="text-sm text-gray-500 mb-3">{message}</p>
      {cta}
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = "upcoming" | "pending" | "completed" | "history";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "upcoming",  label: "Upcoming",  icon: <Calendar className="h-4 w-4" /> },
  { key: "pending",   label: "Pending",   icon: <Clock className="h-4 w-4" /> },
  { key: "completed", label: "Completed", icon: <CheckCircle className="h-4 w-4" /> },
  { key: "history",   label: "History",   icon: <XCircle className="h-4 w-4" /> },
];

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LearnerDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [reviewSession, setReviewSession] = useState<Session | null>(null);
  const [cancelSession, setCancelSession] = useState<Session | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push("/login?returnUrl=/dashboard"); return; }
    if (user?.role === "tutor") { router.push("/dashboard/tutor"); return; }
  }, [isAuthenticated, authLoading, user, router]);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.getSessions({ role: "learner" });
      setSessions(data);
    } catch {
      setError("Failed to load sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAuthenticated && user?.role === "learner") loadSessions(); }, [isAuthenticated, user, loadSessions]);

  if (authLoading) return <PageSpinner />;

  const now = new Date();

  const filtered: Record<Tab, Session[]> = {
    upcoming:  sessions.filter(s => s.status === "accepted" && new Date(s.scheduled_end) > now),
    pending:   sessions.filter(s => s.status === "pending"),
    completed: sessions.filter(s => s.status === "completed"),
    history:   sessions.filter(s => ["rejected", "cancelled"].includes(s.status)),
  };

  const counts = Object.fromEntries(Object.entries(filtered).map(([k, v]) => [k, v.length])) as Record<Tab, number>;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {reviewSession && (
        <ReviewModal
          session={reviewSession}
          onClose={() => setReviewSession(null)}
          onDone={() => { setReviewSession(null); loadSessions(); }}
        />
      )}
      {cancelSession && (
        <CancelModal
          session={cancelSession}
          onClose={() => setCancelSession(null)}
          onDone={() => { setCancelSession(null); loadSessions(); }}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
          <p className="mt-1 text-sm text-gray-500">Track your tutoring bookings and reviews</p>
        </div>
        <Link href="/marketplace" className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
          <BookOpen className="h-4 w-4" /> Find a Tutor <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-indigo-600"
            }`}
          >
            {tab.icon}{tab.label}
            {counts[tab.key] > 0 && (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${activeTab === tab.key ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-600"}`}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center text-sm text-red-600">{error}</div>
      ) : filtered[activeTab].length > 0 ? (
        <div className="space-y-4">
          {filtered[activeTab].map((s) => (
            <SessionCard key={s.id} session={s} onWriteReview={setReviewSession} onCancel={setCancelSession} />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "upcoming" && <EmptyState icon={<Calendar className="h-6 w-6" />} message="No upcoming sessions." cta={<Link href="/marketplace" className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Browse Tutors</Link>} />}
          {activeTab === "pending" && <EmptyState icon={<Clock className="h-6 w-6" />} message="No pending requests." />}
          {activeTab === "completed" && <EmptyState icon={<CheckCircle className="h-6 w-6" />} message="No completed sessions yet." />}
          {activeTab === "history" && <EmptyState icon={<XCircle className="h-6 w-6" />} message="No cancelled or rejected bookings." />}
        </>
      )}
    </div>
  );
}
