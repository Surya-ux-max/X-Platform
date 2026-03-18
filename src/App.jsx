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
   3D — JET FIRE PARTICLE SYSTEM
   Emits from engine nozzles, flows backward (+X)
══════════════════════════════════════ */
function JetFire({ offset = [0, 0, 0], scale = 1 }) {
  const ref = useRef();
  const COUNT = 120;

  const { positions, velocities, lifetimes, sizes } = useMemo(() => {
    const positions  = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const lifetimes  = new Float32Array(COUNT);
    const sizes      = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      lifetimes[i] = Math.random();
      sizes[i]     = Math.random() * 0.06 + 0.02;
    }
    return { positions, velocities, lifetimes, sizes };
  }, []);

  // colour array: hot white core → orange → red → transparent
  const colors = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    return arr;
  }, []);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array;
    const col = ref.current.geometry.attributes.color.array;
    const sz  = ref.current.geometry.attributes.size.array;

    for (let i = 0; i < COUNT; i++) {
      lifetimes[i] += delta * 1.8;
      if (lifetimes[i] > 1) {
        // respawn at nozzle
        lifetimes[i] = 0;
        pos[i * 3]     = offset[0];
        pos[i * 3 + 1] = offset[1] + (Math.random() - 0.5) * 0.04;
        pos[i * 3 + 2] = offset[2] + (Math.random() - 0.5) * 0.04;
        velocities[i * 3]     = (0.8 + Math.random() * 0.6) * scale;  // shoot right (+X)
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
      }

      pos[i * 3]     += velocities[i * 3]     * delta;
      pos[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      pos[i * 3 + 2] += velocities[i * 3 + 2] * delta;

      const life = lifetimes[i]; // 0→1
      // colour: 0→0.2 white, 0.2→0.5 orange, 0.5→1 red→dark
      if (life < 0.2) {
        col[i*3]=1; col[i*3+1]=0.95; col[i*3+2]=0.8;  // hot white
      } else if (life < 0.5) {
        const t = (life - 0.2) / 0.3;
        col[i*3]=1; col[i*3+1]=0.6-t*0.4; col[i*3+2]=0.1*(1-t); // orange
      } else {
        const t = (life - 0.5) / 0.5;
        col[i*3]=1-t*0.6; col[i*3+1]=0.1*(1-t); col[i*3+2]=0; // red→dark
      }
      sz[i] = sizes[i] * scale * (1 - life * 0.8);
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.geometry.attributes.color.needsUpdate    = true;
    ref.current.geometry.attributes.size.needsUpdate     = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]} />
        <bufferAttribute attach="attributes-size"     args={[new Float32Array(COUNT), 1]} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors size={0.08 * scale} sizeAttenuation
        transparent opacity={0.9} depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ══════════════════════════════════════
   3D — HEAVY CRUISER SPACESHIP
   Wide saucer hull + swept delta wings + quad nacelles + bridge tower
   Travels right → left, enters from deep z toward camera
