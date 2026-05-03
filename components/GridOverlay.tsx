
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

  // Range must cover viewport even when scale shrinks (denser lines)
  const rangeY = Math.max(totalH * 2, Math.ceil(totalH / Math.max(0.1, gridScaleY)) + 2);
  const rangeX = Math.max(totalV * 2, Math.ceil(totalV / Math.max(0.1, gridScaleX)) + 2);

  // Horizontal Lines (Rows) — deduplicated by position
  const seenY = new Set<string>();
  for (let i = -rangeY; i < rangeY * 2; i++) {
    if (i === 0) continue; // skip boundary at 0
    const rawY = (i / totalH) * 100 * gridScaleY;
    const y = mod(rawY + normOffsetY, 100);
    const yKey = y.toFixed(4);
    if (seenY.has(yKey)) continue;
    seenY.add(yKey);
    const isMainLine = isMain(Math.abs(i));
    const isCenterLine = isCenter(Math.abs(i), totalH);
    
    horizontalLines.push(
      <line
        key={`h-${yKey}`}
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

  // Vertical Lines (Columns) — deduplicated by position
  const seenX = new Set<string>();
  for (let i = -rangeX; i < rangeX * 2; i++) {
    if (i === 0) continue;
    const rawX = (i / totalV) * 100 * gridScaleX;
    const x = mod(rawX + normOffsetX, 100);
    const xKey = x.toFixed(4);
    if (seenX.has(xKey)) continue;
    seenX.add(xKey);
    const isMainLine = isMain(Math.abs(i));
    const isCenterLine = isCenter(Math.abs(i), totalV);

    verticalLines.push(
      <line
        key={`v-${xKey}`}
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
