"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// Standard spherical coords — lng=0 faces +Z (toward camera)
function latLngToVec3(lat, lng, r = 1) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = lng        * (Math.PI / 180);
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  );
}

// 70+ Indian cities
const INDIA_CITIES = [
  { name: "Mumbai",             lat: 19.076, lng: 72.877 },
  { name: "Delhi",              lat: 28.613, lng: 77.209 },
  { name: "Bangalore",          lat: 12.971, lng: 77.594 },
  { name: "Chennai",            lat: 13.082, lng: 80.270 },
  { name: "Hyderabad",          lat: 17.385, lng: 78.487 },
  { name: "Kolkata",            lat: 22.572, lng: 88.363 },
  { name: "Pune",               lat: 18.520, lng: 73.856 },
  { name: "Ahmedabad",          lat: 23.022, lng: 72.571 },
  { name: "Jaipur",             lat: 26.912, lng: 75.787 },
  { name: "Lucknow",            lat: 26.846, lng: 80.946 },
  { name: "Surat",              lat: 21.170, lng: 72.831 },
  { name: "Rajkot",             lat: 22.303, lng: 70.802 },
  { name: "Bhopal",             lat: 23.259, lng: 77.413 },
  { name: "Indore",             lat: 22.719, lng: 75.857 },
  { name: "Nagpur",             lat: 21.145, lng: 79.088 },
  { name: "Patna",              lat: 25.594, lng: 85.137 },
  { name: "Vadodara",           lat: 22.307, lng: 73.181 },
  { name: "Coimbatore",         lat: 11.017, lng: 76.955 },
  { name: "Kochi",              lat:  9.931, lng: 76.267 },
  { name: "Chandigarh",         lat: 30.733, lng: 76.779 },
  { name: "Gurgaon",            lat: 28.459, lng: 77.026 },
  { name: "Noida",              lat: 28.535, lng: 77.391 },
  { name: "Visakhapatnam",      lat: 17.686, lng: 83.218 },
  { name: "Agra",               lat: 27.176, lng: 78.008 },
  { name: "Varanasi",           lat: 25.317, lng: 82.973 },
  { name: "Meerut",             lat: 28.984, lng: 77.706 },
  { name: "Nashik",             lat: 19.997, lng: 73.789 },
  { name: "Aurangabad",         lat: 19.877, lng: 75.343 },
  { name: "Amritsar",           lat: 31.634, lng: 74.872 },
  { name: "Jodhpur",            lat: 26.292, lng: 73.017 },
  { name: "Hubli",              lat: 15.317, lng: 75.713 },
  { name: "Mysore",             lat: 12.295, lng: 76.639 },
  { name: "Thrissur",           lat: 10.527, lng: 76.213 },
  { name: "Thiruvananthapuram", lat:  8.524, lng: 76.936 },
  { name: "Salem",              lat: 11.127, lng: 78.656 },
  { name: "Vijayawada",         lat: 16.307, lng: 80.436 },
  { name: "Bhubaneswar",        lat: 20.296, lng: 85.824 },
  { name: "Guwahati",           lat: 26.184, lng: 91.746 },
  { name: "Ranchi",             lat: 23.344, lng: 85.309 },
  { name: "Dehradun",           lat: 30.316, lng: 78.032 },
  { name: "Shimla",             lat: 31.104, lng: 77.167 },
  { name: "Srinagar",           lat: 34.083, lng: 74.797 },
  { name: "Allahabad",          lat: 25.435, lng: 81.846 },
  { name: "Raipur",             lat: 21.250, lng: 81.629 },
  { name: "Udaipur",            lat: 24.585, lng: 73.712 },
  { name: "Ajmer",              lat: 26.460, lng: 74.639 },
  { name: "Bikaner",            lat: 28.022, lng: 73.312 },
  { name: "Jammu",              lat: 32.726, lng: 74.857 },
  { name: "Ludhiana",           lat: 30.901, lng: 75.857 },
  { name: "Jalandhar",          lat: 31.326, lng: 75.576 },
  { name: "Kanpur",             lat: 26.449, lng: 80.331 },
  { name: "Gorakhpur",          lat: 26.760, lng: 83.373 },
  { name: "Madurai",            lat:  9.925, lng: 78.120 },
  { name: "Tiruchirappalli",    lat: 10.790, lng: 78.704 },
  { name: "Tirupati",           lat: 13.629, lng: 79.419 },
  { name: "Mangalore",          lat: 12.914, lng: 74.856 },
  { name: "Panaji",             lat: 15.499, lng: 73.824 },
  { name: "Puducherry",         lat: 11.934, lng: 79.830 },
  { name: "Gwalior",            lat: 26.218, lng: 78.182 },
  { name: "Jabalpur",           lat: 23.181, lng: 79.987 },
  { name: "Faridabad",          lat: 28.408, lng: 77.317 },
  { name: "Ghaziabad",          lat: 28.669, lng: 77.453 },
  { name: "Agartala",           lat: 23.833, lng: 91.279 },
  { name: "Shillong",           lat: 25.578, lng: 91.893 },
  { name: "Gangtok",            lat: 27.336, lng: 88.612 },
  { name: "Imphal",             lat: 24.817, lng: 93.944 },
];

