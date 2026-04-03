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

function buildLandDots(imgData, imgW, imgH, dotCount = 40000) {
  const positions = [];
  for (let i = 0; i < dotCount; i++) {
    const y     = 1 - (i / (dotCount - 1)) * 2;
    const r     = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;
    const x     = r * Math.cos(theta);
    const z     = r * Math.sin(theta);
    const lat   = Math.asin(y) * (180 / Math.PI);
    const lng   = Math.atan2(z, -x) * (180 / Math.PI);
    const px    = Math.floor(((lng + 180) / 360) * imgW);
    const py    = Math.floor(((90 - lat) / 180) * imgH);
    const idx   = (py * imgW + px) * 4;
    const red   = imgData[idx];
    if (red === undefined) continue;
    // topology map: land = bright (r > 80)
    if (red < 80) continue;
    positions.push(x, y, z);
  }
  return new Float32Array(positions);
}

// Indian cities as default markers
const DEFAULT_MARKERS = [
  { lat: 19.076,  lng: 72.877  }, // Mumbai
  { lat: 28.613,  lng: 77.209  }, // Delhi
  { lat: 12.971,  lng: 77.594  }, // Bangalore
  { lat: 22.572,  lng: 88.363  }, // Kolkata
  { lat: 17.385,  lng: 78.487  }, // Hyderabad
  { lat: 23.022,  lng: 72.571  }, // Ahmedabad
  { lat: 13.082,  lng: 80.270  }, // Chennai
  { lat: 18.520,  lng: 73.856  }, // Pune
];

export default function ThreeGlobe({ markersRef: externalMarkersRef }) {
  const mountRef       = useRef(null);
  const prevMarkersRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let animId, renderer;

    const W   = mountRef.current.clientWidth  || 600;
    const H   = mountRef.current.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.z = 3.0;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // ── Globe base — light grey/white like the reference ──────────────────
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        color:       0xf0f2f5,
        emissive:    0xe8eaf0,
        shininess:   20,
        transparent: true,
        opacity:     1.0,
      })
    );
    scene.add(globe);

    // ── Soft edge glow ────────────────────────────────────────────────────
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.08, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0xc8d4e8, transparent: true, opacity: 0.18, side: THREE.BackSide,
      })
    ));

    // ── Lights ────────────────────────────────────────────────────────────
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 3, 5);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    // ── Marker group ──────────────────────────────────────────────────────
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    // India-facing rotation
    const BASE_Y = -(78 * Math.PI / 180);
    const BASE_X = -(20 * Math.PI / 180);
    globe.rotation.set(BASE_X, BASE_Y, 0);
    markerGroup.rotation.set(BASE_X, BASE_Y, 0);

    // ── Load world map → dark land dots ───────────────────────────────────
    const mapImg = new Image();
    mapImg.crossOrigin = "anonymous";
    mapImg.src = "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";

    mapImg.onload = () => {
      const mapW = 1024, mapH = 512;
      const offscreen = document.createElement("canvas");
      offscreen.width = mapW; offscreen.height = mapH;
      const oc = offscreen.getContext("2d");
      oc.drawImage(mapImg, 0, 0, mapW, mapH);
      const { data } = oc.getImageData(0, 0, mapW, mapH);
      const positions = buildLandDots(data, mapW, mapH, 40000);
      if (!positions.length) return;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      // Dark dots like the reference image
      const mat = new THREE.PointsMaterial({
        size:            0.010,
        transparent:     true,
        opacity:         0.75,
        depthWrite:      false,
        sizeAttenuation: true,
        color:           0x1a1a2e,  // very dark, almost black dots
      });

      const dots = new THREE.Points(geo, mat);
      dots.rotation.set(BASE_X, BASE_Y, 0);
      scene.add(dots);
    };

    // ── Ping state ────────────────────────────────────────────────────────
    const pings = [];

    function buildMarkers(list) {
      while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0]);
      pings.length = 0;

      list.forEach(({ lat, lng, location }) => {
        const la = lat ?? location?.[0];
        const lo = lng ?? location?.[1];
        if (la == null || lo == null) return;

        const pos = latLngToVec3(la, lo, 1.012);

        // Bigger solid blue dot
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.028, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0x2563eb })
        );
        dot.position.copy(pos);
        markerGroup.add(dot);

        // White inner highlight
        const inner = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        inner.position.copy(pos);
        markerGroup.add(inner);

        // Pulse ring 1
        const ring1 = new THREE.Mesh(
          new THREE.RingGeometry(0.03, 0.042, 32),
          new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        );
        ring1.position.copy(pos);
        ring1.lookAt(pos.clone().multiplyScalar(2));
        markerGroup.add(ring1);

        // Pulse ring 2 (offset phase)
        const ring2 = new THREE.Mesh(
          new THREE.RingGeometry(0.03, 0.042, 32),
          new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        );
        ring2.position.copy(pos);
        ring2.lookAt(pos.clone().multiplyScalar(2));
        markerGroup.add(ring2);

        pings.push({
          rings: [
            { mesh: ring1, mat: ring1.material, offset: 0 },
            { mesh: ring2, mat: ring2.material, offset: 1000 },
          ],
          born: performance.now(),
        });
      });
    }

    // Use external markers or default Indian cities
    const getMarkers = () => {
      const ext = externalMarkersRef?.current;
      if (ext && ext.length > 0) return ext;
      return DEFAULT_MARKERS;
    };

    buildMarkers(getMarkers());

    // ── Render loop ───────────────────────────────────────────────────────
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();

      // Sync external markers
      const current = externalMarkersRef?.current ?? null;
      if (current !== prevMarkersRef.current) {
        prevMarkersRef.current = current;
        buildMarkers(getMarkers());
      }

      // Animate ping rings
      pings.forEach(({ rings }) => {
        rings.forEach(({ mesh, mat, offset }) => {
          const t = ((now + offset) % 2000) / 2000;
          mesh.scale.setScalar(1 + t * 3.5);
          mat.opacity = 0.7 * (1 - t);
        });
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
