
import React from 'react';
import { GridSettings } from '../types';

interface GridOverlayProps {
  settings: GridSettings;
  imageWidth: number;
  imageHeight: number;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({ settings, imageWidth, imageHeight }) => {
  if (!settings.isVisible || imageWidth === 0 || imageHeight === 0) return null;

  const { hDivisions, vDivisions, subDivisions, color } = settings;
  const horizontalLines = [];
  const verticalLines = [];

  // Total lines for each direction including sub-divisions
  const totalH = hDivisions * subDivisions;
  const totalV = vDivisions * subDivisions;

  const isCenter = (index: number, total: number) => {
    return Math.abs((index / total) - 0.5) < 0.001;
  };

  const isMain = (index: number) => index % subDivisions === 0;

  // Horizontal Lines (Rows)
  for (let i = 1; i < totalH; i++) {
    const y = (i / totalH) * 100;
    const isMainLine = isMain(i);
    const isCenterLine = isCenter(i, totalH);
    
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

  // Vertical Lines (Columns)
  for (let i = 1; i < totalV; i++) {
    const x = (i / totalV) * 100;
    const isMainLine = isMain(i);
    const isCenterLine = isCenter(i, totalV);

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
