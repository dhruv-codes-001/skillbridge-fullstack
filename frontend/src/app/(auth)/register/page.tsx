"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { YEARS_OF_STUDY } from "@/lib/constants";
import { AlertCircle, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import type { Role, UserRegisterPayload } from "@/types";

const SUBJECTS_OPTIONS = [
  "Computer Science", "Mathematics", "Chemistry", "Physics",
  "Biology", "Economics", "Statistics", "Engineering", "Literature",
  "History", "Psychology", "Sociology",
];

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<Role>(
    (searchParams.get("role") as Role) === "tutor" ? "tutor" : "learner"
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    college: "",
    department: "",
    year_of_study: "",
    bio: "",
    // learner
    learning_interests: "",
    // tutor
    hourly_rate: "",
    teaching_subjects: "",
    experience_years: "",
    experience_description: "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const payload: UserRegisterPayload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      password: form.password,
      role,
      ...(form.college ? { college: form.college.trim() } : {}),
      ...(form.department ? { department: form.department.trim() } : {}),
      ...(form.year_of_study ? { year_of_study: form.year_of_study } : {}),
      ...(form.bio ? { bio: form.bio.trim() } : {}),
    };

    if (role === "learner") {
      if (form.learning_interests) {
        payload.learning_interests = form.learning_interests.trim();
      }
    } else {
      if (!form.hourly_rate) {
        setError("Hourly rate is required for tutors.");
        return;
      }
      const rate = parseFloat(form.hourly_rate);
      if (isNaN(rate) || rate < 50 || rate > 50000) {
        setError("Hourly rate must be between ₹50 and ₹50,000.");
        return;
      }
      payload.hourly_rate = rate;
      if (form.teaching_subjects) {
        payload.teaching_subjects = form.teaching_subjects.trim();
      }
      if (form.experience_years) {
        const yrs = parseInt(form.experience_years, 10);
        if (!isNaN(yrs)) payload.experience_years = yrs;
      }
      if (form.experience_description) {
        payload.experience_description = form.experience_description.trim();
      }
    }

    setIsLoading(true);
    try {
      await register(payload);
      router.push("/marketplace");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">Join the SkillBridge community</p>
      </div>

      {/* Role Toggle */}
      <div className="mb-6 flex rounded-xl border border-gray-200 p-1 bg-gray-50 gap-1">
        <button
          type="button"
          onClick={() => setRole("learner")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
            role === "learner"
              ? "bg-white text-indigo-700 shadow-sm border border-indigo-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          I want to learn
        </button>
        <button
          type="button"
          onClick={() => setRole("tutor")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-all ${
            role === "tutor"
              ? "bg-white text-indigo-700 shadow-sm border border-indigo-200"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          I want to tutor
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Core fields */}
        <div>
          <label className={labelClass}>Full Name *</label>
          <input required value={form.full_name} onChange={set("full_name")} placeholder="Jane Doe" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email Address *</label>
          <input type="email" required value={form.email} onChange={set("email")} placeholder="jane@university.edu" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Password *</label>
          <input type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="Min. 8 characters" className={inputClass} />
        </div>

        {/* Academic info */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Academic Info (optional)</p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>College / University</label>
              <input value={form.college} onChange={set("college")} placeholder="e.g. IIT Delhi, BITS Pilani, Delhi University" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Department / Branch</label>
                <input value={form.department} onChange={set("department")} placeholder="e.g. Computer Science & Engineering" className={inputClass} />
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
            <div>
              <label className={labelClass}>Bio</label>
              <textarea value={form.bio} onChange={set("bio") as React.ChangeEventHandler<HTMLTextAreaElement>} placeholder="Tell others a bit about yourself…" rows={2} className={inputClass + " resize-none"} />
            </div>
          </div>
        </div>

        {/* Role-specific */}
        {role === "learner" ? (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Learning Preferences</p>
            <div>
              <label className={labelClass}>Subjects you want to learn</label>
              <input value={form.learning_interests} onChange={set("learning_interests")} placeholder="e.g. Calculus, Python, Organic Chemistry" className={inputClass} />
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Tutor Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Hourly Rate (₹ / hr) *</label>
                <input type="number" min="50" max="50000" step="10" required value={form.hourly_rate} onChange={set("hourly_rate")} placeholder="e.g. 500" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Years of Experience</label>
                <input type="number" min="0" max="20" value={form.experience_years} onChange={set("experience_years")} placeholder="e.g. 2" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Subjects You Teach</label>
              <input value={form.teaching_subjects} onChange={set("teaching_subjects")} placeholder="e.g. Linear Algebra, Machine Learning" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Teaching Experience</label>
              <textarea value={form.experience_description} onChange={set("experience_description") as React.ChangeEventHandler<HTMLTextAreaElement>} placeholder="Describe your tutoring experience, approach, or achievements…" rows={3} className={inputClass + " resize-none"} />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors mt-2"
        >
          {isLoading ? "Creating account…" : `Create ${role === "tutor" ? "Tutor" : "Learner"} Account`}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
