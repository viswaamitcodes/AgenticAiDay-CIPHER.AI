
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, Video, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addCamera, uploadVideo } from '@/lib/firebase-service';
import { useDrishti } from '@/lib/drishti-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dynamic from 'next/dynamic';

const LocationPicker = dynamic(() => import('./location-picker'), { 
    ssr: false,
    loading: () => <div className="w-full h-64 rounded-lg bg-muted animate-pulse" />,
});

export default function CameraAddForm() {
  const { eventId } = useDrishti();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [cameraName, setCameraName] = useState('');
  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingStream, setIsAddingStream] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      if (!cameraName) {
        setCameraName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const resetForm = () => {
    setCameraName('');
    setLocationName('');
    setCoordinates(null);
    setVideoFile(null);
    setStreamUrl('');
  };

  const handleLocationSelect = (latlng: {lat: number, lng: number}) => {
    setCoordinates(latlng);
  }

  const handleUpload = async () => {
    if (!videoFile || !cameraName || !locationName || !coordinates) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please provide a camera name, location, select a location on the map, and choose a video file.',
        });
        return;
    };

    setIsUploading(true);
    try {
      const videoUrl = await uploadVideo(videoFile, eventId);
      const newCamera = {
        name: cameraName,
        location: locationName,
        status: 'Online' as const,
        lastSeen: new Date().toISOString(),
        coordinates: coordinates,
        zone: 'Uploaded',
        streamImage: videoUrl,
      };
      await addCamera(newCamera, eventId);
      
      toast({
        title: 'Upload Successful',
        description: 'Your video has been added as a new camera source.',
      });
      resetForm();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Could not upload the video. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleAddStream = async () => {
    if (!streamUrl || !cameraName || !locationName || !coordinates) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a camera name, location, select a location on the map, and provide a stream URL.',
      });
      return;
    }

    setIsAddingStream(true);
    try {
      const newCamera = {
        name: cameraName,
        location: locationName,
        status: 'Online' as const,
        lastSeen: new Date().toISOString(),
        coordinates: coordinates,
        zone: 'Stream',
        streamImage: streamUrl,
      };
      await addCamera(newCamera, eventId);
      
      toast({
        title: 'Stream Added',
        description: 'The stream has been added as a new camera source.',
      });
      resetForm();
    } catch (error) {
      console.error('Failed to add stream:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Add Stream',
        description: 'Could not add the camera stream. Please check the URL and try again.',
      });
    } finally {
      setIsAddingStream(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a New Camera Source</CardTitle>
        <CardDescription>
          Upload a video or add a stream URL. Type a location name to search, then click the map to refine the coordinates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Video</TabsTrigger>
            <TabsTrigger value="stream">Add Stream URL</TabsTrigger>
          </TabsList>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="camera-name-upload">Camera Name</Label>
                    <Input 
                        id="camera-name-upload" 
                        placeholder="e.g., Lobby Entrance"
                        value={cameraName}
                        onChange={(e) => setCameraName(e.target.value)}
                        disabled={isUploading || isAddingStream}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="location-name">Location Name (for map search)</Label>
                    <Input 
                        id="location-name" 
                        placeholder="e.g., Main Street Plaza"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        disabled={isUploading || isAddingStream}
                    />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Set Camera Coordinates</Label>
                <LocationPicker 
                    onLocationSelect={handleLocationSelect} 
                    locationQuery={locationName}
                />
              </div>
          </div>


          <TabsContent value="upload" className="space-y-6 pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border-2 border-dashed border-muted p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Video className="h-8 w-8" />
                    <p>{videoFile ? videoFile.name : "Select a video file to upload"}</p>
                </div>
                <Label htmlFor="video-upload" className="cursor-pointer">
                  <div className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                      <Upload className="h-4 w-4" />
                      <span>{videoFile ? 'Change Video' : 'Choose Video'}</span>
                  </div>
                </Label>
                <Input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div className="flex justify-end">
                <Button onClick={handleUpload} disabled={!videoFile || isUploading || !cameraName || !locationName || !coordinates}>
                {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploading ? 'Uploading...' : 'Upload and Add Camera'}
                </Button>
            </div>
          </TabsContent>
          <TabsContent value="stream" className="space-y-6 pt-6">
            <div className="space-y-2">
                <Label htmlFor="stream-url">Stream URL</Label>
                <Input 
                    id="stream-url" 
                    placeholder="e.g., http://localhost:8080/stream.m3u8"
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    disabled={isAddingStream}
                />
            </div>
            <div className="flex justify-end">
                <Button onClick={handleAddStream} disabled={isAddingStream || !streamUrl || !cameraName || !locationName || !coordinates}>
                {isAddingStream ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <LinkIcon className="mr-2 h-4 w-4" />
                )}
                {isAddingStream ? 'Adding...' : 'Add Camera Stream'}
                </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
