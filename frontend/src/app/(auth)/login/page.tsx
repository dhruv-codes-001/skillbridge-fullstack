"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setIsLoading(true);
    try {
      await login({ email: email.trim(), password });
      router.push("/marketplace");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setError(null);
    setDemoLoading(demoEmail);
    try {
      await login({ email: demoEmail, password: demoPassword });
      router.push("/marketplace");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to your SkillBridge account
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading || !email.trim() || !password}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
          Create one
        </Link>
      </div>

      {/* Demo Accounts */}
      <div className="mt-7">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-gray-400">
            <span className="bg-white px-3">Quick Demo Login</span>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => handleDemoLogin(acc.email, acc.password)}
              disabled={demoLoading !== null}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left hover:bg-indigo-50 hover:border-indigo-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${
                        acc.role === "tutor"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {acc.role}
                    </span>
                    <span className="text-xs font-medium text-gray-800 truncate">
                      {acc.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 truncate">{acc.description}</p>
                </div>
                {demoLoading === acc.email && (
                  <div className="h-3 w-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          All demo accounts use password:{" "}
          <code className="rounded bg-gray-100 px-1 font-mono">password123</code>
        </p>
      </div>
    </div>
  );
}
