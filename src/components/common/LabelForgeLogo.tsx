import React from 'react';

export type LogoVariant = 'full' | 'dark' | 'light' | 'mono' | 'small' | 'badge';

export interface LabelForgeLogoProps {
  size?: number | string;
  variant?: LogoVariant;
  className?: string;
  title?: string;
  id?: string;
}

/**
 * LabelForge Universal Brand Logo
 * Pixel-precise vector rendering matching the official brand identity:
 * - Deep navy squircle base
 * - Layered 3D electric blue shadow plate
 * - Crisp white tag with top-left eyelet hole & top-right cyan dog-ear fold
 * - Precision vertical barcode motif
 * - High-vis cyan targeting bracket at top-right
 * - Vivid orange angled accent bevel at bottom-right
 */
export const LabelForgeLogo: React.FC<LabelForgeLogoProps> = ({
  size = 24,
  variant = 'full',
  className = '',
  title = 'LabelForge Studio',
  id = 'labelforge-brand-logo',
}) => {
  const width = typeof size === 'number' ? size : size;
  const height = typeof size === 'number' ? size : size;

  // Color profiles corresponding to official design system specs
  const colors = React.useMemo(() => {
    switch (variant) {
      case 'dark':
        return {
          bgGradStart: '#141722',
          bgGradEnd: '#0d0f17',
          bgBorder: '#232838',
          bluePlateMain: '#0072f5',
          bluePlateShadow: '#0047a5',
          bluePlateHighlight: '#38bdf8',
          tagBody: '#ffffff',
          tagGradientEnd: '#eef3fb',
          tagShadow: 'rgba(0,0,0,0.3)',
          barcode: '#0d0f17',
          eyelet: '#141722',
          cyanFold: '#00c8ff',
          cyanFoldShadow: '#0072f5',
          cyanBracket: '#00e5ff',
          orangeAccent: '#ff7a00',
          orangeAccentShadow: '#c2410c',
        };
      case 'light':
        return {
          bgGradStart: '#ffffff',
          bgGradEnd: '#f1f5f9',
          bgBorder: '#cbd5e1',
          bluePlateMain: '#0072f5',
          bluePlateShadow: '#0250b8',
          bluePlateHighlight: '#60a5fa',
          tagBody: '#ffffff',
          tagGradientEnd: '#f8fafc',
          tagShadow: 'rgba(15,23,42,0.15)',
          barcode: '#0b1633',
          eyelet: '#f1f5f9',
          cyanFold: '#00b4d8',
          cyanFoldShadow: '#0284c7',
          cyanBracket: '#0284c7',
          orangeAccent: '#f97316',
          orangeAccentShadow: '#ea580c',
        };
      case 'mono':
        return {
          bgGradStart: '#000000',
          bgGradEnd: '#111111',
          bgBorder: '#333333',
          bluePlateMain: '#444444',
          bluePlateShadow: '#222222',
          bluePlateHighlight: '#666666',
          tagBody: '#ffffff',
          tagGradientEnd: '#ffffff',
          tagShadow: 'rgba(0,0,0,0.5)',
          barcode: '#000000',
          eyelet: '#000000',
          cyanFold: '#cccccc',
          cyanFoldShadow: '#888888',
          cyanBracket: '#ffffff',
          orangeAccent: '#888888',
          orangeAccentShadow: '#555555',
        };
      case 'small':
        return {
          bgGradStart: '#0b1633',
          bgGradEnd: '#070f24',
          bgBorder: '#1d3557',
          bluePlateMain: '#0070f3',
          bluePlateShadow: '#0047a5',
          bluePlateHighlight: '#38bdf8',
          tagBody: '#ffffff',
          tagGradientEnd: '#ffffff',
          tagShadow: 'none',
          barcode: '#0b1633',
          eyelet: '#0b1633',
          cyanFold: '#00c8ff',
          cyanFoldShadow: '#0070f3',
          cyanBracket: '#00e5ff',
          orangeAccent: '#ff7a00',
          orangeAccentShadow: '#c2410c',
        };
      case 'badge':
      case 'full':
      default:
        return {
          bgGradStart: '#0c1a3e',
          bgGradEnd: '#071026',
          bgBorder: '#1c2d5a',
          bluePlateMain: '#0070f3',
          bluePlateShadow: '#004499',
          bluePlateHighlight: '#38bdf8',
          tagBody: '#ffffff',
          tagGradientEnd: '#edf3fc',
          tagShadow: 'rgba(0,0,0,0.35)',
          barcode: '#091430',
          eyelet: '#0c1a3e',
          cyanFold: '#00c4ff',
          cyanFoldShadow: '#0072f5',
          cyanBracket: '#00e5ff',
          orangeAccent: '#ff7a00',
          orangeAccentShadow: '#c2410c',
        };
    }
  }, [variant]);

  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <svg
      id={id}
      width={width}
      height={height}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label={title}
      role="img"
    >
      <title>{title}</title>

      <defs>
        {/* Background Canvas Gradient */}
        <linearGradient id={`bg-grad-${uniqueId}`} x1="50" y1="0" x2="50" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colors.bgGradStart} />
          <stop offset="100%" stopColor={colors.bgGradEnd} />
        </linearGradient>

        {/* 3D Blue Base Plate Gradient */}
        <linearGradient id={`blue-plate-${uniqueId}`} x1="30" y1="25" x2="70" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colors.bluePlateHighlight} />
          <stop offset="35%" stopColor={colors.bluePlateMain} />
          <stop offset="100%" stopColor={colors.bluePlateShadow} />
        </linearGradient>

        {/* 3D Blue Isometric Shadow Facet */}
        <linearGradient id={`blue-facet-${uniqueId}`} x1="30" y1="50" x2="60" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colors.bluePlateMain} />
          <stop offset="100%" stopColor={colors.bluePlateShadow} />
        </linearGradient>

        {/* White Tag Body Gradient */}
        <linearGradient id={`tag-grad-${uniqueId}`} x1="45" y1="16" x2="55" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colors.tagBody} />
          <stop offset="100%" stopColor={colors.tagGradientEnd} />
        </linearGradient>

        {/* Cyan Fold Dog-Ear Gradient */}
        <linearGradient id={`cyan-fold-${uniqueId}`} x1="52" y1="16" x2="60" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colors.cyanFold} />
          <stop offset="100%" stopColor={colors.cyanFoldShadow} />
        </linearGradient>

        {/* Orange Accent Gradient */}
        <linearGradient id={`orange-grad-${uniqueId}`} x1="60" y1="38" x2="70" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={colors.orangeAccent} />
          <stop offset="100%" stopColor={colors.orangeAccentShadow} />
        </linearGradient>

        {/* Drop shadow for 3D tag pop */}
        <filter id={`tag-shadow-${uniqueId}`} x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="-1" dy="2" stdDeviation="2.5" floodColor={colors.tagShadow} floodOpacity="0.45" />
        </filter>
      </defs>

      {/* 1. Outer Squircle Container */}
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        rx="23"
        fill={`url(#bg-grad-${uniqueId})`}
        stroke={variant === 'light' ? colors.bgBorder : 'none'}
        strokeWidth={variant === 'light' ? 2 : 0}
      />

      {/* 2. Top-Right Cyan Viewfinder / Targeting Bracket */}
      <path
        d="M 61 17.5 L 68.5 17.5 A 3 3 0 0 1 71.5 20.5 L 71.5 28"
        stroke={colors.cyanBracket}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Layered 3D Electric Blue Offset Base Plate */}
      {/* 3a. Deep blue under-extrusion facet (bottom-left) */}
      <path
        d="M 30 38
           L 30 52.5
           A 6 6 0 0 0 34 58
           L 46 68
           A 7 7 0 0 0 52 70
           L 61 70
           L 62.5 65.5
           L 44 65.5
           A 5 5 0 0 1 40 61.5
           L 33 46
           Z"
        fill={colors.bluePlateShadow}
      />

      {/* 3b. Bright blue stepped layer */}
      <path
        d="M 34.5 28
           A 7 7 0 0 0 30 34.5
           L 30 51
           A 5 5 0 0 0 33 55
           L 44 66
           A 6 6 0 0 0 49 68
           L 63 68
           A 5 5 0 0 0 67 65
           L 67.5 60
           L 64 57
           L 60 57
           A 4 4 0 0 1 57 55.5
           L 42 38
           A 4 4 0 0 1 41 33
           L 41 28
           Z"
        fill={`url(#blue-plate-${uniqueId})`}
      />

      {/* 4. Orange Accent Wedge at Lower Right (3D bevel) */}
      <path
        d="M 60.5 45
           L 68.5 37
           A 4 4 0 0 1 71 40
           L 71 43
           A 4 4 0 0 1 69 46.5
           L 63 51
           A 3 3 0 0 1 60 50
           Z"
        fill={`url(#orange-grad-${uniqueId})`}
      />
      {/* Orange highlight bevel line */}
      <path
        d="M 61 45.5 L 68 38.5"
        stroke="#ffd166"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* 5. Main White Label (Foreground) */}
      <g filter={`url(#tag-shadow-${uniqueId})`}>
        {/* Main Tag Shape */}
        <path
          d="M 43 16.5
             A 6.5 6.5 0 0 0 36.5 23
             L 36.5 43
             A 6 6 0 0 0 38.5 47.5
             L 45 54
             A 5 5 0 0 0 48.5 55.5
             L 57 55.5
             A 5 5 0 0 0 60.5 54
             L 68 46.5
             A 5 5 0 0 0 69.5 43
             L 69.5 34
             A 4 4 0 0 0 68 31
             L 59 22
             L 52 16.5
             Z"
          fill={`url(#tag-grad-${uniqueId})`}
        />

        {/* 6. Tag Eyelet Cutout Hole (Top Left) */}
        <circle
          cx="43"
          cy="23.5"
          r="4.2"
          fill={colors.eyelet}
        />
        {/* Eyelet subtle rim shine */}
        <circle
          cx="43"
          cy="23.5"
          r="4.2"
          stroke={colors.tagBody}
          strokeWidth="0.8"
          opacity="0.6"
        />

        {/* 7. Dog-Ear Folded Corner (Top Right) */}
        {/* Fold crease shadow underneath flap */}
        <path
          d="M 52 16.5 L 52 24.5 A 2 2 0 0 0 54 26.5 L 61 24 Z"
          fill={colors.cyanFoldShadow}
        />
        {/* Vibrant folded cyan triangle */}
        <path
          d="M 52 16.5
             L 52 24.5
             A 1.5 1.5 0 0 0 53.5 26
             L 61 24.5
             Z"
          fill={`url(#cyan-fold-${uniqueId})`}
        />
        {/* Cyan Fold Highlight Edge */}
        <path
          d="M 52 16.5 L 61 24.5"
          stroke="#e0f2fe"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* 8. Precision Barcode Stripes (Inside White Tag) */}
        <g fill={colors.barcode}>
          {/* Bar 1 (Wide) */}
          <rect x="41.5" y="30" width="2.8" height="15" rx="0.7" />
          {/* Bar 2 (Medium) */}
          <rect x="45.5" y="30" width="2.0" height="15" rx="0.6" />
          {/* Bar 3 (Thin) */}
          <rect x="48.7" y="30" width="1.4" height="15" rx="0.5" />
          {/* Bar 4 (Medium) */}
          <rect x="51.3" y="30" width="2.0" height="15" rx="0.6" />
          {/* Bar 5 (Wide) */}
          <rect x="54.5" y="30" width="2.8" height="15" rx="0.7" />
          {/* Bar 6 (Thin) */}
          <rect x="58.5" y="30" width="1.4" height="15" rx="0.5" />
        </g>
      </g>
    </svg>
  );
};

export default LabelForgeLogo;
