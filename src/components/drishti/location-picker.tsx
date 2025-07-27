
'use client';

import { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';

interface LocationPickerProps {
  onLocationSelect: (latlng: { lat: number; lng: number }) => void;
  locationQuery: string;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;

const MapHandler = ({ place, onPositionChange }: { place: google.maps.places.PlaceResult | null, onPositionChange: (pos: {lat: number, lng: number}) => void }) => {
    const map = useMap();
    
    useEffect(() => {
        if (!map || !place?.geometry?.location) return;
        map.panTo(place.geometry.location);
        map.setZoom(15);
        const location = place.geometry.location;
        onPositionChange({ lat: location.lat(), lng: location.lng() });
    }, [map, place, onPositionChange]);

    return null;
}

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


export default function LocationPicker({ onLocationSelect, locationQuery }: LocationPickerProps) {
  const [position, setPosition] = useState({ lat: 51.505, lng: -0.09 });
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(locationQuery, 500);

  useEffect(() => {
      if (!debouncedQuery) return;
      
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: debouncedQuery }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
              const place = results[0];
              const location = place.geometry.location;
              if (location) {
                const newPos = { lat: location.lat(), lng: location.lng() };
                setPosition(newPos);
                onLocationSelect(newPos);
                setSelectedPlace(place);
              }
          } else {
              console.warn(`Geocode was not successful for the following reason: ${status}`);
          }
      });
  }, [debouncedQuery, onLocationSelect]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setPosition(newPos);
      onLocationSelect(newPos);
    }
  };

  if (!API_KEY) {
    return (
        <div className="w-full h-64 rounded-lg bg-muted flex items-center justify-center text-center p-4">
            <p className="text-destructive-foreground bg-destructive p-2 rounded-md">
                Google Maps API key is missing. Please add it to your .env file.
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-2">
       <div ref={mapContainerRef} className="w-full h-64 rounded-lg overflow-hidden border z-0">
         <APIProvider apiKey={API_KEY}>
            <Map
                center={position}
                zoom={13}
                mapId="drishti-map"
                onClick={handleMapClick}
                gestureHandling={'greedy'}
            >
                <AdvancedMarker position={position} />
                <MapHandler place={selectedPlace} onPositionChange={setPosition} />
            </Map>
         </APIProvider>
       </div>
       <div className="text-sm text-muted-foreground text-center p-2 bg-muted rounded-md">
            {position ? `Lat: ${position.lat.toFixed(4)}, Lng: ${position.lng.toFixed(4)}` : 'Click map to select.'}
       </div>
    </div>
  );
}
