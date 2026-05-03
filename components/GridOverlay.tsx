
import React from 'react';
import { GridSettings } from '../types';

interface GridOverlayProps {
  settings: GridSettings;
  imageWidth: number;
  imageHeight: number;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({ settings, imageWidth, imageHeight }) => {
  if (!settings.isVisible || imageWidth === 0 || imageHeight === 0) return null;

  const { hDivisions, vDivisions, subDivisions, color, gridOffsetX, gridOffsetY, gridScaleX, gridScaleY } = settings;
  const horizontalLines = [];
  const verticalLines = [];

  // Total lines for each direction including sub-divisions
  const totalH = hDivisions * subDivisions;
  const totalV = vDivisions * subDivisions;

  const isCenter = (index: number, total: number) => {
    return Math.abs((index / total) - 0.5) < 0.001;
  };

  const isMain = (index: number) => index % subDivisions === 0;

  // Safe modulo (handles negative)
  const mod = (n: number, m: number) => ((n % m) + m) % m;

  // Normalize offset to 0..100 range for wrap-around calculation
  const normOffsetX = mod(gridOffsetX, 100);
  const normOffsetY = mod(gridOffsetY, 100);

  // Horizontal Lines — direct spacing, no modulo wrap
  const spacingY = (100 * gridScaleY) / totalH;
  const startIY = Math.floor(-normOffsetY / spacingY) - 1;
  const endIY = Math.ceil((100 - normOffsetY) / spacingY) + 1;

  for (let i = startIY; i <= endIY; i++) {
    const y = i * spacingY + normOffsetY;
    if (y <= 0.001 || y >= 99.999) continue; // skip border positions
    const absI = Math.abs(i);
    const isMainLine = isMain(absI);
    const isCenterLine = isCenter(absI, totalH);

    horizontalLines.push(
      <line
        key={`h-${i}`}
        x1="0"
        y1={`${y}%`}
        x2="100%"
        y2={`${y}%`}
        stroke={color}
        strokeWidth={isCenterLine ? "2.5" : (isMainLine ? "1.2" : "0.4")}
        strokeOpacity={isCenterLine ? "0.9" : (isMainLine ? "0.7" : "0.3")}
      />
    );
  }

  // Vertical Lines — direct spacing, no modulo wrap
  const spacingX = (100 * gridScaleX) / totalV;
  const startIX = Math.floor(-normOffsetX / spacingX) - 1;
  const endIX = Math.ceil((100 - normOffsetX) / spacingX) + 1;

  for (let i = startIX; i <= endIX; i++) {
    const x = i * spacingX + normOffsetX;
    if (x <= 0.001 || x >= 99.999) continue; // skip border positions
    const absI = Math.abs(i);
    const isMainLine = isMain(absI);
    const isCenterLine = isCenter(absI, totalV);

    verticalLines.push(
      <line
        key={`v-${i}`}
        x1={`${x}%`}
        y1="0"
        x2={`${x}%`}
        y2="100%"
        stroke={color}
        strokeWidth={isCenterLine ? "2.5" : (isMainLine ? "1.2" : "0.4")}
        strokeOpacity={isCenterLine ? "0.9" : (isMainLine ? "0.7" : "0.3")}
      />
    );
  }

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      preserveAspectRatio="none"
      style={{ overflow: 'hidden' }}
    >
      {/* Border */}
      <rect 
        x="0" 
        y="0" 
        width="100%" 
        height="100%" 
        fill="none" 
        stroke={color} 
        strokeWidth="2" 
        strokeOpacity="0.8"
      />
      {horizontalLines}
      {verticalLines}
    </svg>
  );
};