══════════════════════════════════════ */
function Spaceship({ lane = 0, speed = 1, delay = 0 }) {
  const group = useRef();
  const M = { color: "#c8c8c8", metalness: 0.95, roughness: 0.12 };
  const MD = { color: "#888", metalness: 1, roughness: 0.08 };
  const DARK = { color: "#444", metalness: 0.9, roughness: 0.2 };

  const path = useMemo(() => ({
    startX:  20, endX: -20,
    startZ: -12 + lane * 3, endZ: 4 + lane * 1.5,
    y: (lane - 1) * 1.8,
    tilt: -0.15 + lane * 0.05,
  }), [lane]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const cyc = 16 / speed;
    const raw = ((t + delay) % cyc) / cyc;
    const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
    group.current.position.x = path.startX + (path.endX - path.startX) * p;
    group.current.position.z = path.startZ + (path.endZ - path.startZ) * p;
    group.current.position.y = path.y + Math.sin(t * 0.5 + delay) * 0.1;
    group.current.rotation.y = -Math.PI / 2 + Math.sin(t * 0.25 + delay) * 0.03;
    group.current.rotation.z = path.tilt + Math.sin(t * 0.4 + delay) * 0.025;
  });

  // nozzle positions for 4 engines
  const nozzles = [[-0.55, 0.08, 0.28], [-0.55, 0.08, -0.28], [-0.55, -0.08, 0.18], [-0.55, -0.08, -0.18]];

  return (
    <group ref={group}>
      {/* ── Primary saucer hull (wide flat ellipsoid via scaled sphere) ── */}
      <mesh scale={[1.1, 0.18, 0.72]}>
        <sphereGeometry args={[0.55, 32, 16]} />
        <meshStandardMaterial {...M} />
      </mesh>

      {/* ── Upper hull ridge (spine) ── */}
      <mesh position={[0, 0.07, 0]} scale={[1, 0.5, 0.3]}>
        <sphereGeometry args={[0.38, 20, 10]} />
        <meshStandardMaterial {...M} />
      </mesh>

      {/* ── Bridge tower ── */}
      <mesh position={[0.12, 0.16, 0]}>
        <boxGeometry args={[0.18, 0.1, 0.14]} />
        <meshStandardMaterial {...M} />
      </mesh>
      {/* bridge viewport strip */}
      <mesh position={[0.18, 0.17, 0]}>
        <boxGeometry args={[0.06, 0.04, 0.12]} />
        <meshStandardMaterial color="#88ccff" emissive="#2255aa" emissiveIntensity={1.2}
          transparent opacity={0.85} roughness={0} metalness={0.1} />
      </mesh>

      {/* ── Nose prow (elongated forward) ── */}
      <mesh position={[0.62, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.09, 0.55, 12]} />
        <meshStandardMaterial {...M} />
      </mesh>
      {/* prow underside keel */}
      <mesh position={[0.45, -0.06, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.3, 8]} />
        <meshStandardMaterial {...MD} />
      </mesh>

      {/* ── Swept delta wings (port & starboard) ── */}
      {/* main wing panels — tapered box swept back */}
      <mesh position={[-0.05, -0.02, 0.52]} rotation={[0, -0.38, 0.06]}>
        <boxGeometry args={[0.72, 0.025, 0.38]} />
        <meshStandardMaterial {...M} />
      </mesh>
      <mesh position={[-0.05, -0.02, -0.52]} rotation={[0, 0.38, -0.06]}>
        <boxGeometry args={[0.72, 0.025, 0.38]} />
        <meshStandardMaterial {...M} />
      </mesh>
      {/* wing tip fins */}
      <mesh position={[-0.28, 0.04, 0.78]} rotation={[0, -0.5, 0.35]}>
        <boxGeometry args={[0.22, 0.12, 0.018]} />
        <meshStandardMaterial {...MD} />
      </mesh>
      <mesh position={[-0.28, 0.04, -0.78]} rotation={[0, 0.5, -0.35]}>
        <boxGeometry args={[0.22, 0.12, 0.018]} />
        <meshStandardMaterial {...MD} />
      </mesh>

      {/* ── Ventral strakes (under-hull detail) ── */}
      <mesh position={[0.1, -0.1, 0.18]}>
        <boxGeometry args={[0.5, 0.018, 0.06]} />
        <meshStandardMaterial {...DARK} />
      </mesh>
      <mesh position={[0.1, -0.1, -0.18]}>
        <boxGeometry args={[0.5, 0.018, 0.06]} />
        <meshStandardMaterial {...DARK} />
      </mesh>

      {/* ── Hull panel lines (surface detail boxes) ── */}
      <mesh position={[0.25, 0.1, 0.12]}>
        <boxGeometry args={[0.28, 0.008, 0.08]} />
        <meshStandardMaterial {...DARK} />
      </mesh>
      <mesh position={[0.25, 0.1, -0.12]}>
        <boxGeometry args={[0.28, 0.008, 0.08]} />
        <meshStandardMaterial {...DARK} />
      </mesh>
      <mesh position={[-0.1, 0.1, 0]}>
        <boxGeometry args={[0.18, 0.008, 0.22]} />
        <meshStandardMaterial {...DARK} />
      </mesh>

      {/* ── Sensor/antenna array (top) ── */}
      <mesh position={[0.3, 0.24, 0]} rotation={[0, 0, 0.15]}>
        <cylinderGeometry args={[0.005, 0.005, 0.14, 4]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.3, 0.31, 0]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial color="#ff4400" emissive="#ff4400" emissiveIntensity={4}
          transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* ── Upper nacelle pylons ── */}
      <mesh position={[-0.22, 0.04, 0.28]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.025, 0.12, 6]} />
        <meshStandardMaterial {...MD} />
      </mesh>
      <mesh position={[-0.22, 0.04, -0.28]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.025, 0.12, 6]} />
        <meshStandardMaterial {...MD} />
      </mesh>

      {/* ── 4 engine nacelles ── */}
      {nozzles.map(([nx, ny, nz], i) => (
        <group key={i}>
          {/* nacelle body */}
          <mesh position={[nx + 0.12, ny, nz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.038, 0.055, 0.38, 10]} />
            <meshStandardMaterial {...MD} />
          </mesh>
          {/* nacelle intake ring */}
          <mesh position={[nx + 0.31, ny, nz]}>
            <torusGeometry args={[0.055, 0.01, 8, 18]} />
            <meshStandardMaterial {...DARK} />
          </mesh>
          {/* nozzle bell */}
          <mesh position={[nx, ny, nz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.042, 0.032, 0.06, 10]} />
            <meshStandardMaterial color="#333" metalness={1} roughness={0.05} />
          </mesh>
          {/* engine glow ring */}
          <mesh position={[nx - 0.01, ny, nz]}>
            <torusGeometry args={[0.036, 0.009, 8, 20]} />
            <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={4}
              transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* inner core glow */}
          <mesh position={[nx - 0.01, ny, nz]}>
            <circleGeometry args={[0.028, 12]} />
            <meshStandardMaterial color="#ffaa00" emissive="#ff8800" emissiveIntensity={5}
              transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false}
              side={THREE.DoubleSide} />
          </mesh>
          <JetFire offset={[nx, ny, nz]} scale={1.4} />
          <pointLight position={[nx, ny, nz]} intensity={1.5} color="#ff5500" distance={0.9} />
        </group>
      ))}

      {/* ── Weapon hardpoints on wings ── */}
      <mesh position={[0.08, -0.04, 0.62]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
        <meshStandardMaterial color="#555" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.08, -0.04, -0.62]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 6]} />
        <meshStandardMaterial color="#555" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ══════════════════════════════════════
   3D — FREE-FLYING ASTEROIDS
   Travel right→left at varying depths, tumbling as they go
