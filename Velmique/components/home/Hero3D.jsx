"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows, Text } from "@react-three/drei";
import { Suspense, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const slides = [
  {
    eyebrow: "Signature",
    title: "Phantom",
    accent: "Encens",
    tagline: "Oud · Frankincense · Amber",
    href: "/product/phantom-encens",
    bottle: "#e5c9a2",
    liquid: "#b8624f",
    capColor: "#1f1b16",
    shape: "flacon", // classic rectangular shoulder bottle
  },
  {
    eyebrow: "New",
    title: "Lumière",
    accent: "Dorée",
    tagline: "Saffron · Honey · Sandalwood",
    href: "/product/lumiere-doree",
    bottle: "#e9d8b4",
    liquid: "#c5a880",
    capColor: "#b8624f",
    shape: "obelisk", // tall slim with pyramid cap
  },
  {
    eyebrow: "Heritage",
    title: "Velvet",
    accent: "Oud",
    tagline: "Rose · Oud · Musk",
    href: "/product/velvet-oud",
    bottle: "#7a4a38",
    liquid: "#3a2218",
    capColor: "#d4a872",
    shape: "stepped", // art deco tiered
  },
];

// Reusable glass + metal materials
const glassProps = (color) => ({
  color,
  metalness: 0.05,
  roughness: 0.08,
  transmission: 0.96,
  thickness: 1.6,
  ior: 1.5,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  transparent: true,
  opacity: 0.95,
});
const liquidProps = (color) => ({
  color,
  metalness: 0.15,
  roughness: 0.3,
  transmission: 0.25,
  thickness: 0.4,
  ior: 1.35,
  transparent: true,
  opacity: 0.9,
});

// Label with VELMIQUE branding — shared across shapes
function Label({ z = 0.381, width = 1.05, height = 1.1 }) {
  return (
    <>
      <mesh position={[0, 0.08, z]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#fdfaf3" roughness={0.6} />
      </mesh>
      <Text position={[0, 0.32, z + 0.001]} fontSize={0.14} color="#1f1b16" anchorX="center" anchorY="middle" letterSpacing={0.22}>
        VELMIQUE
      </Text>
      <mesh position={[0, 0.2, z + 0.002]}>
        <planeGeometry args={[0.32, 0.005]} />
        <meshStandardMaterial color="#b8624f" metalness={0.8} roughness={0.3} />
      </mesh>
      <Text position={[0, 0.1, z + 0.002]} fontSize={0.05} color="#4d4840" anchorX="center" anchorY="middle" letterSpacing={0.3}>
        EAU DE PARFUM
      </Text>
      <Text position={[0, 0.01, z + 0.002]} fontSize={0.045} color="#8a8378" anchorX="center" anchorY="middle" letterSpacing={0.25}>
        PARIS
      </Text>
      <Text position={[0, -0.1, z + 0.002]} fontSize={0.04} color="#b8624f" anchorX="center" anchorY="middle" letterSpacing={0.4}>
        50 ML
      </Text>
    </>
  );
}

/* ──── SHAPE 1: Classic Flacon — rectangular, heavy shoulders ──── */
function FlaconBottle({ bottle, liquid, capColor }) {
  return (
    <group>
      {/* Main body — squat rectangle */}
      <mesh castShadow>
        <boxGeometry args={[1.6, 2.1, 0.8]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Shoulder taper */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[1.2, 0.25, 0.6]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Liquid fill inside */}
      <mesh position={[0, -0.45, 0]}>
        <boxGeometry args={[1.48, 1.15, 0.7]} />
        <meshPhysicalMaterial {...liquidProps(liquid)} />
      </mesh>
      <Label z={0.41} width={1.15} height={1.2} />
      {/* Neck */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.3, 32]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Chunky square cap */}
      <mesh position={[0, 1.78, 0]} castShadow>
        <boxGeometry args={[0.88, 0.45, 0.88]} />
        <meshStandardMaterial color={capColor} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Cap top ring detail */}
      <mesh position={[0, 2.02, 0]} castShadow>
        <boxGeometry args={[0.94, 0.04, 0.94]} />
        <meshStandardMaterial color="#b8624f" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ──── SHAPE 2: Obelisk — tall narrow with pyramid cap ──── */
function ObeliskBottle({ bottle, liquid, capColor }) {
  return (
    <group>
      {/* Tall slim rectangular body */}
      <mesh castShadow>
        <boxGeometry args={[1.1, 2.6, 0.9]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Slight taper shoulder at top */}
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[0.85, 0.25, 0.72]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Liquid fill */}
      <mesh position={[0, -0.3, 0]}>
        <boxGeometry args={[1.0, 1.7, 0.82]} />
        <meshPhysicalMaterial {...liquidProps(liquid)} />
      </mesh>
      {/* Front label */}
      <mesh position={[0, 0.1, 0.46]}>
        <planeGeometry args={[0.9, 1.4]} />
        <meshStandardMaterial color="#fdfaf3" roughness={0.6} />
      </mesh>
      <Text position={[0, 0.52, 0.461]} fontSize={0.11} color="#1f1b16" anchorX="center" anchorY="middle" letterSpacing={0.22}>
        VELMIQUE
      </Text>
      <mesh position={[0, 0.42, 0.462]}>
        <planeGeometry args={[0.26, 0.005]} />
        <meshStandardMaterial color="#b8624f" metalness={0.8} roughness={0.3} />
      </mesh>
      <Text position={[0, 0.32, 0.462]} fontSize={0.045} color="#4d4840" anchorX="center" anchorY="middle" letterSpacing={0.3}>
        LUMIÈRE
      </Text>
      <Text position={[0, 0.23, 0.462]} fontSize={0.045} color="#4d4840" anchorX="center" anchorY="middle" letterSpacing={0.3}>
        DORÉE
      </Text>
      <Text position={[0, 0.08, 0.462]} fontSize={0.036} color="#8a8378" anchorX="center" anchorY="middle" letterSpacing={0.25}>
        EAU DE PARFUM
      </Text>
      <Text position={[0, -0.3, 0.462]} fontSize={0.04} color="#b8624f" anchorX="center" anchorY="middle" letterSpacing={0.4}>
        PARIS · 50 ML
      </Text>
      {/* Short rectangular neck */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[0.35, 0.2, 0.35]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Base of cap — square */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <boxGeometry args={[0.68, 0.18, 0.68]} />
        <meshStandardMaterial color={capColor} metalness={0.75} roughness={0.25} />
      </mesh>
      {/* PYRAMID cap on top (4-sided) */}
      <mesh position={[0, 2.18, 0]} castShadow>
        <coneGeometry args={[0.48, 0.55, 4]} />
        <meshStandardMaterial color={capColor} metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Accent line at top of cap */}
      <mesh position={[0, 1.99, 0]} castShadow>
        <boxGeometry args={[0.72, 0.025, 0.72]} />
        <meshStandardMaterial color="#b8624f" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ──── SHAPE 3: Stepped — art deco tiered ──── */
function SteppedBottle({ bottle, liquid, capColor }) {
  return (
    <group>
      {/* Base step — widest */}
      <mesh castShadow>
        <boxGeometry args={[1.9, 0.45, 1.0]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Middle step */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.65, 0.4, 0.92]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Main body step */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[1.4, 0.75, 0.84]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Top step */}
      <mesh position={[0, 1.58, 0]} castShadow>
        <boxGeometry args={[1.15, 0.4, 0.76]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Liquid fill across body steps */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[1.82, 1.1, 0.92]} />
        <meshPhysicalMaterial {...liquidProps(liquid)} />
      </mesh>
      {/* Front label on middle body */}
      <mesh position={[0, 1.0, 0.43]}>
        <planeGeometry args={[1.15, 0.62]} />
        <meshStandardMaterial color="#fdfaf3" roughness={0.6} />
      </mesh>
      <Text position={[0, 1.18, 0.431]} fontSize={0.13} color="#1f1b16" anchorX="center" anchorY="middle" letterSpacing={0.24}>
        VELMIQUE
      </Text>
      <mesh position={[0, 1.08, 0.432]}>
        <planeGeometry args={[0.3, 0.005]} />
        <meshStandardMaterial color="#b8624f" metalness={0.8} roughness={0.3} />
      </mesh>
      <Text position={[0, 0.99, 0.432]} fontSize={0.04} color="#4d4840" anchorX="center" anchorY="middle" letterSpacing={0.3}>
        VELVET OUD
      </Text>
      <Text position={[0, 0.89, 0.432]} fontSize={0.034} color="#8a8378" anchorX="center" anchorY="middle" letterSpacing={0.3}>
        EXTRAIT DE PARFUM
      </Text>
      <Text position={[0, 0.77, 0.432]} fontSize={0.034} color="#b8624f" anchorX="center" anchorY="middle" letterSpacing={0.4}>
        50 ML
      </Text>
      {/* Terracotta accent lines on each step edge */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.91, 0.015, 1.01]} />
        <meshStandardMaterial color="#b8624f" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.66, 0.015, 0.93]} />
        <meshStandardMaterial color="#b8624f" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* Short rectangular neck */}
      <mesh position={[0, 1.88, 0]}>
        <boxGeometry args={[0.42, 0.18, 0.42]} />
        <meshPhysicalMaterial {...glassProps(bottle)} />
      </mesh>
      {/* Stepped cap — 3 tiers */}
      <mesh position={[0, 2.06, 0]} castShadow>
        <boxGeometry args={[0.95, 0.14, 0.62]} />
        <meshStandardMaterial color={capColor} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 2.19, 0]} castShadow>
        <boxGeometry args={[0.75, 0.14, 0.5]} />
        <meshStandardMaterial color={capColor} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 2.32, 0]} castShadow>
        <boxGeometry args={[0.55, 0.14, 0.4]} />
        <meshStandardMaterial color={capColor} metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Bottle({ bottle, liquid, capColor, shape }) {
  const group = useRef(null);
  useFrame((state) => {
    if (group.current)
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.12;
  });

  const BottleShape =
    shape === "obelisk" ? ObeliskBottle :
    shape === "stepped" ? SteppedBottle :
    FlaconBottle;

  return (
    <Float speed={1.1} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={group} position={[0, -0.4, 0]} scale={0.85}>
        <BottleShape bottle={bottle} liquid={liquid} capColor={capColor} />
      </group>
    </Float>
  );
}