// City name → coords (lowercase key)
const CITY_MAP = {};
INDIA_CITIES.forEach(c => { CITY_MAP[c.name.toLowerCase()] = [c.lat, c.lng]; });

// International fallback
const INTL_MAP = {
  "london": [51.507, -0.128], "new york": [40.714, -74.006],
  "dubai": [25.204, 55.270],  "singapore": [1.352, 103.820],
  "toronto": [43.651, -79.347], "sydney": [-33.868, 151.209],
  "kuala lumpur": [3.139, 101.687], "bangkok": [13.756, 100.502],
};

function makeLabel(text, position) {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 56;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 56);

  ctx.font = "bold 20px sans-serif";
  const tw = ctx.measureText(text).width;

  // Brand red background
  ctx.fillStyle = "#CE1E36";
  ctx.beginPath();
  ctx.roundRect(8, 10, tw + 16, 30, 5);
  ctx.fill();

  // White text
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText(text, 16, 31);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.28 + text.length * 0.011, 0.075, 1);

  // Position label just above the dot, along the surface normal
  const dir = position.clone().normalize();
  sprite.position.copy(position.clone().add(dir.multiplyScalar(0.10)));
  return sprite;
}

export default function ThreeGlobe({ markersRef: externalMarkersRef }) {
  const mountRef       = useRef(null);
  const prevMarkersRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let animId, renderer;

    const W   = mountRef.current.clientWidth  || 600;
    const H   = mountRef.current.clientHeight || 500;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.z = 2.8;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // ── Earth group — everything in here, rotated to face India ─────────────
    const earth = new THREE.Group();
    // India center: lat 22, lng 78 → rotate Y by -78°, tilt X by +22°
    earth.rotation.order = "YXZ";
    earth.rotation.y = -78 * (Math.PI / 180);
    earth.rotation.x =  22 * (Math.PI / 180);
    scene.add(earth);

    // Globe sphere — deep navy base
    earth.add(new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x0a0720, emissive: 0x0d0a2e, shininess: 20 })
    ));

    // White edge ring — visible globe border
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.015, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.BackSide })
    ));

    // Glow — brand red tint
    earth.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xce1e36, transparent: true, opacity: 0.04, side: THREE.BackSide })
    ));

    // Outer atmosphere glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.12, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x180d3e, transparent: true, opacity: 0.08, side: THREE.BackSide })
    ));

    // Lights — cool blue-white
    const dir = new THREE.DirectionalLight(0xaac4ff, 0.8);
    dir.position.set(5, 3, 5);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0xce1e36, 0.15);
    dir2.position.set(-4, -2, -3);
    scene.add(dir2);
    scene.add(new THREE.AmbientLight(0x8899cc, 0.6));

    // ── World land dots — muted navy/purple ─────────────────────────────────
    const worldPos = [];
    for (let i = 0; i < 18000; i++) {
      const y = 1 - (i / 17999) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const t = Math.PI * (3 - Math.sqrt(5)) * i;
      const x = r * Math.cos(t), z = r * Math.sin(t);
      const lat = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
      const lng = Math.atan2(x, z) * (180 / Math.PI);
      if (isLand(lat, lng)) worldPos.push(x, y, z);
    }
    const wGeo = new THREE.BufferGeometry();
    wGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(worldPos), 3));
    earth.add(new THREE.Points(wGeo, new THREE.PointsMaterial({
      size: 0.006, color: 0x3d2f6e, transparent: true, opacity: 0.55, depthWrite: false,
    })));

    // ── India fill dots — brand red tinted blue ──────────────────────────────
    const indiaPos = [];
    for (let lat = 8; lat <= 37; lat += 0.45) {
      for (let lng = 68; lng <= 97; lng += 0.45) {
        if (!isIndia(lat, lng)) continue;
        const v = latLngToVec3(lat, lng, 1.002);
        indiaPos.push(v.x, v.y, v.z);
      }
    }
    const iGeo = new THREE.BufferGeometry();
    iGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(indiaPos), 3));
    earth.add(new THREE.Points(iGeo, new THREE.PointsMaterial({
      size: 0.009, color: 0x6d4aff, transparent: true, opacity: 0.75, depthWrite: false,
    })));

    // ── City dots — bright accent ────────────────────────────────────────────
    const cityPos = [];
    INDIA_CITIES.forEach(({ lat, lng }) => {
      const v = latLngToVec3(lat, lng, 1.004);
      cityPos.push(v.x, v.y, v.z);
    });
    const cGeo = new THREE.BufferGeometry();
    cGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cityPos), 3));
    earth.add(new THREE.Points(cGeo, new THREE.PointsMaterial({
      size: 0.013, color: 0x9d7fff, transparent: true, opacity: 0.90, depthWrite: false,
    })));

    // ── Live marker group ────────────────────────────────────────────────────
    const markerGroup = new THREE.Group();
    earth.add(markerGroup);
    const pings = [];

    function resolveCoords(m) {
      if (m.lat != null && m.lng != null) return { lat: m.lat, lng: m.lng, name: m.city || "" };
      if (m.location) return { lat: m.location[0], lng: m.location[1], name: m.city || "" };
      if (m.city) {
        const key = m.city.toLowerCase();
        const c = CITY_MAP[key] || INTL_MAP[key];
        if (c) return { lat: c[0], lng: c[1], name: m.city };
      }
      return null;
    }

    function buildMarkers(list) {
      while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0]);
      pings.length = 0;

      list.forEach(m => {
        const r = resolveCoords(m);
        if (!r) return;
        const pos = latLngToVec3(r.lat, r.lng, 1.016);

        // Red dot — smaller, brand color
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.016, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xce1e36 })
        );
        dot.position.copy(pos);
        markerGroup.add(dot);

        // White center — tiny
        const inner = new THREE.Mesh(
          new THREE.SphereGeometry(0.006, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        inner.position.copy(pos);
        markerGroup.add(inner);

        // Pulse rings — tight, fast
        [0, 500].forEach(offset => {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.020, 0.028, 32),
            new THREE.MeshBasicMaterial({
              color: 0xce1e36, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
            })
          );
          ring.position.copy(pos);
          ring.lookAt(pos.clone().multiplyScalar(2));
          markerGroup.add(ring);
          pings.push({ mesh: ring, mat: ring.material, offset });
        });

        // City name label
        if (r.name) {
          const label = makeLabel(r.name, pos, camera);
          markerGroup.add(label);
        }
      });
    }

    // No defaults — only show markers when real active users exist
    buildMarkers(externalMarkersRef?.current?.length ? externalMarkersRef.current : []);

    // ── Animate — NO auto-rotation ───────────────────────────────────────────
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();

      // Check for realtime marker updates
      const current = externalMarkersRef?.current ?? null;
      if (current !== prevMarkersRef.current) {
        prevMarkersRef.current = current;
        buildMarkers(current?.length ? current : []);
      }

      // Pulse rings
      pings.forEach(({ mesh, mat, offset }) => {
        const t = ((now + offset) % 1600) / 1600;
        mesh.scale.setScalar(1 + t * 2.5);
        mat.opacity = 0.7 * (1 - t);
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

function isIndia(lat, lng) {
  if (lat < 8 || lat > 37 || lng < 68 || lng > 97) return false;
  if (lat > 30 && lng < 72) return false;
  if (lat < 12 && lng > 80) return false;
  if (lat > 33 && lng > 88) return false;
  return true;
}

function isLand(lat, lng) {
  if (isIndia(lat, lng)) return true;
  if (lat > 35  && lat < 72  && lng > -10  && lng < 40)  return true; // Europe
  if (lat > -35 && lat < 38  && lng > -18  && lng < 52)  return true; // Africa
  if (lat > 15  && lat < 75  && lng > -170 && lng < -50) return true; // N America
  if (lat > -55 && lat < 15  && lng > -82  && lng < -34) return true; // S America
  if (lat > -45 && lat < -10 && lng > 113  && lng < 155) return true; // Australia
  if (lat > 10  && lat < 75  && lng > 60   && lng < 145) return true; // Asia
  return false;
}
