'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface FlightDestination {
  destination: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  price: number;
  departureDate: string;
  returnDate: string;
}

interface Props {
  destinations: FlightDestination[];
  selected: string | null;
  onSelect: (iata: string) => void;
  currency: string;
}

function priceColor(price: number, min: number, max: number): string {
  const range = max - min || 1;
  const t = (price - min) / range; // 0 = cheapest, 1 = most expensive
  if (t < 0.33) return '#059669'; // green
  if (t < 0.66) return '#F59E0B'; // amber
  return '#DC2626';               // red
}

function FlyToSelected({ destinations, selected }: { destinations: FlightDestination[]; selected: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    const dest = destinations.find(d => d.destination === selected);
    if (dest) map.flyTo([dest.lat, dest.lng], 5, { duration: 0.8 });
  }, [selected, destinations, map]);
  return null;
}

export default function FlightMap({ destinations, selected, onSelect, currency }: Props) {
  const prices = destinations.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return (
    <MapContainer
      center={[30, 10]}
      zoom={2}
      minZoom={2}
      style={{ height: '100%', width: '100%', borderRadius: '16px' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FlyToSelected destinations={destinations} selected={selected} />
      {destinations.map(dest => {
        const isSelected = dest.destination === selected;
        const color = priceColor(dest.price, minPrice, maxPrice);
        return (
          <CircleMarker
            key={dest.destination}
            center={[dest.lat, dest.lng]}
            radius={isSelected ? 14 : 9}
            pathOptions={{
              fillColor: color,
              fillOpacity: isSelected ? 1 : 0.75,
              color: isSelected ? '#fff' : color,
              weight: isSelected ? 2.5 : 1,
            }}
            eventHandlers={{ click: () => onSelect(dest.destination) }}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', minWidth: '130px' }}>
                <p style={{ fontWeight: 700, margin: '0 0 2px' }}>{dest.city}</p>
                <p style={{ color: '#6B7280', margin: '0 0 4px', fontSize: '0.8rem' }}>{dest.country}</p>
                <p style={{ color, fontWeight: 700, fontSize: '1rem', margin: 0 }}>
                  {currency}{dest.price.toFixed(0)}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
