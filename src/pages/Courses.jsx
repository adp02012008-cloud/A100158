// src/pages/Courses.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch, getCachedApi } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import UnifiedLoader from "../components/UnifiedLoader";
import BulkImportCoursesModal from "../components/BulkImportCoursesModal";
import "./Courses.css";

// Precise domain-aware thematic classifier for educational courses
function detectCourseTheme(course) {
  const name = (course.name || "").toLowerCase();

  // 1. C++ vs C Programming
  if (/\b(c\+\+|cpp|programming c\+\+)\b/i.test(name)) return "cpp";
  if (/\b(c programming|code debugging)\b/i.test(name) || name === "c" || name.startsWith("c -") || name.startsWith("c programming")) return "c";

  // 2. Python & AI / Deep Learning (word bounded to prevent matching "affairs")
  if (/\b(python|deep learning|machine learning|artificial intelligence)\b/i.test(name) || name.startsWith("ai -")) return "python_ai";

  // 3. Java Programming
  if (/\b(java)\b/i.test(name) && !/\b(script)\b/i.test(name)) return "java";

  // 4. Web, Frontend & UI/UX (word bounded so "circuit" does not match "ui")
  if (/\b(html|css|javascript|java script|react|nodejs|creative media)\b/i.test(name) || (/\b(ui|ux)\b/i.test(name) && !/\b(circuit)\b/i.test(name))) return "web_uiux";

  // 5. Data Science & Analytics
  if (/\b(data science|data visualization)\b/i.test(name)) return "datascience";

  // 6. Databases & Data Structures
  if (/\b(dbms|database|data structure|data structures|sql)\b/i.test(name)) return "database";

  // 7. Biotechnology, Food Science & Life Sciences
  if (/\b(bio|biochemical|bioinformatics|bioinstrumentation|bioprocess|biological|culturing|tissue|food|microbiology|preservation|nutrition|harvest|biotechnology)\b/i.test(name)) return "biotech";

  // 8. Circuits, Electronics & Embedded (Prevents "circuit debugging" from matching UI/UX)
  if (/\b(circuit|circuits|analog|digital electronic|electronics|vlsi|pcb|electrical|embedded|wiring|eee)\b/i.test(name)) return "electronics";

  // 9. Automation & PLC
  if (/\b(plc|automation|industrial automation)\b/i.test(name)) return "automation_plc";

  // 10. Mechanical, Fabrication & Materials
  if (/\b(weld|welding|assembly|materials and manufacturing|mechanical|modelling|prototype|simulation|ansys|fea)\b/i.test(name)) return "mechanical";

  // 11. Civil & Structural Engineering
  if (/\b(construction|irrigation|structural|surveying)\b/i.test(name)) return "civil";

  // 12. Cloud, SysAdmin, Linux, Security & Version Control
  if (/\b(system admin|system administration|backup|storage|cloud|network|networking|cyber|cybersecurity|linux|git|github|version control|cs cluster)\b/i.test(name)) return "cloud_sysadmin";

  // 13. Mathematics
  if (/\b(algebra|calculus|differential|computational thinking)\b/i.test(name)) return "math";

  // 14. Aptitude & Logical Reasoning
  if (/\b(aptitude|logical|problem solving|reasoning|brainstorming)\b/i.test(name)) return "aptitude";

  // 15. Institutional Regulations, Governance, Affairs & Patents ("Autonomy Affairs" gets this!)
  if (/\b(regulation|regulations|autonomy|affairs|patent|ipr|laws|counselling)\b/i.test(name)) return "regulations";

  // 16. Hackathons & Competitions
  if (/\b(challenge|innovation|yukti|gp challenge|project based)\b/i.test(name)) return "innovation";

  // 17. Languages & Soft Skills
  if (/\b(communication|german|language|leadership|physical fitness|yoga|fitness)\b/i.test(name)) return "general";

  return "general";
}

