"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { sessionService } from "@/services/session.service";
import { PageSpinner } from "@/components/common/Spinner";
import { Badge } from "@/components/common/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Session } from "@/types";
import {
  Calendar, Clock, CheckCircle, XCircle, BookOpen,
  AlertCircle, Check, X, ChevronRight, Users,
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

// ─── Action Modal ─────────────────────────────────────────────────────────────

function ActionModal({
  session, action, onClose, onDone,
}: {
  session: Session;
  action: "reject" | "cancel";
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReject = action === "reject";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await sessionService.updateStatus(session.id, action, reason.trim() || undefined);
      onDone();
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? "Action failed.") : "Action failed.");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h3 className="text-lg font-bold text-gray-900">{isReject ? "Decline Request" : "Cancel Session"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          <p className="text-sm text-gray-600">
            {isReject ? `Decline the booking request for ` : `Cancel the session for `}
            <strong>{session.offering_title}</strong> from <strong>{session.learner_name}</strong>?
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              placeholder={isReject ? "Let the student know why..." : "Reason for cancellation..."}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Keep</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
              {submitting ? "Processing…" : isReject ? "Decline" : "Cancel Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function TutorSessionCard({
  session,
  onAccept, onReject, onComplete, onCancel,
  accepting, completing,
}: {
  session: Session;
  onAccept: (s: Session) => void;
  onReject: (s: Session) => void;
  onComplete: (s: Session) => void;
  onCancel: (s: Session) => void;
  accepting: boolean;
  completing: boolean;
}) {
  const { date, range } = formatSessionTime(session.scheduled_start, session.scheduled_end);
  const now = new Date();
  const isPast = new Date(session.scheduled_end) < now;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{session.offering_title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Request from <span className="font-medium text-indigo-600">{session.learner_name}</span>
          </p>
        </div>
        {statusBadge(session.status)}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
        <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-indigo-400" />{date}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-indigo-400" />{range}</span>
        <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-indigo-400" />{session.duration_minutes} min · {session.subject}</span>
      </div>

      {session.learner_notes && (
        <div className="mb-3 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm text-indigo-700 italic">
          "{session.learner_notes}"
        </div>
      )}

      {session.cancellation_reason && (
        <p className="mb-3 text-xs text-gray-400 italic">Reason: {session.cancellation_reason}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-700">{formatCurrency(session.hourly_rate)}/hr</span>
        <div className="flex gap-2">
          {session.status === "pending" && (
            <>
              <button onClick={() => onAccept(session)} disabled={accepting}
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors">
                <Check className="h-3.5 w-3.5" /> {accepting ? "Accepting…" : "Accept"}
              </button>
              <button onClick={() => onReject(session)}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                <X className="h-3.5 w-3.5" /> Decline
              </button>
            </>
          )}
          {session.status === "accepted" && !isPast && (
            <>
              <button onClick={() => onComplete(session)} disabled={completing}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                <CheckCircle className="h-3.5 w-3.5" /> {completing ? "Marking…" : "Mark Complete"}
              </button>
              <button onClick={() => onCancel(session)}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </>
          )}
          {session.status === "accepted" && isPast && (
            <button onClick={() => onComplete(session)} disabled={completing}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              <CheckCircle className="h-3.5 w-3.5" /> {completing ? "Marking…" : "Mark Complete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">{icon}</div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

type TutorTab = "pending" | "upcoming" | "completed" | "history";

const TABS: { key: TutorTab; label: string; icon: React.ReactNode }[] = [
  { key: "pending",   label: "Requests",  icon: <Clock className="h-4 w-4" /> },
  { key: "upcoming",  label: "Upcoming",  icon: <Calendar className="h-4 w-4" /> },
  { key: "completed", label: "Completed", icon: <CheckCircle className="h-4 w-4" /> },
  { key: "history",   label: "History",   icon: <XCircle className="h-4 w-4" /> },
];

export default function TutorDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TutorTab>("pending");
  const [modalAction, setModalAction] = useState<{ session: Session; action: "reject" | "cancel" } | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push("/login?returnUrl=/dashboard/tutor"); return; }
    if (user?.role === "learner") { router.push("/dashboard"); return; }
  }, [isAuthenticated, authLoading, user, router]);

  const loadSessions = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await sessionService.getSessions({ role: "tutor" });
      setSessions(data);
    } catch { setError("Failed to load sessions."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated && user?.role === "tutor") loadSessions(); }, [isAuthenticated, user, loadSessions]);

  async function handleAccept(session: Session) {
    setAcceptingId(session.id);
    try {
      await sessionService.updateStatus(session.id, "accept");
      await loadSessions();
      setActiveTab("upcoming");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.detail ?? "Failed to accept.") : "Failed to accept.";
      alert(msg);
    } finally { setAcceptingId(null); }
  }

  async function handleComplete(session: Session) {
    if (!confirm(`Mark "${session.offering_title}" with ${session.learner_name} as completed?`)) return;
    setCompletingId(session.id);
    try {
      await sessionService.updateStatus(session.id, "complete");
      await loadSessions();
      setActiveTab("completed");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.detail ?? "Failed to complete.") : "Failed to complete.";
      alert(msg);
    } finally { setCompletingId(null); }
  }

  if (authLoading) return <PageSpinner />;

  const now = new Date();

  const filtered: Record<TutorTab, Session[]> = {
    pending:   sessions.filter(s => s.status === "pending"),
    upcoming:  sessions.filter(s => s.status === "accepted" && new Date(s.scheduled_end) > now),
    completed: sessions.filter(s => s.status === "completed"),
    history:   sessions.filter(s => ["rejected", "cancelled"].includes(s.status)),
  };
  const counts = Object.fromEntries(Object.entries(filtered).map(([k, v]) => [k, v.length])) as Record<TutorTab, number>;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {modalAction && (
        <ActionModal
          session={modalAction.session}
          action={modalAction.action}
          onClose={() => setModalAction(null)}
          onDone={() => { setModalAction(null); loadSessions(); }}
        />
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutor Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Manage booking requests and sessions</p>
        </div>
        <div className="flex gap-2">
          <a href="/offerings" className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
            <BookOpen className="h-4 w-4" /> My Offerings
          </a>
          <a href="/marketplace" className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            <Users className="h-4 w-4" /> Marketplace <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: counts.pending, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Upcoming", count: counts.upcoming, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Completed", count: counts.completed, color: "text-green-600", bg: "bg-green-50" },
          { label: "Total", count: sessions.length, color: "text-gray-600", bg: "bg-gray-50" },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl ${stat.bg} border border-gray-200 p-4 text-center`}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-indigo-600"
            }`}>
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
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-600">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />{error}
        </div>
      ) : filtered[activeTab].length > 0 ? (
        <div className="space-y-4">
          {filtered[activeTab].map((s) => (
            <TutorSessionCard
              key={s.id} session={s}
              onAccept={handleAccept}
              onReject={(session) => setModalAction({ session, action: "reject" })}
              onComplete={handleComplete}
              onCancel={(session) => setModalAction({ session, action: "cancel" })}
              accepting={acceptingId === s.id}
              completing={completingId === s.id}
            />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "pending"   && <EmptyState icon={<Clock className="h-6 w-6" />} message="No pending booking requests." />}
          {activeTab === "upcoming"  && <EmptyState icon={<Calendar className="h-6 w-6" />} message="No upcoming confirmed sessions." />}
          {activeTab === "completed" && <EmptyState icon={<CheckCircle className="h-6 w-6" />} message="No completed sessions yet." />}
          {activeTab === "history"   && <EmptyState icon={<XCircle className="h-6 w-6" />} message="No declined or cancelled sessions." />}
        </>
      )}
    </div>
  );
}
