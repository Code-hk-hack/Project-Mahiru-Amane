"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import anime from "animejs";
import Link from "next/link";

export default function LandingPage() {
  const glowRef = useRef(null);
  
  useEffect(() => {
    if (glowRef.current) {
      anime({
        targets: glowRef.current,
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.6, 0.3],
        rotate: '1turn',
        duration: 20000,
        easing: 'linear',
        loop: true
      });
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '4rem 2rem'
    }}>
      {/* Background Animated Glow */}
      <div ref={glowRef} style={{
        position: 'absolute',
        top: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '70vw',
        height: '70vw',
        background: 'radial-gradient(circle, var(--primary-color) 0%, transparent 60%)',
        opacity: 0.1,
        filter: 'blur(100px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Navigation */}
      <motion.nav 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
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
          alignItems: 'center'
        }}
      >
        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: 'var(--primary-color)', marginRight: '2rem', fontSize: '1.2rem' }}>PROJECT MAHIRU</div>
        <Link href="/dashboard" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.3s' }}>Dashboard</Link>
        <Link href="/training" style={{ color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 600, transition: 'color 0.3s' }}>Start Training</Link>
      </motion.nav>

      {/* Hero Section */}
      <motion.main 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 1, ease: "easeOut" }}
        style={{
          marginTop: '8rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          zIndex: 10,
          maxWidth: '800px'
        }}
      >
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ 
            fontFamily: 'JetBrains Mono', 
            color: 'var(--secondary-color)', 
            letterSpacing: '4px',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            fontWeight: 700
          }}
        >
          No-Escapism Mandate Enabled
        </motion.div>
        
        <h1 style={{
          fontSize: '4.5rem',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: '2rem',
          textShadow: '0 0 20px rgba(255,255,255,0.2)'
        }}>
          Master Your Confidence with <span style={{ color: 'var(--primary-color)', textShadow: '0 0 30px rgba(189, 0, 255, 0.5)' }}>Real-Time AI.</span>
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: '3rem',
          maxWidth: '600px'
        }}>
          Stop apologizing. Stop hesitating. Project Mahiru uses a strict RAG pipeline grounded in real HR rubrics to physically stop you from using passive language during interviews.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/training" style={{ textDecoration: 'none' }}>
            <motion.button 
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(189, 0, 255, 0.6)' }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'linear-gradient(135deg, var(--primary-color), var(--tertiary-color))',
                color: 'white',
                border: 'none',
                padding: '1rem 3rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 0 15px rgba(189, 0, 255, 0.4)'
              }}
            >
              Start Training
            </motion.button>
          </Link>
          
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <motion.button 
              whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              style={{
                background: 'var(--surface-low)',
                color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)',
                padding: '1rem 3rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              View Analytics
            </motion.button>
          </Link>
        </div>
      </motion.main>

      {/* Features Grid */}
      <div style={{
        display: 'flex',
        gap: '2rem',
        marginTop: '8rem',
        zIndex: 10,
        maxWidth: '1200px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {[
          { title: "RAG Pipeline", desc: "Responses grounded in real-world HR guidelines (STAR Method).", color: "var(--primary-color)" },
          { title: "Instant Feedback", desc: "Live scoring on passiveness, hesitation, and unnecessary apologies.", color: "var(--secondary-color)" },
          { title: "Dynamic Emotion", desc: "Characters react dynamically to your confidence level and choices.", color: "var(--tertiary-color)" }
        ].map((feat, i) => (
          <motion.div 
            key={i}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 + (i * 0.2) }}
            whileHover={{ y: -10, borderColor: feat.color, boxShadow: `0 10px 30px ${feat.color}40` }}
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '2.5rem',
              width: '320px',
              textAlign: 'left',
              transition: 'all 0.3s'
            }}
          >
            <div style={{ 
              width: '45px', 
              height: '45px', 
              borderRadius: '10px', 
              background: `${feat.color}20`,
              border: `1px solid ${feat.color}`,
              marginBottom: '1.5rem'
            }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.8rem', fontFamily: 'JetBrains Mono', color: feat.color }}>{feat.title}</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{feat.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
