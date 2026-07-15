"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Meteors } from "@/components/ui/MeteorEffect";
import { Activity, TrendingUp, AlertCircle } from "lucide-react";

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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen flex flex-col p-8 md:p-16 relative overflow-hidden bg-[#0d0d18] text-white">
      {/* Meteor Background */}
      <div className="absolute inset-0 z-0">
        <Meteors number={30} />
      </div>

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex gap-10 bg-white/5 px-10 py-4 rounded-full border border-white/10 backdrop-blur-xl z-10 shadow-2xl items-center mb-16 w-fit mx-auto"
      >
        <div className="font-[family-name:JetBrains_Mono] font-extrabold text-[var(--primary-color)] mr-8 text-xl tracking-wider">PROJECT MAHIRU</div>
        <Link href="/" className="text-white/80 hover:text-white font-semibold transition-colors">Home</Link>
        <Link href="/training" className="text-[var(--secondary-color)] hover:text-cyan-300 font-semibold transition-colors">Start Training</Link>
      </motion.nav>

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="z-10 w-full max-w-6xl mx-auto"
      >
        <motion.h1 variants={itemVariants} className="text-4xl mb-12 font-[family-name:JetBrains_Mono] font-bold">
          Performance <span className="text-[var(--secondary-color)]">Analytics</span>
        </motion.h1>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { label: "Avg. Passiveness Score", value: "3.2", highlight: "var(--primary-color)", icon: <Activity />, trend: "-15% (Improving)" },
            { label: "Total Apologies", value: "14", highlight: "var(--secondary-color)", icon: <AlertCircle />, trend: "4 this week" },
            { label: "Hesitation Markers", value: "89", highlight: "var(--tertiary-color)", icon: <TrendingUp />, trend: "Mostly 'I guess'" }
          ].map((metric, idx) => (
            <motion.div key={idx} variants={itemVariants} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-2" style={{ background: metric.highlight }} />
              
              <div className="flex justify-between items-start mb-4">
                <div className="font-[family-name:JetBrains_Mono] text-sm text-gray-400 uppercase tracking-widest">
                  {metric.label}
                </div>
                <div className="text-gray-500">{metric.icon}</div>
              </div>
              
              <div className="text-6xl font-extrabold text-white mb-4">
                {metric.value}
              </div>
              <div className="font-bold text-sm" style={{ color: metric.highlight }}>
                {metric.trend}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Chart Area */}
        <motion.div variants={itemVariants} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 mb-16">
          <h2 className="font-[family-name:JetBrains_Mono] text-xl mb-10 text-gray-400">Passiveness Score Over Time</h2>
          
          <div className="h-[300px] flex items-end gap-4 pb-8 border-b border-white/10">
            {[8, 7, 9, 6, 5, 5, 4, 3, 2, 3, 1, 2].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: mounted ? `${val * 10}%` : 0 }}
                  transition={{ duration: 1.5, type: "spring", bounce: 0.4, delay: 0.5 + (i * 0.05) }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-[var(--primary-color)] to-[var(--secondary-color)] opacity-90 hover:opacity-100 transition-opacity cursor-pointer shadow-[0_0_20px_rgba(0,224,255,0.3)]"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 text-gray-400 font-[family-name:JetBrains_Mono] text-sm tracking-widest">
            <span>Session 1</span>
            <span>Session 6</span>
            <span>Session 12 (Current)</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
