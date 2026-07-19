"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Registration successful! Please check your email for a confirmation link, or log in if auto-confirm is enabled.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-lowest)] text-[var(--text-primary)] relative overflow-hidden p-4">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary-color)] to-transparent opacity-30" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[var(--primary-color)] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[var(--secondary-color)] opacity-[0.03] rounded-full blur-3xl pointer-events-none" />

      <Link href="/" className="absolute top-8 left-8 text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors flex items-center gap-2 text-sm font-semibold z-10">
        <ArrowLeft className="w-4 h-4" />
        Return Home
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md bg-white border border-[var(--primary-color)]/20 rounded-3xl p-10 shadow-[0_20px_60px_rgba(212,175,55,0.05)] relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-[var(--surface-lowest)] border border-[var(--primary-color)]/30 shadow-sm">
             <Sparkles className="w-8 h-8 text-[var(--primary-color)]" />
          </div>
          <h1 className="text-3xl font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)] mb-2">
            {isLogin ? "Welcome Back" : "Join Aura AI"}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {isLogin ? "Sign in to access your analytics and history." : "Create an account to track your progress."}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2 ml-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--surface-lowest)] border border-[var(--primary-color)]/20 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] transition-all"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-2 ml-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[var(--surface-lowest)] border border-[var(--primary-color)]/20 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[var(--primary-color)] focus:ring-1 focus:ring-[var(--primary-color)] transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-[var(--primary-color)] text-white px-8 py-4 rounded-xl text-sm font-bold hover:bg-[#B5952F] hover:shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
