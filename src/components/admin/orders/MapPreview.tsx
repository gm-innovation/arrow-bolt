import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapPreviewProps {
  longitude: number;
  latitude: number;
  locationName?: string;
}

export const MapPreview = ({ longitude, latitude, locationName }: MapPreviewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not configured');
      return;
    }
    
    mapboxgl.accessToken = MAPBOX_TOKEN;

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [longitude, latitude],
        zoom: 14,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    }

    if (marker.current) {
      marker.current.remove();
    }

    marker.current = new mapboxgl.Marker({ color: 'hsl(var(--primary))' })
      .setLngLat([longitude, latitude])
      .addTo(map.current);

    if (locationName) {
      const popup = new mapboxgl.Popup({ offset: 25 }).setText(locationName);
      marker.current.setPopup(popup);
    }

    map.current.flyTo({
      center: [longitude, latitude],
      zoom: 14,
      essential: true,
    });

    return () => {
      marker.current?.remove();
    };
  }, [longitude, latitude, locationName]);

  return (
    <div className="w-full h-[300px] rounded-lg overflow-hidden border border-border">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
