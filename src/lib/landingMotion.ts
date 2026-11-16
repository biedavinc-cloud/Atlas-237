import { useEffect } from 'react';

/**
 * Landing page motion, all opt-out for prefers-reduced-motion:
 *  - thin scroll-progress bar (#lp-progress) and a compact header state;
 *  - count-up for real product facts ([data-count]), triggered on scroll;
 *  - cursor spotlight on .lp-spot cards, only on devices with a fine
 *    pointer (never on touch screens, so nothing runs on mobile);
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
      const onMove = (e: PointerEvent) => {
        const card = (e.target as HTMLElement | null)?.closest?.('.lp-spot') as HTMLElement | null;
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      };
      document.addEventListener('pointermove', onMove, { passive: true });
      cleanups.push(() => document.removeEventListener('pointermove', onMove));
    }

    return () => cleanups.forEach((c) => c());
  }, []);
}
