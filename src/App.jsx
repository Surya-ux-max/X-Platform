import React, { useRef, useEffect, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Trail } from "@react-three/drei";
import { TextureLoader } from "three";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Rocket, Globe, Zap, Shield, Cpu, Users } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════════
   TEXTURE GENERATORS — procedural real-look
══════════════════════════════════════ */
function makeAsteroidTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");

  // base dark rock colour
  ctx.fillStyle = "#2a2520";
  ctx.fillRect(0, 0, size, size);

  // layered noise patches — simulate rock grain
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 14 + 1;
    const l = Math.floor(Math.random() * 60 + 20);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${l},${l - 5},${l - 10},${Math.random() * 0.35 + 0.05})`;
    ctx.fill();
  }
  // crater pits
  for (let i = 0; i < 28; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 22 + 4;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   "rgba(10,8,6,0.85)");
    g.addColorStop(0.6, "rgba(40,35,28,0.4)");
    g.addColorStop(1,   "rgba(80,70,55,0.0)");
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    // crater rim highlight
    const rim = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 1.1);
    rim.addColorStop(0, "rgba(120,100,80,0.0)");
    rim.addColorStop(0.5, "rgba(120,100,80,0.25)");
    rim.addColorStop(1, "rgba(120,100,80,0.0)");
    ctx.beginPath();
    ctx.arc(x, y, r * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = rim;
    ctx.fill();
  }
  // surface streaks
  for (let i = 0; i < 40; i++) {
    const x1 = Math.random() * size, y1 = Math.random() * size;
    const x2 = x1 + (Math.random() - 0.5) * 80, y2 = y1 + (Math.random() - 0.5) * 80;
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? 90 : 30},${Math.random() > 0.5 ? 80 : 25},${Math.random() > 0.5 ? 65 : 20},${Math.random() * 0.2})`;
    ctx.lineWidth = Math.random() * 1.5;
    ctx.stroke();
  }
  return new THREE.CanvasTexture(c);
}

function makeMoonTexture() {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#888880";
  ctx.fillRect(0, 0, size, size);
  // large maria (dark patches)
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = Math.random() * 120 + 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(60,58,55,${Math.random() * 0.5 + 0.2})`);
    g.addColorStop(1, "rgba(60,58,55,0)");
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  }
  // grain
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const l = Math.floor(Math.random() * 50 + 100);
    ctx.fillStyle = `rgba(${l},${l},${l - 5},${Math.random() * 0.12})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // craters
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = Math.random() * 35 + 3;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0,   "rgba(40,38,35,0.9)");
    g.addColorStop(0.7, "rgba(80,78,72,0.3)");
    g.addColorStop(1,   "rgba(140,138,130,0.0)");
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    // rim
    const rim = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.15);
    rim.addColorStop(0, "rgba(200,195,185,0)");
    rim.addColorStop(0.5, "rgba(200,195,185,0.3)");
    rim.addColorStop(1, "rgba(200,195,185,0)");
    ctx.beginPath(); ctx.arc(x, y, r * 1.15, 0, Math.PI * 2);
    ctx.fillStyle = rim; ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

