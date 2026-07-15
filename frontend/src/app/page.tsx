"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Activity, Zap, Brain, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center relative bg-black text-[#EDEDED] font-sans selection:bg-white/30">
      
      {/* Top Border / Progress Line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex justify-between items-center w-full max-w-6xl px-6 py-8"
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-white rounded-sm" />
          <div className="font-bold text-white tracking-tight">Project Mahiru</div>
        </div>
        <div className="flex gap-6 text-sm font-medium text-[#A0A0A0]">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/training" className="hover:text-white transition-colors">Training</Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <motion.main 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
        className="mt-32 flex flex-col items-center text-center max-w-4xl px-6"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-[#A0A0A0] mb-8">
          <Shield className="w-3 h-3" />
          <span>Strict Evaluation Mode Active</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-white">
          Communicate with <br /> absolute clarity.
        </h1>
        
        <p className="text-lg md:text-xl text-[#A0A0A0] leading-relaxed mb-10 max-w-2xl">
          Project Mahiru enforces active language using a rigorous RAG pipeline grounded in professional evaluation rubrics. Eliminate hesitation.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/training" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
              Start Evaluation
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          
          <Link href="/dashboard" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-6 py-3 bg-transparent border border-white/20 hover:border-white/40 hover:bg-white/5 rounded-md transition-all text-sm font-medium text-white">
              View Analytics
            </button>
          </Link>
        </div>
      </motion.main>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-40 max-w-6xl px-6 pb-32 w-full">
        {[
          { title: "RAG Pipeline", desc: "Responses strictly grounded in professional communication guidelines.", icon: <Brain className="w-5 h-5 text-white" /> },
          { title: "Instant Feedback", desc: "Real-time metrics on hesitation and passive language usage.", icon: <Activity className="w-5 h-5 text-white" /> },
          { title: "Dynamic Agents", desc: "AI characters react directly to your measured confidence level.", icon: <Zap className="w-5 h-5 text-white" /> }
        ].map((feat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 + (i * 0.1) }}
            className="group relative border border-white/10 bg-[#0A0A0A] rounded-lg p-6 text-left hover:border-white/20 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-md flex items-center justify-center mb-4 bg-white/5 border border-white/10">
              {feat.icon}
            </div>
            <h3 className="text-base font-semibold text-white mb-2">{feat.title}</h3>
            <p className="text-sm text-[#A0A0A0] leading-relaxed">{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
