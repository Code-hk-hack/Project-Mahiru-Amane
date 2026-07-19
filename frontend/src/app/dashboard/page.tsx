"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, TrendingUp, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ passiveness: "0.0", apologies: 0, hesitations: 0 });
  const router = useRouter();
  
  useEffect(() => {
    setMounted(true);
    
    const fetchDashboardData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }

      try {
        // Fetch all sessions for this user
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id')
          .eq('user_id', session.user.id);
          
        if (!sessionsData || sessionsData.length === 0) {
          setLoading(false);
          return;
        }

        const sessionIds = sessionsData.map(s => s.id);

        // Fetch all messages for these sessions
        const { data: messagesData } = await supabase
          .from('messages')
          .select('passiveness_score, apology_count, hesitation_count')
          .in('session_id', sessionIds)
          .not('passiveness_score', 'is', null);

        if (messagesData && messagesData.length > 0) {
          let totalPass = 0;
          let totalApol = 0;
          let totalHes = 0;
          let validScores = 0;

          messagesData.forEach(m => {
            if (m.passiveness_score !== null) {
              totalPass += m.passiveness_score;
              validScores++;
            }
            totalApol += m.apology_count || 0;
            totalHes += m.hesitation_count || 0;
          });

          setMetrics({
            passiveness: validScores > 0 ? (totalPass / validScores).toFixed(1) : "0.0",
            apologies: totalApol,
            hesitations: totalHes
          });
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-lowest)] text-[var(--text-primary)] overflow-hidden selection:bg-[var(--primary-color)] selection:text-white">
      
      {/* Soft Top Gradient */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary-color)] to-transparent opacity-30" />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-[var(--primary-color)]/10 bg-white/50 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors flex items-center gap-2 text-sm font-semibold shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Return</span>
          </Link>
          <div className="h-5 w-px bg-[var(--primary-color)]/20 hidden sm:block" />
          <h1 className="font-[family-name:var(--font-playfair)] font-bold text-lg sm:text-xl tracking-wide text-[var(--text-primary)] truncate">Progress Analytics</h1>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link href="/training">
            <button className="bg-[var(--primary-color)] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold hover:bg-[#B5952F] hover:shadow-[0_4px_15px_rgba(212,175,55,0.3)] transition-all duration-300 min-h-[40px]">
              New Session
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-5 sm:p-8 md:p-12">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-6xl mx-auto space-y-10"
        >

          {/* Top Metric Cards */}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="w-8 h-8 text-[var(--primary-color)] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
              {[
                { label: "Avg. Passiveness Score", value: metrics.passiveness, icon: <Activity className="w-5 h-5" />, trend: "Lower is better", positive: parseFloat(metrics.passiveness) < 4.0 },
                { label: "Total Apologies", value: metrics.apologies.toString(), icon: <AlertCircle className="w-5 h-5" />, trend: "Across all sessions", positive: metrics.apologies < 5 },
                { label: "Hesitation Markers", value: metrics.hesitations.toString(), icon: <TrendingUp className="w-5 h-5" />, trend: "Tracked in real-time", positive: metrics.hesitations < 10 }
              ].map((metric, idx) => (
                <motion.div key={idx} variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }} className="bg-white border border-[var(--primary-color)]/10 rounded-3xl p-8 shadow-sm hover:shadow-[0_8px_30px_rgba(212,175,55,0.08)] hover:border-[var(--primary-color)]/30 transition-all duration-300">
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
          )}

          {/* Main Chart Area */}
          <motion.div variants={itemVariants} className="bg-white border border-[var(--primary-color)]/10 rounded-3xl p-5 sm:p-10 shadow-sm relative overflow-hidden">
            {/* Subtle floral/angelic background watermark (optional) */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--primary-color)] opacity-5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 sm:mb-12 relative z-10 gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)] mb-1 sm:mb-2">Confidence Score Timeline</h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">A lower passiveness score reflects a stronger, clearer voice.</p>
              </div>
            </div>
            
            <div className="h-[200px] sm:h-[280px] flex items-end gap-1.5 sm:gap-6 pb-6 border-b border-[var(--primary-color)]/20 relative z-10">
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
            <div className="flex justify-between mt-4 sm:mt-6 text-[var(--text-secondary)] text-[10px] sm:text-xs font-bold tracking-wider uppercase relative z-10">
              <span>S.1</span>
              <span className="hidden sm:block">Session 6</span>
              <span className="text-[var(--primary-color)]">Current</span>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
