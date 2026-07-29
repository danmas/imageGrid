
export interface GridSettings {
  isVisible: boolean;
  hDivisions: number; // Number of horizontal rows (controlled by horizontal lines)
  vDivisions: number; // Number of vertical columns (controlled by vertical lines)
  subDivisions: number;
  isSquare: boolean;
  color: string;
  gridOffsetX: number; // Horizontal grid offset in % of image width
  gridOffsetY: number; // Vertical grid offset in % of image height
  gridScaleX: number; // Horizontal grid scale factor (1.0 = normal, step 0.05)
  gridScaleY: number; // Vertical grid scale factor (1.0 = normal, step 0.05)
  usePhysicalStep: boolean;
  physicalStepX: number;
  physicalStepY: number;
}

export interface PaletteSettings {
  colors: string[];
  activeIndex: number;
  isVisible: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
}

export interface ImageState {
  url: string | null;
  width: number;
  height: number;
}

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageAdjustments {
  shadows: number;
  highlights: number;
  brightness: number;
}

export interface PaperLayout {
  isEnabled: boolean;
  paperWidthCm: number;
  paperHeightCm: number;
  imageWidthCm: number;
  imageHeightCm: number;
  offsetXCm: number;
  offsetYCm: number;
  alignment: 'center' | 'top-left' | 'custom';
  showCmLabels: boolean;
  showCmExport: boolean;
  includeSubdivisionsInList: boolean;
}

