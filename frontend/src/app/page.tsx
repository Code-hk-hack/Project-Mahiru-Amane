"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Spotlight } from "@/components/ui/Spotlight";
import { HoverBorderGradient } from "@/components/ui/HoverBorderGradient";
import { ArrowRight, Activity, Zap, Brain } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-hidden bg-[#0d0d18] text-white">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="var(--primary-color)" />

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex gap-10 bg-white/5 px-12 py-5 rounded-full border border-white/10 backdrop-blur-xl z-10 shadow-2xl items-center mt-8 w-fit mx-auto"
      >
        <div className="font-[family-name:JetBrains_Mono] font-extrabold text-[var(--primary-color)] mr-8 text-xl tracking-wider">PROJECT MAHIRU</div>
        <Link href="/dashboard" className="text-white/80 hover:text-white font-semibold transition-colors">Dashboard</Link>
        <Link href="/training" className="text-[var(--secondary-color)] hover:text-cyan-300 font-semibold transition-colors">Start Training</Link>
      </motion.nav>

      {/* Hero Section */}
      <motion.main 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
        className="mt-32 flex flex-col items-center text-center z-10 max-w-4xl px-4"
      >
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="font-[family-name:JetBrains_Mono] text-[var(--secondary-color)] tracking-[4px] mb-4 uppercase font-bold text-sm bg-[var(--secondary-color)]/10 px-4 py-2 rounded-full border border-[var(--secondary-color)]/20"
        >
          No-Escapism Mandate Enabled
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-8 drop-shadow-2xl">
          Master Your Confidence with <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)]">Real-Time AI.</span>
        </h1>
        
        <p className="text-xl text-gray-400 leading-relaxed mb-12 max-w-2xl font-light">
          Stop apologizing. Stop hesitating. Project Mahiru uses a strict RAG pipeline grounded in real HR rubrics to physically stop you from using passive language during interviews.
        </p>

        <div className="flex gap-6">
          <Link href="/training">
            <HoverBorderGradient
              containerClassName="rounded-full"
              as="button"
              className="bg-black text-white flex items-center space-x-2 px-8 py-3 text-lg font-[family-name:JetBrains_Mono] font-bold uppercase tracking-wider"
            >
              <span>Start Training</span>
              <ArrowRight className="w-5 h-5" />
            </HoverBorderGradient>
          </Link>
          
          <Link href="/dashboard">
            <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 text-white font-bold font-[family-name:JetBrains_Mono] uppercase tracking-wider text-lg">
              View Analytics
            </button>
          </Link>
        </div>
      </motion.main>

      {/* Features Grid */}
      <div className="flex flex-wrap justify-center gap-8 mt-40 z-10 max-w-7xl px-8 pb-32">
        {[
          { title: "RAG Pipeline", desc: "Responses grounded in real-world HR guidelines (STAR Method).", color: "var(--primary-color)", icon: <Brain className="w-6 h-6 text-[#bd00ff]" /> },
          { title: "Instant Feedback", desc: "Live scoring on passiveness, hesitation, and unnecessary apologies.", color: "var(--secondary-color)", icon: <Activity className="w-6 h-6 text-[#00e0ff]" /> },
          { title: "Dynamic Emotion", desc: "Characters react dynamically to your confidence level and choices.", color: "var(--tertiary-color)", icon: <Zap className="w-6 h-6 text-[#ff007a]" /> }
        ].map((feat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 + (i * 0.2) }}
            whileHover={{ y: -10 }}
            className="group relative bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-2xl p-8 w-[350px] text-left transition-all duration-300 cursor-pointer"
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl" style={{ backgroundImage: `linear-gradient(to right, ${feat.color}, transparent)` }} />
            
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-black/50 border" style={{ borderColor: `${feat.color}40` }}>
              {feat.icon}
            </div>
            <h3 className="text-xl mb-3 font-[family-name:JetBrains_Mono] font-bold" style={{ color: feat.color }}>{feat.title}</h3>
            <p className="text-gray-400 leading-relaxed font-light">{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
