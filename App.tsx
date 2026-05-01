
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GridOverlay } from './components/GridOverlay';
import { GridSettings, ImageState, PaletteSettings, CropArea, ImageAdjustments } from './types';
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
  Download
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
    gridOffsetY: 0
  });
  
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
      const aspectRatio = image.height / image.width;
      const newH = Math.round(settings.vDivisions * aspectRatio);
      if (newH !== settings.hDivisions) {
        setSettings(prev => ({ ...prev, hDivisions: Math.max(1, newH) }));
      }
    }
  }, [settings.isSquare, settings.vDivisions, image.width, image.height]);

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
      const { hDivisions, vDivisions, subDivisions, color, gridOffsetX, gridOffsetY } = settings;
      const totalH = hDivisions * subDivisions;
      const totalV = vDivisions * subDivisions;

      const isCenter = (index: number, total: number) => Math.abs((index / total) - 0.5) < 0.001;
      const isMain = (index: number) => index % subDivisions === 0;

      const normOffsetX = ((gridOffsetX % 100) + 100) % 100;
      const normOffsetY = ((gridOffsetY % 100) + 100) % 100;

      ctx.strokeStyle = color;
      
      // Draw extended range for wrap-around
      for (let i = -totalH; i < totalH * 2; i++) {
        if (i === 0) continue;
        const rawY = (i / totalH) * canvas.height;
        const y = (rawY + (normOffsetY / 100) * canvas.height) % canvas.height;
        const absI = Math.abs(i);
        ctx.lineWidth = isCenter(absI, totalH) ? 2.5 : (isMain(absI) ? 1.2 : 0.4);
        ctx.globalAlpha = isCenter(absI, totalH) ? 0.9 : (isMain(absI) ? 0.7 : 0.3);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      for (let i = -totalV; i < totalV * 2; i++) {
        if (i === 0) continue;
        const rawX = (i / totalV) * canvas.width;
        const x = (rawX + (normOffsetX / 100) * canvas.width) % canvas.width;
        const absI = Math.abs(i);
        ctx.lineWidth = isCenter(absI, totalV) ? 2.5 : (isMain(absI) ? 1.2 : 0.4);
        ctx.globalAlpha = isCenter(absI, totalV) ? 0.9 : (isMain(absI) ? 0.7 : 0.3);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
    }

    const link = document.createElement('a');
    link.download = `artgrid-export-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [image.width, image.height, image.url, settings, adjustments, applyCurve]);

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
              
              {!isCropping && <GridOverlay settings={settings} imageWidth={image.width} imageHeight={image.height} />}
              
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
            {(settings.gridOffsetX !== 0 || settings.gridOffsetY !== 0) && (
              <>
                <span className="w-1 h-1 bg-slate-600 rounded-full" />
                <span className="text-blue-400">
                  Сетка: {settings.gridOffsetX.toFixed(1)},{settings.gridOffsetY.toFixed(1)}
                </span>
                <button
                  onClick={() => setSettings(s => ({...s, gridOffsetX: 0, gridOffsetY: 0}))}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="pointer-events-auto text-blue-400 hover:text-blue-300 hover:bg-slate-700/50 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold leading-none"
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
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500"><span>Детализация</span><span className="text-blue-400">{settings.subDivisions}</span></div>
                      <input type="range" min="1" max="8" step="1" value={settings.subDivisions} onChange={(e) => setSettings(s => ({...s, subDivisions: parseInt(e.target.value)}))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                    
                    {/* Grid Offset Controls */}
                    <div className="space-y-3 pt-2 border-t border-slate-800">
                      <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                        <span>Сдвиг сетки</span>
                        <button 
                          onClick={() => setSettings(s => ({...s, gridOffsetX: 0, gridOffsetY: 0}))}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="Сбросить сдвиг"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {/* Row 1: empty, up, empty */}
                        <div />
                        <button 
                          onClick={() => setSettings(s => ({...s, gridOffsetY: s.gridOffsetY - 5}))}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex justify-center active:scale-95 transition-all"
                          title="Сдвинуть вверх"
                        >
                          <ChevronDown size={16} className="rotate-180" />
                        </button>
                        <div />
                        {/* Row 2: left, reset, right */}
                        <button 
                          onClick={() => setSettings(s => ({...s, gridOffsetX: s.gridOffsetX - 5}))}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex justify-center active:scale-95 transition-all"
                          title="Сдвинуть влево"
                        >
                          <ChevronDown size={16} className="rotate-90" />
                        </button>
                        <div className="flex items-center justify-center text-[10px] text-slate-500 font-mono">
                          <span>{settings.gridOffsetX},{settings.gridOffsetY}</span>
                        </div>
                        <button 
                          onClick={() => setSettings(s => ({...s, gridOffsetX: s.gridOffsetX + 5}))}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex justify-center active:scale-95 transition-all"
                          title="Сдвинуть вправо"
                        >
                          <ChevronDown size={16} className="-rotate-90" />
                        </button>
                        {/* Row 3: empty, down, empty */}
                        <div />
                        <button 
                          onClick={() => setSettings(s => ({...s, gridOffsetY: s.gridOffsetY + 5}))}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 flex justify-center active:scale-95 transition-all"
                          title="Сдвинуть вниз"
                        >
                          <ChevronDown size={16} />
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