function makeCloudTexture() {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "black"; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = Math.random() * 30 + 3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15 + 0.03})`;
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

/* ══════════════════════════════════════
   3D — Particle Cloud
══════════════════════════════════════ */
function Particles({ count = 1400 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) arr[i] = (Math.random() - 0.5) * 32;
    return arr;
  }, [count]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.025;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#ffffff" transparent opacity={0.45} sizeAttenuation />
    </points>
  );
}

/* ══════════════════════════════════════
   3D — Real Earth Globe (local textures)
══════════════════════════════════════ */
function EarthGlobe() {
  const earthRef  = useRef();
  const cloudsRef = useRef();

  const [colorMap, specMap] = useLoader(TextureLoader, [
    "/earth-day.jpg",
    "/earth-water.png",
  ]);

  const cloudsMap = useMemo(() => makeCloudTexture(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (earthRef.current)  earthRef.current.rotation.y  = t * 0.08;
    if (cloudsRef.current) cloudsRef.current.rotation.y = t * 0.105;
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 96, 96]} />
        <meshPhongMaterial map={colorMap} specularMap={specMap} specular={new THREE.Color(0x555555)} shininess={22} />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.03, 64, 64]} />
        <meshStandardMaterial map={cloudsMap} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.2, 48, 48]} />
        <meshStandardMaterial color="#3366cc" emissive="#1133aa" emissiveIntensity={0.3} transparent opacity={0.13} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.07, 48, 48]} />
        <meshStandardMaterial color="#aaccff" emissive="#aaccff" emissiveIntensity={0.2} transparent opacity={0.06} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════
   3D — Asteroid Belt
══════════════════════════════════════ */
function AsteroidBelt({ count = 120, radius = 4.2 }) {
  const group = useRef();
  const asteroidTex = useMemo(() => makeAsteroidTexture(), []);

  const asteroids = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle  = (i / count) * Math.PI * 2;
      const spread = (Math.random() - 0.5) * 1.4;
      const r      = radius + spread;
      const yOff   = (Math.random() - 0.5) * 0.9;
      const scale  = Math.random() * 0.13 + 0.04;
      const speed  = Math.random() * 0.12 + 0.04;
      const phase  = Math.random() * Math.PI * 2;
      const rotX   = Math.random() * Math.PI;
      const rotZ   = Math.random() * Math.PI;
      const detail = Math.floor(Math.random() * 2);
      // unique scale distortion per axis for jagged look
      const sx = 0.7 + Math.random() * 0.6;
      const sy = 0.5 + Math.random() * 0.8;
      const sz = 0.6 + Math.random() * 0.7;
      return { angle, r, yOff, scale, speed, phase, rotX, rotZ, detail, sx, sy, sz };
    });
  }, [count, radius]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!group.current) return;
    group.current.children.forEach((mesh, i) => {
      const a = asteroids[i];
      const angle = a.phase + t * a.speed;
      mesh.position.x = Math.cos(angle) * a.r;
      mesh.position.z = Math.sin(angle) * a.r;
      mesh.position.y = a.yOff;
      mesh.rotation.x += 0.004;
      mesh.rotation.y += 0.006;
    });
  });

  return (
    <group ref={group}>
      {asteroids.map((a, i) => (
        <mesh key={i} scale={[a.scale * a.sx, a.scale * a.sy, a.scale * a.sz]} rotation={[a.rotX, 0, a.rotZ]}>
          <dodecahedronGeometry args={[1, a.detail]} />
          <meshStandardMaterial
            map={asteroidTex}
            roughness={0.95}
            metalness={0.08}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ══════════════════════════════════════
   3D — Asteroid Belt Ring (orbital plane)
══════════════════════════════════════ */
function BeltRing() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[4.2, 0.55, 2, 180]} />
      <meshStandardMaterial
        color="#ffffff"
        transparent
        opacity={0.018}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ══════════════════════════════════════
   3D — Moon
══════════════════════════════════════ */
function Moon() {
  const ref = useRef();
  const moonTex = useMemo(() => makeMoonTexture(), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.position.x = Math.cos(t * 0.18) * 3.4;
      ref.current.position.z = Math.sin(t * 0.18) * 3.4;
      ref.current.position.y = Math.sin(t * 0.09) * 0.4;
      ref.current.rotation.y += 0.002;
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.28, 48, 48]} />
      <meshStandardMaterial map={moonTex} roughness={1} metalness={0} />
    </mesh>
  );
}

/* ══════════════════════════════════════
   3D — Satellites (3 orbital planes)
══════════════════════════════════════ */
function Satellite({ rx = 0, ry = 0, rz = 0, orbitR = 3.0, speed = 0.55, phase = 0, color = "#ffffff" }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = phase + t * speed;
    if (ref.current) {
      // rotate orbit plane
      const x = Math.cos(angle) * orbitR;
      const y = Math.sin(angle) * orbitR * Math.sin(rx);
      const z = Math.sin(angle) * orbitR * Math.cos(rx);
      ref.current.position.set(x, y, z);
    }
  });
  return (
    <Trail width={0.4} length={12} color={color} attenuation={(t) => t * t}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.05, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={4} />
      </mesh>
    </Trail>
  );
}

/* ══════════════════════════════════════
   3D — Shooting Stars
══════════════════════════════════════ */
function ShootingStars({ count = 6 }) {
  const stars = useMemo(() => Array.from({ length: count }, (_, i) => ({
    speed:  3.5 + Math.random() * 4,
    delay:  Math.random() * 8,
    startX: (Math.random() - 0.5) * 20,
    startY: Math.random() * 6 + 2,
    startZ: (Math.random() - 0.5) * 10,
    dirX:   -(Math.random() * 0.4 + 0.3),
    dirY:   -(Math.random() * 0.3 + 0.1),
  })), [count]);

  const refs = useRef(stars.map(() => React.createRef()));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((r, i) => {
      if (!r.current) return;
      const s = stars[i];
      const progress = ((t * s.speed * 0.15 + s.delay) % 12) / 12;
      r.current.position.x = s.startX + progress * s.dirX * 18;
      r.current.position.y = s.startY + progress * s.dirY * 10;
      r.current.position.z = s.startZ;
      r.current.material.opacity = progress < 0.1 ? progress * 10
        : progress > 0.8 ? (1 - progress) * 5 : 1;
    });
  });

  return (
    <>
      {stars.map((s, i) => (
        <mesh key={i} ref={refs.current[i]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshStandardMaterial
            color="#ffffff" emissive="#ffffff" emissiveIntensity={5}
            transparent opacity={1}
          />
        </mesh>
      ))}
    </>
  );
}

/* ══════════════════════════════════════
   3D — Sun Glow (off-scene light source)
══════════════════════════════════════ */
function SunGlow() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.material.opacity = 0.18 + Math.sin(clock.getElapsedTime() * 0.8) * 0.04;
  });
  return (
    <mesh position={[-9, 5, -6]} ref={ref}>
      <sphereGeometry args={[1.8, 32, 32]} />
      <meshStandardMaterial
        color="#fffbe0"
        emissive="#ffe080"
        emissiveIntensity={1.2}
        transparent
        opacity={0.18}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ══════════════════════════════════════
   Full 3D Scene — scroll-driven camera
══════════════════════════════════════ */
function CameraRig({ scrollProgress }) {
  const { camera } = useThree();
  useFrame(() => {
    // direct mapping — no lerp, no jitter
    const p = scrollProgress.current;
    camera.position.z = 6 - p * 4.8;
    camera.position.y = p * 0.5;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function HeroScene({ scrollProgress }) {
  return (
    <group>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[-9, 5, -6]} intensity={4.2} color="#fff8ee" />
      <pointLight position={[-9, 5, -6]} intensity={2.5} color="#ffe8a0" distance={40} />
      <pointLight position={[8, -4, 6]}  intensity={0.4} color="#aaddff" />
      <Stars radius={90} depth={70} count={6000} factor={3.5} fade speed={0.5} saturation={0} />
      <Particles />
      <Suspense fallback={null}><EarthGlobe /></Suspense>
      <Moon />
      <AsteroidBelt />
      <BeltRing />
      <Satellite rx={0.4}  orbitR={3.0} speed={0.55} phase={0}           color="#ffffff" />
      <Satellite rx={1.1}  orbitR={3.3} speed={0.38} phase={Math.PI}     color="#dddddd" />
      <Satellite rx={-0.7} orbitR={2.8} speed={0.72} phase={Math.PI / 2} color="#ffffff" />
      <ShootingStars count={7} />
      <SunGlow />
      <CameraRig scrollProgress={scrollProgress} />
      <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} autoRotate autoRotateSpeed={0.2} />
    </group>
  );
}

/* ══════════════════════════════════════
   Tilt Card
══════════════════════════════════════ */
function TiltCard({ children }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-60, 60], [6, -6]);
  const rotateY = useTransform(x, [-60, 60], [-6, 6]);

  return (
    <motion.div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left - r.width / 2);
        y.set(e.clientY - r.top - r.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.04 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════
   APP
══════════════════════════════════════ */
export default function App() {
  const badgeRef       = useRef();
  const h1Ref          = useRef();
  const subRef         = useRef();
  const ctaRef         = useRef();
  const scrollRef      = useRef();
  const canvasWrapRef  = useRef();   // sticky outer wrapper
  const canvasRef      = useRef();   // canvas opacity target
  const textSectionRef = useRef();   // hero text below
  const scrollProgress = useRef(0);  // mutable — read inside useFrame
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // ── entry animations
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(badgeRef.current, { opacity: 0, y: 24, duration: 0.7 }, 0.2)
      .from(h1Ref.current,    { opacity: 0, y: 50, duration: 1.0 }, 0.4)
      .from(subRef.current,   { opacity: 0, y: 24, duration: 0.8 }, 0.8)
      .from(ctaRef.current,   { opacity: 0, y: 16, duration: 0.6 }, 1.1)
      .from(scrollRef.current,{ opacity: 0, duration: 0.5 },        1.5);

    // ── scroll-driven 3D zoom
    // canvasWrapRef is 300vh tall; canvas is sticky inside it
    ScrollTrigger.create({
      trigger: canvasWrapRef.current,
      start:   "top top",
      end:     "bottom bottom",
      scrub:   true,           // instant — no lag fighting camera
      onUpdate: (self) => {
        scrollProgress.current = self.progress;

        // fade canvas out in last 25%
        if (canvasRef.current) {
          const fade = self.progress > 0.75
            ? 1 - (self.progress - 0.75) / 0.25
            : 1;
          canvasRef.current.style.opacity = String(Math.max(0, fade));
        }

        // reveal text section in last 30%
        if (textSectionRef.current) {
          const show = self.progress > 0.7
            ? (self.progress - 0.7) / 0.3
            : 0;
          const clamped = Math.min(1, Math.max(0, show));
          // set directly — NO css transition on this element
          textSectionRef.current.style.opacity   = String(clamped);
          textSectionRef.current.style.transform = `translateY(${(1 - clamped) * 50}px)`;
        }
      },
    });

    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  const features = [
    { icon: <Globe size={26} />,  title: "Global Reach",      desc: "Instant connections across 180+ countries with zero-latency infrastructure." },
    { icon: <Zap size={26} />,    title: "Lightning Fast",    desc: "Sub-millisecond delivery powered by distributed edge computing." },
    { icon: <Rocket size={26} />, title: "Future Ready",      desc: "AI-native architecture built for the next decade of digital life." },
    { icon: <Shield size={26} />, title: "Secure by Default", desc: "End-to-end encryption and zero-trust security on every layer." },
    { icon: <Cpu size={26} />,    title: "Grok AI Native",    desc: "Your intelligent co-pilot embedded directly into every interaction." },
    { icon: <Users size={26} />,  title: "Creator Economy",   desc: "Monetize your audience with built-in payments and subscriptions." },
  ];

  const stats = [
    { value: "600M+", label: "Monthly Users" },
    { value: "500B+", label: "Posts Indexed" },
    { value: "180+",  label: "Countries" },
    { value: "<1ms",  label: "Latency" },
  ];

  /* ── shared style tokens ── */
  const S = {
    dimText:   "rgba(255,255,255,0.45)",
    border:    "1px solid rgba(255,255,255,0.08)",
    borderHov: "rgba(255,255,255,0.25)",
    cardBg:    "rgba(255,255,255,0.03)",
  };

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden" }}>

      {/* ── Floating Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 56px", height: 66,
        background: scrolled ? "rgba(0,0,0,0.82)" : "transparent",
        backdropFilter: scrolled ? "blur(24px)" : "none",
        borderBottom: scrolled ? S.border : "none",
        transition: "all 0.4s ease",
      }}>
        <span style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1px", lineHeight: 1 }}>𝕏</span>

        <div style={{ display: "flex", gap: 40, fontSize: 13, color: S.dimText }}>
          {["About", "Features", "Pricing", "Blog"].map(l => (
            <a key={l} href="#" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "#fff"}
              onMouseLeave={e => e.target.style.color = S.dimText}>{l}</a>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.18)", color: "#fff", padding: "8px 22px", borderRadius: 999, fontSize: 13, cursor: "pointer", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}>
            Sign In
          </button>
          <button style={{ background: "#fff", color: "#000", padding: "8px 22px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#d4d4d4"}
            onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
            Get Started
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════
          HERO — sticky 3D zoom on scroll
      ══════════════════════════════════════ */}

      {/* Outer wrapper: 300vh tall so scroll has room to drive the animation */}
      <div ref={canvasWrapRef} style={{ position: "relative", height: "300vh" }}>

        {/* Sticky canvas — stays fixed while user scrolls through 300vh */}
        <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
          <div ref={canvasRef} style={{ width: "100%", height: "100%" }}>
            <Canvas camera={{ position: [0, 0, 6], fov: 48 }} style={{ width: "100%", height: "100%" }}>
              <HeroScene scrollProgress={scrollProgress} />
            </Canvas>
          </div>

          {/* Bottom fade into black */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 180,
            pointerEvents: "none",
            background: "linear-gradient(to bottom, transparent, #000)",
          }} />

          {/* Scroll hint — fades out as user scrolls */}
          <div ref={scrollRef} style={{
            position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 3,
            textTransform: "uppercase", pointerEvents: "none",
          }}>
            <span>Scroll</span>
            <div style={{
              width: 1, height: 36,
              background: "linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)",
              animation: "scrollPulse 2s infinite",
            }} />
          </div>
        </div>

        {/* Hero text — absolutely positioned at bottom of the 300vh block
            so it slides up into view as canvas fades out */}
        <div
          ref={textSectionRef}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "#000", textAlign: "center",
            padding: "100px 24px 80px",
            opacity: 0,
            transform: "translateY(50px)",
            willChange: "opacity, transform",
          }}
        >
          {/* Badge */}
          <div ref={badgeRef} style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 999, padding: "7px 18px", fontSize: 12,
            color: "rgba(255,255,255,0.75)", marginBottom: 32, letterSpacing: "0.5px",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#fff",
              display: "inline-block", animation: "blink 2s infinite",
            }} />
            Now with Grok AI — Live
          </div>

          {/* Headline */}
          <h1 ref={h1Ref} style={{
            fontSize: "clamp(48px, 8vw, 100px)", fontWeight: 900,
            lineHeight: 0.95, letterSpacing: "-4px",
            margin: "0 0 28px", color: "#fff",
          }}>
            The Everything<br />
            <span style={{
              WebkitTextStroke: "2.5px #fff",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}>App.</span>
          </h1>

          {/* Subtext */}
          <p ref={subRef} style={{
            fontSize: "clamp(15px, 1.8vw, 18px)", color: "rgba(255,255,255,0.55)",
            lineHeight: 1.75, maxWidth: 500, margin: "0 auto 44px",
          }}>
            X is the global town square — where ideas ignite, communities thrive,
            and the future is written in real time.
          </p>

          {/* CTA */}
          <div ref={ctaRef} style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <button style={{
              background: "#fff", color: "#000", padding: "15px 40px",
              borderRadius: 999, fontSize: 15, fontWeight: 700, border: "none",
              cursor: "pointer", transition: "all 0.25s",
              boxShadow: "0 0 32px rgba(255,255,255,0.2)",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#d4d4d4"; e.currentTarget.style.boxShadow = "0 0 48px rgba(255,255,255,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff";    e.currentTarget.style.boxShadow = "0 0 32px rgba(255,255,255,0.2)"; }}>
              Join X Today
            </button>
            <button style={{
              background: "transparent", color: "#fff",
              padding: "15px 40px", borderRadius: 999, fontSize: 15,
              border: "1.5px solid rgba(255,255,255,0.25)", cursor: "pointer",
              transition: "all 0.25s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = "transparent"; }}>
              Watch Demo ▶
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <section style={{ borderTop: S.border, borderBottom: S.border, background: "rgba(255,255,255,0.015)", padding: "44px 80px" }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, textAlign: "center" }}>
          {stats.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}>
              <div style={{ fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 900, letterSpacing: "-1px" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: S.dimText, marginTop: 6, letterSpacing: "1px", textTransform: "uppercase" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "120px 80px", maxWidth: 1300, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 72 }}>
          <p style={{ fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 18 }}>Platform</p>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 54px)", fontWeight: 900, letterSpacing: "-2px", margin: 0 }}>
            Built for the next era
          </h2>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {features.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.6 }}>
              <TiltCard>
                <div style={{
                  background: S.cardBg, border: S.border, borderRadius: 20,
                  padding: "36px 30px", backdropFilter: "blur(10px)",
                  transition: "border-color 0.3s, background 0.3s", cursor: "default",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = S.borderHov; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = S.cardBg; }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 13, marginBottom: 22,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                  }}>
                    {f.icon}
                  </div>
                  <h4 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 10px", letterSpacing: "-0.3px" }}>{f.title}</h4>
                  <p style={{ fontSize: 14, color: S.dimText, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: "0 80px 120px", maxWidth: 1300, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 28, padding: "80px 60px", textAlign: "center",
            position: "relative", overflow: "hidden",
          }}>
          {/* subtle corner glows */}
          <div style={{ position: "absolute", top: -100, right: -100, width: 350, height: 350, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(80px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -100, left: -100, width: 350, height: 350, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(80px)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: "clamp(28px, 4vw, 54px)", fontWeight: 900, letterSpacing: "-2px", margin: "0 0 16px" }}>
            Ready to shape the future?
          </h2>
          <p style={{ fontSize: 16, color: S.dimText, margin: "0 0 44px" }}>
            Join 600 million people already on X.
          </p>
          <button style={{
            background: "#fff", color: "#000", padding: "16px 52px",
            borderRadius: 999, fontSize: 16, fontWeight: 700, border: "none",
            cursor: "pointer", transition: "all 0.25s",
            boxShadow: "0 0 40px rgba(255,255,255,0.18)",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#d4d4d4"; e.currentTarget.style.boxShadow = "0 0 60px rgba(255,255,255,0.35)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.boxShadow = "0 0 40px rgba(255,255,255,0.18)"; }}>
            Create Your Account →
          </button>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: S.border, padding: "36px 80px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "rgba(255,255,255,0.28)", fontSize: 13,
      }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: "rgba(255,255,255,0.55)" }}>𝕏</span>
        <span>© 2026 X Corp. All rights reserved.</span>
        <div style={{ display: "flex", gap: 28 }}>
          {["Privacy", "Terms", "Cookies"].map(l => (
            <a key={l} href="#" style={{ color: "inherit", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "#fff"}
              onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.28)"}>{l}</a>
          ))}
        </div>
      </footer>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; }
        @keyframes blink {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(1.5); }
        }
        @keyframes scrollPulse {
          0%,100% { opacity:0.4; }
          50%      { opacity:1; }
        }
        @media (max-width: 860px) {
          nav { padding: 0 20px !important; }
          nav > div:nth-child(2) { display: none; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
          div[style*="repeat(3,1fr)"] { grid-template-columns: 1fr !important; }
          div[style*="repeat(4,1fr)"] { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  );
}
