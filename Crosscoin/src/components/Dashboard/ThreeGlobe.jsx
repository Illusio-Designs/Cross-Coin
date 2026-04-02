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

function buildDotPositions(count = 5000) {
  const pos = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = phi * i;
    pos.push(r * Math.cos(t), y, r * Math.sin(t));
  }
  return new Float32Array(pos);
}

export default function ThreeGlobe({ markersRef: externalMarkersRef }) {
  const mountRef       = useRef(null);
  const markerGroupRef = useRef(null);
  const prevMarkersRef = useRef([]);

  useEffect(() => {
    if (!mountRef.current) return;

    const W   = mountRef.current.clientWidth  || 600;
    const H   = mountRef.current.clientHeight || 600;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Scene / Camera / Renderer
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.z = 2.6;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Globe base
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({
        color: 0x0f172a, emissive: 0x0a1628,
        shininess: 18, transparent: true, opacity: 0.92,
      })
    );
    scene.add(globe);

    // Dot cloud (Cobe-style)
    const dotCanvas = document.createElement("canvas");
    dotCanvas.width = dotCanvas.height = 16;
    const ctx = dotCanvas.getContext("2d");
    ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; ctx.fill();

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(buildDotPositions(5000), 3));
    const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({
      size: 0.018, map: new THREE.CanvasTexture(dotCanvas),
      transparent: true, opacity: 0.55, depthWrite: false,
      sizeAttenuation: true, color: 0xc7d2fe,
    }));
    scene.add(dots);

    // Atmosphere glow layers
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.06, side: THREE.BackSide })
    ));
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.07, side: THREE.BackSide })
    ));

    // Lights
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(5, 3, 5);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0x8b9cf4, 0.6));

    // Marker group
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    markerGroupRef.current = markerGroup;

    // India-facing initial rotation
    const BASE_Y = -(78 * Math.PI / 180);
    const BASE_X = -(20 * Math.PI / 180);
    globe.rotation.set(BASE_X, BASE_Y, 0);
    dots.rotation.set(BASE_X, BASE_Y, 0);
    markerGroup.rotation.set(BASE_X, BASE_Y, 0);

    // Animation
    let animId;
    const SPEED = 0.0015;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Live marker sync
      const current = externalMarkersRef?.current ?? [];
      if (current !== prevMarkersRef.current) {
        prevMarkersRef.current = current;
        while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0]);
        current.forEach(({ location, size = 0.05 }) => {
          const pos = latLngToVec3(location[0], location[1], 1.01);
          const pin = new THREE.Mesh(
            new THREE.SphereGeometry(size * 0.5, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xce1e36 })
          );
          pin.position.copy(pos);
          markerGroup.add(pin);

          const halo = new THREE.Mesh(
            new THREE.SphereGeometry(size * 0.9, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xce1e36, transparent: true, opacity: 0.25 })
          );
          halo.position.copy(pos);
          markerGroup.add(halo);
        });
      }

      globe.rotation.y       += SPEED;
      dots.rotation.y        += SPEED;
      markerGroup.rotation.y += SPEED;
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
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}
