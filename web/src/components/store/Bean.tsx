import type { CSSProperties } from 'react';

export type BeanTone = 'green' | 'light' | 'medium' | 'dark';

export const BEAN_COLORS: Record<BeanTone, string> = {
  green: '#7a8450',
  light: '#c08a4a',
  medium: '#7a4521',
  dark: '#3a1f10',
};

interface Props {
  tone?: BeanTone;
  className?: string;
  style?: CSSProperties;
}

/** A single coffee bean drawn in SVG. `.bean-body` can be tweened by GSAP. */
export function Bean({ tone = 'medium', className, style }: Props) {
  return (
    <svg viewBox="0 0 100 140" className={className} style={style} aria-hidden="true">
      <path
        className="bean-body"
        d="M50 4C22 4 3 38 3 78c0 36 20 58 47 58s47-22 47-58C97 38 78 4 50 4Z"
        fill={BEAN_COLORS[tone]}
      />
      <ellipse cx="32" cy="40" rx="13" ry="26" fill="#fff" opacity="0.14" transform="rotate(-14 32 40)" />
      <path
        d="M54 10C34 36 68 54 50 82c-14 22 8 40-4 54"
        fill="none"
        stroke="#000"
        strokeOpacity="0.45"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
