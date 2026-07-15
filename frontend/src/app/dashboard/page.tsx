"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, TrendingUp, AlertCircle, ArrowLeft } from "lucide-react";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-lowest)] text-[var(--text-primary)] overflow-hidden selection:bg-[var(--primary-color)] selection:text-white">
      
      {/* Soft Top Gradient */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary-color)] to-transparent opacity-30" />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-[var(--primary-color)]/10 bg-white/50 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Return
          </Link>
          <div className="h-5 w-px bg-[var(--primary-color)]/20" />
          <h1 className="font-[family-name:var(--font-playfair)] font-bold text-xl tracking-wide text-[var(--text-primary)]">Progress Analytics</h1>
        </div>
        <div className="flex gap-4">
          <Link href="/training">
            <button className="bg-[var(--primary-color)] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#B5952F] hover:shadow-[0_4px_15px_rgba(212,175,55,0.3)] transition-all duration-300">
              New Session
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-8 md:p-12">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-6xl mx-auto space-y-10"
        >

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: "Avg. Passiveness Score", value: "3.2", icon: <Activity className="w-5 h-5" />, trend: "-15% (Improving)", positive: true },
              { label: "Total Apologies", value: "14", icon: <AlertCircle className="w-5 h-5" />, trend: "4 this week", positive: false },
              { label: "Hesitation Markers", value: "89", icon: <TrendingUp className="w-5 h-5" />, trend: "Mostly 'I guess'", positive: false }
            ].map((metric, idx) => (
              <motion.div key={idx} variants={itemVariants} className="bg-white border border-[var(--primary-color)]/10 rounded-3xl p-8 shadow-sm hover:shadow-[0_8px_30px_rgba(212,175,55,0.08)] hover:border-[var(--primary-color)]/30 transition-all duration-500">
                <div className="flex justify-between items-center mb-6 text-[var(--text-secondary)]">
                  <div className="text-xs font-bold uppercase tracking-widest text-[var(--primary-color)]">
                    {metric.label}
                  </div>
                  <div className="bg-[var(--surface-lowest)] p-2 rounded-full border border-[var(--primary-color)]/20 text-[var(--primary-color)]">{metric.icon}</div>
                </div>
                
                <div className="text-5xl font-bold font-[family-name:var(--font-playfair)] text-[var(--text-primary)] mb-3 tracking-tight">
                  {metric.value}
                </div>
                <div className={`text-sm font-semibold ${metric.positive ? 'text-[#8DB596]' : 'text-[#D98A94]'}`}>
                  {metric.trend}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Chart Area */}
          <motion.div variants={itemVariants} className="bg-white border border-[var(--primary-color)]/10 rounded-3xl p-10 shadow-sm relative overflow-hidden">
            {/* Subtle floral/angelic background watermark (optional) */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--primary-color)] opacity-5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex justify-between items-end mb-12 relative z-10">
              <div>
                <h2 className="text-2xl font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)] mb-2">Confidence Score Timeline</h2>
                <p className="text-sm text-[var(--text-secondary)]">A lower passiveness score reflects a stronger, clearer voice.</p>
              </div>
            </div>
            
            <div className="h-[280px] flex items-end gap-3 sm:gap-6 pb-6 border-b border-[var(--primary-color)]/20 relative z-10">
              {[8, 7, 9, 6, 5, 5, 4, 3, 2, 3, 1, 2].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[var(--text-primary)] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg transition-opacity pointer-events-none whitespace-nowrap">
                    Score: {val.toFixed(1)}
                  </div>
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: mounted ? `${val * 10}%` : 0 }}
                    transition={{ duration: 1.2, type: "spring", bounce: 0.3, delay: 0.2 + (i * 0.05) }}
                    className="w-full bg-[var(--primary-color)]/20 group-hover:bg-[var(--primary-color)] group-hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all duration-300 rounded-t-lg"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6 text-[var(--text-secondary)] text-xs font-bold tracking-wider uppercase relative z-10">
              <span>Session 1</span>
              <span>Session 6</span>
              <span className="text-[var(--primary-color)]">Session 12 (Current)</span>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
