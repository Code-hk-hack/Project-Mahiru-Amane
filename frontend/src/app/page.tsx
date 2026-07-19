"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Feather, Heart, Sparkles, Star } from "lucide-react";
import { useEffect, useState } from "react";

// Continuous floating particles component
const FloatingDust = () => {
  const [particles, setParticles] = useState<Array<{ id: number; left: string; delay: string; duration: string; size: string }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${10 + Math.random() * 15}s`,
      size: `${Math.random() * 4 + 2}px`
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-0 bg-[var(--primary-color)] rounded-full blur-[1px]"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animation: `float ${p.duration} linear ${p.delay} infinite`,
            opacity: 0,
            boxShadow: `0 0 10px var(--primary-color)`
          }}
        />
      ))}
    </div>
  );
};

export default function LandingPage() {
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center relative bg-[var(--surface-lowest)] text-[var(--text-primary)] overflow-hidden selection:bg-[var(--primary-color)] selection:text-white">
      
      <FloatingDust />

      {/* Elegant Top Border */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[var(--primary-color)] to-transparent opacity-40" />

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex justify-between items-center w-full max-w-6xl px-8 py-8 z-10"
      >
        <motion.div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setIsLogoAnimating(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <img 
            src="/logo.png" 
            alt="Aura AI Logo" 
            className="w-8 h-8 rounded-md shadow-md" 
          />
          <div className="font-[family-name:var(--font-playfair)] font-bold text-xl tracking-wide">Aura AI</div>
        </motion.div>
        <div className="flex gap-8 text-[var(--text-secondary)] font-medium">
          <Link href="/dashboard" className="hover:text-[var(--primary-color)] transition-colors">Analytics</Link>
          <Link href="/training" className="hover:text-[var(--primary-color)] transition-colors">Start Session</Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.main 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.2, ease: "easeOut" }}
        className="mt-24 md:mt-32 flex flex-col items-center text-center max-w-4xl px-6 z-10"
      >

        <h1 className="text-5xl md:text-7xl font-[family-name:var(--font-playfair)] font-bold tracking-tight leading-[1.1] mb-8 text-[var(--text-primary)]">
          Find your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)]">confidence.</span><br />
          Speak with clarity.
        </h1>
        
        <p className="text-lg md:text-xl text-[var(--text-secondary)] leading-relaxed mb-12 max-w-2xl">
          Let Aura guide your words. Using strict evaluation rubrics wrapped in a warm, elegant interface, she will gently correct hesitation and passive language.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <Link href="/training" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[var(--primary-color)] text-white px-8 py-4 rounded-full text-[15px] font-bold hover:bg-[#B5952F] hover:shadow-[0_4px_20px_rgba(212,175,55,0.4)] transition-all duration-300 transform hover:-translate-y-1">
              Continue Active Session
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          
          <button 
            onClick={() => {
              localStorage.setItem('mahiru_session_id', crypto.randomUUID());
              localStorage.setItem('amane_session_id', crypto.randomUUID());
              window.location.href = '/training';
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white border border-[var(--primary-color)]/20 hover:border-[var(--primary-color)]/50 hover:bg-white/80 rounded-full transition-all duration-300 text-[15px] font-bold text-[var(--text-primary)] shadow-sm backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4 text-[var(--primary-color)]" />
            Start New Session
          </button>
        </div>

        <div className="mt-8">
          <Link href="/dashboard" className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] text-sm font-semibold transition-colors flex items-center gap-2">
            View Progress Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.main>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 max-w-6xl px-8 pb-32 w-full z-10">
        {[
          { title: "Gentle Correction", desc: "Responses strictly grounded in professional communication guidelines, delivered with grace.", icon: <Heart className="w-6 h-6 text-[var(--primary-color)]" /> },
          { title: "Live Feedback", desc: "Real-time metrics on hesitation and passive language usage, completely integrated.", icon: <Star className="w-6 h-6 text-[var(--primary-color)]" /> },
          { title: "Dynamic Empathy", desc: "AI characters react directly to your measured confidence level with soft visual cues.", icon: <Feather className="w-6 h-6 text-[var(--primary-color)]" /> }
        ].map((feat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 + (i * 0.2), duration: 0.8 }}
            className="group relative bg-white border border-[var(--primary-color)]/10 rounded-3xl p-8 text-center hover:border-[var(--primary-color)]/30 hover:shadow-[0_8px_30px_rgba(212,175,55,0.1)] transition-all duration-500"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6 bg-[var(--surface-lowest)] border border-[var(--primary-color)]/20 group-hover:scale-110 transition-transform duration-500">
              {feat.icon}
            </div>
            <h3 className="text-xl font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)] mb-3">{feat.title}</h3>
            <p className="text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isLogoAnimating && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-lowest)]/80 backdrop-blur-md cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setIsLogoAnimating(false)}
          >
            <motion.img 
              src="/logo.png" 
              alt="Aura AI Logo"
              className="w-[80vmin] h-[80vmin] max-w-[600px] max-h-[600px] rounded-[3rem]"
              initial={{ scale: 0.5, opacity: 0, filter: "brightness(0.5)" }}
              animate={{ 
                scale: [0.5, 1.1, 1], 
                opacity: 1, 
                filter: ["brightness(0.5)", "brightness(1.5)", "brightness(1)"],
                boxShadow: ["0px 0px 0px rgba(212,175,55,0)", "0px 0px 150px rgba(212,175,55,1)", "0px 0px 80px rgba(212,175,55,0.6)"]
              }}
              exit={{ scale: 1.5, opacity: 0, filter: "blur(20px)" }}
              transition={{ duration: 1.2, type: "spring", bounce: 0.5 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