// Dynamic high-fidelity illustrated banners tailored directly to course subject
function CourseBannerGraphic({ course }) {
  const theme = detectCourseTheme(course);
  const totalLevels = (course.levels || []).length || 1;

  const renderBannerContent = () => {
    switch (theme) {
      case "biotech":
        return (
          <div className="banner-art-wrap biotech-banner">
            <div className="banner-tag">🧬 BIOTECHNOLOGY</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Background grid */}
              <defs>
                <pattern id="bioGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.15" />
                </pattern>
              </defs>
              <rect width="300" height="120" fill="url(#bioGrid)" />
              {/* Chemical Benzene Ring */}
              <polygon points="50,45 68,34 86,45 86,67 68,78 50,67" stroke="#34d399" strokeWidth="1.8" fill="rgba(16, 185, 129, 0.12)" />
              <circle cx="68" cy="56" r="12" stroke="#34d399" strokeWidth="1.2" strokeDasharray="3 2" fill="none" />
              {/* Laboratory Flask with Liquid */}
              <path d="M98 42 L106 42 L106 52 L120 74 C122 78 119 82 114 82 L90 82 C85 82 82 78 84 74 L98 52 Z" fill="#047857" stroke="#6ee7b7" strokeWidth="2" />
              <path d="M89 74 Q102 70 115 74 L114 82 L90 82 Z" fill="#34d399" opacity="0.6" />
              <circle cx="100" cy="68" r="2.5" fill="#ffffff" opacity="0.8" />
              <circle cx="106" cy="62" r="1.8" fill="#ffffff" opacity="0.6" />
              {/* DNA Double Helix */}
              <path d="M150 30 Q170 60 190 30 T230 30 T270 30" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
              <path d="M150 75 Q170 45 190 75 T230 75 T270 75" stroke="#34d399" strokeWidth="2.5" fill="none" />
              {/* DNA Rungs */}
              <line x1="160" y1="42" x2="160" y2="63" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" />
              <line x1="180" y1="36" x2="180" y2="69" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="200" y1="42" x2="200" y2="63" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" />
              <line x1="220" y1="36" x2="220" y2="69" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="240" y1="42" x2="240" y2="63" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="2 2" />
              <line x1="260" y1="36" x2="260" y2="69" stroke="#cbd5e1" strokeWidth="1.5" />
              <circle cx="160" cy="42" r="3" fill="#38bdf8" />
              <circle cx="160" cy="63" r="3" fill="#34d399" />
              <circle cx="200" cy="42" r="3" fill="#38bdf8" />
              <circle cx="200" cy="63" r="3" fill="#34d399" />
              <circle cx="240" cy="42" r="3" fill="#38bdf8" />
              <circle cx="240" cy="63" r="3" fill="#34d399" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "electronics":
        return (
          <div className="banner-art-wrap electronics-banner">
            <div className="banner-tag">⚡ CIRCUITS & ELECTRONICS</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* PCB Circuit Traces */}
              <path d="M25 40 L60 40 L80 60 L120 60" stroke="#38bdf8" strokeWidth="2" fill="none" />
              <circle cx="25" cy="40" r="3" fill="#38bdf8" />
              <path d="M40 85 L90 85 L105 70 L120 70" stroke="#34d399" strokeWidth="2" fill="none" />
              <circle cx="40" cy="85" r="3" fill="#34d399" />
              {/* Microcontroller Package */}
              <rect x="120" y="32" width="60" height="56" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="130" cy="42" r="2.5" fill="#f59e0b" />
              <text x="135" y="64" fill="#38bdf8" fontFamily="monospace" fontSize="11" fontWeight="bold">IC</text>
              {/* IC Pins */}
              <line x1="128" y1="24" x2="128" y2="32" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="140" y1="24" x2="140" y2="32" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="152" y1="24" x2="152" y2="32" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="164" y1="24" x2="164" y2="32" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="128" y1="88" x2="128" y2="96" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="140" y1="88" x2="140" y2="96" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="152" y1="88" x2="152" y2="96" stroke="#f59e0b" strokeWidth="2.5" />
              <line x1="164" y1="88" x2="164" y2="96" stroke="#f59e0b" strokeWidth="2.5" />
              {/* Oscilloscope Waveform */}
              <rect x="195" y="30" width="80" height="60" rx="4" fill="#091e3a" stroke="#0284c7" strokeWidth="1.5" />
              <path d="M200 60 L212 60 L218 42 L226 78 L234 42 L240 60 L270 60" stroke="#22c55e" strokeWidth="2" fill="none" />
              <line x1="180" y1="60" x2="195" y2="60" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "c":
        return (
          <div className="banner-art-wrap c-banner">
            <div className="banner-tag">💻 C PROGRAMMING</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Hexagonal C Logo Emblem */}
              <polygon points="150,22 185,42 185,82 150,102 115,82 115,42" fill="#042f2e" stroke="#14b8a6" strokeWidth="2.5" />
              <text x="135" y="74" fill="#ffffff" fontFamily="sans-serif" fontSize="38" fontWeight="900">C</text>
              {/* Pointer & Memory Nodes */}
              <rect x="35" y="38" width="60" height="44" rx="4" fill="#0f172a" stroke="#2dd4bf" strokeWidth="1.5" />
              <text x="44" y="55" fill="#5eead4" fontFamily="monospace" fontSize="11" fontWeight="bold">*ptr</text>
              <text x="44" y="72" fill="#94a3b8" fontFamily="monospace" fontSize="9">0x7FFE</text>
              <path d="M95 60 L115 60" stroke="#2dd4bf" strokeWidth="2" markerEnd="url(#arrow)" />
              {/* Function Block */}
              <rect x="205" y="38" width="65" height="44" rx="4" fill="#0f172a" stroke="#2dd4bf" strokeWidth="1.5" />
              <text x="215" y="55" fill="#5eead4" fontFamily="monospace" fontSize="10.5" fontWeight="bold">main()</text>
              <text x="215" y="72" fill="#38bdf8" fontFamily="monospace" fontSize="9">{`{ ... }`}</text>
              <path d="M185 60 L205 60" stroke="#2dd4bf" strokeWidth="2" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "cpp":
        return (
          <div className="banner-art-wrap cpp-banner">
            <div className="banner-tag">🚀 C++ PROGRAMMING</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Distinct C++ Shield */}
              <polygon points="150,20 190,42 190,82 150,104 110,82 110,42" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2.5" />
              <text x="123" y="73" fill="#ffffff" fontFamily="sans-serif" fontSize="32" fontWeight="900">C++</text>
              {/* Template & STL Nodes */}
              <rect x="30" y="35" width="68" height="50" rx="4" fill="#0f172a" stroke="#93c5fd" strokeWidth="1.5" />
              <text x="38" y="54" fill="#93c5fd" fontFamily="monospace" fontSize="10.5" fontWeight="bold">std::cout</text>
              <text x="38" y="72" fill="#34d399" fontFamily="monospace" fontSize="10">&lt;&lt; "OOP";</text>
              {/* Object Class Node */}
              <rect x="202" y="35" width="72" height="50" rx="4" fill="#0f172a" stroke="#a5b4fc" strokeWidth="1.5" />
              <text x="210" y="54" fill="#a5b4fc" fontFamily="monospace" fontSize="10.5" fontWeight="bold">class&lt;T&gt;</text>
              <text x="210" y="72" fill="#f87171" fontFamily="monospace" fontSize="9.5">virtual ~</text>
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "python_ai":
        return (
          <div className="banner-art-wrap python-banner">
            <div className="banner-tag">🐍 PYTHON & AI</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Python Twin Curves Emblem */}
              <g transform="translate(60, 28) scale(0.9)">
                <path d="M25 5 C12 5 5 12 5 22 L5 30 L22 30 L22 35 L7 35 C3 35 0 39 0 47 C0 55 4 60 12 60 L18 60 L18 52 C18 44 24 38 32 38 L42 38 C47 38 52 33 52 28 L52 15 C52 7 45 5 35 5 Z" fill="#38bdf8" />
                <circle cx="15" cy="15" r="2.5" fill="#ffffff" />
                <path d="M27 65 C40 65 47 58 47 48 L47 40 L30 40 L30 35 L45 35 C49 35 52 31 52 23 C52 15 48 10 40 10 L34 10 L34 18 C34 26 28 32 20 32 L10 32 C5 32 0 37 0 42 L0 55 C0 63 7 65 17 65 Z" fill="#fbbf24" />
                <circle cx="37" cy="55" r="2.5" fill="#0f172a" />
              </g>
              {/* Neural Network Nodes */}
              <circle cx="160" cy="38" r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="160" cy="65" r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="160" cy="92" r="7" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="210" cy="48" r="7" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="210" cy="80" r="7" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="260" cy="65" r="9" fill="#34d399" stroke="#ffffff" strokeWidth="2" />
              {/* Synapse connections */}
              <line x1="167" y1="38" x2="203" y2="48" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
              <line x1="167" y1="38" x2="203" y2="80" stroke="#60a5fa" strokeWidth="1" opacity="0.4" />
              <line x1="167" y1="65" x2="203" y2="48" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
              <line x1="167" y1="65" x2="203" y2="80" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
              <line x1="167" y1="92" x2="203" y2="80" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
              <line x1="217" y1="48" x2="251" y2="65" stroke="#fbbf24" strokeWidth="2" />
              <line x1="217" y1="80" x2="251" y2="65" stroke="#fbbf24" strokeWidth="2" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "java":
        return (
          <div className="banner-art-wrap java-banner">
            <div className="banner-tag">☕ JAVA PROGRAMMING</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Coffee Cup & Steam */}
              <rect x="70" y="52" width="46" height="34" rx="4" fill="#ea580c" stroke="#fed7aa" strokeWidth="1.5" />
              <path d="M116 58 C126 58 126 74 116 78" stroke="#fed7aa" strokeWidth="3" fill="none" />
              <ellipse cx="93" cy="88" rx="28" ry="7" fill="#7c2d12" stroke="#ea580c" strokeWidth="1" />
              <path d="M84 45 Q88 32 92 42 Q96 30 100 42" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* JVM Architecture Block */}
              <rect x="145" y="32" width="115" height="60" rx="6" fill="#18181b" stroke="#f97316" strokeWidth="1.5" />
              <text x="156" y="52" fill="#f97316" fontFamily="monospace" fontSize="11" fontWeight="bold">JVM Architecture</text>
              <rect x="155" y="60" width="44" height="22" rx="3" fill="#27272a" stroke="#fb923c" strokeWidth="1" />
              <text x="160" y="75" fill="#cbd5e1" fontFamily="sans-serif" fontSize="9">Bytecode</text>
              <rect x="206" y="60" width="44" height="22" rx="3" fill="#27272a" stroke="#38bdf8" strokeWidth="1" />
              <text x="215" y="75" fill="#38bdf8" fontFamily="sans-serif" fontSize="9">JIT Ops</text>
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "web_uiux":
        return (
          <div className="banner-art-wrap web-banner">
            <div className="banner-tag">🎨 WEB & UI/UX DESIGN</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Responsive Browser Canvas */}
              <rect x="40" y="24" width="130" height="74" rx="6" fill="#0f172a" stroke="#818cf8" strokeWidth="2" />
              <circle cx="52" cy="33" r="3" fill="#f87171" />
              <circle cx="60" cy="33" r="3" fill="#fbbf24" />
              <circle cx="68" cy="33" r="3" fill="#34d399" />
              <rect x="50" y="44" width="40" height="44" rx="3" fill="#312e81" />
              <rect x="98" y="44" width="62" height="14" rx="2" fill="#6366f1" opacity="0.6" />
              <rect x="98" y="63" width="62" height="8" rx="2" fill="#cbd5e1" opacity="0.5" />
              <rect x="98" y="75" width="38" height="12" rx="3" fill="#ec4899" />
              {/* Mobile Device Frame */}
              <rect x="190" y="20" width="50" height="82" rx="7" fill="#1e1b4b" stroke="#c084fc" strokeWidth="2" />
              <rect x="197" y="32" width="36" height="28" rx="3" fill="#6366f1" />
              <rect x="197" y="66" width="36" height="6" rx="2" fill="#cbd5e1" />
              <circle cx="215" cy="94" r="3" fill="#c084fc" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "database":
        return (
          <div className="banner-art-wrap database-banner">
            <div className="banner-tag">🗄️ DATABASES & DATA</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Database Cylinder 1 */}
              <ellipse cx="90" cy="40" rx="36" ry="12" fill="#312e81" stroke="#818cf8" strokeWidth="1.8" />
              <path d="M54 40 L54 60 C54 67 70 72 90 72 C110 72 126 67 126 60 L126 40" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.8" />
              <path d="M54 60 L54 80 C54 87 70 92 90 92 C110 92 126 87 126 80 L126 60" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.8" />
              {/* Connected Schema Table */}
              <rect x="160" y="32" width="95" height="58" rx="4" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.8" />
              <rect x="160" y="32" width="95" height="16" rx="3" fill="#1e40af" />
              <text x="170" y="44" fill="#ffffff" fontFamily="sans-serif" fontSize="10" fontWeight="bold">SQL Schema</text>
              <line x1="160" y1="62" x2="255" y2="62" stroke="#334155" strokeWidth="1" />
              <circle cx="172" cy="55" r="3" fill="#fbbf24" />
              <line x1="180" y1="55" x2="245" y2="55" stroke="#cbd5e1" strokeWidth="2" />
              <circle cx="172" cy="74" r="3" fill="#34d399" />
              <line x1="180" y1="74" x2="230" y2="74" stroke="#cbd5e1" strokeWidth="2" />
              {/* Connecting Line */}
              <path d="M126 60 L160 60" stroke="#818cf8" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "datascience":
        return (
          <div className="banner-art-wrap datascience-banner">
            <div className="banner-tag">📊 DATA SCIENCE</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Coordinate Grid */}
              <line x1="50" y1="92" x2="250" y2="92" stroke="#475569" strokeWidth="1.5" />
              <line x1="50" y1="28" x2="50" y2="92" stroke="#475569" strokeWidth="1.5" />
              {/* Bar Columns */}
              <rect x="70" y="60" width="18" height="32" rx="2" fill="#0284c7" />
              <rect x="96" y="45" width="18" height="47" rx="2" fill="#38bdf8" />
              <rect x="122" y="35" width="18" height="57" rx="2" fill="#06b6d4" />
              <rect x="148" y="50" width="18" height="42" rx="2" fill="#0284c7" />
              {/* Analytical Spline Curve */}
              <path d="M60 80 Q100 25 150 48 T240 32" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
              <circle cx="100" cy="44" r="3.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" />
              <circle cx="150" cy="48" r="3.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" />
              <circle cx="195" cy="52" r="3.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" />
              <circle cx="240" cy="32" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "automation_plc":
        return (
          <div className="banner-art-wrap plc-banner">
            <div className="banner-tag">🤖 AUTOMATION & PLC</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* PLC Controller Rack */}
              <rect x="40" y="24" width="220" height="74" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              {/* Module 1: CPU */}
              <rect x="52" y="34" width="40" height="54" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
              <circle cx="62" cy="44" r="3" fill="#22c55e" />
              <circle cx="72" cy="44" r="3" fill="#38bdf8" />
              <circle cx="82" cy="44" r="3" fill="#ef4444" />
              <text x="60" y="68" fill="#94a3b8" fontFamily="monospace" fontSize="8" fontWeight="bold">CPU</text>
              {/* Module 2: Ladder Logic */}
              <rect x="100" y="34" width="75" height="54" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
              <line x1="110" y1="48" x2="165" y2="48" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="122" y1="42" x2="122" y2="54" stroke="#38bdf8" strokeWidth="2" />
              <line x1="128" y1="42" x2="128" y2="54" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="152" cy="48" r="4.5" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
              <line x1="110" y1="68" x2="165" y2="68" stroke="#34d399" strokeWidth="1.5" />
              <circle cx="138" cy="68" r="4.5" stroke="#34d399" strokeWidth="1.5" fill="none" />
              {/* Digital I/O Bus */}
              <rect x="183" y="34" width="65" height="54" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
              <path d="M190 62 L200 62 L200 44 L212 44 L212 62 L224 62 L224 44 L236 44" stroke="#38bdf8" strokeWidth="1.8" fill="none" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "mechanical":
        return (
          <div className="banner-art-wrap mechanical-banner">
            <div className="banner-tag">⚙️ MECHANICAL & CAD</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Technical drafting grid */}
              <circle cx="110" cy="60" r="32" stroke="#d97706" strokeWidth="2" strokeDasharray="4 2" />
              {/* Interlocking Main Gear */}
              <circle cx="110" cy="60" r="26" fill="#27272a" stroke="#f59e0b" strokeWidth="3" />
              <circle cx="110" cy="60" r="10" fill="#18181b" stroke="#fbbf24" strokeWidth="2" />
              {/* Gear Cogs */}
              <line x1="110" y1="26" x2="110" y2="34" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
              <line x1="110" y1="86" x2="110" y2="94" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
              <line x1="76" y1="60" x2="84" y2="60" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
              <line x1="136" y1="60" x2="144" y2="60" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round" />
              {/* Secondary Meshing Gear */}
              <circle cx="165" cy="45" r="18" fill="#27272a" stroke="#ea580c" strokeWidth="2.5" />
              <circle cx="165" cy="45" r="6" fill="#18181b" stroke="#ea580c" strokeWidth="1.5" />
              {/* Vernier Caliper / Dimension Arrows */}
              <line x1="205" y1="35" x2="255" y2="35" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="205" y1="30" x2="205" y2="40" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="255" y1="30" x2="255" y2="40" stroke="#94a3b8" strokeWidth="1.5" />
              <text x="216" y="32" fill="#fbbf24" fontFamily="sans-serif" fontSize="9">50.0mm</text>
              {/* 3D Part Wireframe */}
              <polygon points="210,50 240,50 255,65 225,65" fill="#3f3f46" stroke="#d97706" strokeWidth="1.5" />
              <polygon points="210,50 225,65 225,85 210,70" fill="#27272a" stroke="#d97706" strokeWidth="1.5" />
              <polygon points="225,65 255,65 255,85 225,85" fill="#18181b" stroke="#d97706" strokeWidth="1.5" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "civil":
        return (
          <div className="banner-art-wrap civil-banner">
            <div className="banner-tag">🏗️ CIVIL ENGINEERING</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Structural Truss Bridge Geometry */}
              <line x1="30" y1="85" x2="270" y2="85" stroke="#ca8a04" strokeWidth="3" />
              <line x1="60" y1="40" x2="240" y2="40" stroke="#eab308" strokeWidth="2.5" />
              <line x1="30" y1="85" x2="60" y2="40" stroke="#eab308" strokeWidth="2" />
              <line x1="60" y1="40" x2="95" y2="85" stroke="#eab308" strokeWidth="2" />
              <line x1="95" y1="85" x2="130" y2="40" stroke="#eab308" strokeWidth="2" />
              <line x1="130" y1="40" x2="165" y2="85" stroke="#eab308" strokeWidth="2" />
              <line x1="165" y1="85" x2="200" y2="40" stroke="#eab308" strokeWidth="2" />
              <line x1="200" y1="40" x2="240" y2="85" stroke="#eab308" strokeWidth="2" />
              <line x1="240" y1="85" x2="270" y2="40" stroke="#eab308" strokeWidth="2" />
              {/* Theodolite Survey Compass Circle */}
              <circle cx="150" cy="30" r="14" stroke="#fde047" strokeWidth="1.5" strokeDasharray="2 2" fill="#292524" />
              <line x1="150" y1="20" x2="150" y2="40" stroke="#fde047" strokeWidth="1.5" />
              <line x1="140" y1="30" x2="160" y2="30" stroke="#fde047" strokeWidth="1.5" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "cloud_sysadmin":
        return (
          <div className="banner-art-wrap cloud-banner">
            <div className="banner-tag">☁️ CLOUD & DEVOPS</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Cloud Icon with Network Backbone */}
              <path d="M60 65 C50 65 42 57 42 47 C42 38 49 31 58 30 C62 20 73 14 85 14 C99 14 110 23 113 36 C118 34 124 35 128 39 C133 44 134 50 131 56 C138 58 142 64 140 71 C138 77 132 81 125 81 L60 81 Z" fill="#0369a1" stroke="#38bdf8" strokeWidth="2" opacity="0.6" />
              {/* Terminal Console */}
              <rect x="145" y="26" width="125" height="68" rx="6" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2" />
              <rect x="145" y="26" width="125" height="16" rx="4" fill="#1e293b" />
              <circle cx="157" cy="34" r="3" fill="#ef4444" />
              <circle cx="166" cy="34" r="3" fill="#fbbf24" />
              <circle cx="175" cy="34" r="3" fill="#10b981" />
              <text x="156" y="58" fill="#34d399" fontFamily="monospace" fontSize="11" fontWeight="bold">&gt;_ root@cloud</text>
              <text x="156" y="74" fill="#38bdf8" fontFamily="monospace" fontSize="10.5">deploy --prod</text>
              <line x1="110" y1="65" x2="145" y2="65" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "math":
        return (
          <div className="banner-art-wrap math-banner">
            <div className="banner-tag">📐 MATHEMATICS</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Cartesian Axes */}
              <line x1="50" y1="90" x2="260" y2="90" stroke="#6366f1" strokeWidth="1.5" />
              <line x1="50" y1="20" x2="50" y2="90" stroke="#6366f1" strokeWidth="1.5" />
              {/* Parabolic / Sine Curve */}
              <path d="M50 85 Q110 15 160 65 T250 30" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
              {/* Integral & Math Symbols */}
              <text x="75" y="58" fill="#c084fc" fontFamily="serif" fontSize="34" fontStyle="italic">∫</text>
              <text x="120" y="52" fill="#a5b4fc" fontFamily="sans-serif" fontSize="18" fontWeight="bold">f(x)dx</text>
              <text x="195" y="54" fill="#f43f5e" fontFamily="sans-serif" fontSize="22" fontWeight="bold">∑</text>
              <text x="225" y="74" fill="#facc15" fontFamily="serif" fontSize="20" fontStyle="italic">Δy/Δx</text>
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "aptitude":
        return (
          <div className="banner-art-wrap aptitude-banner">
            <div className="banner-tag">🧠 APTITUDE & LOGIC</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Target Bullseye with Dart */}
              <circle cx="95" cy="58" r="34" stroke="#c084fc" strokeWidth="1.8" fill="rgba(168, 85, 247, 0.15)" />
              <circle cx="95" cy="58" r="22" stroke="#a855f7" strokeWidth="1.8" fill="rgba(168, 85, 247, 0.25)" />
              <circle cx="95" cy="58" r="10" fill="#e879f9" stroke="#ffffff" strokeWidth="1.5" />
              {/* Analytical Compass & Logic Path */}
              <path d="M150 78 L175 35 L200 78" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
              <line x1="158" y1="62" x2="192" y2="62" stroke="#38bdf8" strokeWidth="2" />
              {/* Logic puzzle node */}
              <rect x="220" y="38" width="45" height="45" rx="5" fill="#581c87" stroke="#e879f9" strokeWidth="2" />
              <circle cx="242" cy="60" r="8" fill="#fdf4ff" />
              <path d="M192 62 L220 60" stroke="#e879f9" strokeWidth="2" strokeDasharray="2 2" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "regulations":
        return (
          <div className="banner-art-wrap regulations-banner">
            <div className="banner-tag">⚖️ REGULATIONS & IPR</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Scales of Justice */}
              <line x1="100" y1="28" x2="100" y2="86" stroke="#fbbf24" strokeWidth="3" />
              <line x1="85" y1="86" x2="115" y2="86" stroke="#fbbf24" strokeWidth="3" />
              <line x1="65" y1="38" x2="135" y2="38" stroke="#fbbf24" strokeWidth="2.5" />
              <polygon points="100,24 94,36 106,36" fill="#f59e0b" />
              {/* Left Scale Pan */}
              <line x1="65" y1="38" x2="52" y2="58" stroke="#fcd34d" strokeWidth="1.5" />
              <line x1="65" y1="38" x2="78" y2="58" stroke="#fcd34d" strokeWidth="1.5" />
              <path d="M48 58 Q65 70 82 58 Z" fill="#b45309" stroke="#fcd34d" strokeWidth="1.5" />
              {/* Right Scale Pan */}
              <line x1="135" y1="38" x2="122" y2="58" stroke="#fcd34d" strokeWidth="1.5" />
              <line x1="135" y1="38" x2="148" y2="58" stroke="#fcd34d" strokeWidth="1.5" />
              <path d="M118 58 Q135 70 152 58 Z" fill="#b45309" stroke="#fcd34d" strokeWidth="1.5" />
              {/* Official Seal / Certificate Scroll */}
              <rect x="175" y="32" width="75" height="54" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="212" cy="52" r="12" fill="#b45309" stroke="#fbbf24" strokeWidth="2" />
              <path d="M212 64 L208 76 L212 73 L216 76 Z" fill="#fbbf24" />
              <line x1="185" y1="42" x2="198" y2="42" stroke="#94a3b8" strokeWidth="1.5" />
              <line x1="185" y1="68" x2="240" y2="68" stroke="#94a3b8" strokeWidth="1.5" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      case "innovation":
        return (
          <div className="banner-art-wrap innovation-banner">
            <div className="banner-tag">🏆 INNOVATION & CHALLENGES</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Trophy Cup */}
              <path d="M70 34 L110 34 L104 62 C100 70 80 70 76 62 Z" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />
              <path d="M70 40 C60 40 60 52 70 54" stroke="#fef08a" strokeWidth="2" fill="none" />
              <path d="M110 40 C120 40 120 52 110 54" stroke="#fef08a" strokeWidth="2" fill="none" />
              <rect x="85" y="66" width="10" height="12" fill="#d97706" />
              <rect x="76" y="78" width="28" height="8" rx="2" fill="#b45309" stroke="#fef08a" strokeWidth="1" />
              {/* Rocket Launch */}
              <g transform="translate(170, 20) rotate(25)">
                <path d="M25 0 C25 0 40 20 40 45 L10 45 C10 20 25 0 25 0 Z" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="25" cy="22" r="6" fill="#0284c7" />
                <path d="M10 35 L0 48 L10 45 Z" fill="#ef4444" />
                <path d="M40 35 L50 48 L40 45 Z" fill="#ef4444" />
                <polygon points="15,45 25,60 35,45" fill="#f59e0b" />
                <polygon points="18,45 25,54 32,45" fill="#fef08a" />
              </g>
              {/* Starburst rays */}
              <circle cx="230" cy="40" r="2" fill="#ffffff" />
              <circle cx="255" cy="65" r="3" fill="#fde047" />
              <circle cx="240" cy="80" r="2" fill="#ffffff" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );

      default:
        return (
          <div className="banner-art-wrap general-banner">
            <div className="banner-tag">🌐 GENERAL SKILLS</div>
            <div className="banner-level-pill">📄 {totalLevels} Levels</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              {/* Globe with Longitude & Latitude */}
              <circle cx="100" cy="58" r="28" fill="#155e75" stroke="#38bdf8" strokeWidth="2" />
              <ellipse cx="100" cy="58" rx="14" ry="28" stroke="#38bdf8" strokeWidth="1.2" fill="none" />
              <line x1="72" y1="58" x2="128" y2="58" stroke="#38bdf8" strokeWidth="1.2" />
              {/* Open Book of Knowledge */}
              <path d="M155 68 C170 60 190 60 205 66 L205 40 C190 34 170 34 155 42 Z" fill="#0e7490" stroke="#67e8f9" strokeWidth="1.8" />
              <path d="M255 68 C240 60 220 60 205 66 L205 40 C220 34 240 34 255 42 Z" fill="#0e7490" stroke="#67e8f9" strokeWidth="1.8" />
              {/* Graduation Cap Star */}
              <polygon points="205,20 185,28 205,36 225,28" fill="#facc15" stroke="#ffffff" strokeWidth="1" />
              <line x1="225" y1="28" x2="228" y2="40" stroke="#facc15" strokeWidth="1.5" />
            </svg>
            <div className="banner-course-title-strip">{course.name}</div>
          </div>
        );
    }
  };

  return <div className="course-card-top-art">{renderBannerContent()}</div>;
}

