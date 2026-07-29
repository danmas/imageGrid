import { GridSettings } from './types';

export interface GridLine {
  pct: number;
  isMain: boolean;
  isCenter: boolean;
  index: number;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

export const getGridLinePercents = (settings: GridSettings, imgW = 21.0, imgH = 29.7) => {
  const { hDivisions, vDivisions, subDivisions, gridOffsetX, gridOffsetY, gridScaleX, gridScaleY, usePhysicalStep, physicalStepX, physicalStepY } = settings;
  
  const normOffsetX = mod(gridOffsetX + 50, 100) - 50;
  const normOffsetY = mod(gridOffsetY + 50, 100) - 50;

  const vertical: GridLine[] = [];
  const horizontal: GridLine[] = [];

  const isCenter = (index: number, total: number) => {
    return Math.abs((index / total) - 0.5) < 0.001;
  };

  const isMain = (index: number) => index % subDivisions === 0;

  if (usePhysicalStep) {
    // Horizontal Lines (constant Y) - based on physicalStepY
    const stepYCm = physicalStepY > 0 ? physicalStepY : 2.0;
    const spacingYMain = (stepYCm / imgH) * 100;
    const spacingY = spacingYMain / subDivisions;
    const originY = 50 + normOffsetY;

    const startIY = Math.floor(-originY / spacingY) - 1;
    const endIY = Math.ceil((100 - originY) / spacingY) + 1;

    for (let i = startIY; i <= endIY; i++) {
      const y = i * spacingY + originY;
      if (y <= 0.001 || y >= 99.999) continue;
      const absI = Math.abs(i);
      vertical.push({
        pct: y,
        isMain: isMain(absI),
        isCenter: i === 0,
        index: i
      });
    }

    // Vertical Lines (constant X) - based on physicalStepX
    const stepXCm = physicalStepX > 0 ? physicalStepX : 2.0;
    const spacingXMain = (stepXCm / imgW) * 100;
    const spacingX = spacingXMain / subDivisions;
    const originX = 50 + normOffsetX;

    const startIX = Math.floor(-originX / spacingX) - 1;
    const endIX = Math.ceil((100 - originX) / spacingX) + 1;

    for (let i = startIX; i <= endIX; i++) {
      const x = i * spacingX + originX;
      if (x <= 0.001 || x >= 99.999) continue;
      const absI = Math.abs(i);
      horizontal.push({
        pct: x,
        isMain: isMain(absI),
        isCenter: i === 0,
        index: i
      });
    }
  } else {
    const totalH = hDivisions * subDivisions;
    const totalV = vDivisions * subDivisions;

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
  }

  return { vertical, horizontal };
};

export const getGridLines = (settings: GridSettings, imgW = 21.0, imgH = 29.7) => {
  const { vertical, horizontal } = getGridLinePercents(settings, imgW, imgH);
  return {
    hLines: vertical, // constant Y
    vLines: horizontal // constant X
  };
};

export const calculatePhysicalCm = (pct: number, offsetCm: number, sizeCm: number): number => {
  const val = offsetCm + (pct / 100) * sizeCm;
  return Math.round(val * 10) / 10;
};

