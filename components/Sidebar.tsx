import React, { useState, useRef, useEffect } from 'react';
import { Upload, Box, Ruler, MessageSquare, Loader2, Send, Rotate3d, Info, MousePointer2, ArrowDownToLine, Scaling } from 'lucide-react';
import { ModelDimensions, AnalysisMessage, ViewerMode } from '../types';
import { analyzeModelImage } from '../services/geminiService';

interface SidebarProps {
  onFileUpload: (file: File) => void;
  dimensions: ModelDimensions | null;
  getCanvasScreenshot: () => string | null;
  viewerMode: ViewerMode;
  setViewerMode: (mode: ViewerMode) => void;
  onRotateModel: () => void;
  scale: number;
  onScaleChange: (scale: number) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onFileUpload, 
  dimensions, 
  getCanvasScreenshot,
  viewerMode,
  setViewerMode,
  onRotateModel,
  scale,
  onScaleChange
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'ai'>('info');
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!prompt.trim() && messages.length > 0) return;
    
    const screenshot = getCanvasScreenshot();
    if (!screenshot) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Please load a 3D model first to analyze it.', isError: true }]);
      return;
    }

    const currentPrompt = prompt.trim() || "What is this object and what are the 3D printing considerations?";
    setPrompt('');
    setIsAnalyzing(true);
    
    if (prompt.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: currentPrompt }]);
    } else if (messages.length === 0) {
       setMessages(prev => [...prev, { role: 'user', content: "Analyze this model." }]);
    }

    try {
      const response = await analyzeModelImage(screenshot, currentPrompt);
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Failed to analyze the model.", isError: true }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-800 border-l border-slate-700 w-80 shadow-2xl z-10">
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Box className="w-6 h-6 text-indigo-500" />
          STL Inspector
        </h1>
      </div>

      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'info' ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Ruler className="w-4 h-4" />
          Tools
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'ai' ? 'bg-indigo-600/10 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          AI Analysis
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' ? (
          <div className="space-y-6">
            <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600 border-dashed hover:border-indigo-500 transition-colors cursor-pointer relative group">
              <input
                type="file"
                accept=".stl"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center justify-center text-center gap-2 py-4">
                <Upload className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">Upload STL File</span>
                <span className="text-xs text-slate-500">Drag & drop or click</span>
              </div>
            </div>

            {dimensions ? (
              <div className="space-y-4 animate-fade-in">
                
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Orientation</h3>
                 <div className="grid grid-cols-2 gap-2">
                   <button
                    onClick={() => setViewerMode(viewerMode === ViewerMode.ALIGN ? ViewerMode.VIEW : ViewerMode.ALIGN)}
                    className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all border ${
                      viewerMode === ViewerMode.ALIGN 
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' 
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <ArrowDownToLine className="w-5 h-5" />
                    <span className="text-xs font-medium">Drop Face</span>
                  </button>

                  <button
                    onClick={onRotateModel}
                    className="p-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all border bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500"
                  >
                    <Rotate3d className="w-5 h-5" />
                    <span className="text-xs font-medium">Rotate X</span>
                  </button>
                 </div>

                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Scale (%)</h3>
                <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700 flex items-center gap-2">
                  <Scaling className="w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={Math.round(scale * 100)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val > 0) {
                        onScaleChange(val / 100);
                      }
                    }}
                    className="w-full bg-transparent text-white font-mono text-sm focus:outline-none"
                  />
                </div>

                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Measurement</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setViewerMode(viewerMode === ViewerMode.MEASURE ? ViewerMode.VIEW : ViewerMode.MEASURE)}
                    className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all border ${
                      viewerMode === ViewerMode.MEASURE 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <MousePointer2 className="w-5 h-5" />
                    <span className="text-xs font-medium">Ruler Tool</span>
                  </button>
                </div>

                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Dimensions</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Width (X)</span>
                    <span className="font-mono text-indigo-300 font-bold">{dimensions.width.toFixed(2)} mm</span>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Height (Y)</span>
                    <span className="font-mono text-indigo-300 font-bold">{dimensions.height.toFixed(2)} mm</span>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Depth (Z)</span>
                    <span className="font-mono text-indigo-300 font-bold">{dimensions.depth.toFixed(2)} mm</span>
                  </div>
                </div>

                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Volume</h3>
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-slate-400 text-sm">Bounding Box</span>
                  </div>
                   <span className="font-mono text-emerald-300 font-bold text-lg block text-right">
                     {(dimensions.volume / 1000).toFixed(2)} cm³
                   </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500 opacity-60">
                <Info className="w-10 h-10 mb-2" />
                <p className="text-sm">Load a model to see stats</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 mb-4">
              {messages.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-sm mb-4">Ask Gemini to analyze the visible 3D model.</p>
                  <button 
                    onClick={handleSendMessage}
                    disabled={!dimensions}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-md font-medium transition-colors"
                  >
                    Auto-Analyze Model
                  </button>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : msg.isError 
                        ? 'bg-red-900/50 border border-red-700 text-red-200'
                        : 'bg-slate-700 text-slate-200 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAnalyzing && (
                 <div className="flex justify-start">
                   <div className="bg-slate-700 p-3 rounded-lg rounded-bl-none flex items-center gap-2">
                     <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                     <span className="text-xs text-slate-300">Gemini is thinking...</span>
                   </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="mt-auto">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask about this model..."
                  disabled={isAnalyzing || !dimensions}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none h-12 min-h-[48px] max-h-32"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isAnalyzing || !dimensions || !prompt.trim()}
                  className="absolute right-2 top-2 p-1.5 text-indigo-400 hover:text-white disabled:opacity-30 disabled:hover:text-indigo-400 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;