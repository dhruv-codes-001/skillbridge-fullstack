"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/user.service";
import { PageSpinner } from "@/components/common/Spinner";
import { StarRating } from "@/components/common/StarRating";
import { YEARS_OF_STUDY } from "@/lib/constants";
import {
  User,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  MapPin,
  GraduationCap,
  BookOpen,
  DollarSign,
  Clock,
  Award,
  Star,
} from "lucide-react";
import { formatCurrency, formatRating } from "@/lib/utils";
import type { UserProfileUpdatePayload } from "@/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50">
        <Icon className="h-4 w-4 text-indigo-600" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-sm text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    college: "",
    department: "",
    year_of_study: "",
    learning_interests: "",
    hourly_rate: "",
    teaching_subjects: "",
    experience_years: "",
    experience_description: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?returnUrl=/profile");
    }
  }, [authLoading, isAuthenticated, router]);

  // Populate form from user data
  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name ?? "",
        bio: user.bio ?? "",
        college: user.college ?? "",
        department: user.department ?? "",
        year_of_study: user.year_of_study ?? "",
        learning_interests: user.learning_interests ?? "",
        hourly_rate: user.tutor_profile?.hourly_rate?.toString() ?? "",
        teaching_subjects: user.tutor_profile?.teaching_subjects ?? "",
        experience_years: user.tutor_profile?.experience_years?.toString() ?? "",
        experience_description: user.tutor_profile?.experience_description ?? "",
      });
    }
  }, [user]);

  if (authLoading) return <PageSpinner />;
  if (!user) return null;

  const isTutor = user.role === "tutor";
  const tp = user.tutor_profile;

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
    };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: UserProfileUpdatePayload = {};
    if (form.full_name.trim()) payload.full_name = form.full_name.trim();
    if (form.bio.trim() !== (user.bio ?? "")) payload.bio = form.bio.trim() || undefined;
    if (form.college.trim() !== (user.college ?? "")) payload.college = form.college.trim() || undefined;
    if (form.department.trim() !== (user.department ?? "")) payload.department = form.department.trim() || undefined;
    if (form.year_of_study !== (user.year_of_study ?? "")) payload.year_of_study = form.year_of_study || undefined;
    if (form.learning_interests.trim() !== (user.learning_interests ?? ""))
      payload.learning_interests = form.learning_interests.trim() || undefined;

    if (isTutor) {
      if (form.hourly_rate) {
        const rate = parseFloat(form.hourly_rate);
        if (!isNaN(rate)) payload.hourly_rate = rate;
      }
      if (form.teaching_subjects.trim() !== (tp?.teaching_subjects ?? ""))
        payload.teaching_subjects = form.teaching_subjects.trim() || undefined;
      if (form.experience_description.trim() !== (tp?.experience_description ?? ""))
        payload.experience_description = form.experience_description.trim() || undefined;
      if (form.experience_years) {
        const yrs = parseInt(form.experience_years, 10);
        if (!isNaN(yrs)) payload.experience_years = yrs;
      }
    }

    setIsSaving(true);
    try {
      await userService.updateProfile(payload);
      await refreshUser();
      setEditing(false);
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setErrorMsg(null);
    // Reset form to current user data
    if (user) {
      setForm({
        full_name: user.full_name ?? "",
        bio: user.bio ?? "",
        college: user.college ?? "",
        department: user.department ?? "",
        year_of_study: user.year_of_study ?? "",
        learning_interests: user.learning_interests ?? "",
        hourly_rate: tp?.hourly_rate?.toString() ?? "",
        teaching_subjects: tp?.teaching_subjects ?? "",
        experience_years: tp?.experience_years?.toString() ?? "",
        experience_description: tp?.experience_description ?? "",
      });
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your SkillBridge account and preferences
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </button>
        )}
      </div>

      {/* Feedback banners */}
      {successMsg && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {editing ? (
        /* ── EDIT MODE ── */
        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  required
                  value={form.full_name}
                  onChange={set("full_name")}
                  className={inputClass}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={set("bio") as React.ChangeEventHandler<HTMLTextAreaElement>}
                  rows={3}
                  className={inputClass + " resize-none"}
                  placeholder="Tell others about yourself…"
                />
              </div>
            </div>
          </div>

          {/* Academic info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Academic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>College / University</label>
                <input
                  value={form.college}
                  onChange={set("college")}
                  className={inputClass}
                  placeholder="e.g. IIT Bombay, BITS Pilani, Delhi University"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Department / Branch</label>
                  <input
                    value={form.department}
                    onChange={set("department")}
                    className={inputClass}
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
                <div>
                  <label className={labelClass}>Year of Study</label>
                  <select value={form.year_of_study} onChange={set("year_of_study")} className={inputClass}>
                    <option value="">Select year</option>
                    {YEARS_OF_STUDY.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              {!isTutor && (
                <div>
                  <label className={labelClass}>Learning Interests</label>
                  <input
                    value={form.learning_interests}
                    onChange={set("learning_interests")}
                    className={inputClass}
                    placeholder="e.g. Calculus, Python, Organic Chemistry"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Tutor-specific */}
          {isTutor && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-indigo-900 border-b border-indigo-200 pb-3">
                Tutor Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Hourly Rate (₹ / hr)</label>
                    <input
                      type="number"
                      min="50"
                      max="50000"
                      step="10"
                      value={form.hourly_rate}
                      onChange={set("hourly_rate")}
                      className={inputClass}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={form.experience_years}
                      onChange={set("experience_years")}
                      className={inputClass}
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Teaching Subjects</label>
                  <input
                    value={form.teaching_subjects}
                    onChange={set("teaching_subjects")}
                    className={inputClass}
                    placeholder="e.g. Linear Algebra, Machine Learning"
                  />
                </div>
                <div>
                  <label className={labelClass}>Teaching Approach / Experience</label>
                  <textarea
                    value={form.experience_description}
                    onChange={set("experience_description") as React.ChangeEventHandler<HTMLTextAreaElement>}
                    rows={3}
                    className={inputClass + " resize-none"}
                    placeholder="Describe your tutoring approach and experience…"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* ── VIEW MODE ── */
        <div className="space-y-6">
          {/* Profile card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.full_name}
                    className="h-20 w-20 rounded-full object-cover border-4 border-indigo-100"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
                    {getInitials(user.full_name)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isTutor ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isTutor ? "Tutor" : "Learner"}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">{user.email}</p>
                {user.bio && (
                  <p className="text-sm text-gray-600 leading-relaxed">{user.bio}</p>
                )}
              </div>
            </div>

            {/* Stats for tutors */}
            {isTutor && tp && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xl font-bold text-indigo-700">
                    <Star className="h-5 w-5 text-amber-400" />
                    {formatRating(tp.average_rating)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Avg Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-700">{tp.total_reviews}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Reviews</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-700">{tp.total_sessions_completed}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-indigo-700">{formatCurrency(tp.hourly_rate)}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Hourly Rate</div>
                </div>
              </div>
            )}
          </div>

          {/* Academic info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3 mb-4">
              Academic Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={MapPin} label="College / University" value={user.college} />
              <InfoRow icon={GraduationCap} label="Department / Branch" value={user.department} />
              <InfoRow icon={User} label="Year of Study" value={user.year_of_study} />
              {!isTutor && (
                <InfoRow icon={BookOpen} label="Learning Interests" value={user.learning_interests} />
              )}
            </div>
            {!user.college && !user.department && !user.year_of_study && (
              <p className="text-sm text-gray-400 italic">
                No academic information added yet.{" "}
                <button onClick={() => setEditing(true)} className="text-indigo-600 not-italic hover:underline">
                  Edit your profile
                </button>{" "}
                to add details.
              </p>
            )}
          </div>

          {/* Tutor details */}
          {isTutor && tp && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-indigo-900 border-b border-indigo-200 pb-3 mb-4">
                Tutor Profile
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <InfoRow icon={DollarSign} label="Hourly Rate" value={formatCurrency(tp.hourly_rate)} />
                <InfoRow icon={Award} label="Experience" value={tp.experience_years ? `${tp.experience_years} year${tp.experience_years !== 1 ? "s" : ""}` : null} />
                <InfoRow icon={BookOpen} label="Teaching Subjects" value={tp.teaching_subjects} />
              </div>
              {tp.experience_description && (
                <div>
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">Teaching Approach</p>
                  <p className="text-sm text-indigo-700 leading-relaxed">{tp.experience_description}</p>
                </div>
              )}
              {tp.average_rating !== null && tp.average_rating !== undefined && (
                <div className="mt-4 flex items-center gap-2">
                  <StarRating rating={tp.average_rating} size="md" showValue />
                  <span className="text-sm text-indigo-600">
                    from {tp.total_reviews} review{tp.total_reviews !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
