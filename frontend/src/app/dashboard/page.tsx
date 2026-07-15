"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 4rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, var(--secondary-color) 0%, transparent 70%)',
        opacity: 0.05,
        filter: 'blur(80px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          display: 'flex',
          gap: '2.5rem',
          background: 'var(--glass-bg)',
          padding: '1.2rem 3rem',
          borderRadius: '100px',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'var(--glass-blur)',
          zIndex: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          alignItems: 'center',
          marginBottom: '3rem',
          width: 'fit-content',
          margin: '0 auto 3rem auto'
        }}
      >
        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: 'var(--primary-color)', marginRight: '2rem', fontSize: '1.2rem' }}>PROJECT MAHIRU</div>
        <Link href="/" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>Home</Link>
        <Link href="/training" style={{ color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 600 }}>Start Training</Link>
      </motion.nav>

      {/* Main Content */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ zIndex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%' }}
      >
        <motion.h1 variants={itemVariants} style={{ fontSize: '2.5rem', marginBottom: '2rem', fontFamily: 'JetBrains Mono' }}>
          Performance <span style={{ color: 'var(--secondary-color)' }}>Analytics</span>
        </motion.h1>

        {/* Top Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '3rem' }}>
          {[
            { label: "Avg. Passiveness Score", value: "3.2", highlight: "var(--primary-color)", trend: "-15% (Improving)" },
            { label: "Total Apologies", value: "14", highlight: "var(--secondary-color)", trend: "4 this week" },
            { label: "Hesitation Markers", value: "89", highlight: "var(--tertiary-color)", trend: "Mostly 'I guess'" }
          ].map((metric, idx) => (
            <motion.div key={idx} variants={itemVariants} style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: `0 10px 30px ${metric.highlight}20`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: metric.highlight }} />
              <div style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontSize: '0.9rem', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                {metric.label}
              </div>
              <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                {metric.value}
              </div>
              <div style={{ color: metric.highlight, fontWeight: 600, fontSize: '0.9rem' }}>
                {metric.trend}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Chart Area (Mockup) */}
        <motion.div variants={itemVariants} style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '3rem'
        }}>
          <h2 style={{ fontFamily: 'JetBrains Mono', fontSize: '1.2rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>Passiveness Score Over Time</h2>
          
          <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '10px', paddingBottom: '20px', borderBottom: '1px solid var(--glass-border)' }}>
            {[8, 7, 9, 6, 5, 5, 4, 3, 2, 3, 1, 2].map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: mounted ? `${val * 10}%` : 0 }}
                  transition={{ duration: 1, delay: 0.5 + (i * 0.05) }}
                  style={{
                    width: '100%',
                    background: `linear-gradient(to top, var(--primary-color), var(--secondary-color))`,
                    borderRadius: '4px 4px 0 0',
                    opacity: 0.8,
                    boxShadow: '0 0 10px rgba(0, 224, 255, 0.4)'
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
            <span>Session 1</span>
            <span>Session 6</span>
            <span>Session 12 (Current)</span>
          </div>
        </motion.div>

        {/* Recent Sessions Table */}
        <motion.div variants={itemVariants} style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '2rem'
        }}>
          <h2 style={{ fontFamily: 'JetBrains Mono', fontSize: '1.2rem', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Recent Training Sessions</h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
                <th style={{ padding: '1rem 0' }}>Date</th>
                <th style={{ padding: '1rem 0' }}>Agent</th>
                <th style={{ padding: '1rem 0' }}>Duration</th>
                <th style={{ padding: '1rem 0' }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {[
                { date: "Oct 24", agent: "Mahiru", dur: "15m", res: "Mastered", color: "var(--secondary-color)" },
                { date: "Oct 22", agent: "Amane", dur: "45m", res: "Improving", color: "var(--primary-color)" },
                { date: "Oct 20", agent: "Mahiru", dur: "12m", res: "Review Needed", color: "var(--tertiary-color)" },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1.2rem 0', fontWeight: 600 }}>{row.date}</td>
                  <td style={{ padding: '1.2rem 0', fontFamily: 'JetBrains Mono', color: row.color }}>{row.agent}</td>
                  <td style={{ padding: '1.2rem 0', color: 'var(--text-secondary)' }}>{row.dur}</td>
                  <td style={{ padding: '1.2rem 0' }}>
                    <span style={{ 
                      background: `${row.color}20`, 
                      color: row.color, 
                      padding: '0.4rem 1rem', 
                      borderRadius: '100px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      border: `1px solid ${row.color}50`
                    }}>
                      {row.res}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

      </motion.div>
    </div>
  );
}
