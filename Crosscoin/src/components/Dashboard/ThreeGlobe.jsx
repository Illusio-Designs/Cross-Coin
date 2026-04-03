"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

function latLngToVec3(lat, lng, r = 1) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// Approximate land mask using a simple inline base64 world map
// We'll generate dots using a Fibonacci sphere + land check via canvas
function buildDotsFromImage(img, dotCount = 35000) {
  const W = 512, H = 256;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const positions = [];
  for (let i = 0; i < dotCount; i++) {
    const y     = 1 - (i / (dotCount - 1)) * 2;
    const r     = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;
    const x     = r * Math.cos(theta);
    const z     = r * Math.sin(theta);
    const lat   = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
    const lng   = Math.atan2(z, -x) * (180 / Math.PI);
    const px    = Math.floor(((lng + 180) / 360) * W);
    const py    = Math.floor(((90 - lat) / 180) * H);
    const idx   = (Math.min(py, H - 1) * W + Math.min(px, W - 1)) * 4;
    // land = dark pixel (r < 100) on natural earth map
    if (data[idx] > 120) continue;
    positions.push(x, y, z);
  }
  return new Float32Array(positions);
}

const DEFAULT_MARKERS = [
  { lat: 19.076, lng: 72.877  }, // Mumbai
  { lat: 28.613, lng: 77.209  }, // Delhi
  { lat: 12.971, lng: 77.594  }, // Bangalore
  { lat: 22.572, lng: 88.363  }, // Kolkata
  { lat: 17.385, lng: 78.487  }, // Hyderabad
  { lat: 23.022, lng: 72.571  }, // Ahmedabad
  { lat: 13.082, lng: 80.270  }, // Chennai
  { lat: 18.520, lng: 73.856  }, // Pune
];

// Multiple CDN fallbacks for the world map
const MAP_URLS = [
  "https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg",
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-dark.jpg",
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-dark.jpg",
];

export default function ThreeGlobe({ markersRef: externalMarkersRef }) {
  const mountRef       = useRef(null);
  const prevMarkersRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let animId, renderer;

    const W   = mountRef.current.clientWidth  || 560;
    const H   = mountRef.current.clientHeight || 560;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.z = 2.8;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Globe base — light grey
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        color:       0xeef1f7,
        emissive:    0xe2e8f0,
        shininess:   15,
        transparent: false,
      })
    );
    scene.add(globe);

    // Soft outer glow ring
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0xbfcfe8, transparent: true, opacity: 0.15, side: THREE.BackSide,
      })
    ));

    // Lights
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 3, 5);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    // Marker group
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    // India-facing rotation
    const BASE_Y = -(78 * Math.PI / 180);
    const BASE_X = -(20 * Math.PI / 180);
    globe.rotation.set(BASE_X, BASE_Y, 0);
    markerGroup.rotation.set(BASE_X, BASE_Y, 0);

    // Try loading map from multiple sources
    let dotsAdded = false;
    function tryLoadMap(urls, idx = 0) {
      if (idx >= urls.length) {
        // All failed — draw fallback grid dots
        addFallbackDots();
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (dotsAdded) return;
        dotsAdded = true;
        try {
          const positions = buildDotsFromImage(img, 35000);
          if (positions.length < 100) { tryLoadMap(urls, idx + 1); return; }
          addDots(positions);
        } catch { tryLoadMap(urls, idx + 1); }
      };
      img.onerror = () => tryLoadMap(urls, idx + 1);
      img.src = urls[idx];
    }

    function addDots(positions) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.009, transparent: true, opacity: 0.8,
        depthWrite: false, sizeAttenuation: true,
        color: 0x1e293b,
      });
      const pts = new THREE.Points(geo, mat);
      pts.rotation.set(BASE_X, BASE_Y, 0);
      scene.add(pts);
    }

    // Fallback: draw dots on a lat/lng grid for land areas (hardcoded rough land mask)
    function addFallbackDots() {
      const positions = [];
      // Dense Fibonacci sphere, skip obvious ocean areas
      for (let i = 0; i < 25000; i++) {
        const y     = 1 - (i / 24999) * 2;
        const r     = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = Math.PI * (3 - Math.sqrt(5)) * i;
        const x     = r * Math.cos(theta);
        const z     = r * Math.sin(theta);
        const lat   = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
        const lng   = Math.atan2(z, -x) * (180 / Math.PI);
        if (isRoughlyLand(lat, lng)) positions.push(x, y, z);
      }
      addDots(new Float32Array(positions));
    }

    // Very rough land check (bounding boxes of major continents)
    function isRoughlyLand(lat, lng) {
      // Asia
      if (lat > 5 && lat < 75 && lng > 25 && lng < 145) return true;
      // Europe
      if (lat > 35 && lat < 72 && lng > -10 && lng < 40) return true;
      // Africa
      if (lat > -35 && lat < 38 && lng > -18 && lng < 52) return true;
      // North America
      if (lat > 15 && lat < 75 && lng > -170 && lng < -50) return true;
      // South America
      if (lat > -55 && lat < 15 && lng > -82 && lng < -34) return true;
      // Australia
      if (lat > -45 && lat < -10 && lng > 113 && lng < 155) return true;
      return false;
    }

    tryLoadMap(MAP_URLS);

    // Pings
    const pings = [];

    function buildMarkers(list) {
      while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0]);
      pings.length = 0;

      list.forEach(({ lat, lng, location }) => {
        const la = lat ?? location?.[0];
        const lo = lng ?? location?.[1];
        if (la == null || lo == null) return;

        const pos = latLngToVec3(la, lo, 1.013);

        // Outer blue dot
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.026, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0x2563eb })
        );
        dot.position.copy(pos);
        markerGroup.add(dot);

        // White center
        const inner = new THREE.Mesh(
          new THREE.SphereGeometry(0.011, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        inner.position.copy(pos);
        markerGroup.add(inner);

        // Two pulse rings with offset phase
        [0, 900].forEach(offset => {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.028, 0.038, 32),
            new THREE.MeshBasicMaterial({
              color: 0x2563eb, transparent: true, opacity: 0.7, side: THREE.DoubleSide,
            })
          );
          ring.position.copy(pos);
          ring.lookAt(pos.clone().multiplyScalar(2));
          markerGroup.add(ring);
          pings.push({ mesh: ring, mat: ring.material, offset });
        });
      });
    }

    buildMarkers(externalMarkersRef?.current?.length ? externalMarkersRef.current : DEFAULT_MARKERS);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();

      const current = externalMarkersRef?.current ?? null;
      if (current !== prevMarkersRef.current) {
        prevMarkersRef.current = current;
        buildMarkers(current?.length ? current : DEFAULT_MARKERS);
      }

      pings.forEach(({ mesh, mat, offset }) => {
        const t = ((now + offset) % 2000) / 2000;
        mesh.scale.setScalar(1 + t * 4);
        mat.opacity = 0.65 * (1 - t);
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