export function parseLevelInfo(name = "") {
  const str = String(name || "").trim();
  const isTraining = /training/i.test(str);

  let num = 999;
  let sub = "";

  // 1. Match "level" followed by number and optional letter (e.g. Level 0, Level 1A, Level 2 Training)
  const levelMatch = str.match(/level\s*[-–:]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-z]?)/i);
  if (levelMatch) {
    num = parseFloat(levelMatch[1]);
    sub = (levelMatch[2] || "").toLowerCase();
  } else {
    // 2. Match "training" followed by number (e.g. Training 1)
    const trainingMatch = str.match(/training\s*[-–:]?\s*([0-9]+(?:\.[0-9]+)?)\s*([a-z]?)/i);
    if (trainingMatch) {
      num = parseFloat(trainingMatch[1]);
      sub = (trainingMatch[2] || "").toLowerCase();
    } else {
      // 3. Fallback to any standalone number
      const fallbackMatch = str.match(/\b([0-9]+(?:\.[0-9]+)?)\s*([a-z]?)\b/i);
      if (fallbackMatch) {
        num = parseFloat(fallbackMatch[1]);
        sub = (fallbackMatch[2] || "").toLowerCase();
      }
    }
  }

  return {
    num,
    sub,
    isTraining: isTraining ? 0 : 1, // Training (0) comes before Regular/Exam (1)
  };
}

