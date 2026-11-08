"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { offeringService } from "@/services/offering.service";
import { PageSpinner } from "@/components/common/Spinner";
import { Badge } from "@/components/common/Badge";
import { formatCurrency } from "@/lib/utils";
import { ACADEMIC_SUBJECTS, ACADEMIC_LEVELS } from "@/lib/constants";
import type { Offering, OfferingCreatePayload, OfferingUpdatePayload } from "@/types";
import { Plus, Pencil, Trash2, X, AlertCircle, BookOpen, CheckCircle } from "lucide-react";
import axios from "axios";

// ─── Form Types ───────────────────────────────────────────────────────────────

interface OfferingFormData {
  title: string;
  subject: string;
  description: string;
  level: string;
  hourly_rate: string;
  is_active: boolean;
}

const EMPTY_FORM: OfferingFormData = {
  title: "", subject: "", description: "", level: "", hourly_rate: "", is_active: true,
};

function offeringToForm(o: Offering): OfferingFormData {
  return {
    title: o.title,
    subject: o.subject,
    description: o.description,
    level: o.level,
    hourly_rate: String(typeof o.hourly_rate === "string" ? parseFloat(o.hourly_rate) : o.hourly_rate),
    is_active: o.is_active,
  };
}

// ─── Offering Form Modal ──────────────────────────────────────────────────────

