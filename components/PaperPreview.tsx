import React, { useRef, useState, useEffect } from 'react';
import { PaperLayout } from '../types';

interface PaperPreviewProps {
  paperLayout: PaperLayout;
  imageUrl: string | null;
  onChange: (updates: Partial<PaperLayout>) => void;
}

export const PaperPreview: React.FC<PaperPreviewProps> = ({ paperLayout, imageUrl, onChange }) => {
  const {
    paperWidthCm,
    paperHeightCm,
    imageWidthCm,
    imageHeightCm,
    offsetXCm,
    offsetYCm
  } = paperLayout;

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number; offsetX: number; offsetY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Maximum dimensions for the preview box
  const MAX_W = 240;
  const MAX_H = 150;

  // Calculate scale factor to fit the paper sheet inside MAX_W x MAX_H
  const scale = Math.min(MAX_W / paperWidthCm, MAX_H / paperHeightCm);

  const paperW_px = paperWidthCm * scale;
  const paperH_px = paperHeightCm * scale;

  const imgW_px = imageWidthCm * scale;
  const imgH_px = imageHeightCm * scale;
  const imgX_px = offsetXCm * scale;
  const imgY_px = offsetYCm * scale;

  const handleStart = (clientX: number, clientY: number) => {
    dragStartRef.current = {
      clientX,
      clientY,
      offsetX: offsetXCm,
      offsetY: offsetYCm
    };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragStartRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const dx = clientX - dragStartRef.current.clientX;
      const dy = clientY - dragStartRef.current.clientY;

      const dxCm = dx / scale;
      const dyCm = dy / scale;

      let nextX = dragStartRef.current.offsetX + dxCm;
      let nextY = dragStartRef.current.offsetY + dyCm;

      // Bound within the physical paper boundaries
      const maxX = paperWidthCm - imageWidthCm;
      const maxY = paperHeightCm - imageHeightCm;

      nextX = Math.max(0, Math.min(maxX, nextX));
      nextY = Math.max(0, Math.min(maxY, nextY));

      onChange({
        offsetXCm: parseFloat(nextX.toFixed(1)),
        offsetYCm: parseFloat(nextY.toFixed(1)),
        alignment: 'custom'
      });
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, scale, paperWidthCm, paperHeightCm, imageWidthCm, imageHeightCm, onChange]);

  return (
    <div className="flex flex-col items-center justify-center space-y-2 p-2 bg-slate-900 border border-slate-800 rounded-xl">
      <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex justify-between w-full px-1">
        <span>Схема расположения</span>
        <span className="text-slate-400 font-mono text-[9px] lowercase">перетащите рисунок</span>
      </div>

      <div 
        ref={containerRef}
        className="relative flex items-center justify-center bg-slate-950/40 border border-dashed border-slate-800 rounded-lg overflow-hidden"
        style={{ width: `${MAX_W}px`, height: `${MAX_H}px` }}
      >
        {/* Paper Sheet Representation */}
        <div 
          className="relative bg-slate-900 border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all overflow-hidden"
          style={{ width: `${paperW_px}px`, height: `${paperH_px}px` }}
        >
          {/* Paper Size Text overlay */}
          <div className="absolute right-1 bottom-1 text-[8px] text-slate-600 font-mono select-none pointer-events-none">
            Лист: {paperWidthCm}x{paperHeightCm}см
          </div>

          {/* Grid/Image placement box inside the paper */}
          <div
            onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX, e.clientY); }}
            onTouchStart={(e) => { handleStart(e.touches[0].clientX, e.touches[0].clientY); }}
            className={`absolute rounded-[2px] shadow-lg cursor-grab transition-shadow overflow-hidden group select-none border-2 border-blue-500/70 hover:border-blue-500 ${isDragging ? 'cursor-grabbing shadow-2xl scale-[1.01] border-blue-400' : ''}`}
            style={{ 
              left: `${imgX_px}px`, 
              top: `${imgY_px}px`, 
              width: `${imgW_px}px`, 
              height: `${imgH_px}px`,
              touchAction: 'none'
            }}
          >
            {imageUrl ? (
              <img 
                src={imageUrl} 
                alt="Miniature" 
                draggable={false}
                className="w-full h-full object-cover opacity-60 pointer-events-none"
              />
            ) : (
              <div className="w-full h-full bg-blue-500/20" />
            )}

            {/* Label inside image */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-1 bg-black/30 pointer-events-none select-none">
              <span className="text-[8px] text-white font-bold leading-none font-mono">Рисунок</span>
              <span className="text-[7px] text-slate-300 font-mono mt-0.5 leading-none">{imageWidthCm}x{imageHeightCm}см</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Margin Infos */}
      <div className="grid grid-cols-2 gap-x-4 w-full text-[9px] font-mono text-slate-500 px-1 pt-0.5 select-none">
        <span>Отступ слева: <strong className="text-slate-350">{offsetXCm.toFixed(1)} см</strong></span>
        <span className="text-right">Сверху: <strong className="text-slate-350">{offsetYCm.toFixed(1)} см</strong></span>
      </div>
    </div>
  );
};
