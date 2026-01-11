
import React, { useState, useRef, useEffect } from 'react';
import { GridOverlay } from './components/GridOverlay';
import { GridSettings, ImageState } from './types';
import { 
  Upload, 
  Eye, 
  EyeOff, 
  Settings2, 
  Image as ImageIcon,
  Camera,
  Layers,
  Square,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

const App: React.FC = () => {
  const [image, setImage] = useState<ImageState>({ url: null, width: 0, height: 0 });
  const [settings, setSettings] = useState<GridSettings>({
    isVisible: true,
    hDivisions: 4,
    vDivisions: 4,
    subDivisions: 4,
    isSquare: false,
    color: '#ffffff'
  });
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        setIsControlsMinimized(false);
      };
      img.src = url;
    }
  };

  const toggleVisibility = () => {
    setSettings(prev => ({ ...prev, isVisible: !prev.isVisible }));
  };

  // Sync divisions if square mode is on
  useEffect(() => {
    if (settings.isSquare && image.width > 0 && image.height > 0) {
      const aspectRatio = image.height / image.width;
      const newH = Math.round(settings.vDivisions * aspectRatio);
      if (newH !== settings.hDivisions) {
        setSettings(prev => ({ ...prev, hDivisions: Math.max(1, newH) }));
      }
    }
  }, [settings.isSquare, settings.vDivisions, image.width, image.height]);

  const updateSetting = (key: keyof GridSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white relative">
      {/* Header */}
      <header className="p-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-20 shadow-lg shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-500 w-6 h-6" />
          <h1 className="text-lg font-bold tracking-tight">ArtGrid</h1>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-blue-900/20"
        >
          <Upload size={18} />
          <span>Загрузить</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </header>

      {/* Main Viewport */}
      <main 
        ref={containerRef}
        onClick={() => image.url && toggleVisibility()}
        className="flex-1 relative overflow-hidden flex items-center justify-center p-4 cursor-pointer group"
      >
        {!image.url ? (
          <div className="text-center space-y-4 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="text-slate-600 w-10 h-10" />
            </div>
            <h2 className="text-xl font-semibold">Начните работу</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Выберите фотографию вашего эскиза или референс, чтобы наложить профессиональную сетку для рисования.
            </p>
            <button 
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="mt-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-6 py-3 rounded-2xl w-full flex items-center justify-center gap-2 transition-colors"
            >
              <Camera size={20} />
              Выбрать изображение
            </button>
          </div>
        ) : (
          <div className="relative max-w-full max-h-full shadow-2xl rounded-sm overflow-hidden border border-slate-800 transition-transform duration-500">
            <img 
              src={image.url} 
              alt="Workspace" 
              className="max-w-full max-h-[85vh] object-contain block"
            />
            <GridOverlay 
              settings={settings} 
              imageWidth={image.width} 
              imageHeight={image.height} 
            />
            
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase tracking-widest text-slate-300 pointer-events-none">
              Tap image to toggle grid
            </div>
          </div>
        )}
      </main>

      {/* Floating Settings Panel */}
      {image.url && (
        <div 
          className={`fixed right-6 bottom-6 z-30 transition-all duration-300 ease-in-out ${
            isControlsMinimized 
              ? 'w-12 h-12' 
              : 'w-[calc(100vw-3rem)] sm:w-80 h-auto'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {isControlsMinimized ? (
            <button 
              onClick={() => setIsControlsMinimized(false)}
              className="w-12 h-12 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-90"
            >
              <Settings2 size={24} className="text-white" />
            </button>
          ) : (
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Panel Header */}
              <div className="p-3 bg-slate-800/50 flex justify-between items-center border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Settings2 size={16} className="text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Настройки</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setIsControlsMinimized(true)}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
                <div className="flex justify-between items-center">
                   <button 
                    onClick={() => updateSetting('isSquare', !settings.isSquare)}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold border ${
                      settings.isSquare 
                        ? 'text-blue-400 bg-blue-400/10 border-blue-400/30' 
                        : 'text-slate-500 bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Square size={14} />
                    <span>КВАДРАТ</span>
                  </button>
                  <div className="w-2" />
                  <button 
                    onClick={toggleVisibility}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 text-xs font-bold border ${
                      settings.isVisible 
                        ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' 
                        : 'text-slate-500 bg-slate-800 border-slate-700'
                    }`}
                  >
                    {settings.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>ВИДИМОСТЬ</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Vertical Columns Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                      <span>{settings.isSquare ? 'Ячейки (Ш)' : 'По горизонтали'}</span>
                      <span className="text-blue-400">{settings.vDivisions}</span>
                    </div>
                    <input 
                      type="range" min="1" max="40" step="1"
                      value={settings.vDivisions}
                      onChange={(e) => updateSetting('vDivisions', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Horizontal Rows Slider */}
                  <div className={`space-y-2 transition-opacity ${settings.isSquare ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                      <span>По вертикали</span>
                      <span className="text-blue-400">{settings.hDivisions}</span>
                    </div>
                    <input 
                      type="range" min="1" max="40" step="1"
                      value={settings.hDivisions}
                      disabled={settings.isSquare}
                      onChange={(e) => updateSetting('hDivisions', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* Sub Divisions Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500">
                      <span>Детализация</span>
                      <span className="text-blue-400">{settings.subDivisions}</span>
                    </div>
                    <input 
                      type="range" min="1" max="8" step="1"
                      value={settings.subDivisions}
                      onChange={(e) => updateSetting('subDivisions', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </div>
                
                {/* Color Selection */}
                <div className="flex justify-between gap-2 pt-2">
                    {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0088ff', '#ffff00'].map(color => (
                        <button 
                            key={color}
                            onClick={() => updateSetting('color', color)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-90 ${settings.color === color ? 'border-blue-500 scale-110 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-slate-800'}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {!image.url && (
          <div className="absolute bottom-6 left-0 right-0 text-center text-slate-700 text-[10px] uppercase tracking-widest animate-pulse pointer-events-none">
            Grid Master v1.3
          </div>
      )}
    </div>
  );
};

export default App;
