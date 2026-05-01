
export interface GridSettings {
  isVisible: boolean;
  hDivisions: number; // Number of horizontal rows (controlled by horizontal lines)
  vDivisions: number; // Number of vertical columns (controlled by vertical lines)
  subDivisions: number;
  isSquare: boolean;
  color: string;
  gridOffsetX: number; // Horizontal grid offset in % of image width (-100..100)
  gridOffsetY: number; // Vertical grid offset in % of image height (-100..100)
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
