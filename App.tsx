
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GridOverlay } from './components/GridOverlay';
import { PaperPreview } from './components/PaperPreview';
import { GridSettings, ImageState, PaletteSettings, CropArea, ImageAdjustments, PaperLayout } from './types';
import { getGridLines, calculatePhysicalCm } from './gridUtils';
import { 
  Upload, 
  Eye, 
  EyeOff, 
  Settings2, 
  Sun,
  Image as ImageIcon,
  Camera,
  Layers,
  Square,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Pipette,
  Palette,
  GripHorizontal,
  Plus,
  Minus,
  Trash2,
  Crop,
  Check,
  X as CloseIcon,
  Download,
  Ruler
} from 'lucide-react';

const SliderWithArrows = ({ label, value, onChange, min = -100, max = 100 }: { label: string, value: number, onChange: (v: number) => void, min?: number, max?: number }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
      <span>{label}</span>
      <span className={value !== 0 ? "text-blue-400" : ""}>{value > 0 ? `+${value}` : value}</span>
    </div>
    <div className="flex items-center gap-2">
      <button 
        onClick={() => onChange(Math.max(min, value - 5))}
        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 active:scale-95 transition-all flex-shrink-0"
      >
        <Minus size={14} />
      </button>
      <input 
        type="range" 
        min={min} 
        max={max} 
        step="1" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))} 
        onDoubleClick={() => onChange(0)}
        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" 
      />
      <button 
        onClick={() => onChange(Math.min(max, value + 5))}
        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 active:scale-95 transition-all flex-shrink-0"
      >
        <Plus size={14} />
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [image, setImage] = useState<ImageState>({ url: null, width: 0, height: 0 });
  const [settings, setSettings] = useState<GridSettings>({
    isVisible: true,
    hDivisions: 4,
    vDivisions: 4,
    subDivisions: 4,
    isSquare: false,
    color: '#ffffff',
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridScaleX: 1,
    gridScaleY: 1,
    usePhysicalStep: false,
    physicalStepX: 2.0,
    physicalStepY: 2.0
  });

  const [activeGridTab, setActiveGridTab] = useState<'grid' | 'ruler'>('grid');
  const [paperLayout, setPaperLayout] = useState<PaperLayout>({
    isEnabled: false,
    paperWidthCm: 21.0,
    paperHeightCm: 29.7,
    imageWidthCm: 21.0,
    imageHeightCm: 29.7,
    offsetXCm: 0,
    offsetYCm: 0,
    alignment: 'center',
    showCmLabels: true,
    showCmExport: true,
    includeSubdivisionsInList: false
  });

  const handlePaperLayoutChange = useCallback((updates: Partial<PaperLayout>) => {
    setPaperLayout(prev => {
      const next = { ...prev, ...updates };
      const imgAR = image.width > 0 ? image.height / image.width : 1;

      if ('imageWidthCm' in updates && updates.imageWidthCm !== undefined) {
        next.imageHeightCm = +(updates.imageWidthCm * imgAR).toFixed(1);
      } else if ('imageHeightCm' in updates && updates.imageHeightCm !== undefined) {
        next.imageWidthCm = +(updates.imageHeightCm / imgAR).toFixed(1);
      }

      if (next.imageWidthCm > next.paperWidthCm) {
        next.imageWidthCm = next.paperWidthCm;
        next.imageHeightCm = +(next.imageWidthCm * imgAR).toFixed(1);
      }
      if (next.imageHeightCm > next.paperHeightCm) {
        next.imageHeightCm = next.paperHeightCm;
        next.imageWidthCm = +(next.imageHeightCm / imgAR).toFixed(1);
      }

      if (next.alignment === 'center') {
        next.offsetXCm = +((next.paperWidthCm - next.imageWidthCm) / 2).toFixed(1);
        next.offsetYCm = +((next.paperHeightCm - next.imageHeightCm) / 2).toFixed(1);
      } else if (next.alignment === 'top-left') {
        next.offsetXCm = 0;
        next.offsetYCm = 0;
      } else {
        next.offsetXCm = Math.max(0, Math.min(next.paperWidthCm - next.imageWidthCm, next.offsetXCm));
        next.offsetYCm = Math.max(0, Math.min(next.paperHeightCm - next.imageHeightCm, next.offsetYCm));
      }

      next.offsetXCm = Math.max(0, +next.offsetXCm.toFixed(1));
      next.offsetYCm = Math.max(0, +next.offsetYCm.toFixed(1));

      return next;
    });
  }, [image.width, image.height]);
  
  const [palette, setPalette] = useState<PaletteSettings>({
    colors: Array(8).fill('#1e293b'),
    activeIndex: 0,
    isVisible: false,
    isMinimized: false,
    position: { x: 20, y: 100 }
  });

  const [isPipetteActive, setIsPipetteActive] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [shrinkToNewSize, setShrinkToNewSize] = useState(false);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({ shadows: 0, highlights: 0, brightness: 0 });
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isGridMinimized, setIsGridMinimized] = useState(false);
  const [isLightMinimized, setIsLightMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const paletteDragStartRef = useRef<{ x: number, y: number } | null>(null);
  const cropHandleRef = useRef<string | null>(null);
  const isGridOffsetDragging = useRef(false);
  const gridDragStartClientRef = useRef({ x: 0, y: 0 });
  const gridOffsetStartRef = useRef({ x: 0, y: 0 });

  const updateOffscreenCanvas = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
    offscreenCanvasRef.current = canvas;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImage({
          url,
          width: img.width,
          height: img.height
        });
        updateOffscreenCanvas(img);
        setIsGridMinimized(false);
        setIsLightMinimized(false);
        resetView();

        const imgAR = img.height / img.width;
        let defaultImgW = 21.0;
        let defaultImgH = +(defaultImgW * imgAR).toFixed(1);
        if (defaultImgH > 29.7) {
          defaultImgH = 29.7;
          defaultImgW = +(defaultImgH / imgAR).toFixed(1);
        }
        setPaperLayout(prev => ({
          ...prev,
          paperWidthCm: 21.0,
          paperHeightCm: 29.7,
          imageWidthCm: defaultImgW,
          imageHeightCm: defaultImgH,
          offsetXCm: +((21.0 - defaultImgW) / 2).toFixed(1),
          offsetYCm: +((29.7 - defaultImgH) / 2).toFixed(1),
          alignment: 'center'
        }));
      };
      img.src = url;
    }
  };

  const resetView = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    lastPositionRef.current = { x: 0, y: 0 };
  }, []);

  const toggleVisibility = useCallback(() => {
    setSettings(prev => ({ ...prev, isVisible: !prev.isVisible }));
  }, []);

  useEffect(() => {
    if (settings.isSquare && image.width > 0 && image.height > 0) {
      const updates: Partial<typeof settings> = {};
      
      if (settings.usePhysicalStep) {
        if (settings.physicalStepX !== settings.physicalStepY) {
          updates.physicalStepY = settings.physicalStepX;
        }
      } else {
        const aspectRatio = image.height / image.width;
        const newH = Math.round(settings.vDivisions * aspectRatio);
        if (newH !== settings.hDivisions) {
          updates.hDivisions = Math.max(1, newH);
        }
      }

      if (settings.gridScaleX !== settings.gridScaleY) {
        const avg = +((settings.gridScaleX + settings.gridScaleY) / 2).toFixed(2);
        updates.gridScaleX = avg;
        updates.gridScaleY = avg;
      }
      
      if (Object.keys(updates).length > 0) {
        setSettings(prev => ({ ...prev, ...updates }));
      }
    }
  }, [settings.isSquare, settings.vDivisions, settings.usePhysicalStep, settings.physicalStepX, settings.physicalStepY, image.width, image.height]);

  const filterTableValues = useMemo(() => {
    const shadowVal = adjustments.shadows / 100;
    const highlightVal = adjustments.highlights / 100;
    const brightVal = adjustments.brightness / 100;
    
    const points = [];
    for (let i = 0; i <= 20; i++) {
        let x = i / 20;
        let y = x;
        
        y += brightVal * 0.4; // Linear offset for brightness
        
        if (x <= 0.5) {
            y += Math.sin(x * Math.PI * 2) * shadowVal * 0.25;
        } else {
            y += Math.sin((x - 0.5) * Math.PI * 2) * highlightVal * 0.25;
        }
        points.push(Math.max(0, Math.min(1, y)).toFixed(4));
    }
    return points.join(' ');
  }, [adjustments.shadows, adjustments.highlights, adjustments.brightness]);

  const cmLists = useMemo(() => {
    if (!paperLayout.isEnabled) return { verticalCm: [], horizontalCm: [] };
    const { hLines, vLines } = getGridLines(settings, paperLayout.imageWidthCm, paperLayout.imageHeightCm);

    // vLines have X coordinate (pct)
    const xList = vLines
      .filter(line => paperLayout.includeSubdivisionsInList || line.isMain || line.isCenter)
      .map(line => calculatePhysicalCm(line.pct, paperLayout.offsetXCm, paperLayout.imageWidthCm))
      .sort((a, b) => a - b);

    // hLines have Y coordinate (pct)
    const yList = hLines
      .filter(line => paperLayout.includeSubdivisionsInList || line.isMain || line.isCenter)
      .map(line => calculatePhysicalCm(line.pct, paperLayout.offsetYCm, paperLayout.imageHeightCm))
      .sort((a, b) => a - b);

    return {
      verticalCm: Array.from(new Set(xList)),
      horizontalCm: Array.from(new Set(yList))
    };
  }, [settings, paperLayout]);

  const applyCurve = useCallback((val: number) => {
    const shadowVal = adjustments.shadows / 100;
    const highlightVal = adjustments.highlights / 100;
    const brightVal = adjustments.brightness / 100;
    let x = val / 255;
    let y = x;
    
    y += brightVal * 0.4;
    
    if (x <= 0.5) {
        y += Math.sin(x * Math.PI * 2) * shadowVal * 0.25;
    } else {
        y += Math.sin((x - 0.5) * Math.PI * 2) * highlightVal * 0.25;
    }
    return Math.max(0, Math.min(255, Math.round(y * 255)));
  }, [adjustments.shadows, adjustments.highlights, adjustments.brightness]);

  const sampleColorAt = (clientX: number, clientY: number) => {
    if (!offscreenCanvasRef.current || !image.url || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportX = clientX - rect.left - rect.width / 2;
    const viewportY = clientY - rect.top - rect.height / 2;
    const imgX = (viewportX - position.x) / scale + (image.width / 2);
    const imgY = (viewportY - position.y) / scale + (image.height / 2);

    if (imgX >= 0 && imgX < image.width && imgY >= 0 && imgY < image.height) {
      const ctx = offscreenCanvasRef.current.getContext('2d');
      const pixel = ctx?.getImageData(Math.floor(imgX), Math.floor(imgY), 1, 1).data;
      if (pixel) {
        const r = applyCurve(pixel[0]);
        const g = applyCurve(pixel[1]);
        const b = applyCurve(pixel[2]);
        const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        const newColors = [...palette.colors];
        newColors[palette.activeIndex] = hex;
        setPalette(prev => ({ ...prev, colors: newColors }));
      }
    }
  };

  const handleApplyCrop = () => {
    if (!offscreenCanvasRef.current || !image.url) return;
    
    const sourceCanvas = offscreenCanvasRef.current;
    const cropX = (cropArea.x / 100) * image.width;
    const cropY = (cropArea.y / 100) * image.height;
    const cropW = (cropArea.width / 100) * image.width;
    const cropH = (cropArea.height / 100) * image.height;

    const canvas = document.createElement('canvas');
    canvas.width = cropW;
    canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    
    const newUrl = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
      setImage({
        url: newUrl,
        width: img.width,
        height: img.height
      });
      updateOffscreenCanvas(img);
      setIsCropping(false);
      resetView();

      if (shrinkToNewSize) {
        // Calculate new size and offsets based on current layout and cropArea
        const newWidthCm = +(paperLayout.imageWidthCm * (cropArea.width / 100)).toFixed(1);
        const newHeightCm = +(paperLayout.imageHeightCm * (cropArea.height / 100)).toFixed(1);
        const newOffsetXCm = +(paperLayout.offsetXCm + paperLayout.imageWidthCm * (cropArea.x / 100)).toFixed(1);
        const newOffsetYCm = +(paperLayout.offsetYCm + paperLayout.imageHeightCm * (cropArea.y / 100)).toFixed(1);

        setPaperLayout(prev => ({
          ...prev,
          imageWidthCm: newWidthCm,
          imageHeightCm: newHeightCm,
          offsetXCm: Math.max(0, newOffsetXCm),
          offsetYCm: Math.max(0, newOffsetYCm),
          alignment: 'custom'
        }));
      } else {
        const imgAR = img.height / img.width;
        let defaultImgW = 21.0;
        let defaultImgH = +(defaultImgW * imgAR).toFixed(1);
        if (defaultImgH > 29.7) {
          defaultImgH = 29.7;
          defaultImgW = +(defaultImgH / imgAR).toFixed(1);
        }
        setPaperLayout(prev => ({
          ...prev,
          imageWidthCm: defaultImgW,
          imageHeightCm: defaultImgH,
          offsetXCm: +((prev.paperWidthCm - defaultImgW) / 2).toFixed(1),
          offsetYCm: +((prev.paperHeightCm - defaultImgH) / 2).toFixed(1),
          alignment: 'center'
        }));
      }
    };
    img.src = newUrl;
  };

  const handleSaveImage = useCallback(() => {
    if (!image.url || !offscreenCanvasRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(offscreenCanvasRef.current, 0, 0);

    if (adjustments.shadows !== 0 || adjustments.highlights !== 0 || adjustments.brightness !== 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = applyCurve(data[i]);
        data[i + 1] = applyCurve(data[i + 1]);
        data[i + 2] = applyCurve(data[i + 2]);
      }
      ctx.putImageData(imageData, 0, 0);
    }

    if (settings.isVisible) {
      const { color } = settings;
      const { hLines, vLines } = getGridLines(settings, paperLayout.imageWidthCm, paperLayout.imageHeightCm);

      ctx.strokeStyle = color;

      const drawLabels = paperLayout.isEnabled && paperLayout.showCmExport;
      const labelOutlineColor = color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff' ? '#000000' : '#ffffff';

      // Horizontal lines (constant Y)
      hLines.forEach(line => {
        const y = (line.pct / 100) * canvas.height;
        ctx.lineWidth = line.isCenter ? 2.5 : (line.isMain ? 1.2 : 0.4);
        ctx.globalAlpha = line.isCenter ? 0.9 : (line.isMain ? 0.7 : 0.3);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        if (drawLabels && (line.isMain || line.isCenter)) {
          const cmVal = calculatePhysicalCm(line.pct, paperLayout.offsetYCm, paperLayout.imageHeightCm);
          ctx.save();
          ctx.globalAlpha = 1.0;
          const fontSize = Math.max(12, Math.round(canvas.height * 0.015));
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.strokeStyle = labelOutlineColor;
          ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.2));
          ctx.strokeText(`${cmVal.toFixed(1)} см`, 8, y);
          ctx.fillStyle = color;
          ctx.fillText(`${cmVal.toFixed(1)} см`, 8, y);
          ctx.restore();
        }
      });

      // Vertical lines (constant X)
      vLines.forEach(line => {
        const x = (line.pct / 100) * canvas.width;
        ctx.lineWidth = line.isCenter ? 2.5 : (line.isMain ? 1.2 : 0.4);
        ctx.globalAlpha = line.isCenter ? 0.9 : (line.isMain ? 0.7 : 0.3);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        if (drawLabels && (line.isMain || line.isCenter)) {
          const cmVal = calculatePhysicalCm(line.pct, paperLayout.offsetXCm, paperLayout.imageWidthCm);
          ctx.save();
          ctx.globalAlpha = 1.0;
          const fontSize = Math.max(12, Math.round(canvas.height * 0.015));
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.textBaseline = 'top';
          ctx.textAlign = 'center';
          ctx.strokeStyle = labelOutlineColor;
          ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.2));
          ctx.strokeText(cmVal.toFixed(1), x, 8);
          ctx.fillStyle = color;
          ctx.fillText(cmVal.toFixed(1), x, 8);
          ctx.restore();
        }
      });

      // Border and edge labels
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      if (drawLabels) {
        ctx.globalAlpha = 1.0;
        const fontSize = Math.max(12, Math.round(canvas.height * 0.015));
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.strokeStyle = labelOutlineColor;
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.2));
        ctx.fillStyle = color;

        // Top Left label
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        ctx.strokeText(`Y: ${paperLayout.offsetXCm.toFixed(1)}x${paperLayout.offsetYCm.toFixed(1)}`, 8, 8);
        ctx.fillText(`Y: ${paperLayout.offsetXCm.toFixed(1)}x${paperLayout.offsetYCm.toFixed(1)}`, 8, 8);

        // Bottom Left label
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        ctx.strokeText(`${(paperLayout.offsetYCm + paperLayout.imageHeightCm).toFixed(1)} см`, 8, canvas.height - 8);
        ctx.fillText(`${(paperLayout.offsetYCm + paperLayout.imageHeightCm).toFixed(1)} см`, 8, canvas.height - 8);

        // Top Right label
        ctx.textBaseline = 'top';
        ctx.textAlign = 'right';
        ctx.strokeText(`${(paperLayout.offsetXCm + paperLayout.imageWidthCm).toFixed(1)} см`, canvas.width - 8, 8);
        ctx.fillText(`${(paperLayout.offsetXCm + paperLayout.imageWidthCm).toFixed(1)} см`, canvas.width - 8, 8);
      }
      
      ctx.globalAlpha = 1.0;
    }

    const link = document.createElement('a');
    link.download = `artgrid-export-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [image.width, image.height, image.url, settings, adjustments, applyCurve, paperLayout]);

  const handleStart = (clientX: number, clientY: number, target?: EventTarget, ctrlKey?: boolean) => {
    if (!image.url) return;

    // Ctrl + LMB: grid offset dragging
    if (ctrlKey) {
      isGridOffsetDragging.current = true;
      gridDragStartClientRef.current = { x: clientX, y: clientY };
      gridOffsetStartRef.current = { x: settings.gridOffsetX, y: settings.gridOffsetY };
      return;
    }
    
    if (isCropping) {
        const handle = (target as HTMLElement)?.dataset?.handle;
        if (handle) {
            cropHandleRef.current = handle;
            dragStartRef.current = { x: clientX, y: clientY };
            lastPositionRef.current = { x: cropArea.x, y: cropArea.y }; // Reusing ref to store initial crop rect values
            return;
        }
    }

    if (isPipetteActive) {
      sampleColorAt(clientX, clientY);
      return;
    }
    
    setIsDragging(false);
    dragStartRef.current = { x: clientX, y: clientY };
    lastPositionRef.current = { ...position };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!image.url) return;

    // Grid offset dragging (Ctrl+LMB)
    if (isGridOffsetDragging.current) {
      const dx = clientX - gridDragStartClientRef.current.x;
      const dy = clientY - gridDragStartClientRef.current.y;
      const deltaXPercent = (dx / scale) / image.width * 100;
      const deltaYPercent = (dy / scale) / image.height * 100;
      setSettings(s => ({
        ...s,
        gridOffsetX: gridOffsetStartRef.current.x + deltaXPercent,
        gridOffsetY: gridOffsetStartRef.current.y + deltaYPercent
      }));
      return;
    }

    if (isCropping && cropHandleRef.current) {
        const dx = ((clientX - dragStartRef.current.x) / (image.width * scale)) * 100;
        const dy = ((clientY - dragStartRef.current.y) / (image.height * scale)) * 100;
        
        setCropArea(prev => {
            const next = { ...prev };
            if (cropHandleRef.current === 'tl') {
                next.x = Math.max(0, Math.min(prev.x + prev.width - 5, prev.x + dx));
                next.y = Math.max(0, Math.min(prev.y + prev.height - 5, prev.y + dy));
                next.width = prev.width - (next.x - prev.x);
                next.height = prev.height - (next.y - prev.y);
            } else if (cropHandleRef.current === 'br') {
                next.width = Math.max(5, Math.min(100 - prev.x, prev.width + dx));
                next.height = Math.max(5, Math.min(100 - prev.y, prev.height + dy));
            } else if (cropHandleRef.current === 'tr') {
                next.y = Math.max(0, Math.min(prev.y + prev.height - 5, prev.y + dy));
                next.width = Math.max(5, Math.min(100 - prev.x, prev.width + dx));
                next.height = prev.height - (next.y - prev.y);
            } else if (cropHandleRef.current === 'bl') {
                next.x = Math.max(0, Math.min(prev.x + prev.width - 5, prev.x + dx));
                next.width = prev.width - (next.x - prev.x);
                next.height = Math.max(5, Math.min(100 - prev.y, prev.height + dy));
            }
            return next;
        });
        dragStartRef.current = { x: clientX, y: clientY };
        return;
    }

    if (isPipetteActive) return;
    
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      setIsDragging(true);
      setPosition({
        x: lastPositionRef.current.x + dx,
        y: lastPositionRef.current.y + dy
      });
    }
  };

  const handleEnd = () => {
    if (isGridOffsetDragging.current) {
      isGridOffsetDragging.current = false;
      return;
    }
    cropHandleRef.current = null;
    if (!isDragging && image.url && !isPipetteActive && !isCropping) {
      toggleVisibility();
    }
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!image.url || isCropping) return;

    // Shift + wheel: change grid scale (both X and Y)
    if (e.shiftKey) {
      const step = e.deltaY > 0 ? -0.05 : 0.05;
      setSettings(s => {
        const newX = Math.min(5, Math.max(0.05, +(s.gridScaleX + step).toFixed(2)));
        const newY = Math.min(5, Math.max(0.05, +(s.gridScaleY + step).toFixed(2)));
        return { ...s, gridScaleX: newX, gridScaleY: newY };
      });
      return;
    }

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(0.1, scale * delta), 20);
    setScale(newScale);
  };

  // Palette Dragging logic
  const handlePaletteDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    paletteDragStartRef.current = { x: clientX - palette.position.x, y: clientY - palette.position.y };
    e.stopPropagation();
  };

  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (isGridOffsetDragging.current) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        handleMove(clientX, clientY);
        return;
      }
      if (paletteDragStartRef.current) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setPalette(prev => ({
          ...prev,
          position: {
            x: clientX - paletteDragStartRef.current!.x,
            y: clientY - paletteDragStartRef.current!.y
          }
        }));
      } else if (cropHandleRef.current) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        handleMove(clientX, clientY);
      }
    };
    const handleGlobalEnd = () => {
      if (isGridOffsetDragging.current) {
        isGridOffsetDragging.current = false;
      }
      paletteDragStartRef.current = null;
      cropHandleRef.current = null;
    };
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalEnd);
    window.addEventListener('touchmove', handleGlobalMove);
    window.addEventListener('touchend', handleGlobalEnd);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [palette.position, isCropping, scale, image.width, image.height]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white relative touch-none select-none">
      {/* Global SVG Filters */}
      <svg width="0" height="0" className="absolute pointer-events-none" style={{ position: 'absolute', width: 0, height: 0, visibility: 'hidden' }}>
        <filter id={`shadow-highlight-filter-${adjustments.shadows}-${adjustments.highlights}-${adjustments.brightness}`} colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncR type="table" tableValues={filterTableValues} />
            <feFuncG type="table" tableValues={filterTableValues} />
            <feFuncB type="table" tableValues={filterTableValues} />
          </feComponentTransfer>
        </filter>
      </svg>

      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-20 shadow-lg shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-500 w-6 h-6" />
          <h1 className="text-lg font-bold tracking-tight">ArtGrid</h1>
        </div>
        
        {isCropping ? (
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={shrinkToNewSize} 
                        onChange={(e) => setShrinkToNewSize(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 w-4 h-4 cursor-pointer"
                    />
                    <span>Урезать размер (не растягивать)</span>
                </label>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsCropping(false)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
                    >
                        <CloseIcon size={18} />
                        <span>Отмена</span>
                    </button>
                    <button 
                        onClick={handleApplyCrop}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                    >
                        <Check size={18} />
                        <span>Применить</span>
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex gap-2">
                {image.url && (
                    <button 
                        onClick={handleSaveImage}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                        title="Сохранить изображение"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Сохранить</span>
                    </button>
                )}
                <button 
                    onClick={() => setPalette(p => ({ ...p, isVisible: !p.isVisible }))}
                    className={`p-2 rounded-full transition-all active:scale-95 border ${palette.isVisible ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    title="Палитра цветов"
                >
                    <Palette size={20} />
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                >
                    <Upload size={18} />
                    <span className="hidden sm:inline">Загрузить</span>
                </button>
            </div>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </header>

      <main 
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.target, e.ctrlKey)}
        onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e.target)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 ${isPipetteActive ? 'cursor-crosshair' : (isCropping ? 'cursor-default' : 'cursor-grab active:cursor-grabbing')}`}
      >
        {!image.url ? (
          <div className="text-center space-y-4 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-700 pointer-events-none">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="text-slate-600 w-10 h-10" />
            </div>
            <h2 className="text-xl font-semibold">Начните работу</h2>
            <p className="text-slate-400 text-sm leading-relaxed text-balance">
              Загрузите изображение, чтобы наложить сетку, кадрировать и анализировать цвета.
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="mt-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-2xl w-full flex items-center justify-center gap-2 transition-colors pointer-events-auto"
            >
              <Camera size={20} />
              Выбрать изображение
            </button>
          </div>
        ) : (
          <div 
            className="relative transition-transform duration-75 ease-out will-change-transform"
            style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
          >
            <div className="relative shadow-2xl rounded-sm overflow-hidden border border-slate-800">
              <img 
                src={image.url} 
                alt="Workspace" 
                draggable={false} 
                className="max-w-[80vw] max-h-[75vh] object-contain block pointer-events-none" 
                style={{ filter: (adjustments.shadows !== 0 || adjustments.highlights !== 0 || adjustments.brightness !== 0) ? `url(#shadow-highlight-filter-${adjustments.shadows}-${adjustments.highlights}-${adjustments.brightness})` : 'none' }}
              />
              
              {!isCropping && <GridOverlay settings={settings} imageWidth={image.width} imageHeight={image.height} paperLayout={paperLayout} />}
              
              {isCropping && (
                  <div className="absolute inset-0 z-50">
                      {/* Dark overlay for outside area */}
                      <div className="absolute inset-0 bg-black/60" style={{ 
                          clipPath: `polygon(
                            0% 0%, 0% 100%, 
                            ${cropArea.x}% 100%, 
                            ${cropArea.x}% ${cropArea.y}%, 
                            ${cropArea.x + cropArea.width}% ${cropArea.y}%, 
                            ${cropArea.x + cropArea.width}% ${cropArea.y + cropArea.height}%, 
                            ${cropArea.x}% ${cropArea.y + cropArea.height}%, 
                            ${cropArea.x}% 100%, 100% 100%, 100% 0%)`
                      }} />
                      
                      {/* Crop Window */}
                      <div 
                        className="absolute border-2 border-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move"
                        style={{ 
                            left: `${cropArea.x}%`, 
                            top: `${cropArea.y}%`, 
                            width: `${cropArea.width}%`, 
                            height: `${cropArea.height}%` 
                        }}
                      >
                          {/* Corner Handles */}
                          <div data-handle="tl" className="absolute -left-2 -top-2 w-5 h-5 bg-white border border-slate-900 rounded-sm cursor-nw-resize" />
                          <div data-handle="tr" className="absolute -right-2 -top-2 w-5 h-5 bg-white border border-slate-900 rounded-sm cursor-ne-resize" />
                          <div data-handle="bl" className="absolute -left-2 -bottom-2 w-5 h-5 bg-white border border-slate-900 rounded-sm cursor-sw-resize" />
                          <div data-handle="br" className="absolute -right-2 -bottom-2 w-5 h-5 bg-white border border-slate-900 rounded-sm cursor-se-resize" />
                          
                          {/* Grid preview in crop */}
                          <div className="absolute inset-0 opacity-20 pointer-events-none grid grid-cols-3 grid-rows-3 border-white/20">
                             <div className="border border-white/30" /><div className="border border-white/30" /><div className="border border-white/30" />
                             <div className="border border-white/30" /><div className="border border-white/30" /><div className="border border-white/30" />
                             <div className="border border-white/30" /><div className="border border-white/30" /><div className="border border-white/30" />
                          </div>
                      </div>
                  </div>
              )}
            </div>
          </div>
        )}
        
        {image.url && (
           <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase tracking-widest text-slate-400 pointer-events-none z-10 flex items-center gap-3">
            <span>{Math.round(scale * 100)}%</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full" />
            <span>{isPipetteActive ? 'Пипетка' : (isCropping ? 'Кадрирование' : 'Навигация')}</span>
            {settings.isVisible && (
              <>
                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                <span className={(settings.gridOffsetX !== 0 || settings.gridOffsetY !== 0) ? "text-blue-400" : "text-slate-500"}>
                  {settings.gridOffsetX.toFixed(1)},{settings.gridOffsetY.toFixed(1)}
                </span>
                <button
                  onClick={() => setSettings(s => ({...s, gridOffsetX: 0, gridOffsetY: 0}))}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`pointer-events-auto rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold leading-none transition-colors ${
                    (settings.gridOffsetX !== 0 || settings.gridOffsetY !== 0)
                      ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-700/50'
                      : 'text-slate-600 cursor-default'
                  }`}
                  title="Сбросить сдвиг сетки (0,0)"
                >
                  ×
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {/* Palette Draggable Panel */}
      {palette.isVisible && image.url && (
        <div 
          className="fixed z-40 transition-shadow duration-300 shadow-2xl"
          style={{ left: palette.position.x, top: palette.position.y }}
        >
          {palette.isMinimized ? (
            <button 
              onClick={() => setPalette(p => ({ ...p, isMinimized: false }))}
              className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white"
            >
              <Palette size={24} />
            </button>
          ) : (
            <div className="w-56 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              <div 
                className="p-2 bg-slate-800/80 flex justify-between items-center border-b border-slate-700 cursor-move"
                onMouseDown={handlePaletteDragStart}
                onTouchStart={handlePaletteDragStart}
              >
                <div className="flex items-center gap-2 text-slate-300">
                  <GripHorizontal size={14} className="text-slate-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Палитра</span>
                </div>
                <button 
                  onClick={() => setPalette(p => ({ ...p, isMinimized: true }))}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {palette.colors.map((color, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setPalette(p => ({ ...p, activeIndex: idx }))}
                      className={`aspect-square rounded-lg border-2 transition-all relative group ${palette.activeIndex === idx ? 'border-blue-500 scale-105 shadow-[0_0_10px_rgba(59,130,246,0.5)] z-10' : 'border-slate-800'}`}
                      style={{ backgroundColor: color }}
                    >
                      {palette.activeIndex === idx && <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                   <button 
                    onClick={() => setPalette(p => ({ ...p, colors: [...p.colors, '#1e293b'] }))}
                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded flex justify-center text-slate-400"
                    title="Добавить ячейку"
                  >
                    <Plus size={16} />
                  </button>
                  <button 
                    onClick={() => setPalette(p => ({ ...p, colors: p.colors.slice(0, -1) }))}
                    disabled={palette.colors.length <= 1}
                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded flex justify-center text-slate-400 disabled:opacity-30"
                    title="Удалить ячейку"
                  >
                    <Minus size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      const newColors = [...palette.colors];
                      newColors[palette.activeIndex] = '#1e293b';
                      setPalette(p => ({ ...p, colors: newColors }));
                    }}
                    className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 rounded flex justify-center text-rose-500"
                    title="Очистить ячейку"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <button 
                  onClick={() => { setIsPipetteActive(!isPipetteActive); if (!isPipetteActive) setIsCropping(false); }}
                  className={`w-full py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${isPipetteActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'bg-slate-800 text-slate-400'}`}
                >
                  <Pipette size={16} />
                  <span>{isPipetteActive ? 'АКТИВНО' : 'ПИПЕТКА'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Settings Panels */}
      {image.url && !isCropping && (
        <div className="fixed right-6 bottom-6 z-30 flex flex-col gap-4 items-end pointer-events-none">
          {/* Light Controls */}
          <div className="pointer-events-auto origin-bottom-right transition-all">
            {isLightMinimized ? (
              <button 
                onClick={() => setIsLightMinimized(false)} 
                className="w-12 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full flex items-center justify-center shadow-2xl group transition-all"
                title="Развернуть Инструменты Света"
              >
                <Sun size={22} className="text-amber-400 group-hover:scale-110 transition-transform" />
              </button>
            ) : (
              <div className="w-[calc(100vw-3rem)] sm:w-80 bg-slate-900/95 backdrop-blur-2xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="p-3 bg-slate-800/50 flex justify-between items-center border-b border-slate-700">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Sun size={16} className="text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Инструменты Света</span>
                  </div>
                  <button onClick={() => setIsLightMinimized(true)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400"><ChevronDown size={18} /></button>
                </div>
                <div className="p-5 space-y-5">
                  <SliderWithArrows 
                    label="Яркость" 
                    value={adjustments.brightness} 
                    onChange={(v: number) => setAdjustments(s => ({...s, brightness: v}))} 
                  />
                  <SliderWithArrows 
                    label="Тени" 
                    value={adjustments.shadows} 
                    onChange={(v: number) => setAdjustments(s => ({...s, shadows: v}))} 
                  />
                  <SliderWithArrows 
                    label="Света" 
                    value={adjustments.highlights} 
                    onChange={(v: number) => setAdjustments(s => ({...s, highlights: v}))} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Grid Controls */}
          <div className="pointer-events-auto origin-bottom-right transition-all">
            {isGridMinimized ? (
              <button 
                onClick={() => setIsGridMinimized(false)} 
                className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-2xl group transition-all"
                title="Развернуть Инструменты Сетка"
              >
                <Settings2 size={22} className="text-white group-hover:scale-110 transition-transform" />
              </button>
            ) : (
              <div className="w-[calc(100vw-3rem)] sm:w-80 bg-slate-900/95 backdrop-blur-2xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="p-3 bg-slate-800/50 flex justify-between items-center border-b border-slate-700">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Settings2 size={16} className="text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">Инструменты Сетка</span>
                  </div>
                  <button onClick={() => setIsGridMinimized(true)} className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400"><ChevronDown size={18} /></button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto max-h-[65vh]">
                  {/* Tab Selector */}
                  <div className="flex border-b border-slate-800 pb-1">
                    <button 
                      onClick={() => setActiveGridTab('grid')}
                      className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 text-center ${activeGridTab === 'grid' ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                      Сетка
                    </button>
                    <button 
                      onClick={() => setActiveGridTab('ruler')}
                      className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 text-center flex items-center justify-center gap-1 ${activeGridTab === 'ruler' ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                    >
                      <Ruler size={11} />
                      Линейка (см)
                    </button>
                  </div>

                  {activeGridTab === 'grid' ? (
                    <>
                      <div className="space-y-3">
                        <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                          <span>Вид</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setScale(s => Math.max(0.1, s - 0.2))} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex-1 flex justify-center"><ZoomOut size={18} /></button>
                          <button onClick={resetView} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex-1 flex justify-center"><RefreshCw size={18} /></button>
                          <button onClick={() => setScale(s => Math.min(20, s + 0.2))} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex-1 flex justify-center"><ZoomIn size={18} /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                         <button 
                          onClick={() => { setIsCropping(true); setIsPipetteActive(false); setCropArea({x: 10, y: 10, width: 80, height: 80}); }} 
                          className="flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold border text-slate-300 bg-slate-800 border-slate-700"
                        >
                          <Crop size={14} /><span>ОБРЕЗАТЬ</span>
                        </button>
                         <button onClick={() => setSettings(s => ({ ...s, isSquare: !s.isSquare }))} className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold border ${settings.isSquare ? 'text-blue-400 bg-blue-400/10 border-blue-400/30' : 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                          <Square size={14} /><span>КВАДРАТ</span>
                        </button>
                        <button onClick={toggleVisibility} className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold border ${settings.isVisible ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                          {settings.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}<span>СЕТКА</span>
                        </button>
                      </div>

                      <div className="space-y-4 pt-2 border-t border-slate-800">
                        {paperLayout.isEnabled && (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Задавать шаг в см</span>
                            <button 
                              onClick={() => setSettings(s => ({ ...s, usePhysicalStep: !s.usePhysicalStep }))}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${settings.usePhysicalStep ? 'bg-blue-600' : 'bg-slate-800'}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${settings.usePhysicalStep ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        )}

                        {settings.usePhysicalStep && paperLayout.isEnabled ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Шаг X (см)</span>
                                <input 
                                  type="number" 
                                  step="0.1"
                                  min="0.1"
                                  value={settings.physicalStepX === 0 ? '' : settings.physicalStepX} 
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    setSettings(s => {
                                      const nextVal = isNaN(val) ? 0 : val;
                                      if (s.isSquare) return { ...s, physicalStepX: nextVal, physicalStepY: nextVal };
                                      return { ...s, physicalStepX: nextVal };
                                    });
                                  }}
                                  onBlur={(e) => {
                                    const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                                    setSettings(s => {
                                      if (s.isSquare) return { ...s, physicalStepX: val, physicalStepY: val };
                                      return { ...s, physicalStepX: val };
                                    });
                                  }}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className={`space-y-1 ${settings.isSquare ? 'opacity-30 pointer-events-none' : ''}`}>
                                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Шаг Y (см)</span>
                                <input 
                                  type="number" 
                                  step="0.1"
                                  min="0.1"
                                  disabled={settings.isSquare}
                                  value={settings.physicalStepY} 
                                  onChange={(e) => {
                                    const val = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                                    setSettings(s => ({ ...s, physicalStepY: val }));
                                  }}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                                <span>{settings.isSquare ? 'Ячейки (Ш)' : 'Колонки'}</span>
                                <span className="text-blue-400">{settings.vDivisions}</span>
                              </div>
                              <input type="range" min="1" max="40" step="1" value={settings.vDivisions} onChange={(e) => setSettings(s => ({...s, vDivisions: parseInt(e.target.value)}))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div className={`space-y-2 transition-opacity ${settings.isSquare ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500"><span>Ряды</span><span className="text-blue-400">{settings.hDivisions}</span></div>
                              <input type="range" min="1" max="40" step="1" value={settings.hDivisions} disabled={settings.isSquare} onChange={(e) => setSettings(s => ({...s, hDivisions: parseInt(e.target.value)}))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500"><span>Детализация</span><span className="text-blue-400">{settings.subDivisions}</span></div>
                          <input type="range" min="1" max="8" step="1" value={settings.subDivisions} onChange={(e) => setSettings(s => ({...s, subDivisions: parseInt(e.target.value)}))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                        </div>
                        
                        {/* Grid Scale Controls */}
                        <div className="space-y-3 pt-2 border-t border-slate-800">
                          <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                            <span>Масштаб сетки</span>
                            <button 
                              onClick={() => setSettings(s => ({...s, gridScaleX: 1, gridScaleY: 1}))}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Сбросить масштаб (1×1)"
                            >
                              <RefreshCw size={12} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div />
                            <button 
                              onClick={() => setSettings(s => {
                                const newY = Math.min(5, +(s.gridScaleY + 0.05).toFixed(2));
                                if (s.isSquare) return {...s, gridScaleX: newY, gridScaleY: newY};
                                return {...s, gridScaleY: newY};
                              })}
                              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex justify-center active:scale-95 transition-all"
                              title="Увеличить масштаб Y"
                            >
                              <Plus size={16} />
                            </button>
                            <div />
                            <button 
                              onClick={() => setSettings(s => {
                                const newX = Math.max(0.05, +(s.gridScaleX - 0.05).toFixed(2));
                                if (s.isSquare) return {...s, gridScaleX: newX, gridScaleY: newX};
                                return {...s, gridScaleX: newX};
                              })}
                              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex justify-center active:scale-95 transition-all"
                              title="Уменьшить масштаб X"
                            >
                              <Minus size={16} />
                            </button>
                            <div className="flex items-center justify-center text-[10px] text-slate-500 font-mono">
                              <span>X:{settings.gridScaleX.toFixed(2)} Y:{settings.gridScaleY.toFixed(2)}</span>
                            </div>
                            <button 
                              onClick={() => setSettings(s => {
                                const newX = Math.min(5, +(s.gridScaleX + 0.05).toFixed(2));
                                if (s.isSquare) return {...s, gridScaleX: newX, gridScaleY: newX};
                                return {...s, gridScaleX: newX};
                              })}
                              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex justify-center active:scale-95 transition-all"
                              title="Увеличить масштаб X"
                            >
                              <Plus size={16} />
                            </button>
                            <div />
                            <button 
                              onClick={() => setSettings(s => {
                                const newY = Math.max(0.05, +(s.gridScaleY - 0.05).toFixed(2));
                                if (s.isSquare) return {...s, gridScaleX: newY, gridScaleY: newY};
                                return {...s, gridScaleY: newY};
                              })}
                              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex justify-center active:scale-95 transition-all"
                              title="Уменьшить масштаб Y"
                            >
                              <Minus size={16} />
                            </button>
                            <div />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between gap-2 pt-4 border-t border-slate-800">
                          {['#ffffff', '#000000', '#ff3e3e', '#3eff3e', '#3e8cff', '#ffff3e'].map(color => (
                              <button key={color} onClick={() => setSettings(s => ({...s, color}))} className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-90 ${settings.color === color ? 'border-blue-500 scale-110 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-slate-800'}`} style={{ backgroundColor: color }} />
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      {/* Enable Switch */}
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Включить линейку</span>
                        <button 
                          onClick={() => handlePaperLayoutChange({ isEnabled: !paperLayout.isEnabled })}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${paperLayout.isEnabled ? 'bg-blue-600' : 'bg-slate-800'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${paperLayout.isEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>

                      {paperLayout.isEnabled && (
                        <div className="space-y-3 pt-2 border-t border-slate-850 animate-in fade-in duration-150">
                          {/* Sheet Layout Preview with Drag and Drop */}
                          <PaperPreview 
                            paperLayout={paperLayout} 
                            imageUrl={image.url} 
                            onChange={handlePaperLayoutChange} 
                          />

                          {/* Presets */}
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Размер бумаги (Лист)</label>
                            <select 
                              value={
                                paperLayout.paperWidthCm === 21.0 && paperLayout.paperHeightCm === 29.7 ? 'a4' :
                                paperLayout.paperWidthCm === 29.7 && paperLayout.paperHeightCm === 42.0 ? 'a3' :
                                paperLayout.paperWidthCm === 14.8 && paperLayout.paperHeightCm === 21.0 ? 'a5' :
                                paperLayout.paperWidthCm === 21.6 && paperLayout.paperHeightCm === 27.9 ? 'letter' : 'custom'
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'a4') handlePaperLayoutChange({ paperWidthCm: 21.0, paperHeightCm: 29.7 });
                                else if (val === 'a3') handlePaperLayoutChange({ paperWidthCm: 29.7, paperHeightCm: 42.0 });
                                else if (val === 'a5') handlePaperLayoutChange({ paperWidthCm: 14.8, paperHeightCm: 21.0 });
                                else if (val === 'letter') handlePaperLayoutChange({ paperWidthCm: 21.6, paperHeightCm: 27.9 });
                              }}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                            >
                              <option value="a4">A4 (21.0 × 29.7 см)</option>
                              <option value="a3">A3 (29.7 × 42.0 см)</option>
                              <option value="a5">A5 (14.8 × 21.0 см)</option>
                              <option value="letter">Letter (21.6 × 27.9 см)</option>
                              <option value="custom">Свой размер...</option>
                            </select>
                          </div>

                          {/* Paper Size custom inputs */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Лист Ш (см)</span>
                              <input 
                                type="number" 
                                step="0.1" 
                                value={paperLayout.paperWidthCm} 
                                onChange={(e) => handlePaperLayoutChange({ paperWidthCm: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Лист В (см)</span>
                              <input 
                                type="number" 
                                step="0.1" 
                                value={paperLayout.paperHeightCm} 
                                onChange={(e) => handlePaperLayoutChange({ paperHeightCm: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {/* Image size physical */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Рисунок Ш (см)</span>
                              <input 
                                type="number" 
                                step="0.1" 
                                value={paperLayout.imageWidthCm} 
                                onChange={(e) => handlePaperLayoutChange({ imageWidthCm: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Рисунок В (см)</span>
                              <input 
                                type="number" 
                                step="0.1" 
                                value={paperLayout.imageHeightCm} 
                                onChange={(e) => handlePaperLayoutChange({ imageHeightCm: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {/* Alignment */}
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Выравнивание на листе</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['center', 'top-left', 'custom'] as const).map(align => (
                                <button
                                  key={align}
                                  onClick={() => handlePaperLayoutChange({ alignment: align })}
                                  className={`py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all border ${paperLayout.alignment === align ? 'text-blue-400 bg-blue-400/10 border-blue-400/30' : 'text-slate-400 bg-slate-800 border-slate-700'}`}
                                >
                                  {align === 'center' ? 'Центр' : align === 'top-left' ? 'Угол' : 'Смещение'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Offset inputs if custom */}
                          {paperLayout.alignment === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-100">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Слева X (см)</span>
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  value={paperLayout.offsetXCm} 
                                  onChange={(e) => handlePaperLayoutChange({ offsetXCm: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Сверху Y (см)</span>
                                <input 
                                  type="number" 
                                  step="0.1" 
                                  value={paperLayout.offsetYCm} 
                                  onChange={(e) => handlePaperLayoutChange({ offsetYCm: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200 font-mono outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          )}

                          {/* Checkboxes */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-850">
                            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={paperLayout.showCmLabels} 
                                onChange={(e) => handlePaperLayoutChange({ showCmLabels: e.target.checked })}
                                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                              />
                              <span>Разметка в см на экране</span>
                            </label>
                            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={paperLayout.showCmExport} 
                                onChange={(e) => handlePaperLayoutChange({ showCmExport: e.target.checked })}
                                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                              />
                              <span>Разметка на экспортном файле</span>
                            </label>
                            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={paperLayout.includeSubdivisionsInList} 
                                onChange={(e) => handlePaperLayoutChange({ includeSubdivisionsInList: e.target.checked })}
                                className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 w-3.5 h-3.5"
                              />
                              <span>Мелкие деления в списке</span>
                            </label>
                          </div>

                          {/* Ruler marks list */}
                          <div className="space-y-2 pt-2.5 border-t border-slate-850">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Отметки для линейки (см)</div>
                            <div className="space-y-2">
                              <div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Горизонтальные (сверху/снизу листа):</div>
                                <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto pr-1">
                                  {cmLists.verticalCm.length > 0 ? (
                                    cmLists.verticalCm.map((val, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] font-mono text-slate-300">
                                        {val.toFixed(1)}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-650 italic">Нет линий</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Вертикальные (слева/справа листа):</div>
                                <div className="flex flex-wrap gap-1 mt-1 max-h-20 overflow-y-auto pr-1">
                                  {cmLists.horizontalCm.length > 0 ? (
                                    cmLists.horizontalCm.map((val, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] font-mono text-slate-300">
                                        {val.toFixed(1)}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-650 italic">Нет линий</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
