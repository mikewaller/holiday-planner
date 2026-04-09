'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  added_by: string;
  added_by_name: string;
  reactions: { member_id: string; emoji: string }[];
}

interface Props {
  pins: MapPin[];
  selectedPinId: string | null;
  memberColors: Record<string, string>;
  flyTo: { lat: number; lng: number } | null;
  onSelect: (pinId: string) => void;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([lat, lng], 7, { duration: 1.2 }); }, [lat, lng, map]);
  return null;
}

export default function MapInner({ pins, selectedPinId, memberColors, flyTo, onSelect }: Props) {
  return (
    <MapContainer
      center={[48, 14]}
      zoom={3}
      style={{ height: '100%', width: '100%' }}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {flyTo && <FlyTo lat={flyTo.lat} lng={flyTo.lng} />}
      {pins.map(pin => {
        const color = memberColors[pin.added_by] ?? '#F4621F';
        const isSelected = selectedPinId === pin.id;
        return (
          <CircleMarker
            key={pin.id}
            center={[pin.lat, pin.lng]}
            radius={isSelected ? 13 : 9}
            pathOptions={{
              color: isSelected ? '#2C1F14' : '#fff',
              weight: isSelected ? 3 : 2,
              fillColor: color,
              fillOpacity: 0.92,
            }}
            eventHandlers={{ click: () => onSelect(pin.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <span style={{ fontFamily: 'system-ui', fontSize: '0.75rem', fontWeight: 600 }}>
                {pin.label}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
