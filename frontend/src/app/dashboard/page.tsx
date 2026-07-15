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
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#EDEDED] font-sans selection:bg-white/30">
      
      {/* Top Border / Progress Line */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[#A0A0A0] hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Overview
          </Link>
          <div className="h-4 w-px bg-white/20" />
          <h1 className="font-semibold text-white tracking-tight">Analytics Dashboard</h1>
        </div>
        <div className="flex gap-4">
          <Link href="/training">
            <button className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
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
          className="w-full max-w-6xl mx-auto space-y-8"
        >

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Avg. Passiveness Score", value: "3.2", icon: <Activity className="w-4 h-4" />, trend: "-15% (Improving)", positive: true },
              { label: "Total Apologies", value: "14", icon: <AlertCircle className="w-4 h-4" />, trend: "4 this week", positive: false },
              { label: "Hesitation Markers", value: "89", icon: <TrendingUp className="w-4 h-4" />, trend: "Mostly 'I guess'", positive: false }
            ].map((metric, idx) => (
              <motion.div key={idx} variants={itemVariants} className="bg-[#0A0A0A] border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors">
                <div className="flex justify-between items-center mb-4 text-[#A0A0A0]">
                  <div className="text-xs font-semibold uppercase tracking-wider">
                    {metric.label}
                  </div>
                  <div>{metric.icon}</div>
                </div>
                
                <div className="text-4xl font-semibold text-white mb-2 tracking-tight">
                  {metric.value}
                </div>
                <div className={`text-xs font-medium ${metric.positive ? 'text-green-500' : 'text-gray-400'}`}>
                  {metric.trend}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Chart Area */}
          <motion.div variants={itemVariants} className="bg-[#0A0A0A] border border-white/10 rounded-lg p-8">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-sm font-semibold text-white mb-1">Passiveness Score Over Time</h2>
                <p className="text-xs text-[#A0A0A0]">Lower score indicates more confident language usage.</p>
              </div>
            </div>
            
            <div className="h-[250px] flex items-end gap-2 sm:gap-4 pb-4 border-b border-white/10">
              {[8, 7, 9, 6, 5, 5, 4, 3, 2, 3, 1, 2].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-white text-black text-xs font-bold px-2 py-1 rounded transition-opacity pointer-events-none">
                    {val.toFixed(1)}
                  </div>
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: mounted ? `${val * 10}%` : 0 }}
                    transition={{ duration: 1, type: "spring", bounce: 0.2, delay: 0.1 + (i * 0.05) }}
                    className="w-full bg-white/20 group-hover:bg-white transition-colors rounded-t-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[#A0A0A0] text-xs font-medium">
              <span>Session 1</span>
              <span>Session 6</span>
              <span>Session 12 (Current)</span>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