function Scene({ slide }) {
  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[5, 4, 5]}
        intensity={1.3}
        color="#fff4e0"
        castShadow
      />
      <pointLight position={[-3, 2, 4]} intensity={0.7} color="#f0dfb5" />
      <pointLight position={[2, 3, -3]} intensity={0.5} color="#ffffff" />
      <Suspense fallback={null}>
        <Environment preset="studio" />
      </Suspense>
      <Bottle bottle={slide.bottle} liquid={slide.liquid} capColor={slide.capColor} shape={slide.shape} />
      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.3}
        scale={6}
        blur={2.5}
        far={3}
        color="#1f1b16"
      />
    </>
  );
}

export default function Hero3D() {
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(
      () => setActive((a) => (a + 1) % slides.length),
      7000,
    );
    return () => clearInterval(t);
  }, []);

  const slide = slides[active];

  return (
    <section className="relative bg-[#14110e] overflow-hidden">
      <div className="relative min-h-[calc(100vh-130px)] flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] items-center gap-10 lg:gap-16 w-full py-16 lg:py-20">
          {/* LEFT */}
          <div className="flex flex-col justify-center order-2 lg:order-1 relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{
                  visible: { transition: { staggerChildren: 0.08 } },
                }}
              >
                <motion.div
                  className="flex items-center gap-3 mb-8"
                  variants={{
                    hidden: { opacity: 0, x: -15 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: { duration: 0.6 },
                    },
                    exit: { opacity: 0 },
                  }}
                >
                  <span className="h-px w-12 bg-[#b8624f]" />
                  <span className="text-[#d4927f] text-[10px] tracking-[0.5em] uppercase">
                    {slide.eyebrow}
                  </span>
                </motion.div>

                <motion.h1
                  className="font-serif text-[#f3ede0] text-5xl md:text-7xl lg:text-[7.5rem] xl:text-[9rem] leading-[0.92] tracking-tight mb-4"
                  variants={{
                    visible: { transition: { staggerChildren: 0.08 } },
                    exit: { opacity: 0, transition: { duration: 0.3 } },
                  }}
                >
                  <motion.span
                    className="block"
                    variants={{
                      hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
                      visible: {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                      },
                    }}
                  >
                    {slide.title}
                  </motion.span>
                  <motion.span
                    className="block italic text-[#d4927f] font-normal"
                    variants={{
                      hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
                      visible: {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                      },
                    }}
                  >
                    {slide.accent}.
                  </motion.span>
                </motion.h1>

                <motion.p
                  className="text-[#7a7368] text-[11px] tracking-[0.4em] uppercase mb-12 font-body"
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6 },
                    },
                    exit: { opacity: 0 },
                  }}
                >
                  {slide.tagline}
                </motion.p>

                <motion.div
                  className="flex items-center gap-8"
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.6 },
                    },
                    exit: { opacity: 0 },
                  }}
                >
                  <Link
                    href={slide.href}
                    className="group relative inline-flex items-center gap-3 bg-[#1f1b16] text-[#f7f2e8] px-9 py-4 text-[11px] tracking-[0.4em] uppercase overflow-hidden"
                  >
                    <span className="relative z-10">Discover</span>
                    <ArrowRight
                      size={13}
                      className="relative z-10 transition-transform group-hover:translate-x-1"
                    />
                    <span className="absolute inset-0 bg-[#b8624f] translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </Link>

                  <Link
                    href="/shop"
                    className="group text-[#f3ede0] text-[11px] tracking-[0.4em] uppercase border-b border-[#1f1b16] pb-1 hover:text-[#d4927f] hover:border-[#b8624f] transition-colors"
                  >
                    All Fragrances
                  </Link>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Slide pagination — minimal dots */}
            <div className="mt-20 flex items-center gap-3">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-px transition-all duration-500 ${i === active ? "w-16 bg-[#b8624f]" : "w-6 bg-[#2e2821] hover:bg-[#b8624f]/50"}`}
                />
              ))}
            </div>
          </div>

          {/* RIGHT — 3D bottle */}
          <div className="relative h-[480px] md:h-[580px] lg:h-[500px] order-1 lg:order-2 flex items-center justify-center">
            {/* Soft terracotta halo behind bottle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[420px] h-[420px] rounded-full bg-[#b8624f]/15 blur-[90px]" />
            </div>

            {mounted && (
              <div className="relative w-full h-full">
                <Canvas
                  camera={{ position: [0, 0, 6.5], fov: 42 }}
                  dpr={[1, 2]}
                  shadows
                  gl={{ antialias: true, alpha: true }}
                >
                  <Scene slide={slide} />
                </Canvas>
              </div>
            )}

            {/* Vertical meta label */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[#7a7368] text-[9px] tracking-[0.5em] uppercase [writing-mode:vertical-rl] hidden md:block">
              Extrait de Parfum · 50ml
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
