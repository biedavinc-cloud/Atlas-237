import type { ElementType } from 'react';

export interface SplitPart {
  text: string;
  /** Extra classes for these words (e.g. the gradient accent). */
  className?: string;
}

interface SplitRevealProps {
  parts: SplitPart[] | string;
  as?: ElementType;
  className?: string;
  /** 'load' plays once on page load (hero); 'scroll' plays when the heading enters the viewport. */
  trigger?: 'load' | 'scroll';
  /** Delay before the first word, in ms. */
  delay?: number;
}

/**
 * Headline that arrives word by word: each word rises and comes into focus
 * (blur → sharp). Words stay real text, so the heading reads the same for
 * screen readers and search engines; spaces sit between the spans so lines
 * wrap normally. Frozen on the final frame under prefers-reduced-motion.
 */
export function SplitReveal({ parts, as: Tag = 'h2', className = '', trigger = 'scroll', delay = 0 }: SplitRevealProps) {
  const list: SplitPart[] = typeof parts === 'string' ? [{ text: parts }] : parts;
  let i = 0;
  const words = list.flatMap((part, pi) =>
    part.text.split(/\s+/).filter(Boolean).map((w, wi) => {
      const idx = i++;
      return (
        <span key={`${pi}-${wi}`}>
          {idx > 0 ? ' ' : ''}
          <span className={`lp-word ${part.className || ''}`} style={{ ['--i' as string]: idx, ['--d' as string]: `${delay}ms` }}>{w}</span>
        </span>
      );
    }),
  );
  return <Tag className={`lp-split ${trigger === 'load' ? 'lp-split-load' : 'reveal'} ${className}`}>{words}</Tag>;
}
