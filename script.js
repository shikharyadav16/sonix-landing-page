/* ====================================================
   SONIX — Homepage JavaScript
   Three.js Background, Animations, Interactions
   ==================================================== */

// ============================================================
// 1. THREE.JS ANIMATED PARTICLE BACKGROUND
// ============================================================
(function initThreeBackground() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 50;

    // ---- Particle System ----
    const PARTICLE_COUNT = 600;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const palette = [
        new THREE.Color('#7C3AED'), // violet
        new THREE.Color('#A855F7'), // purple
        new THREE.Color('#22D3EE'), // cyan
        new THREE.Color('#3B82F6'), // blue
        new THREE.Color('#F43F5E'), // rose
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        positions[i3]     = (Math.random() - 0.5) * 120;
        positions[i3 + 1] = (Math.random() - 0.5) * 80;
        positions[i3 + 2] = (Math.random() - 0.5) * 60;

        velocities[i3]     = (Math.random() - 0.5) * 0.015;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.015;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

        sizes[i] = Math.random() * 2.5 + 0.5;

        const color = palette[Math.floor(Math.random() * palette.length)];
        colors[i3]     = color.r;
        colors[i3 + 1] = color.g;
        colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const vertexShader = `
        attribute float size;
        varying vec3 vColor;
        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (200.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
        }
    `;

    const fragmentShader = `
        varying vec3 vColor;
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
            gl_FragColor = vec4(vColor, alpha * 0.2);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ---- Subtle connection lines ----
    const lineCount = 60;
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(lineCount * 6);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x7C3AED,
        transparent: true,
        opacity: 0.025,
        blending: THREE.AdditiveBlending,
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // ---- Mouse interaction ----
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // ---- Animation loop ----
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        const posArray = geometry.attributes.position.array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            posArray[i3]     += velocities[i3];
            posArray[i3 + 1] += velocities[i3 + 1];
            posArray[i3 + 2] += velocities[i3 + 2];

            // Boundary wrap
            if (posArray[i3] > 60)  posArray[i3] = -60;
            if (posArray[i3] < -60) posArray[i3] = 60;
            if (posArray[i3 + 1] > 40)  posArray[i3 + 1] = -40;
            if (posArray[i3 + 1] < -40) posArray[i3 + 1] = 40;

            // Gentle wave motion
            posArray[i3 + 1] += Math.sin(elapsed * 0.3 + i * 0.01) * 0.003;
        }

        geometry.attributes.position.needsUpdate = true;

        // Update connection lines between nearby particles
        let lineIdx = 0;
        const lp = lineGeometry.attributes.position.array;
        for (let i = 0; i < PARTICLE_COUNT && lineIdx < lineCount; i += 8) {
            for (let j = i + 8; j < PARTICLE_COUNT && lineIdx < lineCount; j += 12) {
                const dx = posArray[i * 3] - posArray[j * 3];
                const dy = posArray[i * 3 + 1] - posArray[j * 3 + 1];
                const dz = posArray[i * 3 + 2] - posArray[j * 3 + 2];
                const dist = dx * dx + dy * dy + dz * dz;
                if (dist < 200) {
                    const li = lineIdx * 6;
                    lp[li]     = posArray[i * 3];
                    lp[li + 1] = posArray[i * 3 + 1];
                    lp[li + 2] = posArray[i * 3 + 2];
                    lp[li + 3] = posArray[j * 3];
                    lp[li + 4] = posArray[j * 3 + 1];
                    lp[li + 5] = posArray[j * 3 + 2];
                    lineIdx++;
                }
            }
        }
        lineGeometry.attributes.position.needsUpdate = true;

        // Camera parallax from mouse
        camera.position.x += (mouseX * 3 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 2 - camera.position.y) * 0.02;
        camera.lookAt(0, 0, 0);

        particles.rotation.y = elapsed * 0.02;
        particles.rotation.x = Math.sin(elapsed * 0.05) * 0.05;

        renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();

// ============================================================
// 2. NAVBAR SCROLL EFFECT
// ============================================================
(function initNavbar() {
    const navbar = document.getElementById('navbar');
    const mobileToggle = document.getElementById('mobile-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    // Scroll detection
    let lastScrollY = 0;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        lastScrollY = window.scrollY;
    }, { passive: true });

    // Mobile menu toggle
    if (mobileToggle && mobileMenu) {
        mobileToggle.addEventListener('click', () => {
            const isActive = mobileMenu.classList.toggle('active');
            mobileToggle.innerHTML = isActive
                ? '<i class="ph ph-x"></i>'
                : '<i class="ph ph-list"></i>';
        });

        // Close mobile menu on link click
        mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                mobileToggle.innerHTML = '<i class="ph ph-list"></i>';
            });
        });
    }
})();

// ============================================================
// 3. SCROLL REVEAL ANIMATIONS
// ============================================================
(function initRevealAnimations() {
    const reveals = document.querySelectorAll('.reveal-up');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger delay for sibling elements
                const parent = entry.target.parentElement;
                const siblings = parent ? parent.querySelectorAll('.reveal-up') : [];
                let siblingIndex = 0;
                siblings.forEach((sib, i) => {
                    if (sib === entry.target) siblingIndex = i;
                });

                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, siblingIndex * 100);

                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
    });

    reveals.forEach(el => observer.observe(el));
})();

// ============================================================
// 4. ANIMATED COUNTER (Hero Stats)
// ============================================================
(function initCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.count);
                
                if (target === 0) {
                    // Infinity symbol - already set in HTML
                    observer.unobserve(el);
                    return;
                }

                let current = 0;
                const increment = target / 60;
                const duration = 1800;
                const stepTime = duration / 60;

                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    el.textContent = Math.round(current);
                }, stepTime);

                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
})();

// ============================================================
// 5. FAN LAYOUT HOVER INTERACTION (CSS-driven, minimal JS)
// ============================================================
// The 3-phone fan layout is entirely CSS-driven via perspective + rotateY.
// No carousel logic needed.

// ============================================================
// 6. QUALITY BAR ANIMATION ON SCROLL
// ============================================================
(function initQualityBars() {
    const cards = document.querySelectorAll('.quality-card');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed-bar');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    cards.forEach(card => observer.observe(card));
})();

// ============================================================
// 7. SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================================
(function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                const navHeight = document.getElementById('navbar').offsetHeight;
                const top = targetEl.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
})();

// ============================================================
// 8. FEATURE CARD TILT EFFECT
// ============================================================
(function initCardTilt() {
    const cards = document.querySelectorAll('.feature-card, .quality-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -4;
            const rotateY = ((x - centerX) / centerX) * 4;

            card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
})();

// ============================================================
// 9. TYPING EFFECT ON HERO BADGE (subtle)
// ============================================================
(function initParallaxBadge() {
    const badge = document.querySelector('.hero-badge');
    if (!badge) return;

    // Subtle pulse animation
    badge.style.animation = 'badgePulse 3s ease-in-out infinite';
    const style = document.createElement('style');
    style.textContent = `
        @keyframes badgePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.06); }
            50%      { box-shadow: 0 0 0 6px rgba(147, 51, 234, 0); }
        }
    `;
    document.head.appendChild(style);
})();

// ============================================================
// 10. PRELOADER FADE OUT
// ============================================================
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });
});
