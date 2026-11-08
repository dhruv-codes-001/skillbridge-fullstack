"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { tutorService } from "@/services/tutor.service";
import { sessionService } from "@/services/session.service";
import { StarRating } from "@/components/common/StarRating";
import { Badge } from "@/components/common/Badge";
import { PageSpinner } from "@/components/common/Spinner";
import { useAuth } from "@/hooks/useAuth";
import {
  MapPin, GraduationCap, Clock, BookOpen, MessageSquare,
  ArrowLeft, AlertCircle, Award, Calendar, X, CheckCircle,
} from "lucide-react";
import { formatCurrency, formatRating, formatDate } from "@/lib/utils";
import type { TutorDetailResponse, Offering, Review, SessionCreate } from "@/types";
import axios from "axios";

function AvatarFallback({ name, size = "lg" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const sizeMap = { sm: "h-10 w-10 text-sm", md: "h-16 w-16 text-xl", lg: "h-24 w-24 text-3xl" };
  return (
    <div className={`${sizeMap[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function SubjectChips({ subjects }: { subjects: string }) {
  const chips = subjects.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((s) => <Badge key={s} variant="indigo" size="md">{s}</Badge>)}
    </div>
  );
}

function OfferingCard({ offering, onBook, isLearner }: { offering: Offering; onBook: (o: Offering) => void; isLearner: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-gray-900">{offering.title}</h4>
        <span className="flex-shrink-0 text-base font-bold text-indigo-700">
          {formatCurrency(offering.hourly_rate)}<span className="text-xs font-normal text-gray-400">/hr</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="indigo" size="sm">{offering.subject}</Badge>
        <Badge variant="gray" size="sm">{offering.level}</Badge>
      </div>
      {offering.description && <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-3">{offering.description}</p>}
      {isLearner && (
        <button onClick={() => onBook(offering)} className="mt-1 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
          Book this Offering
        </button>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const initials = review.learner_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900">{review.learner_name}</span>
            <StarRating rating={review.rating} size="sm" showValue />
            <span className="text-xs text-gray-400 ml-auto">{formatDate(review.created_at)}</span>
          </div>
          {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Booking Modal ──────────────────────────────────────────────────────────

function BookingModal({
  offering,
  tutorName,
  onClose,
  onSuccess,
}: {
  offering: Offering;
  tutorName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hourlyRate = typeof offering.hourly_rate === "string"
    ? parseFloat(offering.hourly_rate) : offering.hourly_rate;
  const totalPrice = (hourlyRate * duration) / 60;

  // Calculate end time for display
  const endTime = (() => {
    if (!date || !time) return null;
    try {
      const start = new Date(`${date}T${time}:00`);
      const end = new Date(start.getTime() + duration * 60000);
      return end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch { return null; }
  })();

  const minDate = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date || !time) { setError("Please select a date and time."); return; }
    setSubmitting(true);
    try {
      const scheduledStart = new Date(`${date}T${time}:00`).toISOString();
      const payload: SessionCreate = {
        offering_id: offering.id,
        scheduled_start: scheduledStart,
        duration_minutes: duration,
        learner_notes: notes.trim() || undefined,
      };
      await sessionService.createSession(payload);
      setSuccess(true);
      setTimeout(() => { onSuccess(); }, 1500);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail;
        if (status === 409) setError(`Scheduling conflict: ${detail ?? "This time slot is already taken."}`);
        else if (status === 422) setError("Invalid booking details. Please check your inputs.");
        else setError(detail ?? "Booking failed. Please try again.");
      } else {
        setError("Booking failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
          <CheckCircle className="mx-auto mb-4 h-14 w-14 text-green-500" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Request Sent!</h3>
          <p className="text-sm text-gray-500">Your request has been sent to {tutorName}. You'll be notified once they respond.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Book a Session</h3>
            <p className="text-sm text-gray-500 truncate max-w-[260px]">{offering.title} · {tutorName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes (1 hour)</option>
              <option value={90}>90 minutes (1.5 hours)</option>
              <option value={120}>120 minutes (2 hours)</option>
            </select>
          </div>

          {/* Summary row */}
          {date && time && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">End time</span>
                <span className="font-medium text-gray-900">{endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rate</span>
                <span className="font-medium text-gray-900">{formatCurrency(hourlyRate)}/hr</span>
              </div>
              <div className="flex justify-between border-t border-indigo-200 pt-1 mt-1">
                <span className="font-semibold text-gray-700">Estimated Total</span>
                <span className="font-bold text-indigo-700">{formatCurrency(totalPrice)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any specific topics or questions..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Sending…" : "Send Booking Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TutorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [tutor, setTutor] = useState<TutorDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingOffering, setBookingOffering] = useState<Offering | null>(null);

  const tutorId = Number(params.id);

  useEffect(() => {
    if (!tutorId || isNaN(tutorId)) { setError("Invalid tutor ID."); setIsLoading(false); return; }
    setIsLoading(true);
    tutorService.getTutorById(tutorId)
      .then(setTutor)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load tutor."))
      .finally(() => setIsLoading(false));
  }, [tutorId]);

  if (isLoading) return <PageSpinner />;

  if (error || !tutor) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
        <h2 className="text-xl font-semibold text-gray-900">
          {error?.includes("404") || error?.includes("not found") ? "Tutor not found" : "Something went wrong"}
        </h2>
        <p className="mt-2 text-sm text-gray-500">{error ?? "We could not load this tutor's profile."}</p>
        <button onClick={() => router.push("/marketplace")} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </button>
      </div>
    );
  }

  const rating = typeof tutor.average_rating === "string" ? parseFloat(tutor.average_rating) : (tutor.average_rating ?? 0);
  const isLearner = isAuthenticated && user?.role === "learner";
  const isSelf = isAuthenticated && user?.id === tutor.id;
  const activeOfferings = tutor.offerings.filter((o) => o.is_active);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {bookingOffering && (
        <BookingModal
          offering={bookingOffering}
          tutorName={tutor.full_name}
          onClose={() => setBookingOffering(null)}
          onSuccess={() => { setBookingOffering(null); router.push("/dashboard"); }}
        />
      )}

      <Link href="/marketplace" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Marketplace
      </Link>

      {/* Profile header */}
      <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-shrink-0">
            {tutor.avatar_url ? (
              <img src={tutor.avatar_url} alt={tutor.full_name} className="h-24 w-24 rounded-full object-cover border-4 border-indigo-100" />
            ) : (
              <AvatarFallback name={tutor.full_name} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{tutor.full_name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  {tutor.college && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{tutor.college}</span>}
                  {tutor.department && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{tutor.department}</span>}
                  {tutor.year_of_study && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{tutor.year_of_study}</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-indigo-700">{formatCurrency(tutor.hourly_rate)}</span>
                  <span className="text-sm text-gray-400"> / hr</span>
                </div>
                {isLearner && !isSelf ? (
                  <button
                    onClick={() => activeOfferings.length > 0 ? setBookingOffering(activeOfferings[0]) : null}
                    disabled={activeOfferings.length === 0}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Book a Session
                  </button>
                ) : !isAuthenticated ? (
                  <Link href={`/login?returnUrl=/tutors/${tutor.id}`} className="rounded-lg border border-indigo-300 bg-indigo-50 px-5 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
                    Sign in to Book
                  </Link>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <StarRating rating={rating} size="md" />
                <span className="font-bold text-gray-800">{formatRating(rating)}</span>
                <span className="text-sm text-gray-400">({tutor.total_reviews} review{tutor.total_reviews !== 1 ? "s" : ""})</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-4 w-4 text-indigo-400" />{tutor.total_sessions_completed} session{tutor.total_sessions_completed !== 1 ? "s" : ""} completed
              </div>
              {tutor.experience_years > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Award className="h-4 w-4 text-indigo-400" />{tutor.experience_years} yr{tutor.experience_years !== 1 ? "s" : ""} experience
                </div>
              )}
            </div>
            {tutor.bio && <p className="mt-4 text-sm text-gray-600 leading-relaxed">{tutor.bio}</p>}
            {tutor.teaching_subjects && <div className="mt-4"><SubjectChips subjects={tutor.teaching_subjects} /></div>}
          </div>
        </div>
        {tutor.experience_description && (
          <div className="mt-6 rounded-xl bg-indigo-50 border border-indigo-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-800">Teaching Approach</span>
            </div>
            <p className="text-sm text-indigo-700 leading-relaxed">{tutor.experience_description}</p>
          </div>
        )}
      </div>

      {/* Offerings */}
      <section className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">
            Available Offerings{activeOfferings.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({activeOfferings.length})</span>}
          </h2>
        </div>
        {activeOfferings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeOfferings.map((offering) => (
              <OfferingCard key={offering.id} offering={offering} isLearner={isLearner && !isSelf} onBook={setBookingOffering} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-10 text-center">
            <BookOpen className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No active offerings at the moment.</p>
          </div>
        )}
      </section>

      {/* Reviews */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">
            Student Reviews{tutor.reviews.length > 0 && <span className="ml-2 text-sm font-normal text-gray-400">({tutor.reviews.length})</span>}
          </h2>
        </div>
        {tutor.reviews.length > 0 ? (
          <div className="space-y-4">
            {tutor.reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-10 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No reviews yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
