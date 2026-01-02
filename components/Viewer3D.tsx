import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Canvas, useLoader, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Grid, Html, Line, Sphere, Environment, ContactShadows, Bounds, useBounds } from '@react-three/drei';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { ModelDimensions, ViewerMode } from '../types';

interface Viewer3DProps {
  fileUrl: string | null;
  onDimensionsCalculated: (dims: ModelDimensions) => void;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  viewerMode: ViewerMode;
  meshRotation: THREE.Quaternion;
  onRotationChange: (q: THREE.Quaternion) => void;
  scale: number;
}

const STLModel = ({ 
  url, 
  onDimensionsCalculated, 
  onClick,
  meshRotation,
  scale
}: { 
  url: string, 
  onDimensionsCalculated: (dims: ModelDimensions) => void,
  onClick?: (e: ThreeEvent<MouseEvent>) => void,
  meshRotation: THREE.Quaternion,
  scale: number
}) => {
  const geometry = useLoader(STLLoader, url);
  const meshRef = useRef<THREE.Mesh>(null);
  const [verticalOffset, setVerticalOffset] = useState(0);

  useLayoutEffect(() => {
    if (meshRef.current) {
      // 1. Center the geometry itself (mutates geometry)
      // This ensures the local origin is at the center of mass
      meshRef.current.geometry.center();
      
      // 2. Calculate the bounding box of the geometry *after* rotation AND scale are applied
      // We clone to avoid mutating the actual render geometry with the rotation/scale
      const tempGeo = meshRef.current.geometry.clone();
      
      // Apply rotation first
      tempGeo.applyQuaternion(meshRotation);
      
      // Apply scale
      tempGeo.scale(scale, scale, scale);
      
      tempGeo.computeBoundingBox();
      const box = tempGeo.boundingBox;
      
      if (box) {
          // 3. Calculate dimensions for UI
          const size = new THREE.Vector3();
          box.getSize(size);
          const volume = size.x * size.y * size.z;
          onDimensionsCalculated({
              width: size.x,
              height: size.y,
              depth: size.z,
              volume: volume
          });

          // 4. Calculate Vertical Offset
          // The object is centered at 0,0,0 local. 
          // The lowest point in world space (relative to 0) is box.min.y
          // We want that lowest point to be at Y=0.
          // So we shift the whole group UP by distance |min.y|
          setVerticalOffset(-box.min.y);
      }
    }
  }, [url, meshRotation, scale, onDimensionsCalculated, geometry]);

  return (
    <group position={[0, verticalOffset, 0]}>
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        quaternion={meshRotation}
        scale={[scale, scale, scale]}
        castShadow 
        receiveShadow
        onClick={onClick}
      >
        <meshStandardMaterial 
          color="#6366f1" 
          roughness={0.5} 
          metalness={0.2} 
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

const CanvasCapture = ({ onCanvasReady }: { onCanvasReady: (canvas: HTMLCanvasElement) => void }) => {
  const { gl } = useThree();
  useEffect(() => {
    onCanvasReady(gl.domElement);
  }, [gl, onCanvasReady]);
  return null;
};

// AutoFit now accepts a trigger to re-run fitting when rotation/scale changes
const AutoFit = ({ trigger }: { trigger?: any }) => {
    const bounds = useBounds();
    useEffect(() => {
        // Debounce slightly to allow layout to settle
        const timeout = setTimeout(() => {
           bounds.refresh().clip().fit();
        }, 50);
        return () => clearTimeout(timeout);
    }, [bounds, trigger]);
    return null;
};

const MeasurementTool = ({ points }: { points: THREE.Vector3[] }) => {
  if (points.length === 0) return null;

  return (
    <group>
      {points.map((p, i) => (
        <Sphere key={i} position={p} args={[0.5, 16, 16]}>
           <meshBasicMaterial color={i === 0 ? "#10b981" : "#ef4444"} depthTest={false} />
        </Sphere>
      ))}
      {points.length === 2 && (
        <>
          <Line 
            points={points} 
            color="white" 
            lineWidth={2} 
            dashed={false}
          />
          <Html position={points[0].clone().lerp(points[1], 0.5)}>
             <div className="bg-slate-900/90 text-white px-2 py-1 rounded border border-indigo-500 shadow-xl text-xs font-mono whitespace-nowrap pointer-events-none select-none backdrop-blur-md">
               {points[0].distanceTo(points[1]).toFixed(2)} mm
             </div>
          </Html>
        </>
      )}
    </group>
  );
};

const Floor = () => {
  return (
    <group>
      {/* Floor is slightly below 0 to avoid z-fighting with object bottom */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[500, 64]} />
        <meshStandardMaterial 
            color="#1e293b"
            roughness={0.6}
            metalness={0.4}
            side={THREE.DoubleSide} 
        />
      </mesh>
      <Grid 
        infiniteGrid 
        fadeDistance={300} 
        sectionColor="#4f46e5" 
        cellColor="#334155" 
        sectionSize={10} 
        cellSize={1} 
        position={[0, -0.005, 0]}
      />
      <ContactShadows 
        position={[0, -0.005, 0]} 
        opacity={0.6} 
        scale={50} 
        blur={2} 
        far={2} 
        resolution={512} 
        color="#000000" 
      />
    </group>
  );
};

const Viewer3D: React.FC<Viewer3DProps> = ({ 
  fileUrl, 
  onDimensionsCalculated, 
  onCanvasReady,
  viewerMode,
  meshRotation,
  onRotationChange,
  scale
}) => {
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);

  useEffect(() => {
    setMeasurePoints([]);
  }, [fileUrl, viewerMode, meshRotation, scale]);

  const handleMeshClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    if (viewerMode === ViewerMode.MEASURE) {
      setMeasurePoints(prev => {
        if (prev.length >= 2) return [e.point];
        return [...prev, e.point];
      });
    } else if (viewerMode === ViewerMode.ALIGN) {
        if (!e.face) return;
        const localNormal = e.face.normal.clone();
        const worldNormal = localNormal.applyQuaternion(meshRotation).normalize();
        const targetDir = new THREE.Vector3(0, -1, 0);
        const alignQuat = new THREE.Quaternion();
        alignQuat.setFromUnitVectors(worldNormal, targetDir);
        const newRotation = alignQuat.multiply(meshRotation);
        
        onRotationChange(newRotation);
    }
  };

  if (!fileUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500">
        <div className="text-center">
          <p className="text-lg font-medium">No model loaded</p>
          <p className="text-sm">Upload an .stl file to view</p>
        </div>
      </div>
    );
  }

  // Create a unique key for trigger to help with updates
  const triggerKey = meshRotation.toArray().join('_') + '_' + scale;

  return (
    <div className={`w-full h-full relative bg-slate-900 ${
        viewerMode === ViewerMode.MEASURE ? 'cursor-crosshair' : 
        viewerMode === ViewerMode.ALIGN ? 'cursor-alias' : 'cursor-default'
    }`}>
      <Canvas
        shadows
        dpr={[1, 2]}
        // Adjusted near/far planes to prevent clipping of tiny or huge objects
        camera={{ position: [50, 50, 50], fov: 45, near: 0.001, far: 10000 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <CanvasCapture onCanvasReady={onCanvasReady} />
        <color attach="background" args={['#0f172a']} />
        <fog attach="fog" args={['#0f172a', 150, 1000]} />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[20, 30, 20]} 
          intensity={1.8} 
          castShadow 
          shadow-mapSize={[2048, 2048]} 
        />
        <Environment preset="city" />

        <Bounds key={fileUrl} observe={false} fit clip margin={1.2}>
           {/* Manual floor alignment is handled inside STLModel */}
           <STLModel 
             url={fileUrl} 
             onDimensionsCalculated={onDimensionsCalculated} 
             onClick={handleMeshClick}
             meshRotation={meshRotation}
             scale={scale}
           />
           {/* Re-fit camera when rotation or scale changes */}
           <AutoFit trigger={triggerKey} />
        </Bounds>
        
        <MeasurementTool points={measurePoints} />
        <Floor />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
      </Canvas>
    </div>
  );
};

export default Viewer3D;