export function sortCourseLevels(levels = []) {
  if (!Array.isArray(levels) || levels.length === 0) return [];

  return [...levels].sort((a, b) => {
    const nameA = a?.levelName || "";
    const nameB = b?.levelName || "";

    const pA = parseLevelInfo(nameA);
    const pB = parseLevelInfo(nameB);

    // Primary: Base level number (e.g. 0 before 1, 1 before 2)
    if (pA.num !== pB.num) {
      return pA.num - pB.num;
    }
    // Secondary: Training comes before regular level (e.g. Level 1 Training before Level 1)
    if (pA.isTraining !== pB.isTraining) {
      return pA.isTraining - pB.isTraining;
    }
    // Tertiary: Sub-level / letter tier (e.g. Level 1A before Level 1B)
    if (pA.sub !== pB.sub) {
      return pA.sub.localeCompare(pB.sub);
    }
    return (nameA || "").localeCompare(nameB || "");
  });
}

function isLevelMatch(rawCompletedName, rawLevelName, lNum = "", cName = "") {
  const normCompleted = String(rawCompletedName || "").toLowerCase().trim();
  const normLevelName = String(rawLevelName || "").toLowerCase().trim();

  if (!normCompleted || !normLevelName) return false;
  if (normCompleted === normLevelName) return true;

  // Training mismatch check: Training can never match Non-Training
  const completedIsTraining = /training/i.test(normCompleted);
  const levelIsTraining = /training/i.test(normLevelName);
  if (completedIsTraining !== levelIsTraining) return false;

  // Strip course name prefix if present
  let cleanCompleted = normCompleted;
  let cleanLevel = normLevelName;
  if (cName) {
    cleanCompleted = cleanCompleted.replace(cName.toLowerCase(), "").replace(/^[\s\-–:]+/, "").trim();
    cleanLevel = cleanLevel.replace(cName.toLowerCase(), "").replace(/^[\s\-–:]+/, "").trim();
  }

  if (cleanCompleted && cleanLevel && cleanCompleted === cleanLevel) return true;

  const pCompleted = parseLevelInfo(cleanCompleted || normCompleted);
  const pLevel = parseLevelInfo(cleanLevel || normLevelName);

  if (pCompleted.num !== 999 && pLevel.num !== 999) {
    if (
      pCompleted.num === pLevel.num &&
      pCompleted.sub === pLevel.sub &&
      pCompleted.isTraining === pLevel.isTraining
    ) {
      return true;
    }
  }

  if (lNum && (normCompleted === `level ${lNum}` || normCompleted === `level - ${lNum}`)) {
    return true;
  }

  return false;
}