function OfferingFormModal({
  offering, onClose, onSaved,
}: {
  offering: Offering | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!offering;
  const [form, setForm] = useState<OfferingFormData>(offering ? offeringToForm(offering) : EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof OfferingFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const rate = parseFloat(form.hourly_rate);
    if (isNaN(rate) || rate <= 0) { setError("Please enter a valid hourly rate."); return; }
    if (!form.subject || form.subject === "") { setError("Please select a subject."); return; }
    if (!form.level || form.level === "") { setError("Please select a level."); return; }
    setSubmitting(true);
    try {
      if (isEdit && offering) {
        const payload: OfferingUpdatePayload = {
          title: form.title, subject: form.subject, description: form.description,
          level: form.level, hourly_rate: rate, is_active: form.is_active,
        };
        await offeringService.updateOffering(offering.id, payload);
      } else {
        const payload: OfferingCreatePayload = {
          title: form.title, subject: form.subject, description: form.description,
          level: form.level, hourly_rate: rate, is_active: form.is_active,
        };
        await offeringService.createOffering(payload);
      }
      onSaved();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        setError(Array.isArray(detail) ? detail.map((d: { msg: string }) => d.msg).join(", ") : (detail ?? "Failed to save offering."));
      } else setError("Failed to save offering.");
    } finally { setSubmitting(false); }
  }

  const subjects = ACADEMIC_SUBJECTS.filter(s => s !== "All Subjects");
  const levels = ACADEMIC_LEVELS.filter(l => l !== "All Levels");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white p-5">
          <h3 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Offering" : "Create New Offering"}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Title *</label>
            <input
              value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={100}
              placeholder="e.g. Data Structures & Algorithms — Beginner to Advanced"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Subject *</label>
              <select value={form.subject} onChange={(e) => set("subject", e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Level *</label>
              <select value={form.level} onChange={(e) => set("level", e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition">
                <option value="">Select level</option>
                {levels.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Description *</label>
            <textarea
              value={form.description} onChange={(e) => set("description", e.target.value)} required rows={3} maxLength={1000}
              placeholder="Describe what you'll teach, your approach, and what students will learn..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Hourly Rate (₹) *</label>
            <input
              type="number" value={form.hourly_rate} onChange={(e) => set("hourly_rate", e.target.value)}
              min="50" max="5000" step="50" required placeholder="e.g. 500"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
            />
            <p className="mt-1 text-xs text-gray-400">Minimum ₹50 · Maximum ₹5,000 per hour</p>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set("is_active", !form.is_active)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${form.is_active ? "bg-indigo-600" : "bg-gray-200"}`}>
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.is_active ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">{form.is_active ? "Active (visible to students)" : "Inactive (hidden from marketplace)"}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Offering"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirmModal({ offering, onClose, onDone }: { offering: Offering; onClose: () => void; onDone: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    try {
      const result = await offeringService.deleteOffering(offering.id);
      if (result.soft_deleted) alert("Offering has existing sessions — it has been deactivated instead of deleted.");
      onDone();
    } catch (err: unknown) {
      setError(axios.isAxiosError(err) ? (err.response?.data?.detail ?? "Delete failed.") : "Delete failed.");
    } finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Delete Offering</h3>
            <p className="text-sm text-gray-500 truncate">{offering.title}</p>
          </div>
        </div>
        {error && <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
        <p className="text-sm text-gray-600 mb-5">This will permanently delete the offering. If it has existing bookings, it will be deactivated instead.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Keep</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Offering Card ────────────────────────────────────────────────────────────

function OfferingRow({ offering, onEdit, onDelete }: { offering: Offering; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${!offering.is_active ? "opacity-60 border-dashed" : "border-gray-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{offering.title}</h3>
            {!offering.is_active && <Badge variant="gray" size="sm">Inactive</Badge>}
            {offering.is_active && <Badge variant="green" size="sm">Active</Badge>}
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="indigo" size="sm">{offering.subject}</Badge>
            <Badge variant="gray" size="sm">{offering.level}</Badge>
          </div>
          {offering.description && <p className="text-sm text-gray-500 line-clamp-2">{offering.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-3">
          <span className="text-lg font-bold text-indigo-700">{formatCurrency(offering.hourly_rate)}<span className="text-xs font-normal text-gray-400">/hr</span></span>
          <div className="flex gap-2">
            <button onClick={onEdit} className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={onDelete} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfferingsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOffering, setFormOffering] = useState<Offering | "new" | null>(null);
  const [deleteOffering, setDeleteOffering] = useState<Offering | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push("/login?returnUrl=/offerings"); return; }
    if (user?.role === "learner") { router.push("/dashboard"); return; }
  }, [isAuthenticated, authLoading, user, router]);

  const loadOfferings = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const data = await offeringService.getOfferings({ tutor_id: user.id, is_active: undefined });
      setOfferings(data);
    } catch { setError("Failed to load offerings."); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (isAuthenticated && user?.role === "tutor") loadOfferings(); }, [isAuthenticated, user, loadOfferings]);

  function handleSaved() {
    setFormOffering(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadOfferings();
  }

  if (authLoading) return <PageSpinner />;

  const active = offerings.filter(o => o.is_active);
  const inactive = offerings.filter(o => !o.is_active);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {formOffering !== null && (
        <OfferingFormModal
          offering={formOffering === "new" ? null : formOffering}
          onClose={() => setFormOffering(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteOffering && (
        <DeleteConfirmModal
          offering={deleteOffering}
          onClose={() => setDeleteOffering(null)}
          onDone={() => { setDeleteOffering(null); loadOfferings(); }}
        />
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Offerings</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage your tutoring offerings</p>
        </div>
        <button
          onClick={() => setFormOffering("new")}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Offering
        </button>
      </div>

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" /> Offering saved successfully.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-6 text-sm text-red-600">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />{error}
        </div>
      ) : offerings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <BookOpen className="h-7 w-7 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No offerings yet</h3>
          <p className="text-sm text-gray-500 mb-5">Create your first tutoring offering to appear in the marketplace.</p>
          <button onClick={() => setFormOffering("new")} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4" /> Create Your First Offering
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {active.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Active ({active.length})</h2>
              <div className="space-y-3">
                {active.map((o) => (
                  <OfferingRow key={o.id} offering={o} onEdit={() => setFormOffering(o)} onDelete={() => setDeleteOffering(o)} />
                ))}
              </div>
            </div>
          )}
          {inactive.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Inactive ({inactive.length})</h2>
              <div className="space-y-3">
                {inactive.map((o) => (
                  <OfferingRow key={o.id} offering={o} onEdit={() => setFormOffering(o)} onDelete={() => setDeleteOffering(o)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