══════════════════════════════════════ */
function FlyingAsteroids({ count = 14 }) {
  const group = useRef();
  const asteroidTex = useMemo(() => makeAsteroidTexture(), []);

  const rocks = useMemo(() => Array.from({ length: count }, (_, i) => ({
    speed:  0.4 + Math.random() * 0.9,
    delay:  Math.random() * 20,
    y:      (Math.random() - 0.5) * 8,
    z:      -10 + Math.random() * 14,     // spread across depth
    scale:  0.06 + Math.random() * 0.22,
    sx:     0.6 + Math.random() * 0.8,
    sy:     0.5 + Math.random() * 0.9,
    sz:     0.6 + Math.random() * 0.8,
    rotSpeedX: (Math.random() - 0.5) * 0.8,
    rotSpeedY: (Math.random() - 0.5) * 0.6,
    rotSpeedZ: (Math.random() - 0.5) * 0.5,
    detail: Math.floor(Math.random() * 2),
  })), [count]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((mesh, i) => {
      const r = rocks[i];
      const cyc = 28 / r.speed;
      const raw = ((t + r.delay) % cyc) / cyc;
      // right to left: x goes from +16 to -16
      mesh.position.x = 16 - raw * 32;
      mesh.position.y = r.y + Math.sin(t * 0.3 + i) * 0.15;
      mesh.position.z = r.z;
      // tumble
      mesh.rotation.x += r.rotSpeedX * delta;
      mesh.rotation.y += r.rotSpeedY * delta;
      mesh.rotation.z += r.rotSpeedZ * delta;
    });
  });

  return (
    <group ref={group}>
      {rocks.map((r, i) => (
        <mesh key={i} scale={[r.scale * r.sx, r.scale * r.sy, r.scale * r.sz]}>
          <dodecahedronGeometry args={[1, r.detail]} />
          <meshStandardMaterial map={asteroidTex} roughness={0.95} metalness={0.08} />
        </mesh>
      ))}
    </group>
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
   3D — REALISTIC SATELLITE
   Box body + solar panel wings + dish antenna + trail
══════════════════════════════════════ */
function Satellite({ rx = 0, orbitR = 3.0, speed = 0.55, phase = 0, color = "#ffffff" }) {
  const groupRef = useRef();
  const bodyRef  = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = phase + t * speed;
    if (groupRef.current) {
      const x = Math.cos(angle) * orbitR;
      const y = Math.sin(angle) * orbitR * Math.sin(rx);
      const z = Math.sin(angle) * orbitR * Math.cos(rx);
      groupRef.current.position.set(x, y, z);
      // face direction of travel
      groupRef.current.rotation.y = angle + Math.PI / 2;
    }
    // slow body tumble
    if (bodyRef.current) bodyRef.current.rotation.x += 0.004;
  });

  return (
    <Trail width={0.35} length={14} color={color} attenuation={(t) => t * t}>
      <group ref={groupRef}>
        <group ref={bodyRef}>
          {/* ── Main body box ── */}
          <mesh>
            <boxGeometry args={[0.09, 0.07, 0.07]} />
            <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.15} />
          </mesh>

          {/* ── Solar panel wings (port & starboard) ── */}
          {[-1, 1].map((side, i) => (
            <group key={i} position={[0, 0, side * 0.14]}>
              {/* panel frame */}
              <mesh>
                <boxGeometry args={[0.07, 0.005, 0.1]} />
                <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.6} />
              </mesh>
              {/* solar cells — dark blue tinted */}
              <mesh position={[0, 0.003, 0]}>
                <boxGeometry args={[0.065, 0.002, 0.095]} />
                <meshStandardMaterial color="#0a0a30" emissive="#0022aa"
                  emissiveIntensity={0.4} metalness={0.1} roughness={0.4} />
              </mesh>
              {/* cell grid lines */}
              {[-0.02, 0, 0.02].map((ox, j) => (
                <mesh key={j} position={[ox, 0.005, 0]}>
                  <boxGeometry args={[0.003, 0.003, 0.09]} />
                  <meshStandardMaterial color="#333366" />
                </mesh>
              ))}
            </group>
          ))}

          {/* ── Dish antenna ── */}
          <mesh position={[0.06, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.04, 0.025, 12, 1, true]} />
            <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2}
              side={THREE.DoubleSide} />
          </mesh>
          {/* dish stem */}
          <mesh position={[0.06, 0.055, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.03, 5]} />
            <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
          </mesh>

          {/* ── Status beacon light ── */}
          <mesh position={[-0.05, 0.04, 0]}>
            <sphereGeometry args={[0.008, 6, 6]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={6}
              transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <pointLight position={[-0.05, 0.04, 0]} intensity={0.4} color={color} distance={0.5} />
        </group>
      </group>
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

      {/* 3 spaceships on different lanes, speeds, delays */}
      <Spaceship lane={0} speed={1.0} delay={0}  />
      <Spaceship lane={1} speed={0.7} delay={5}  />
      <Spaceship lane={2} speed={1.3} delay={9}  />

      {/* Free-flying asteroids right→left at varying depths */}
      <FlyingAsteroids count={14} />

      <Satellite rx={0.4}  orbitR={3.0} speed={0.55} phase={0}               color="#ffffff" />
      <Satellite rx={1.1}  orbitR={3.3} speed={0.38} phase={Math.PI}         color="#dddddd" />
      <Satellite rx={-0.7} orbitR={2.8} speed={0.72} phase={Math.PI / 2}     color="#ffffff" />
      <Satellite rx={0.9}  orbitR={3.6} speed={0.28} phase={Math.PI * 1.5}   color="#eeeeee" />
      <Satellite rx={-1.3} orbitR={3.1} speed={0.61} phase={Math.PI * 0.75}  color="#ffffff" />
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