function getCourseKey(name = "") {
  return String(name || "")
    .toLowerCase()
    .replace(/gurugulam|assessment|modelling/gi, "")
    .replace(/[^a-z0-9]/gi, "");
}

export default function Courses({ search: initialSearch = "" }) {
  const { auth, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("available"); // "available" | "my-courses"

  // Instant SWR cache hydration: zero delay if preloaded
  const cachedCourses = getCachedApi("/courses");
  const cachedProgress = getCachedApi("/courses/progress");

  const [courses, setCourses] = useState(() =>
    (cachedCourses?.courses || []).map((c) => ({
      ...c,
      levels: sortCourseLevels(c.levels || []).map((l, i) => ({ ...l, levelNumber: i })),
    }))
  );
  const [userProgress, setUserProgress] = useState(() => cachedProgress?.progress || []);
  const [loading, setLoading] = useState(() => !cachedCourses?.courses);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name"); // "name" | "category" | "progress" | "levels" | "points" | "status"

  // Modals
  const [detailCourse, setDetailCourse] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    category: "Software",
    customCategory: "",
    description: "",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 0,
        levelName: "Level 0",
        rewardPoints: 100,
        prerequisites: "None",
        assessmentType: "MCQ",
        topicsText: "1. Overview & Fundamentals\n2. Core Concepts\n3. Practical Demonstration",
      },
      {
        levelNumber: 1,
        levelName: "Level 1",
        rewardPoints: 300,
        prerequisites: "None",
        assessmentType: "Manual Grading",
        topicsText: "1. Advanced Problem Solving\n2. Real-World Projects\n3. Final Evaluation",
      },
    ],
  });

  const loadData = useCallback(async () => {
    try {
      if (!getCachedApi("/courses")) {
        setLoading(true);
      }
      const [coursesRes, progressRes] = await Promise.all([
        apiFetch("/courses"),
        apiFetch("/courses/progress"),
      ]);

      if (coursesRes?.courses) {
        const sorted = coursesRes.courses.map((c) => ({
          ...c,
          levels: sortCourseLevels(c.levels || []).map((l, i) => ({ ...l, levelNumber: i })),
        }));
        setCourses(sorted);
        setDetailCourse((prev) => {
          if (!prev) return null;
          const match = sorted.find((c) => c._id === prev._id);
          return match || prev;
        });
      }
      if (progressRes?.progress) {
        setUserProgress(progressRes.progress);
      }
    } catch (err) {
      console.error("Failed to load courses data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Robust Level & Course Progress Calculator
  const getCourseProgress = useCallback(
    (course) => {
      const levels = sortCourseLevels(course?.levels || []);
      const totalLevels = Math.max(levels.length, 1);

      if (!userProgress || userProgress.length === 0) {
        return {
          completedIndices: new Set(),
          completedCount: 0,
          totalLevels,
          percent: 0,
          currentLevelName: null,
          nextLevelIdx: 0,
          hasOngoing: false,
        };
      }

      const cId = String(course?._id || "");
      const cName = (course?.name || "").toLowerCase().trim();

      // Find matching user progress records
      const matchingRecords = userProgress.filter((p) => {
        const pCourseId = String(p.courseId?._id || p.courseId || "");
        const pCourseName = String(p.courseId?.name || p.courseName || "").toLowerCase().trim();
        if (pCourseId && pCourseId === cId) return true;
        if (pCourseName && pCourseName === cName) return true;
        if (pCourseName && (pCourseName.startsWith(cName + " - ") || pCourseName.startsWith(cName + " level"))) {
          return true;
        }
        if (cName && (cName.startsWith(pCourseName + " - ") || cName.startsWith(pCourseName + " level"))) {
          return true;
        }
        if (pCourseName && cName && getCourseKey(pCourseName) === getCourseKey(cName)) {
          return true;
        }
        return false;
      });

      if (matchingRecords.length === 0) {
        return {
          completedIndices: new Set(),
          completedCount: 0,
          totalLevels,
          percent: 0,
          currentLevelName: null,
          nextLevelIdx: 0,
          hasOngoing: false,
        };
      }

      const completedIndices = new Set();
      let lastLevelText = null;

      matchingRecords.forEach((record) => {
        // Collect completed levels list with fallback to currentLevel
        const recordLevels = Array.isArray(record.completedLevels) && record.completedLevels.length > 0
          ? [...record.completedLevels]
          : record.currentLevel ? [record.currentLevel] : [];

        recordLevels.forEach((rawLvl) => {
          if (!rawLvl || ["NULL", "NIL", ""].includes(String(rawLvl).toUpperCase())) return;
          lastLevelText = String(rawLvl).trim();

          if (String(rawLvl).trim().toUpperCase() === "COMPLETED") {
            for (let i = 0; i < totalLevels; i++) completedIndices.add(i);
            return;
          }

          const normLvl = String(rawLvl).toLowerCase().trim();
          levels.forEach((lvl, idx) => {
            const lName = (lvl.levelName || "").toLowerCase().trim();
            const lNum = String(lvl.levelNumber !== undefined ? lvl.levelNumber : "");
            if (isLevelMatch(normLvl, lName, lNum, cName)) {
              completedIndices.add(idx);
            }
          });
        });
      });

      const completedCount = Math.min(completedIndices.size, totalLevels);
      const percent = Math.min(100, Math.round((completedCount / totalLevels) * 100));
      const nextLevelIdx = completedCount < totalLevels ? completedCount : -1;
      const hasOngoing = completedCount > 0 && completedCount < totalLevels;

      return {
        completedIndices,
        completedCount,
        totalLevels,
        percent,
        currentLevelName: lastLevelText,
        nextLevelIdx,
        hasOngoing,
      };
    },
    [userProgress]
  );

  // Available Parent Courses (Excludes any rogue standalone level duplicates)
  const availableParentCourses = useMemo(() => {
    const levelSuffixRegex = /\s*[-–]?\s*level\s*[-–]?\s*([0-9]+(?:\.[0-9]+)?[A-Z]?|[A-Z][0-9]*).*/i;
    return courses.filter((c) => {
      if (Array.isArray(c.levels) && c.levels.length > 0) return true;
      return !levelSuffixRegex.test(c.name || "");
    });
  }, [courses]);

  // Dynamic Categories
  const categoryOptions = useMemo(() => {
    const defaultCats = ["Software", "Hardware", "GENERAL Skill", "Beginner", "Advanced"];
    const dynamicCats = availableParentCourses.map((c) => c.category).filter(Boolean);
    return Array.from(new Set(["All", ...defaultCats, ...dynamicCats]));
  }, [availableParentCourses]);

  // Available Courses (1 Card Per Course with Segmented Progress Bar)
  const filteredAvailableCourses = useMemo(() => {
    let list = availableParentCourses;

    if (selectedCategory !== "All") {
      list = list.filter(
        (c) =>
          (c.category || "").toLowerCase() === selectedCategory.toLowerCase() ||
          (selectedCategory === "Advanced" && (c.name || "").toLowerCase().includes("advanced")) ||
          (selectedCategory === "Beginner" && (c.name || "").toLowerCase().includes("beginner"))
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(term) ||
          (c.category || "").toLowerCase().includes(term) ||
          (c.description || "").toLowerCase().includes(term)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "category") {
        return (a.category || "").localeCompare(b.category || "");
      }
      if (sortBy === "levels") {
        return (b.levels?.length || 0) - (a.levels?.length || 0);
      }
      if (sortBy === "progress") {
        const progA = getCourseProgress(a).percent;
        const progB = getCourseProgress(b).percent;
        return progB - progA;
      }
      return 0;
    });
  }, [availableParentCourses, selectedCategory, search, sortBy, getCourseProgress]);

  // "My Courses": Enrolled / Active Parent Courses (guaranteed to include every enrolled course from userProgress)
  const myEnrolledCourses = useMemo(() => {
    const enrolledMap = new Map();

    // 1. Check all availableParentCourses and find any with progress or matching db record
    availableParentCourses.forEach((course) => {
      const prog = getCourseProgress(course);
      const hasDbRecord = (userProgress || []).some((p) => {
        const pId = String(p.courseId?._id || p.courseId || "");
        const cId = String(course._id || "");
        if (pId && cId && pId === cId) return true;
        const pName = String(p.courseId?.name || p.courseName || "").toLowerCase().trim();
        const cName = String(course.name || "").toLowerCase().trim();
        if (pName && cName && (pName === cName || pName.startsWith(cName + " - ") || cName.startsWith(pName + " - "))) return true;
        if (pName && cName && getCourseKey(pName) === getCourseKey(cName)) return true;
        return false;
      });

      if (prog.completedCount > 0 || prog.hasOngoing || hasDbRecord) {
        const key = getCourseKey(course.name || course._id);
        enrolledMap.set(key, course);
      }
    });

    // 2. Also ensure ANY course from userProgress is included (so nothing enrolled is ever lost!)
    (userProgress || []).forEach((p) => {
      const pCourseObj = typeof p.courseId === "object" && p.courseId !== null ? p.courseId : null;
      const rawName = pCourseObj?.name || p.courseName || "";
      if (!rawName) return;
      const key = getCourseKey(rawName);

      if (!enrolledMap.has(key)) {
        // Find if any course in the full catalog matches this key or id
        const catalogMatch = courses.find((c) => {
          if (pCourseObj?._id && String(c._id) === String(pCourseObj._id)) return true;
          return getCourseKey(c.name) === key;
        });

        if (catalogMatch) {
          enrolledMap.set(key, catalogMatch);
        } else if (pCourseObj) {
          enrolledMap.set(key, {
            _id: pCourseObj._id || `prog-${key}`,
            name: pCourseObj.name,
            category: pCourseObj.category || "General",
            description: pCourseObj.description || "",
            levels: Array.isArray(pCourseObj.levels) && pCourseObj.levels.length > 0
              ? pCourseObj.levels
              : [{ levelNumber: 0, levelName: p.currentLevel || "Level 0", rewardPoints: 100 }],
          });
        }
      }
    });

    return Array.from(enrolledMap.values());
  }, [availableParentCourses, courses, getCourseProgress, userProgress]);

  // Filtered & Sorted My Courses
  const filteredMyCourses = useMemo(() => {
    let list = myEnrolledCourses;

    if (selectedCategory !== "All") {
      list = list.filter(
        (c) => (c.category || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(term) ||
          (c.category || "").toLowerCase().includes(term) ||
          (c.description || "").toLowerCase().includes(term)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "category") {
        return (a.category || "").localeCompare(b.category || "");
      }
      if (sortBy === "levels") {
        return (b.levels?.length || 0) - (a.levels?.length || 0);
      }
      if (sortBy === "progress") {
        const progA = getCourseProgress(a).percent;
        const progB = getCourseProgress(b).percent;
        return progB - progA;
      }
      return 0;
    });
  }, [myEnrolledCourses, selectedCategory, search, sortBy, getCourseProgress]);

  // Open Edit Modal (Admin)
  const handleOpenEdit = (course, e) => {
    e.stopPropagation();
    setEditCourse(course);
    setFormData({
      name: course.name,
      category: ["Software", "Hardware", "GENERAL Skill", "Advanced", "Beginner"].includes(course.category)
        ? course.category
        : "Other",
      customCategory: ["Software", "Hardware", "GENERAL Skill", "Advanced", "Beginner"].includes(course.category)
        ? ""
        : course.category,
      description: course.description || "",
      clusterAccess: course.clusterAccess || "Both",
      levels: (course.levels || []).map((lvl, idx) => ({
        levelNumber: lvl.levelNumber !== undefined ? lvl.levelNumber : idx,
        levelName: lvl.levelName || `Level ${idx}`,
        rewardPoints: lvl.rewardPoints || 100,
        prerequisites: lvl.prerequisites || "None",
        assessmentType: lvl.assessmentType || "MCQ",
        topicsText: Array.isArray(lvl.topics) ? lvl.topics.join("\n") : "",
      })),
    });
  };

  // Open Add Modal (Admin)
  const handleOpenAdd = () => {
    setEditCourse(null);
    setFormData({
      name: "",
      category: "Software",
      customCategory: "",
      description: "",
      clusterAccess: "Both",
      levels: [
        {
          levelNumber: 0,
          levelName: "Level 0",
          rewardPoints: 100,
          prerequisites: "None",
          assessmentType: "MCQ",
          topicsText: "1. Overview & Fundamentals\n2. Core Concepts\n3. Practical Demonstration",
        },
        {
          levelNumber: 1,
          levelName: "Level 1",
          rewardPoints: 300,
          prerequisites: "None",
          assessmentType: "Manual Grading",
          topicsText: "1. Advanced Problem Solving\n2. Real-World Applications\n3. Final Evaluation",
        },
      ],
    });
    setShowAddCourse(true);
  };

  // Save Course
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Course name is required");
      return;
    }

    const finalCategory =
      formData.category === "Other" && formData.customCategory.trim()
        ? formData.customCategory.trim()
        : formData.category;

    const formattedLevels = formData.levels.map((lvl, idx) => ({
      levelNumber: idx,
      levelName: lvl.levelName.trim() || `Level ${idx}`,
      rewardPoints: Number(lvl.rewardPoints) || 100,
      prerequisites: lvl.prerequisites ? lvl.prerequisites.trim() : "None",
      assessmentType: lvl.assessmentType || "MCQ",
      topics: (lvl.topicsText || "")
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
    }));

    try {
      setActionLoading(true);
      if (editCourse) {
        await apiFetch(`/courses/${editCourse._id}`, {
          method: "PUT",
          body: {
            name: formData.name.trim(),
            category: finalCategory,
            description: formData.description.trim(),
            clusterAccess: formData.clusterAccess,
            levels: formattedLevels,
          },
        });
      } else {
        await apiFetch("/courses", {
          method: "POST",
          body: {
            name: formData.name.trim(),
            category: finalCategory,
            description: formData.description.trim(),
            clusterAccess: formData.clusterAccess,
            levels: formattedLevels,
          },
        });
      }

      setShowAddCourse(false);
      setEditCourse(null);
      await loadData();
    } catch (err) {
      alert("Failed to save course: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Toggle Level Completed / Not Completed
  const handleToggleLevelProgress = async (course, levelObj, levelIndex) => {
    if (!course?._id) return;
    try {
      setActionLoading(true);
      const targetUserId = currentUser?._id || auth.userId;
      const prog = getCourseProgress(course);
      const isCurrentlyCompleted = prog.completedIndices.has(levelIndex);
      const willBeCompleted = !isCurrentlyCompleted;

      const levelName = levelObj?.levelName || `Level ${levelIndex}`;
      const pointsEarned = Number(levelObj?.rewardPoints) || 100;

      const res = await apiFetch("/courses/progress/update", {
        method: "POST",
        body: {
          userId: targetUserId,
          courseId: course._id,
          levelName,
          completed: willBeCompleted,
          pointsEarned,
        },
      });

      if (res?.success) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to toggle level progress:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Mark Entire Course Completed / Not Completed
  const handleToggleEntireCourse = async (course) => {
    if (!course?._id) return;
    try {
      setActionLoading(true);
      const targetUserId = currentUser?._id || auth.userId;
      const prog = getCourseProgress(course);
      const isAllCompleted = prog.completedCount === prog.totalLevels;
      const willBeCompleted = !isAllCompleted;

      const levels = course.levels || [];
      for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        const isLvlDone = prog.completedIndices.has(i);
        if (willBeCompleted !== isLvlDone) {
          await apiFetch("/courses/progress/update", {
            method: "POST",
            body: {
              userId: targetUserId,
              courseId: course._id,
              levelName: lvl.levelName || `Level ${i}`,
              completed: willBeCompleted,
              pointsEarned: Number(lvl.rewardPoints) || 100,
            },
          });
        }
      }

      await loadData();
    } catch (err) {
      console.error("Failed to toggle entire course progress:", err);
      alert("Failed to update course completion. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = (course) => {
    const sorted = {
      ...course,
      levels: sortCourseLevels(course?.levels || []).map((l, i) => ({ ...l, levelNumber: i })),
    };
    setDetailCourse(sorted);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleBackToCourses = () => {
    setDetailCourse(null);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [detailCourse, activeTab]);

  if (loading) {
    return (
      <UnifiedLoader
        title="Loading Courses Portal…"
        subtitle="Retrieving multi-level curriculum, student progress & rewards"
        minHeight="450px"
      />
    );
  }

  return (
    <div className="courses-container full-width-layout">
      {detailCourse ? (
        /* =========================================================================
           FULL-SCREEN COURSE DETAILS VIEW (Matching College LMS Portal Image 4)
           Navbar remains completely visible; content uses entire screen space
           ========================================================================= */
        <div className="course-details-fullscreen-view">
          {/* Top Bar with Navigation & Breadcrumb */}
          <div className="course-details-nav-bar">
            <button
              type="button"
              className="btn-back-courses"
              onClick={handleBackToCourses}
            >
              ← Back to {activeTab === "available" ? "Courses Available" : "My Courses"}
            </button>
            <div className="course-breadcrumb-trail">
              <span
                className="breadcrumb-root"
                onClick={handleBackToCourses}
              >
                {activeTab === "available" ? "Courses Available" : "My Courses"}
              </span>
              <span className="breadcrumb-sep">/</span>
              <span className="breadcrumb-current">{detailCourse.name}</span>
            </div>
          </div>

          {/* Hero Banner Card with Status Switch */}
          {(() => {
            const detailProg = getCourseProgress(detailCourse);
            const isAllCompleted = detailProg.completedCount === detailProg.totalLevels;
            return (
              <div className="course-details-hero-card">
                <div className="hero-card-left">
                  <h1 className="hero-course-title">{detailCourse.name}</h1>
                  <p className="hero-course-desc">
                    {detailCourse.description ||
                      "Comprehensive modular curriculum designed for mastery and practical application."}
                  </p>
                  <div className="hero-tags-row">
                    <span className="hero-pill-badge">
                      📄 Levels: {(detailCourse.levels || []).length || 2}
                    </span>
                    <span className="hero-pill-badge category">
                      🎓 {detailCourse.category || "General"}
                    </span>
                    <span
                      className={`hero-status-pill ${
                        isAllCompleted
                          ? "completed"
                          : detailProg.completedCount > 0
                          ? "in-progress"
                          : "not-completed"
                      }`}
                    >
                      {isAllCompleted
                        ? "✓ Course Completed"
                        : detailProg.completedCount > 0
                        ? `⏳ In Progress (${detailProg.completedCount}/${detailProg.totalLevels} Levels)`
                        : "○ Not Completed"}
                    </span>
                  </div>

                  <div className="hero-action-buttons">
                    <button
                      type="button"
                      className={`hero-course-toggle-btn ${
                        isAllCompleted ? "btn-mark-incomplete" : "btn-mark-complete"
                      }`}
                      disabled={actionLoading}
                      onClick={() => handleToggleEntireCourse(detailCourse)}
                    >
                      {actionLoading
                        ? "Saving…"
                        : isAllCompleted
                        ? "↺ Mark Entire Course Not Completed"
                        : "✓ Mark Entire Course Completed"}
                    </button>
                  </div>
                </div>
                <div className="hero-card-right">
                  <CourseBannerGraphic course={detailCourse} />
                </div>
              </div>
            );
          })()}

          {/* College Level Cards with Completion Status Toggle */}
          {(() => {
            const detailProg = getCourseProgress(detailCourse);
            const sortedDetailLevels = sortCourseLevels(detailCourse.levels || []);
            return (
              <div className="course-details-levels-container">
                {sortedDetailLevels.map((lvl, index) => {
                  const isLevelDone = detailProg.completedIndices.has(index);
                  const topicsList =
                    Array.isArray(lvl.topics) && lvl.topics.length > 0
                      ? lvl.topics
                      : [
                          `1. Introduction to ${detailCourse.name}`,
                          `2. Core Technical Concepts & Implementation`,
                          `3. Practical Evaluation & Problem Solving`,
                        ];

                  const rawLevelName = lvl.levelName || `Level ${index}`;
                  const coursePrefix = `${detailCourse.name} - `;
                  const displayLevelTitle = rawLevelName.toLowerCase().startsWith(coursePrefix.toLowerCase())
                    ? rawLevelName
                    : `${detailCourse.name} - ${rawLevelName}`;

                  return (
                    <div
                      key={index}
                      className={`college-level-card ${isLevelDone ? "level-is-completed" : ""}`}
                    >
                      <div className="college-level-header">
                        <div className="college-level-title-wrap">
                          <div
                            className={`college-level-number-badge ${
                              isLevelDone ? "completed" : ""
                            }`}
                          >
                            {isLevelDone ? "✓" : index + 1}
                          </div>
                          <h3 className="college-level-title">
                            {displayLevelTitle}
                          </h3>
                        </div>

                        <div className="college-level-header-right">
                          {/* Interactive Status Switcher */}
                          <button
                            type="button"
                            className={`level-status-pill-btn ${
                              isLevelDone ? "completed" : "incomplete"
                            }`}
                            disabled={actionLoading}
                            onClick={() =>
                              handleToggleLevelProgress(detailCourse, lvl, index)
                            }
                            title={
                              isLevelDone
                                ? "Click to switch to Not Completed"
                                : "Click to switch to Completed"
                            }
                          >
                            <span className="switch-dot" />
                            <span>
                              {actionLoading
                                ? "Saving…"
                                : isLevelDone
                                ? "Completed"
                                : "Not Completed"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="college-level-body">
                        {/* Left: Syllabus Topics List with grey rounded pills */}
                        <div className="college-topics-column">
                          {topicsList.map((topic, tIdx) => (
                            <div key={tIdx} className="college-topic-pill">
                              {topic}
                            </div>
                          ))}
                        </div>

                        {/* Right: Meta Details (Rewards, Pre Request, Assessment Type, Action Button) */}
                        <div className="college-meta-column">
                          <div className="college-meta-item">
                            <span className="college-meta-label">With Rewards</span>
                            <span className="college-meta-value highlight-gold">
                              🪙 {lvl.rewardPoints || 100} Points
                            </span>
                          </div>

                          <div className="college-meta-item">
                            <span className="college-meta-label">Pre Request</span>
                            <span className="college-meta-value">
                              {lvl.prerequisites || "None"}
                            </span>
                          </div>

                          <div className="college-meta-item">
                            <span className="college-meta-label">Assessment Type</span>
                            <span className="college-meta-value">
                              {lvl.assessmentType || "MCQ"}
                            </span>
                          </div>

                          {/* Action Button */}
                          <div className="college-meta-item level-action-box">
                            <span className="college-meta-label">Status Action</span>
                            <button
                              type="button"
                              className={`btn-level-status-action ${
                                isLevelDone ? "is-completed" : ""
                              }`}
                              disabled={actionLoading}
                              onClick={() =>
                                handleToggleLevelProgress(detailCourse, lvl, index)
                              }
                            >
                              {actionLoading
                                ? "Saving…"
                                : isLevelDone
                                ? "✓ Completed (Click to Undo)"
                                : "Mark Completed"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        /* =========================================================================
           PRIMARY COURSES VIEW (Courses Available & My Courses Full-Screen Grid)
           ========================================================================= */
        <>
          {/* Header Section */}
          <div className="courses-header-section">
            <div className="courses-title-row">
              <div>
                <h1 className="courses-main-title">
                  <span>🎓</span>{" "}
                  {activeTab === "available" ? "Courses Available" : "My Courses"}
                </h1>
                <p className="courses-count-subtitle">
                  {activeTab === "available"
                    ? `Showing ${filteredAvailableCourses.length} of ${availableParentCourses.length} courses`
                    : `Showing ${filteredMyCourses.length} enrolled courses`}
                </p>
              </div>

              {auth.role === "admin" && (
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-add-course"
                    onClick={() => setShowBulkImportModal(true)}
                    style={{
                      background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                      boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                    }}
                  >
                    <span>📤</span> Bulk Import (CSV / JSON)
                  </button>

                  <button
                    type="button"
                    className="btn-add-course"
                    onClick={handleOpenAdd}
                  >
                    <span>➕</span> Add New Course
                  </button>
                </div>
              )}
            </div>

            {/* Primary Tabs: Courses Available vs My Courses */}
            <div className="courses-nav-tabs">
              <button
                type="button"
                className={`courses-tab-btn ${activeTab === "available" ? "active" : ""}`}
                onClick={() => setActiveTab("available")}
              >
                <span>📖 Courses Available</span>
                <span className="courses-tab-badge">
                  {availableParentCourses.length}
                </span>
              </button>

              <button
                type="button"
                className={`courses-tab-btn ${activeTab === "my-courses" ? "active" : ""}`}
                onClick={() => setActiveTab("my-courses")}
              >
                <span>🎓 My Courses</span>
                <span className="courses-tab-badge">
                  {myEnrolledCourses.length}
                </span>
              </button>
            </div>
          </div>

          {/* Toolbar: Search, Filters, Sorting */}
          <div className="courses-toolbar">
            <div className="courses-search-wrap">
              <span className="courses-search-icon">🔍</span>
              <input
                type="text"
                className="courses-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses by name or category…"
              />
              {search && (
                <button
                  type="button"
                  className="courses-search-clear"
                  onClick={() => setSearch("")}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="courses-filters-wrap">
              <select
                className="courses-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filter by Category"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All Categories" : cat}
                  </option>
                ))}
              </select>

              <select
                className="courses-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort Courses"
              >
                <option value="name">Sort by Name</option>
                <option value="category">Sort by Category</option>
                <option value="levels">Sort by Levels</option>
                <option value="progress">Sort by Progress</option>
              </select>
            </div>
          </div>

          {/* =========================================================================
              VIEW 1: COURSES AVAILABLE (Full-width grid)
             ========================================================================= */}
          {activeTab === "available" && (
            <>
              {filteredAvailableCourses.length === 0 ? (
                <div className="courses-empty-state">
                  <div className="empty-icon-lg">🔍</div>
                  <h3 style={{ color: "#0f172a", margin: "0 0 8px 0" }}>
                    No matching courses found
                  </h3>
                  <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                    Try adjusting your search or category filter to discover courses.
                  </p>
                </div>
              ) : (
                <div className="courses-grid">
                  {filteredAvailableCourses.map((course) => {
                    const sortedLevels = sortCourseLevels(course.levels || []);
                    const sortedCourse = { ...course, levels: sortedLevels };
                    const prog = getCourseProgress(sortedCourse);
                    const totalLevels = sortedLevels.length || 2;

                    return (
                      <div
                        key={course._id}
                        className="portal-course-card"
                        onClick={() => handleOpenDetail(sortedCourse)}
                      >
                        {/* Top Visual Thematic Banner */}
                        <CourseBannerGraphic course={sortedCourse} />

                        {/* Card Content */}
                        <div className="portal-course-content">
                          <h3 className="portal-course-title" title={sortedCourse.name}>
                            {sortedCourse.name}
                          </h3>

                          {/* Meta Information Row */}
                          <div className="portal-course-meta-row">
                            <span className="portal-meta-levels">
                              📄 Levels: {totalLevels}
                            </span>
                            <span className="portal-meta-cat">
                              {sortedCourse.category || "General"}
                            </span>
                          </div>

                          {/* Clean Segmented Progress Bar */}
                          <div className="segmented-progress-wrap">
                            <div className="segmented-progress-row">
                              {Array.from({ length: totalLevels }).map((_, idx) => {
                                const isCompleted = prog.completedIndices.has(idx);
                                return (
                                  <div
                                    key={idx}
                                    className={`segment-pill ${isCompleted ? "completed" : "empty"}`}
                                  />
                                );
                              })}
                            </div>
                            <div className="segmented-progress-meta">
                              Progress: {prog.completedCount}/{prog.totalLevels} levels ({prog.percent}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* =========================================================================
              VIEW 2: MY COURSES (Pure Course Listing, No in-progress/status switches)
             ========================================================================= */}
          {activeTab === "my-courses" && (
            <>
              {filteredMyCourses.length === 0 ? (
                <div className="courses-empty-state">
                  <div className="empty-icon-lg">🎓</div>
                  <h3 style={{ color: "#0f172a", margin: "0 0 8px 0" }}>
                    No enrolled courses found
                  </h3>
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "14px",
                      margin: "0 0 16px 0",
                    }}
                  >
                    You haven’t enrolled in any courses yet. Browse through{" "}
                    <strong>"Courses Available"</strong> to explore our curriculum!
                  </p>
                  <button
                    type="button"
                    className="btn-back-courses"
                    onClick={() => setActiveTab("available")}
                  >
                    Browse Courses Available
                  </button>
                </div>
              ) : (
                <div className="courses-grid">
                  {filteredMyCourses.map((course) => {
                    const sortedLevels = sortCourseLevels(course.levels || []);
                    const sortedCourse = { ...course, levels: sortedLevels };
                    const prog = getCourseProgress(sortedCourse);
                    const totalLevels = sortedLevels.length || 2;

                    return (
                      <div
                        key={course._id}
                        className="portal-course-card"
                        onClick={() => handleOpenDetail(sortedCourse)}
                      >
                        {/* Top Visual Thematic Banner */}
                        <CourseBannerGraphic course={sortedCourse} />

                        {/* Card Content */}
                        <div className="portal-course-content">
                          <h3 className="portal-course-title" title={sortedCourse.name}>
                            {sortedCourse.name}
                          </h3>

                          {/* Meta Information Row */}
                          <div className="portal-course-meta-row">
                            <span className="portal-meta-levels">
                              📄 Levels: {totalLevels}
                            </span>
                            <span className="portal-meta-cat">
                              {sortedCourse.category || "General"}
                            </span>
                          </div>

                          {/* Clean Segmented Progress Bar */}
                          <div className="segmented-progress-wrap">
                            <div className="segmented-progress-row">
                              {Array.from({ length: totalLevels }).map((_, idx) => {
                                const isCompleted = prog.completedIndices.has(idx);
                                return (
                                  <div
                                    key={idx}
                                    className={`segment-pill ${isCompleted ? "completed" : "empty"}`}
                                  />
                                );
                              })}
                            </div>
                            <div className="segmented-progress-meta">
                              Progress: {prog.completedCount}/{prog.totalLevels} levels ({prog.percent}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ===================================================
          ADD / EDIT COURSE MODAL (Admin)
         =================================================== */}
      {(showAddCourse || editCourse) && (
        <div className="course-form-modal-overlay" onClick={() => { setShowAddCourse(false); setEditCourse(null); }}>
          <div className="course-form-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="course-form-header">
              <h2>{editCourse ? `Edit Course: ${editCourse.name}` : "Create New Course"}</h2>
              <button
                type="button"
                className="course-details-close-btn"
                onClick={() => { setShowAddCourse(false); setEditCourse(null); }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="course-form">
              <div className="form-group">
                <label>Course Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Advanced Full Stack Engineering"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Software">Software</option>
                    <option value="Hardware">Hardware</option>
                    <option value="GENERAL Skill">GENERAL Skill</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {formData.category === "Other" && (
                  <div className="form-group">
                    <label>Custom Category Name</label>
                    <input
                      type="text"
                      value={formData.customCategory}
                      onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                      placeholder="e.g., Biotech"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Cluster Access</label>
                  <select
                    value={formData.clusterAccess}
                    onChange={(e) => setFormData({ ...formData, clusterAccess: e.target.value })}
                  >
                    <option value="Both">Both (Tech & Non-Tech)</option>
                    <option value="Core">Core Only</option>
                    <option value="Special">Special Track</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Course Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of course learning objectives and syllabus path…"
                />
              </div>

              {/* Levels Builder */}
              <div className="levels-builder-section">
                <div className="levels-builder-head">
                  <h3>Levels & Milestones ({formData.levels.length})</h3>
                  <button
                    type="button"
                    className="btn-add-level"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        levels: [
                          ...formData.levels,
                          {
                            levelNumber: formData.levels.length,
                            levelName: `Level ${formData.levels.length}`,
                            rewardPoints: 200,
                            prerequisites: "None",
                            assessmentType: "MCQ",
                            topicsText: "1. Key Topic\n2. Practical Exercise",
                          },
                        ],
                      })
                    }
                  >
                    ➕ Add Level
                  </button>
                </div>

                {formData.levels.map((lvl, index) => (
                  <div key={index} className="level-form-card">
                    <div className="level-form-header">
                      <h4>Level {index}</h4>
                      {formData.levels.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-level"
                          onClick={() => {
                            const updated = formData.levels.filter((_, i) => i !== index);
                            setFormData({ ...formData, levels: updated });
                          }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Level Name</label>
                        <input
                          type="text"
                          value={lvl.levelName}
                          onChange={(e) => {
                            const updated = [...formData.levels];
                            updated[index].levelName = e.target.value;
                            setFormData({ ...formData, levels: updated });
                          }}
                          placeholder={`Level ${index}`}
                        />
                      </div>
                      <div className="form-group">
                        <label>Reward Points (RP)</label>
                        <input
                          type="number"
                          value={lvl.rewardPoints}
                          onChange={(e) => {
                            const updated = [...formData.levels];
                            updated[index].rewardPoints = e.target.value;
                            setFormData({ ...formData, levels: updated });
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Assessment Type</label>
                        <select
                          value={lvl.assessmentType}
                          onChange={(e) => {
                            const updated = [...formData.levels];
                            updated[index].assessmentType = e.target.value;
                            setFormData({ ...formData, levels: updated });
                          }}
                        >
                          <option value="MCQ">MCQ</option>
                          <option value="Manual Grading">Manual Grading</option>
                          <option value="Programming">Programming</option>
                          <option value="GD">GD</option>
                          <option value="FA">FA</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Prerequisites</label>
                      <input
                        type="text"
                        value={lvl.prerequisites}
                        onChange={(e) => {
                          const updated = [...formData.levels];
                          updated[index].prerequisites = e.target.value;
                          setFormData({ ...formData, levels: updated });
                        }}
                        placeholder="e.g. None"
                      />
                    </div>

                    <div className="form-group">
                      <label>Syllabus Topics (One per line)</label>
                      <textarea
                        rows={3}
                        value={lvl.topicsText}
                        onChange={(e) => {
                          const updated = [...formData.levels];
                          updated[index].topicsText = e.target.value;
                          setFormData({ ...formData, levels: updated });
                        }}
                        placeholder="1. Topic One&#10;2. Topic Two"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => { setShowAddCourse(false); setEditCourse(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={actionLoading}>
                  {actionLoading ? "Saving…" : editCourse ? "Update Course" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Courses Modal */}
      {showBulkImportModal && (
        <BulkImportCoursesModal
          onClose={() => setShowBulkImportModal(false)}
          onSuccess={() => {
            setShowBulkImportModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
