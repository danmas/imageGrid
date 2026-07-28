import { GridSettings } from './types';

export interface GridLine {
  pct: number;
  isMain: boolean;
  isCenter: boolean;
  index: number;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

export const getGridLinePercents = (settings: GridSettings) => {
  const { hDivisions, vDivisions, subDivisions, gridOffsetX, gridOffsetY, gridScaleX, gridScaleY } = settings;
  
  const totalH = hDivisions * subDivisions;
  const totalV = vDivisions * subDivisions;

  const isCenter = (index: number, total: number) => {
    return Math.abs((index / total) - 0.5) < 0.001;
  };

  const isMain = (index: number) => index % subDivisions === 0;

  const normOffsetX = mod(gridOffsetX + 50, 100) - 50;
  const normOffsetY = mod(gridOffsetY + 50, 100) - 50;

  const vertical: GridLine[] = [];
  const horizontal: GridLine[] = [];

  // Horizontal Lines (constant Y)
  const spacingY = (100 * gridScaleY) / totalH;
  const originY = 50 + normOffsetY - (totalH / 2) * spacingY;
  const startIY = Math.floor(-originY / spacingY) - 1;
  const endIY = Math.ceil((100 - originY) / spacingY) + 1;

  for (let i = startIY; i <= endIY; i++) {
    const y = i * spacingY + originY;
    if (y <= 0.001 || y >= 99.999) continue;
    const absI = Math.abs(i);
    vertical.push({
      pct: y,
      isMain: isMain(absI),
      isCenter: isCenter(absI, totalH),
      index: i
    });
  }

  // Vertical Lines (constant X)
  const spacingX = (100 * gridScaleX) / totalV;
  const originX = 50 + normOffsetX - (totalV / 2) * spacingX;
  const startIX = Math.floor(-originX / spacingX) - 1;
  const endIX = Math.ceil((100 - originX) / spacingX) + 1;

  for (let i = startIX; i <= endIX; i++) {
    const x = i * spacingX + originX;
    if (x <= 0.001 || x >= 99.999) continue;
    const absI = Math.abs(i);
    horizontal.push({
      pct: x,
      isMain: isMain(absI),
      isCenter: isCenter(absI, totalV),
      index: i
    });
  }

  return { vertical, horizontal };
};

export const getGridLines = (settings: GridSettings) => {
  const { vertical, horizontal } = getGridLinePercents(settings);
  return {
    hLines: vertical, // constant Y
    vLines: horizontal // constant X
  };
};

export const calculatePhysicalCm = (pct: number, offsetCm: number, sizeCm: number): number => {
  const val = offsetCm + (pct / 100) * sizeCm;
  return Math.round(val * 10) / 10;
};
