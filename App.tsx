import React, { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import Viewer3D from './components/Viewer3D';
import Sidebar from './components/Sidebar';
import { ModelDimensions, ViewerMode } from './types';

const App: React.FC = () => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<ModelDimensions | null>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>(ViewerMode.VIEW);
  const [scale, setScale] = useState<number>(1);
  
  // Initialize with -90 degree rotation on X to convert Z-up (STL standard) to Y-up (Three.js standard)
  const [meshRotation, setMeshRotation] = useState<THREE.Quaternion>(() => {
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    return q;
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setDimensions(null);
    setViewerMode(ViewerMode.VIEW);
    setScale(1); // Reset scale to 100%
    
    // Reset rotation to default Z-up fix on new file load
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    setMeshRotation(q);
  }, [fileUrl]);

  const handleDimensionsCalculated = useCallback((dims: ModelDimensions) => {
    setDimensions(dims);
  }, []);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const getCanvasScreenshot = useCallback((): string | null => {
    if (canvasRef.current) {
      return canvasRef.current.toDataURL('image/png');
    }
    return null;
  }, []);

  const handleRotate90 = useCallback(() => {
    setMeshRotation(prev => {
      const rotator = new THREE.Quaternion();
      rotator.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
      return rotator.multiply(prev);
    });
  }, []);

  return (
    <div className="flex w-full h-screen bg-slate-950 overflow-hidden">
      {/* Main Viewer Area */}
      <div className="flex-1 h-full relative">
        <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-2">
          <h2 className="text-white/50 font-light text-sm tracking-widest uppercase backdrop-blur-sm">
             Viewer v1.2
          </h2>
          {viewerMode === ViewerMode.MEASURE && (
            <div className="bg-indigo-600/90 text-white text-xs px-3 py-1 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-300">
              Ruler Active: Click 2 points on model
            </div>
          )}
          {viewerMode === ViewerMode.ALIGN && (
            <div className="bg-emerald-600/90 text-white text-xs px-3 py-1 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-left-4 duration-300">
              Align Tool: Click a face to place it on the floor
            </div>
          )}
        </div>
        
        <Viewer3D 
          fileUrl={fileUrl} 
          onDimensionsCalculated={handleDimensionsCalculated}
          onCanvasReady={handleCanvasReady}
          viewerMode={viewerMode}
          meshRotation={meshRotation}
          onRotationChange={setMeshRotation}
          scale={scale}
        />
        
        {!fileUrl && (
           <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
             <div className="w-96 h-96 border border-indigo-500/30 rounded-full animate-pulse"></div>
           </div>
        )}
      </div>

      {/* Sidebar Controls */}
      <Sidebar 
        onFileUpload={handleFileUpload} 
        dimensions={dimensions}
        getCanvasScreenshot={getCanvasScreenshot}
        viewerMode={viewerMode}
        setViewerMode={setViewerMode}
        onRotateModel={handleRotate90}
        scale={scale}
        onScaleChange={setScale}
      />
    </div>
  );
};

export default App;