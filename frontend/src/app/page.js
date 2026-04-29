"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ═══════════════════════════════════════
   AUTH GUARD — redirect to /login if no token
   ═══════════════════════════════════════ */
function useAuthGuard() {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
    } else {
      setChecked(true);
    }
  }, []);
  return checked;
}

/* ═══════════════════════════════════════
   SCROLL-REVEAL COMPONENT
   ═══════════════════════════════════════ */
function Reveal({ children, className = "", delay = 0, scale = false }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const cls = scale ? "reveal--scale" : "reveal";
  return (
    <div
      ref={ref}
      className={`${cls} ${visible ? "in-view" : ""} ${className}`}
      data-delay={delay}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════ */
function Counter({ to, suffix = "", duration = 1800 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

/* ═══════════════════════════════════════
   THREAT PARAMETERS DATA
   ═══════════════════════════════════════ */
const THREAT_PARAMS = [
  { name: "Identity Verification", desc: "Cross-checks recruiter identity against known databases and social profiles." },
  { name: "Company Registry Check", desc: "Verifies if the hiring company is registered with MCA/ROC." },
  { name: "Domain Age Analysis", desc: "Flags domains registered recently — a hallmark of phishing operations." },
  { name: "Financial Red Flags", desc: "Detects requests for upfront payments, processing fees, or bank details." },
  { name: "Pressure Tactics", desc: "Identifies urgency language designed to rush candidates into decisions." },
  { name: "Unrealistic Promises", desc: "Catches exaggerated salary claims and guaranteed placement offers." },
  { name: "Contact Method Audit", desc: "Flags usage of personal WhatsApp, Telegram, or non-corporate emails." },
  { name: "Language Manipulation", desc: "Detects emotional manipulation and deceptive language patterns." },
  { name: "Salary Benchmark", desc: "Compares offered salary against industry standards for the role." },
  { name: "Ghost Company Detection", desc: "Identifies shell companies with no verifiable online presence." },
  { name: "Emoji & Formatting", desc: "Excessive emojis and poor formatting correlate with scam listings." },
  { name: "Job Description Length", desc: "Unusually short or vague descriptions signal low-effort scam posts." },
  { name: "Skill Requirements", desc: "Missing or nonsensical requirements indicate fake postings." },
  { name: "Application Channel", desc: "Flags routing to external forms, Google Docs, or personal links." },
  { name: "Document Requests", desc: "Pre-interview requests for Aadhaar, PAN, or other ID documents." },
  { name: "Upfront Payment", desc: "Any request for money before employment is a critical red flag." },
  { name: "Guaranteed Selection", desc: "No legitimate employer guarantees selection before interviews." },
  { name: "Social Proof Check", desc: "Validates employee reviews and company ratings across platforms." },
  { name: "Location Verification", desc: "Confirms the listed office address exists and matches company records." },
  { name: "Historical Patterns", desc: "Matches listing against known scam templates and repeat offenders." },
];

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
export default function Home() {
  /* ─── Auth Guard ─── */
  const authReady = useAuthGuard();

  /* ─── State ─── */
  const [entered, setEntered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const [activeLocation, setActiveLocation] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [stats, setStats] = useState({ total: 0, safe: 0, caution: 0, risky: 0 });
  const [loading, setLoading] = useState(false);

  const [dialIndex, setDialIndex] = useState(0);
  const [dialProgress, setDialProgress] = useState(0);
  const [dialRotation, setDialRotation] = useState(0);
  const [navDark, setNavDark] = useState(false);
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' or 'internships'
  const [searchQuery, setSearchQuery] = useState('');

  /* ─── CV Builder State ─── */
  const [cvModalOpen, setCvModalOpen] = useState(false);
  const [cvStep, setCvStep] = useState(1); // 1=form, 2=generating, 3=preview
  const [cvData, setCvData] = useState(null);
  const [cvGenerating, setCvGenerating] = useState(false);
  const [cvError, setCvError] = useState('');
  const [cvProfile, setCvProfile] = useState({
    name: '', email: '', phone: '', summary: '',
    skills: '', existingCV: '',
    experience: [{ title: '', company: '', duration: '', description: '' }],
    education: [{ degree: '', institution: '', year: '' }]
  });

  /* ─── PDF Upload State ─── */
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);

  const dialRef = useRef(null);
  const introRef = useRef(null);

  /* ─── API Fetches ─── */
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 100;

  useEffect(() => {
    fetch(`${API}/api/roles`).then(r => r.json()).then(setRoles).catch(() => { });
    fetch(`${API}/api/locations`).then(r => r.json()).then(setLocations).catch(() => { });
    fetch(`${API}/api/stats`).then(r => r.json()).then(setStats).catch(() => { });
  }, []);

  // Pre-fetch jobs immediately and on filter changes
  const fetchJobs = useCallback((reset = true) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeRole) params.set('role', activeRole);
    if (activeLocation) params.set('location', activeLocation);
    params.set('limit', String(PAGE_SIZE));
    const currentOffset = reset ? 0 : jobs.length;
    params.set('offset', String(currentOffset));
    fetch(`${API}/api/jobs?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        const newJobs = reset ? data : [...jobs, ...data];
        setJobs(newJobs);
        setHasMore(data.length === PAGE_SIZE);
        if (reset) setSelectedJob(data[0] || null);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [activeRole, activeLocation, jobs]);

  // Fetch on mount + when filters change
  useEffect(() => {
    fetchJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole, activeLocation]);



  /* ─── Dial scroll listener (scroll-driven rotation) ─── */
  useEffect(() => {
    const onScroll = () => {
      const dialEl = dialRef.current;
      if (!dialEl) return;
      const rect = dialEl.getBoundingClientRect();
      const totalScroll = dialEl.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScroll));
      setDialProgress(progress);

      // Full 360° rotation mapped to scroll
      setDialRotation(progress * 360);

      const idx = Math.min(
        THREAT_PARAMS.length - 1,
        Math.floor(progress * THREAT_PARAMS.length)
      );
      setDialIndex(idx);

      // Nav color logic — dark when on coral sections
      const introEl = introRef.current;
      if (introEl) {
        const introRect = introEl.getBoundingClientRect();
        setNavDark(introRect.bottom > 60);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ─── Helper fns ─── */
  const si = (score) => {
    if (!score) return { cls: "", label: "N/A", color: "#6b6b6b" };
    const s = score.final_score;
    if (s >= 61) return { cls: "crit", label: "HIGH RISK", color: "#ef4444" };
    if (s >= 31) return { cls: "warn", label: "CAUTION", color: "#f59e0b" };
    return { cls: "safe", label: "LOW RISK", color: "#10b981" };
  };

  const verd = (score) => {
    if (!score) return null;
    const s = score.final_score;
    if (s >= 61) return { icon: "🚫", t: "AVOID", d: "Critical threat signals detected. Matches known scam patterns.", c: "text-red-400", bg: "verdict-crit" };
    if (s >= 31) return { icon: "⚠️", t: "CAUTION", d: "Some warning signals. Verify company independently.", c: "text-amber-400", bg: "verdict-warn" };
    return { icon: "✅", t: "LOOKS SAFE", d: "No major threats. Appears from a verified entity.", c: "text-emerald-400", bg: "verdict-safe" };
  };

  /* ─── Dial calculations ─── */
  const dialRadius = 220;
  const dialCenterX = 280;
  const dialCenterY = 280;

  const getDialPos = (index, total) => {
    // Evenly distribute items around the full circle
    const angle = ((2 * Math.PI) / total) * index - Math.PI / 2; // start from top
    return {
      x: dialCenterX + dialRadius * Math.cos(angle),
      y: dialCenterY + dialRadius * Math.sin(angle),
      angle,
    };
  };

  const handleEnter = () => {
    setEntered(true);
    setTimeout(() => {
      window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    }, 600);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  /* ─── CV Builder Functions ─── */
  // Load saved profile from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cv_profile');
      if (saved) setCvProfile(JSON.parse(saved));
    } catch { }
  }, []);

  const openCvModal = () => {
    setCvModalOpen(true);
    setCvStep(1);
    setCvData(null);
    setCvError('');
  };

  const closeCvModal = () => {
    setCvModalOpen(false);
    setCvStep(1);
    setCvError('');
  };

  const updateProfile = (field, value) => {
    setCvProfile(prev => ({ ...prev, [field]: value }));
  };

  const addExperience = () => {
    setCvProfile(prev => ({
      ...prev,
      experience: [...prev.experience, { title: '', company: '', duration: '', description: '' }]
    }));
  };

  const updateExperience = (index, field, value) => {
    setCvProfile(prev => {
      const exp = [...prev.experience];
      exp[index] = { ...exp[index], [field]: value };
      return { ...prev, experience: exp };
    });
  };

  const removeExperience = (index) => {
    setCvProfile(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setCvProfile(prev => ({
      ...prev,
      education: [...prev.education, { degree: '', institution: '', year: '' }]
    }));
  };

  const updateEducation = (index, field, value) => {
    setCvProfile(prev => {
      const edu = [...prev.education];
      edu[index] = { ...edu[index], [field]: value };
      return { ...prev, education: edu };
    });
  };

  const removeEducation = (index) => {
    setCvProfile(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setPdfUploading(true);
    setCvError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/api/cv/parse-pdf`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'PDF parsing failed');
      }
      const data = await res.json();
      updateProfile('existingCV', data.text);
    } catch (err) {
      setCvError(err.message || 'Failed to parse PDF');
    } finally {
      setPdfUploading(false);
      // Reset input so re-selecting the same file works
      e.target.value = '';
    }
  };

  const generateCV = async () => {
    if (!cvProfile.name.trim()) { setCvError('Name is required'); return; }
    if (!cvProfile.email.trim()) { setCvError('Email is required'); return; }
    if (!cvProfile.skills.trim() && !cvProfile.existingCV.trim()) { setCvError('Please add skills or paste your existing CV'); return; }

    // Save profile to localStorage
    localStorage.setItem('cv_profile', JSON.stringify(cvProfile));

    setCvError('');
    setCvStep(2);
    setCvGenerating(true);

    try {
      const res = await fetch(`${API}/api/cv/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: selectedJob.id,
          user_profile: cvProfile
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Generation failed');
      }
      const data = await res.json();
      setCvData(data.cv);
      setCvStep(3);
    } catch (e) {
      setCvError(e.message || 'Something went wrong');
      setCvStep(1);
    } finally {
      setCvGenerating(false);
    }
  };

  const printCV = () => {
    window.print();
  };

  /* ─── Loading state while auth is checking ─── */
  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ fontSize: '1.1rem', opacity: 0.6 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* ═══════════ NAVIGATION ═══════════ */}
      <nav className={`nav ${navDark && !entered ? "on-dark" : ""}`}>
        <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          SHIELDDB<span className="nav-logo-sub">SAFE</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="nav-logout-btn"
            onClick={handleLogout}
            title="Log out"
          >
            Logout
          </button>
          <button
            className={`nav-burger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Full-screen menu overlay */}
      <div className={`nav-overlay ${menuOpen ? "open" : ""}`}>
        <a href="#hook" onClick={() => setMenuOpen(false)}>The Problem</a>
        <a href="#dial" onClick={() => setMenuOpen(false)}>Threat Engine</a>
        <a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a>
        <a href="#stats" onClick={() => setMenuOpen(false)}>Live Stats</a>
        <a href="#tool" onClick={() => setMenuOpen(false)}>Search Jobs</a>
      </div>

      {/* ═══════════ INTRO HERO ═══════════ */}
      <section
        ref={introRef}
        className={`intro ${entered ? "zoomed" : ""}`}
        id="intro"
      >
        {/* Geometric circle */}
        <div className="intro-circle" />
        <div className="intro-dot" />

        <div className="intro-title">
          <span className="intro-title-main">SHIELD</span>
          <span className="intro-title-sub">DB</span>
        </div>

        <button className="intro-cta" onClick={handleEnter}>
          Enter the experience
        </button>
      </section>

      {/* ═══════════ SCENE 2: THE HOOK ═══════════ */}
      <section className="section section--cream section--full" id="hook">
        <div className="section-inner">
          <div className="hook">
            <Reveal>
              <p className="label-sm label-sm--coral">The Problem</p>
            </Reveal>
            <Reveal delay={1}>
              <h2 className="heading-mega">
                Job scams cost Indians<br />
                <span className="accent">₹<Counter to={1000} suffix=" Cr+" /></span> every year
              </h2>
            </Reveal>
            <Reveal delay={2}>
              <p className="text-body" style={{ textAlign: "center", margin: "0 auto" }}>
                Every 14 seconds, someone falls victim. Fake recruiters exploit
                trust with sophisticated tactics that slip past traditional filters.
              </p>
            </Reveal>

            <div className="problem-row">
              <Reveal delay={2}>
                <div className="problem-card">
                  <div className="problem-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </div>
                  <h3 className="problem-stat"><Counter to={73} suffix="%" /></h3>
                  <p className="problem-desc">of scam listings use<br /><strong>fake email domains</strong></p>
                </div>
              </Reveal>
              <Reveal delay={3}>
                <div className="problem-card">
                  <div className="problem-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></svg>
                  </div>
                  <h3 className="problem-stat"><Counter to={45} suffix="%" /></h3>
                  <p className="problem-desc">demand <strong>upfront fees</strong><br />for &quot;processing&quot;</p>
                </div>
              </Reveal>
              <Reveal delay={4}>
                <div className="problem-card">
                  <div className="problem-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" /><circle cx="12" cy="8" r="2" /><path d="M15 13a3 3 0 0 0-6 0" /></svg>
                  </div>
                  <h3 className="problem-stat"><Counter to={62} suffix="%" /></h3>
                  <p className="problem-desc">request <strong>Aadhaar/PAN</strong><br />before any interview</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>

        {/* Geo decoration removed */}
      </section>

      {/* ═══════════ SCENE 3: ROTATING DIAL ═══════════ */}
      <div className="dial-container" id="dial" ref={dialRef}>
        <div className="dial-sticky">
          {/* Left side label */}
          <div className="dial-label">THREAT ENGINE</div>

          {/* Scroll progress bar */}
          <div className="dial-progress">
            <div className="dial-progress-fill" style={{ height: `${dialProgress * 100}%` }} />
          </div>
          <div className="dial-progress-count">
            {String(dialIndex + 1).padStart(2, "0")}
            <span className="dial-progress-total">/{THREAT_PARAMS.length}</span>
          </div>

          {/* Rotating SVG container */}
          <div className="dial-arcs">
            {/* The entire wheel rotates on scroll */}
            <div
              className="dial-wheel"
              style={{ transform: `rotate(${dialRotation}deg)` }}
            >
              <svg viewBox="0 0 560 560" xmlns="http://www.w3.org/2000/svg">
                {/* Outer circle */}
                <circle cx="280" cy="280" r="220" className="dial-arc-circle" />
                {/* Inner circle */}
                <circle cx="280" cy="280" r="150" className="dial-arc-circle" />
                {/* Inner-inner circle */}
                <circle cx="280" cy="280" r="80" className="dial-arc-circle" />
                {/* Cross lines */}
                <line x1="0" y1="280" x2="560" y2="280" className="dial-arc-line" />
                <line x1="280" y1="0" x2="280" y2="560" className="dial-arc-line" />
                {/* Diagonal lines */}
                <line x1="60" y1="60" x2="500" y2="500" className="dial-arc-line" />
                <line x1="500" y1="60" x2="60" y2="500" className="dial-arc-line" />
                {/* Extra diagonals for denser look */}
                <line x1="140" y1="0" x2="420" y2="560" className="dial-arc-line" />
                <line x1="420" y1="0" x2="140" y2="560" className="dial-arc-line" />
              </svg>
            </div>

            {/* Text labels orbiting the circle (rotate independently) */}
            {THREAT_PARAMS.map((param, i) => {
              const pos = getDialPos(i, THREAT_PARAMS.length);
              const isActive = dialIndex === i;
              // Compute shortest distance around the circular array of length 20
              let distance = Math.abs(dialIndex - i);
              if (distance > THREAT_PARAMS.length / 2) {
                distance = THREAT_PARAMS.length - distance;
              }
              const opacity = isActive ? 1 : distance <= 3 ? 0.6 : 0.35;
              return (
                <div
                  key={i}
                  className={`dial-orbit-item ${isActive ? "active" : ""}`}
                  style={{
                    left: `${((pos.x / 560) * 100).toFixed(4)}%`,
                    top: `${((pos.y / 560) * 100).toFixed(4)}%`,
                    opacity,
                  }}
                >
                  <span className="dial-orbit-num">{String(i + 1).padStart(2, "0")}</span>
                  {isActive && <span className="dial-orbit-name">{param.name}</span>}
                </div>
              );
            })}

            {/* Glowing active dot */}
            {(() => {
              const pos = getDialPos(dialIndex, THREAT_PARAMS.length);
              return (
                <div
                  className="dial-dot"
                  style={{
                    left: `${((pos.x / 560) * 100).toFixed(4)}%`,
                    top: `${((pos.y / 560) * 100).toFixed(4)}%`,
                  }}
                />
              );
            })()}
          </div>

          {/* Right side content — cross-fade */}
          <div className="dial-content">
            <div className="dial-content-num">
              {String(dialIndex + 1).padStart(2, "0")}
            </div>
            <div className="dial-content-anim" key={dialIndex}>
              <h3 className="dial-content-title">
                {THREAT_PARAMS[dialIndex].name}
              </h3>
              <p className="dial-content-desc">
                {THREAT_PARAMS[dialIndex].desc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ SCENE 4: HOW IT WORKS ═══════════ */}
      <section className="section section--cream section--full" id="how">
        <div className="section-inner">
          <div className="steps-section">
            <Reveal>
              <p className="label-sm label-sm--coral" style={{ textAlign: "center" }}>How It Works</p>
              <h2 className="heading-lg" style={{ textAlign: "center" }}>
                Three steps. Zero guesswork.
              </h2>
            </Reveal>

            <div className="steps-grid">
              <Reveal delay={1}>
                <div className="step-card">
                  <div className="step-num">01</div>
                  <h3 className="step-title">Extract</h3>
                  <p className="step-desc">We use our secure browser extension to seamlessly aggregate listings directly from Naukri.</p>
                </div>
              </Reveal>
              <Reveal delay={2}>
                <div className="step-card">
                  <div className="step-num">02</div>
                  <h3 className="step-title">Score</h3>
                  <p className="step-desc">Each listing is scored against 20 heuristic parameters — from domain age to pressure language.</p>
                </div>
              </Reveal>
              <Reveal delay={3}>
                <div className="step-card">
                  <div className="step-num">03</div>
                  <h3 className="step-title">Shield</h3>
                  <p className="step-desc">You see only verified results. Scams are flagged, warnings are explained, safe jobs are highlighted.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SCENE 5: STATS (CORAL) ═══════════ */}
      <section className="section section--coral section--full" id="stats">
        <div className="section-inner">
          <div className="stats-section">
            <Reveal>
              <p className="label-sm label-sm--light" style={{ textAlign: "center" }}>Live Database</p>
              <h2 className="heading-mega heading-mega--light" style={{ textAlign: "center" }}>
                Already protecting<br />job seekers.
              </h2>
            </Reveal>

            <div className="stats-row">
              <Reveal delay={1}>
                <div className="big-stat">
                  <span className="big-stat-num"><Counter to={stats.total} /></span>
                  <span className="big-stat-label">Jobs Scanned</span>
                </div>
              </Reveal>
              <Reveal delay={2}>
                <div className="big-stat">
                  <span className="big-stat-num stat-safe"><Counter to={stats.safe} /></span>
                  <span className="big-stat-label">Verified Safe</span>
                </div>
              </Reveal>
              <Reveal delay={3}>
                <div className="big-stat">
                  <span className="big-stat-num" style={{ color: "#f59e0b" }}><Counter to={stats.caution || 0} /></span>
                  <span className="big-stat-label">Caution (Verify)</span>
                </div>
              </Reveal>
              <Reveal delay={4}>
                <div className="big-stat">
                  <span className="big-stat-num stat-danger"><Counter to={stats.risky} /></span>
                  <span className="big-stat-label">Flagged Risky</span>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="section section--coral section--full">
        <div className="cta-section">
          <Reveal>
            <p className="label-sm label-sm--light" style={{ textAlign: "center" }}>Protect Yourself</p>
            <h2 className="heading-mega heading-mega--light" style={{ textAlign: "center" }}>
              Build what&apos;s next.<br />
              <span className="accent">Safely.</span>
            </h2>
          </Reveal>
          <Reveal delay={2}>
            <a href="#tool" className="cta-btn">Search Safe Jobs</a>
          </Reveal>
        </div>
      </section>

      {/* ═══════════ SCENE 6: JOB TOOL ═══════════ */}
      <section className="section section--cream" id="tool">
        <div className="section-inner">
          <div className="tool-section">
            <div className="tool-header">
              <Reveal>
                <p className="label-sm label-sm--coral">Try It Now</p>
                <h2 className="heading-lg" style={{ textAlign: "center" }}>
                  Find your next safe job.
                </h2>
                <p className="text-body" style={{ textAlign: "center", margin: "16px auto 0" }}>
                  Choose a position. See every listing scored in real time.
                </p>
              </Reveal>
            </div>

            <Reveal delay={1}>
              <div className="toolbar-row">
                <div className="tool-tabs">
                  <button className={`tool-tab ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>Jobs</button>
                  <button className={`tool-tab ${activeTab === 'internships' ? 'active' : ''}`} onClick={() => setActiveTab('internships')}>Internships</button>
                </div>
                <div className="select-wrap">
                  <span className="select-label">Position:</span>
                  <select
                    className="hero-select"
                    value={activeRole || ""}
                    onChange={(e) => setActiveRole(e.target.value || null)}
                  >
                    <option value="">All Positions ({stats.total} listings)</option>
                    {roles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="select-chevron">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>
                <div className="select-wrap">
                  <span className="select-label">Location:</span>
                  <select
                    className="hero-select"
                    value={activeLocation || ""}
                    onChange={(e) => setActiveLocation(e.target.value || null)}
                  >
                    <option value="">All Locations</option>
                    {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                  <div className="select-chevron">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                </div>
                <div className="search-wrap">
                  <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input type="text" className="search-input" placeholder="Search jobs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
            </Reveal>

            {loading && jobs.length === 0 ? (
              <div className="empty-state">Loading jobs...</div>
            ) : (() => {
              const query = searchQuery.toLowerCase();
              const filteredJobs = jobs.filter(job => {
                const isIntern = job.title.toLowerCase().includes('intern') || (job.role && job.role.toLowerCase().includes('intern'));
                const tabMatch = activeTab === 'internships' ? isIntern : !isIntern;
                const textMatch = job.title.toLowerCase().includes(query) || job.company.toLowerCase().includes(query) || (job.location && job.location.toLowerCase().includes(query));
                return tabMatch && textMatch;
              });

              return filteredJobs.length === 0 ? (
                <div className="empty-state">No {activeTab} found for this position matching your search.</div>
              ) : (
                <div className="job-results-fade-in">
                  <h3 className="job-list-heading">Verified Roles <span className="job-list-count">({filteredJobs.length} listings)</span></h3>
                  <div className="results-grid">
                    {/* List */}
                    <div className="job-list-col">
                      <div className="job-list custom-scrollbar">
                        {filteredJobs.map((job) => {
                          const info = si(job.score);
                          const active = selectedJob?.id === job.id;
                          return (
                            <div key={job.id} onClick={() => setSelectedJob(job)} className={`job-card ${active ? "job-card-active" : ""}`}>
                              <div className="job-card-inner">
                                <div className={`score-ring ${info.cls}`}>
                                  <span className="score-num">{job.score ? `${Math.round(job.score.final_score)}%` : "—"}</span>
                                </div>
                                <div className="job-card-text">
                                  <p className="job-card-title">{job.title}</p>
                                  <p className="job-card-company">{job.company}{job.location && <span className="job-card-location"> · 📍 {job.location}</span>}</p>
                                </div>
                                <div className={`job-card-badge badge-${info.cls}`}>
                                  {info.label}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {hasMore && (
                        <button className="load-more-btn" onClick={() => fetchJobs(false)} disabled={loading}>
                          {loading ? 'Loading...' : 'Load More Jobs'}
                        </button>
                      )}
                    </div>

                    {/* Detail */}
                    <div className="detail-col">
                      {selectedJob ? (
                        <div className="detail-panel">
                          <div className="detail-header">
                            <div className="detail-header-text">
                              <h2 className="detail-title">{selectedJob.title}</h2>
                              <div className="detail-meta">
                                <span className="detail-company">{selectedJob.company}</span>
                                {selectedJob.location && <span className="detail-location-badge">📍 {selectedJob.location}</span>}
                                {selectedJob.url && <a href={selectedJob.url} target="_blank" rel="noreferrer" className="detail-link">View Original ↗</a>}
                                <button className="tailor-cv-btn" onClick={openCvModal} id="tailor-cv-btn">
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                  Tailor CV
                                </button>
                              </div>
                            </div>
                            {selectedJob.score && (() => {
                              const info = si(selectedJob.score);
                              return (
                                <div className="detail-score-wrap">
                                  <div className={`score-ring big ${info.cls}`}><span className="score-num">{Math.round(selectedJob.score.final_score)}%</span></div>
                                  <span className="detail-score-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>SCAM SCORE <span style={{ fontSize: '0.7rem' }}>?</span></span>
                                </div>
                              );
                            })()}
                          </div>
                          {selectedJob.description && (
                            <div className="detail-description">
                              {selectedJob.description}
                            </div>
                          )}
                          {selectedJob.score && (
                            <div className="detail-body">
                              {(() => {
                                const v = verd(selectedJob.score);
                                if (!v) return null;
                                return (
                                  <div className={`verdict-glass ${v.bg}`}>
                                    <div className={`verdict-glass-icon ${v.bg}-icon`}>{v.icon}</div>
                                    <div>
                                      <p className={`verdict-glass-title ${v.c}`}>{v.t}</p>
                                      <p className="verdict-glass-desc">{v.d}</p>
                                    </div>
                                  </div>
                                );
                              })()}
                              <div>
                                <h4 className="signals-heading">THREAT SIGNALS ({selectedJob.score.flags.length})</h4>
                                <div className="signals-list">
                                  {selectedJob.score.flags.map((raw, i) => {
                                    let sev = "warn", lbl = "WARN", text = raw;
                                    if (raw.startsWith("CRIT:")) { sev = "crit"; lbl = "CRIT"; text = raw.slice(6); }
                                    else if (raw.startsWith("SAFE:")) { sev = "safe"; lbl = "SAFE"; text = raw.slice(6); }
                                    else if (raw.startsWith("WARN:")) { text = raw.slice(6); }
                                    return (
                                      <div key={i} className={`flag-pill flag-${sev}`}>
                                        <span className="flag-badge">{lbl}</span>
                                        <span className="flag-text">{text}</span>
                                      </div>
                                    );
                                  })}
                                  {selectedJob.score.flags.length === 0 && (
                                    <div className="flag-pill flag-safe">
                                      <span className="flag-badge">SAFE</span>
                                      <span className="flag-text">Verified globally as {selectedJob.company}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ═══════════ CV BUILDER MODAL ═══════════ */}
      {cvModalOpen && (
        <div className="cv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeCvModal(); }}>
          <div className="cv-modal">
            <button className="cv-modal-close" onClick={closeCvModal}>✕</button>

            {/* Step Indicator */}
            <div className="cv-steps">
              <div className={`cv-step-dot ${cvStep >= 1 ? 'active' : ''}`}><span>1</span><p>Your Info</p></div>
              <div className="cv-step-line"><div className={`cv-step-line-fill ${cvStep >= 2 ? 'filled' : ''}`} /></div>
              <div className={`cv-step-dot ${cvStep >= 2 ? 'active' : ''}`}><span>2</span><p>Generating</p></div>
              <div className="cv-step-line"><div className={`cv-step-line-fill ${cvStep >= 3 ? 'filled' : ''}`} /></div>
              <div className={`cv-step-dot ${cvStep >= 3 ? 'active' : ''}`}><span>3</span><p>Preview</p></div>
            </div>

            {/* Job Context */}
            {selectedJob && (
              <div className="cv-job-context">
                <span className="cv-job-context-label">TAILORING FOR</span>
                <span className="cv-job-context-title">{selectedJob.title}</span>
                <span className="cv-job-context-company">at {selectedJob.company}</span>
              </div>
            )}

            {/* Step 1: Form */}
            {cvStep === 1 && (
              <div className="cv-form-step">
                {cvError && <div className="cv-error">{cvError}</div>}

                {/* Paste Existing CV */}
                <div className="cv-form-section">
                  <label className="cv-form-label">📄 Upload PDF or Paste Existing CV</label>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input 
                      type="file" 
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="cv-input"
                      disabled={pdfUploading}
                      style={{ padding: '8px', flex: 1, background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', opacity: pdfUploading ? 0.6 : 1 }}
                    />
                    {pdfUploading && <span style={{ fontSize: '0.8rem', color: 'var(--coral)', fontWeight: 600 }}>Extracting text...</span>}
                  </div>
                  
                  <div className="cv-form-divider" style={{ margin: '8px 0' }}><span>OR PASTE TEXT</span></div>

                  <textarea
                    className="cv-textarea"
                    placeholder="Paste your existing CV/resume text here and we'll tailor it for this job..."
                    value={cvProfile.existingCV}
                    onChange={(e) => updateProfile('existingCV', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="cv-form-divider"><span>OR FILL IN YOUR DETAILS</span></div>

                {/* Personal Info */}
                <div className="cv-form-section">
                  <label className="cv-form-label">Personal Information</label>
                  <div className="cv-form-row">
                    <input className="cv-input" placeholder="Full Name *" value={cvProfile.name} onChange={(e) => updateProfile('name', e.target.value)} />
                    <input className="cv-input" placeholder="Email *" value={cvProfile.email} onChange={(e) => updateProfile('email', e.target.value)} />
                  </div>
                  <div className="cv-form-row">
                    <input className="cv-input" placeholder="Phone" value={cvProfile.phone} onChange={(e) => updateProfile('phone', e.target.value)} />
                  </div>
                </div>

                {/* Summary */}
                <div className="cv-form-section">
                  <label className="cv-form-label">Professional Summary</label>
                  <textarea
                    className="cv-textarea"
                    placeholder="Brief professional summary highlighting your key strengths..."
                    value={cvProfile.summary}
                    onChange={(e) => updateProfile('summary', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Skills */}
                <div className="cv-form-section">
                  <label className="cv-form-label">Skills (comma-separated) *</label>
                  <input className="cv-input" placeholder="Python, React, Project Management, Data Analysis..." value={cvProfile.skills} onChange={(e) => updateProfile('skills', e.target.value)} />
                </div>

                {/* Experience */}
                <div className="cv-form-section">
                  <label className="cv-form-label">Experience</label>
                  {cvProfile.experience.map((exp, i) => (
                    <div key={i} className="cv-entry-card">
                      <div className="cv-form-row">
                        <input className="cv-input" placeholder="Job Title" value={exp.title} onChange={(e) => updateExperience(i, 'title', e.target.value)} />
                        <input className="cv-input" placeholder="Company" value={exp.company} onChange={(e) => updateExperience(i, 'company', e.target.value)} />
                      </div>
                      <div className="cv-form-row">
                        <input className="cv-input" placeholder="Duration (e.g. Jan 2022 - Present)" value={exp.duration} onChange={(e) => updateExperience(i, 'duration', e.target.value)} />
                        {cvProfile.experience.length > 1 && <button className="cv-remove-btn" onClick={() => removeExperience(i)}>Remove</button>}
                      </div>
                      <textarea className="cv-textarea" placeholder="Key responsibilities and achievements..." value={exp.description} onChange={(e) => updateExperience(i, 'description', e.target.value)} rows={2} />
                    </div>
                  ))}
                  <button className="cv-add-btn" onClick={addExperience}>+ Add Experience</button>
                </div>

                {/* Education */}
                <div className="cv-form-section">
                  <label className="cv-form-label">Education</label>
                  {cvProfile.education.map((edu, i) => (
                    <div key={i} className="cv-entry-card">
                      <div className="cv-form-row">
                        <input className="cv-input" placeholder="Degree" value={edu.degree} onChange={(e) => updateEducation(i, 'degree', e.target.value)} />
                        <input className="cv-input" placeholder="Institution" value={edu.institution} onChange={(e) => updateEducation(i, 'institution', e.target.value)} />
                      </div>
                      <div className="cv-form-row">
                        <input className="cv-input" placeholder="Year" value={edu.year} onChange={(e) => updateEducation(i, 'year', e.target.value)} />
                        {cvProfile.education.length > 1 && <button className="cv-remove-btn" onClick={() => removeEducation(i)}>Remove</button>}
                      </div>
                    </div>
                  ))}
                  <button className="cv-add-btn" onClick={addEducation}>+ Add Education</button>
                </div>

                <button className="cv-generate-btn" onClick={generateCV}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                  Generate Tailored CV
                </button>
              </div>
            )}

            {/* Step 2: Generating */}
            {cvStep === 2 && (
              <div className="cv-generating-step">
                <div className="cv-spinner"></div>
                <h3>Crafting your tailored CV...</h3>
                <p>Our AI is analyzing the job description and optimizing your resume. This may take 15-30 seconds.</p>
                <div className="cv-gen-progress">
                  <div className="cv-gen-progress-bar"></div>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {cvStep === 3 && cvData && (
              <div className="cv-preview-step">
                <div className="cv-preview-actions">
                  <button className="cv-download-btn" onClick={printCV}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Download PDF
                  </button>
                  <button className="cv-regen-btn" onClick={() => setCvStep(1)}>← Edit & Regenerate</button>
                </div>
                {cvData._generatedBy === 'ai' && <div className="cv-ai-badge">✨ AI-Tailored</div>}
                {cvData._generatedBy === 'template' && <div className="cv-template-badge">📋 Template-Based (AI unavailable)</div>}

                {/* Printable CV */}
                <div className="cv-printable" id="cv-printable">
                  <div className="cv-print-header">
                    <h1 className="cv-print-name">{cvData.name}</h1>
                    <div className="cv-print-contact">
                      {cvData.contact?.email && <span>{cvData.contact.email}</span>}
                      {cvData.contact?.phone && <span>{cvData.contact.phone}</span>}
                      {cvData.contact?.location && <span>{cvData.contact.location}</span>}
                    </div>
                  </div>

                  {cvData.professionalSummary && (
                    <div className="cv-print-section">
                      <h2 className="cv-print-section-title">Professional Summary</h2>
                      <p className="cv-print-summary">{cvData.professionalSummary}</p>
                    </div>
                  )}

                  {cvData.skills?.length > 0 && (
                    <div className="cv-print-section">
                      <h2 className="cv-print-section-title">Skills</h2>
                      <div className="cv-print-skills">
                        {cvData.skills.map((skill, i) => <span key={i} className="cv-print-skill-tag">{skill}</span>)}
                      </div>
                    </div>
                  )}

                  {cvData.experience?.length > 0 && (
                    <div className="cv-print-section">
                      <h2 className="cv-print-section-title">Experience</h2>
                      {cvData.experience.map((exp, i) => (
                        <div key={i} className="cv-print-exp">
                          <div className="cv-print-exp-header">
                            <strong>{exp.title}</strong>
                            <span className="cv-print-exp-company">{exp.company}</span>
                            <span className="cv-print-exp-duration">{exp.duration}</span>
                          </div>
                          {exp.highlights?.length > 0 && (
                            <ul className="cv-print-highlights">
                              {exp.highlights.map((h, j) => <li key={j}>{h}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {cvData.education?.length > 0 && (
                    <div className="cv-print-section">
                      <h2 className="cv-print-section-title">Education</h2>
                      {cvData.education.map((edu, i) => (
                        <div key={i} className="cv-print-edu">
                          <strong>{edu.degree}</strong>
                          <span>{edu.institution}</span>
                          <span className="cv-print-edu-year">{edu.year}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {cvData.certifications?.length > 0 && (
                    <div className="cv-print-section">
                      <h2 className="cv-print-section-title">Certifications</h2>
                      <ul className="cv-print-certs">
                        {cvData.certifications.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}

                  {cvData.tailoredKeywords?.length > 0 && (
                    <div className="cv-print-section cv-keywords-section">
                      <h2 className="cv-print-section-title">Key Competencies</h2>
                      <div className="cv-print-keywords">
                        {cvData.tailoredKeywords.map((kw, i) => <span key={i} className="cv-print-keyword">{kw}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error in step 2 */}
            {cvStep === 2 && cvError && (
              <div className="cv-error-state">
                <p>{cvError}</p>
                <button onClick={() => setCvStep(1)}>Go Back</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="site-footer">
        <p>ShieldDB — Built to protect job seekers.</p>
      </footer>
    </div>
  );
}
