
import React from 'react';
import { GridSettings, PaperLayout } from '../types';
import { getGridLines, calculatePhysicalCm } from '../gridUtils';

interface GridOverlayProps {
  settings: GridSettings;
  imageWidth: number;
  imageHeight: number;
  paperLayout?: PaperLayout;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({ settings, imageWidth, imageHeight, paperLayout }) => {
  if (!settings.isVisible || imageWidth === 0 || imageHeight === 0) return null;

  const { color, gridOffsetX, gridOffsetY } = settings;
  const { hLines, vLines } = getGridLines(settings);

  // Safe modulo (handles negative)
  const mod = (n: number, m: number) => ((n % m) + m) % m;
  const normOffsetX = mod(gridOffsetX + 50, 100) - 50;
  const normOffsetY = mod(gridOffsetY + 50, 100) - 50;

  const showLabels = paperLayout?.isEnabled && paperLayout?.showCmLabels;
  const paperW = paperLayout?.paperWidthCm ?? 21.0;
  const paperH = paperLayout?.paperHeightCm ?? 29.7;
  const imgW = paperLayout?.imageWidthCm ?? 21.0;
  const imgH = paperLayout?.imageHeightCm ?? 29.7;
  const offsetX = paperLayout?.offsetXCm ?? 0;
  const offsetY = paperLayout?.offsetYCm ?? 0;

  const labelOutlineColor = color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff' ? '#000000' : '#ffffff';

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fill: color,
    stroke: labelOutlineColor,
    strokeWidth: '2.5px',
    paintOrder: 'stroke',
    userSelect: 'none'
  };

  const horizontalLines = hLines.map((line) => {
    const y = line.pct;
    const isMainLine = line.isMain;
    const isCenterLine = line.isCenter;

    const cmVal = calculatePhysicalCm(y, offsetY, imgH);
    const showLabelOnLine = showLabels && (isMainLine || isCenterLine);

    return (
      <g key={`h-group-${line.index}`}>
        <line
          x1="0"
          y1={`${y}%`}
          x2="100%"
          y2={`${y}%`}
          stroke={color}
          strokeWidth={isCenterLine ? "2.5" : (isMainLine ? "1.2" : "0.4")}
          strokeOpacity={isCenterLine ? "0.9" : (isMainLine ? "0.7" : "0.3")}
        />
        {showLabelOnLine && (
          <text
            x="8"
            y={`${y}%`}
            dy="4"
            style={labelStyle}
            textAnchor="start"
          >
            {cmVal.toFixed(1)}
          </text>
        )}
      </g>
    );
  });

  const verticalLines = vLines.map((line) => {
    const x = line.pct;
    const isMainLine = line.isMain;
    const isCenterLine = line.isCenter;

    const cmVal = calculatePhysicalCm(x, offsetX, imgW);
    const showLabelOnLine = showLabels && (isMainLine || isCenterLine);

    return (
      <g key={`v-group-${line.index}`}>
        <line
          x1={`${x}%`}
          y1="0"
          x2={`${x}%`}
          y2="100%"
          stroke={color}
          strokeWidth={isCenterLine ? "2.5" : (isMainLine ? "1.2" : "0.4")}
          strokeOpacity={isCenterLine ? "0.9" : (isMainLine ? "0.7" : "0.3")}
        />
        {showLabelOnLine && (
          <text
            x={`${x}%`}
            y="16"
            style={labelStyle}
            textAnchor="middle"
          >
            {cmVal.toFixed(1)}
          </text>
        )}
      </g>
    );
  });

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

      {/* Edge labels for image boundaries */}
      {showLabels && (
        <>
          {/* Top Edge (offsetY) */}
          <text x="8" y="16" style={labelStyle} textAnchor="start">
            Y: {offsetX.toFixed(1)}x{offsetY.toFixed(1)}
          </text>
          {/* Bottom Edge label (offsetY + imgH) */}
          <text x="8" y={imageHeight - 8} style={labelStyle} textAnchor="start">
            {(offsetY + imgH).toFixed(1)} см
          </text>
          {/* Right Edge label (offsetX + imgW) */}
          <text x={imageWidth - 8} y="16" style={labelStyle} textAnchor="end">
            {(offsetX + imgW).toFixed(1)} см
          </text>
        </>
      )}

      {/* Grid center marker (0,0) */}
      <circle
        cx={`${50 + normOffsetX}%`}
        cy={`${50 + normOffsetY}%`}
        r={Math.min(imageWidth, imageHeight) * 0.012}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeOpacity="0.9"
      />
    </svg>
  );
};

