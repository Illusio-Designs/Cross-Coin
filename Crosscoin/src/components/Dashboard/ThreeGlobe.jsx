"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// lat/lng → 3D point on unit sphere
function latLngToVec3(lat, lng, r = 1) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// Sample a world map image → return land dot positions on sphere
function buildLandDots(imgData, imgW, imgH, dotCount = 30000, landIsBright = false) {
  const positions = [];
  for (let i = 0; i < dotCount; i++) {
    const y     = 1 - (i / (dotCount - 1)) * 2;
    const r     = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;
    const x     = r * Math.cos(theta);
    const z     = r * Math.sin(theta);

    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = Math.atan2(z, -x) * (180 / Math.PI);

    const px = Math.floor(((lng + 180) / 360) * imgW);
    const py = Math.floor(((90 - lat) / 180) * imgH);
    const idx = (py * imgW + px) * 4;

    const red = imgData[idx];
    if (red === undefined) continue;
    // landIsBright=true: land pixels are bright (topology map)
    // landIsBright=false: land pixels are dark
    if (landIsBright ? red < 80 : red > 100) continue;

    positions.push(x, y, z);
  }
  return new Float32Array(positions);
}

export default function ThreeGlobe({ markersRef: externalMarkersRef }) {
  const mountRef       = useRef(null);
  const prevMarkersRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let animId;
    let renderer;

    const W   = mountRef.current.clientWidth  || 600;
    const H   = mountRef.current.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Scene / Camera / Renderer
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.z = 2.5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // ── Globe base — white/light sphere ──────────────────────────────────
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        color:      0xf0f4ff,   // very light blue-white
        emissive:   0xdde8ff,
        shininess:  30,
        transparent: true,
        opacity:    0.95,
      })
    );
    scene.add(globe);

    // ── Atmosphere glow ───────────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x93c5fd, transparent: true, opacity: 0.10, side: THREE.BackSide,
      })
    ));

    // ── Lights ────────────────────────────────────────────────────────────
    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(4, 3, 5);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xc7d2fe, 0.8));

    // ── Marker group ──────────────────────────────────────────────────────
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    // India-facing static rotation
    // lon 78°E, lat 20°N
    const BASE_Y = -(78 * Math.PI / 180);
    const BASE_X = -(20 * Math.PI / 180);

    // ── Dot sprite texture ────────────────────────────────────────────────
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = dotCanvas.height = 32;
    const dctx = dotCanvas.getContext("2d");
    const grad = dctx.createRadialGradient(16, 16, 0, 16, 16, 14);
    grad.addColorStop(0,   "rgba(59,130,246,1)");
    grad.addColorStop(0.5, "rgba(99,102,241,0.8)");
    grad.addColorStop(1,   "rgba(99,102,241,0)");
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, 32, 32);
    const dotTex = new THREE.CanvasTexture(dotCanvas);

    // ── Load world map → build land dots ─────────────────────────────────
    // Using a simple black-land / white-ocean equirectangular map
    const mapImg = new Image();
    mapImg.crossOrigin = "anonymous";
    // earth-topology.png: land = bright, ocean = dark (public domain)
    mapImg.src = "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";

    mapImg.onload = () => {
      const mapW = 1024, mapH = 512;
      const offscreen = document.createElement("canvas");
      offscreen.width  = mapW;
      offscreen.height = mapH;
      const oc = offscreen.getContext("2d");
      oc.drawImage(mapImg, 0, 0, mapW, mapH);
      const { data } = oc.getImageData(0, 0, mapW, mapH);

      // topology: land is bright (r > 80), ocean is dark
      const landPositions = buildLandDots(data, mapW, mapH, 40000, true);

      if (landPositions.length === 0) return;

      const dotGeo = new THREE.BufferGeometry();
      dotGeo.setAttribute("position", new THREE.BufferAttribute(landPositions, 3));

      const dotMat = new THREE.PointsMaterial({
        size:            0.012,
        map:             dotTex,
        transparent:     true,
        opacity:         0.85,
        depthWrite:      false,
        sizeAttenuation: true,
        color:           0x3b82f6,   // blue land dots
        blending:        THREE.AdditiveBlending,
      });

      const dots = new THREE.Points(dotGeo, dotMat);
      dots.rotation.set(BASE_X, BASE_Y, 0);
      scene.add(dots);
    };

    // ── Ping animation state ──────────────────────────────────────────────
    // Each ping: { mesh, halo, born }
    const pings = [];

    function rebuildMarkers(markerList) {
      // Remove old
      while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0]);
      pings.length = 0;

      markerList.forEach(({ location }) => {
        const [lat, lng] = location;
        const pos = latLngToVec3(lat, lng, 1.015);

        // Core red dot
        const pin = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xce1e36 })
        );
        pin.position.copy(pos);
        markerGroup.add(pin);

        // Animated ping ring (starts small, expands + fades)
        const haloGeo = new THREE.RingGeometry(0.02, 0.03, 24);
        // Orient ring to face outward from sphere surface
        haloGeo.lookAt = pos.clone().normalize();
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xce1e36, transparent: true, opacity: 0.8,
          side: THREE.DoubleSide,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.copy(pos);
        // Orient ring to face outward
        halo.lookAt(pos.clone().multiplyScalar(2));
        markerGroup.add(halo);

        pings.push({ pin, halo, mat: haloMat, born: performance.now(), basePos: pos });
      });
    }

    // Set static rotation on globe + markerGroup
    globe.rotation.set(BASE_X, BASE_Y, 0);
    markerGroup.rotation.set(BASE_X, BASE_Y, 0);

    // ── Render loop (NO rotation) ─────────────────────────────────────────
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();

      // Sync markers from external ref
      const current = externalMarkersRef?.current ?? [];
      if (current !== prevMarkersRef.current) {
        prevMarkersRef.current = current;
        rebuildMarkers(current);
      }

      // Animate ping rings
      pings.forEach(({ halo, mat, born }) => {
        const t = ((now - born) % 2000) / 2000; // 0→1 every 2s
        const scale = 1 + t * 4;
        halo.scale.setScalar(scale);
        mat.opacity = 0.8 * (1 - t);
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer?.dispose();
      if (mountRef.current?.contains(renderer?.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
