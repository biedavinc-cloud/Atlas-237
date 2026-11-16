import { useEffect } from 'react';

/**
 * Landing page motion, all opt-out for prefers-reduced-motion:
 *  - thin scroll-progress bar (#lp-progress) and a compact header state;
 *  - count-up for real product facts ([data-count]), triggered on scroll;
 *  - cursor spotlight on .lp-spot cards, only on devices with a fine
 *    pointer (never on touch screens, so nothing runs on mobile);
 *  - hero 3D stage (#lp-stage): leans back at the top and flattens as you
 *    scroll; follows the mouse on desktop;
 *  - magnetic CTAs (.lp-magnetic) and card tilt (.lp-tilt), desktop only.
 * One passive scroll listener + rAF and one delegated pointer listener;
 * transforms only.
 */
export function useLandingMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: (() => void)[] = [];

    // Count-up of real facts. The final value is in the HTML (SEO / no-JS);
    // counters below the fold are reset to 0 and run once they come into
    // view — checked on scroll, so a fast scroll past them still finishes.
    const render = (el: HTMLElement, v: number) => { el.textContent = `${v}${el.dataset.suffix || ''}`; };
    const pending = new Set<HTMLElement>();
    if (!reduced) {
      document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
        if (el.getBoundingClientRect().top > window.innerHeight * 0.9) { render(el, 0); pending.add(el); }
      });
    }
    const runCounter = (el: HTMLElement) => {
      pending.delete(el);
      const target = Number(el.dataset.count) || 0;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / 1100);
        render(el, Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    // Scroll progress + header state (+ counters)
    const bar = document.getElementById('lp-progress');
    const header = document.getElementById('lp-header');
    const stage = document.getElementById('lp-stage');
    let mouseX = 0; let mouseY = 0; // -1..1 relative to the viewport centre
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        if (bar) bar.style.transform = `scaleX(${p})`;
        header?.classList.toggle('lp-scrolled', window.scrollY > 8);
        if (stage && !reduced) {
          const k = Math.max(0, 1 - window.scrollY / 520);
          stage.style.setProperty('--lp-rx', `${(10 * k + mouseX * -3).toFixed(2)}deg`);
          stage.style.setProperty('--lp-ry', `${(mouseY * 5).toFixed(2)}deg`);
        }
        pending.forEach((el) => { if (el.getBoundingClientRect().top < window.innerHeight * 0.85) runCounter(el); });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    cleanups.push(() => window.removeEventListener('scroll', onScroll));
    // Leaving the page mid-count must not leave a 0 behind if the DOM is reused.
    cleanups.push(() => pending.forEach((el) => render(el, Number(el.dataset.count) || 0)));

    // Spotlight on cards (desktop pointers only)
    if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let tilted: HTMLElement | null = null;
      let magnet: HTMLElement | null = null;
      const release = (el: HTMLElement | null, a: string, b: string) => { el?.style.removeProperty(a); el?.style.removeProperty(b); };
      const onMove = (e: PointerEvent) => {
        const t = e.target as HTMLElement | null;
        // stage follows the mouse while the hero is on screen
        if (stage && window.scrollY < 900) {
          mouseX = (e.clientY / window.innerHeight) * 2 - 1;
          mouseY = (e.clientX / window.innerWidth) * 2 - 1;
          onScroll();
        }
        const card = t?.closest?.('.lp-spot') as HTMLElement | null;
        if (card) {
          const r = card.getBoundingClientRect();
          card.style.setProperty('--mx', `${e.clientX - r.left}px`);
          card.style.setProperty('--my', `${e.clientY - r.top}px`);
        }
        const tilt = t?.closest?.('.lp-tilt') as HTMLElement | null;
        if (tilted && tilted !== tilt) release(tilted, '--lp-tx', '--lp-ty');
        tilted = tilt;
        if (tilt) {
          const r = tilt.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          tilt.style.setProperty('--lp-tx', `${(-py * 6).toFixed(2)}deg`);
          tilt.style.setProperty('--lp-ty', `${(px * 6).toFixed(2)}deg`);
        }
        const mag = t?.closest?.('.lp-magnetic') as HTMLElement | null;
        if (magnet && magnet !== mag) release(magnet, '--lp-mx', '--lp-my');
        magnet = mag;
        if (mag) {
          const r = mag.getBoundingClientRect();
          mag.style.setProperty('--lp-mx', `${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px`);
          mag.style.setProperty('--lp-my', `${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`);
        }
      };
      const onLeave = () => { release(tilted, '--lp-tx', '--lp-ty'); release(magnet, '--lp-mx', '--lp-my'); tilted = magnet = null; mouseX = mouseY = 0; onScroll(); };
      document.addEventListener('pointermove', onMove, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
      cleanups.push(() => { document.removeEventListener('pointermove', onMove); document.documentElement.removeEventListener('pointerleave', onLeave); });
    }

    return () => cleanups.forEach((c) => c());
  }, []);
}
