
'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDrishti } from '@/lib/drishti-context';
import { Skeleton } from '@/components/ui/skeleton';

const HEATMAP_RADIUS = 35;
const HEATMAP_BLUR = 15;
const HEATMAP_OPACITY = 0.5;

// Color scale from blue to red
const heatmapColorScale = [
  { stop: 0.0, color: 'rgba(0, 0, 255, 0)' },
  { stop: 0.2, color: 'rgba(0, 0, 255, 1)' },
  { stop: 0.4, color: 'rgba(0, 255, 255, 1)' },
  { stop: 0.6, color: 'rgba(0, 255, 0, 1)' },
  { stop: 0.8, color: 'rgba(255, 255, 0, 1)' },
  { stop: 1.0, color: 'rgba(255, 0, 0, 1)' },
];

export default function Heatmap() {
  const { cameras, crowdDetections, setSelectedCameraForHeatmap } = useDrishti();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const allCameras = useMemo(() => [
    { id: 'cam-webcam', name: 'Your Webcam', location: 'Local Feed' },
    ...cameras,
  ], [cameras]);
  
  const [selectedCameraId, setSelectedCameraId] = useState('cam-webcam');

  useEffect(() => {
    setSelectedCameraForHeatmap(selectedCameraId);
  }, [selectedCameraId, setSelectedCameraForHeatmap]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !crowdDetections) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create a grayscale heatmap
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = canvas.width;
    heatCanvas.height = canvas.height;
    const heatCtx = heatCanvas.getContext('2d');
    if (!heatCtx) return;

    crowdDetections.forEach(point => {
        heatCtx.beginPath();
        const gradient = heatCtx.createRadialGradient(
            point.x * canvas.width, point.y * canvas.height, 0,
            point.x * canvas.width, point.y * canvas.height, HEATMAP_RADIUS
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${HEATMAP_OPACITY})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        heatCtx.fillStyle = gradient;
        heatCtx.fillRect(0, 0, canvas.width, canvas.height);
        heatCtx.globalCompositeOperation = 'source-over';
    });

    // Apply blur
    if (HEATMAP_BLUR > 0) {
        heatCtx.filter = `blur(${HEATMAP_BLUR}px)`;
        heatCtx.drawImage(heatCanvas, 0, 0);
        heatCtx.filter = 'none';
    }
    

    // Colorize the heatmap
    const imageData = heatCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 256;
    gradientCanvas.height = 1;
    const gradientCtx = gradientCanvas.getContext('2d');
    if (!gradientCtx) return;

    const colorGradient = gradientCtx.createLinearGradient(0, 0, 256, 0);
    heatmapColorScale.forEach(s => colorGradient.addColorStop(s.stop, s.color));
    gradientCtx.fillStyle = colorGradient;
    gradientCtx.fillRect(0, 0, 256, 1);
    const gradientPixels = gradientCtx.getImageData(0, 0, 256, 1).data;

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        const colorIndex = Math.min(alpha, 255) * 4;
        data[i] = gradientPixels[colorIndex];
        data[i + 1] = gradientPixels[colorIndex + 1];
        data[i + 2] = gradientPixels[colorIndex + 2];
      }
    }

    ctx.putImageData(imageData, 0, 0);

  }, [crowdDetections]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Crowd Density Heatmap</CardTitle>
            <CardDescription>Live visualization of crowd density.</CardDescription>
          </div>
          <Select value={selectedCameraId} onValueChange={setSelectedCameraId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Camera" />
            </SelectTrigger>
            <SelectContent>
              {allCameras.map(cam => (
                <SelectItem key={cam.id} value={cam.id}>{cam.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {allCameras.length > 0 ? (
           <div className="w-full aspect-video rounded-md bg-muted/20 overflow-hidden border">
              <canvas ref={canvasRef} width="500" height="281" className="w-full h-full" />
           </div>
        ): (
          <Skeleton className="w-full aspect-video rounded-md bg-muted" />
        )}
      </CardContent>
    </Card>
  );
}
