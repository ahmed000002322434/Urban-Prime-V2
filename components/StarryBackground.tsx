
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../hooks/useTheme';

const StarryBackground: React.FC = () => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme !== 'elite' || !containerRef.current) {
        return;
    }

    const container = containerRef.current;
    let animationFrameId: number;

    // --- Core Engine Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    camera.position.z = 1000;

    // --- DYNAMIC STARS (WHITE) ---
    const starCount = 20000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starColor = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const x = THREE.MathUtils.randFloatSpread(8000);
      const y = THREE.MathUtils.randFloatSpread(8000);
      const z = THREE.MathUtils.randFloatSpread(8000);
      starPos[i * 3] = x;
      starPos[i * 3 + 1] = y;
      starPos[i * 3 + 2] = z;

      // Set stars to white with varying brightness
      const brightness = 0.5 + Math.random() * 0.5;
      starColor.setRGB(brightness, brightness, brightness);
      starColors[i * 3] = starColor.r;
      starColors[i * 3 + 1] = starColor.g;
      starColors[i * 3 + 2] = starColor.b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ 
        size: 1.5, 
        vertexColors: true, 
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // --- SHOOTING STARS (WHITE) ---
    const shootingStarCount = 150;
    const shootingStarGeo = new THREE.BufferGeometry();
    const shootingStarPos = new Float32Array(shootingStarCount * 3);
    const shootingStarVels: { x: number, y: number }[] = [];
    const bounds = 2000;
    const zPlane = -4000;

    for (let i = 0; i < shootingStarCount; i++) {
        shootingStarPos[i * 3] = THREE.MathUtils.randFloatSpread(bounds * 2);
        shootingStarPos[i * 3 + 1] = THREE.MathUtils.randFloatSpread(bounds * 2);
        shootingStarPos[i * 3 + 2] = zPlane + Math.random() * 4000;
        shootingStarVels.push({
            x: 10 + Math.random() * 20, // Horizontal speed
            y: -0.5 + Math.random() * 1  // Vertical drift
        });
    }
    shootingStarGeo.setAttribute('position', new THREE.BufferAttribute(shootingStarPos, 3));
    const shootingStarMat = new THREE.PointsMaterial({
        color: 0xffffff, // Changed to white
        size: 6,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    const shootingStars = new THREE.Points(shootingStarGeo, shootingStarMat);
    scene.add(shootingStars);

    // --- EVENT LISTENERS (REDUCED FOR RESPONSIVENESS ONLY) ---
    const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);


    // --- ANIMATION LOOP (SIMPLIFIED) ---
    const clock = new THREE.Clock();
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      
      // Add very slow constant rotation for ambiance
      stars.rotation.y += 0.005 * delta;
      stars.rotation.z += 0.001 * delta;
      
      // Animate Shooting Stars
      const positions = shootingStarGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < shootingStarCount; i++) {
          const i3 = i * 3;
          positions[i3] -= shootingStarVels[i].x;
          positions[i3 + 1] += shootingStarVels[i].y;

          if (positions[i3] < -bounds) {
              positions[i3] = bounds;
              positions[i3 + 1] = THREE.MathUtils.randFloatSpread(bounds);
          }
      }
      shootingStarGeo.attributes.position.needsUpdate = true;


      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  if (theme !== 'elite') {
    return null;
  }

  return <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, background: '#000' }} />;
};

export default StarryBackground;
