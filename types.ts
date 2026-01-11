
export interface GridSettings {
  isVisible: boolean;
  hDivisions: number; // Number of horizontal rows (controlled by horizontal lines)
  vDivisions: number; // Number of vertical columns (controlled by vertical lines)
  subDivisions: number;
  isSquare: boolean;
  color: string;
}

export interface ImageState {
  url: string | null;
  width: number;
  height: number;
}
