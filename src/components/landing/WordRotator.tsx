import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface WordRotatorProps {
  words: string[];
  /** ms each word stays on screen */
  interval?: number;
  /** ms before the first change (lets the headline reveal finish) */
  startDelay?: number;
  className?: string;
}

/**
 * Rolling word (like globpay.ai): the current word slides up and out while
 * the next one rises from below; the slot's width follows the word. Pauses
 * when the tab is hidden; under prefers-reduced-motion words change without
 * movement. Screen readers get the first word only (aria-hidden on the
 * moving copies, the caller renders an sr-only sentence).
 */
export function WordRotator({ words, interval = 2400, startDelay = 1800, className = '' }: WordRotatorProps) {
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const measureRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = measureRef.current?.children[index] as HTMLElement | undefined;
    if (el) setWidth(el.getBoundingClientRect().width);
  }, [index, words]);

  useEffect(() => {
    const onResize = () => {
      const el = measureRef.current?.children[index] as HTMLElement | undefined;
      if (el) setWidth(el.getBoundingClientRect().width);
    };
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(onResize).catch(() => {});
    return () => window.removeEventListener('resize', onResize);
  }, [index]);

  useEffect(() => {
    if (words.length < 2) return;
    let timer: number;
    const tick = () => {
      if (!document.hidden) {
        setIndex((i) => { setPrev(i); return (i + 1) % words.length; });
      }
      timer = window.setTimeout(tick, interval);
    };
    timer = window.setTimeout(tick, startDelay);
    return () => window.clearTimeout(timer);
  }, [words.length, interval, startDelay]);

  return (
    <span className={`lp-rotator ${className}`} style={{ width }} aria-hidden="true">
      {/* invisible copies used to measure each word's width */}
      <span ref={measureRef} className="lp-rotator-measure">
        {words.map((w) => <span key={w}>{w}</span>)}
      </span>
      {prev !== null && <span key={`out-${prev}-${index}`} className="lp-rotator-word is-out">{words[prev]}</span>}
      <span key={`in-${index}`} className={`lp-rotator-word ${prev !== null ? 'is-in' : ''}`}>{words[index]}</span>
    </span>
  );
}
