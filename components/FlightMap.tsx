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
  climate?: { avgHigh: number; avgLow: number; rainyDays: number } | null;
}

interface Props {
  destinations: FlightDestination[];
  selected: string | null;
  onSelect: (iata: string) => void;
  currency: string;
  colorBy?: 'price' | 'temp';
}

function priceColor(price: number, min: number, max: number): string {
  const range = max - min || 1;
  const t = (price - min) / range; // 0 = cheapest, 1 = most expensive
  if (t < 0.33) return '#059669'; // green
  if (t < 0.66) return '#F59E0B'; // amber
  return '#DC2626';               // red
}

// Blue (cold) → cyan → green → yellow → orange → red (hot)
// Mapped across 0°C – 40°C
function tempColor(avgHigh: number): string {
  const t = Math.max(0, Math.min(1, (avgHigh - 0) / 40));
  // Interpolate through: #3B82F6 (blue) → #06B6D4 (cyan) → #22C55E (green) → #EAB308 (yellow) → #F97316 (orange) → #EF4444 (red)
  const stops = [
    { t: 0.00, r: 59,  g: 130, b: 246 }, // blue
    { t: 0.25, r: 6,   g: 182, b: 212 }, // cyan
    { t: 0.45, r: 34,  g: 197, b: 94  }, // green
    { t: 0.65, r: 234, g: 179, b: 8   }, // yellow
    { t: 0.80, r: 249, g: 115, b: 22  }, // orange
    { t: 1.00, r: 239, g: 68,  b: 68  }, // red
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].t && t <= stops[i + 1].t) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const seg = hi.t - lo.t || 1;
  const f = (t - lo.t) / seg;
  const r = Math.round(lo.r + f * (hi.r - lo.r));
  const g = Math.round(lo.g + f * (hi.g - lo.g));
  const b = Math.round(lo.b + f * (hi.b - lo.b));
  return `rgb(${r},${g},${b})`;
}

function FlyToSelected({ destinations, selected }: { destinations: FlightDestination[]; selected: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    const dest = destinations.find(d => d.destination === selected);
    if (dest) map.flyTo([dest.lat, dest.lng], 5, { duration: 0.8 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]); // intentionally omit destinations — only fly on selection change
  return null;
}

export default function FlightMap({ destinations, selected, onSelect, currency, colorBy = 'price' }: Props) {
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
        const color = colorBy === 'temp' && dest.climate
          ? tempColor(dest.climate.avgHigh)
          : priceColor(dest.price, minPrice, maxPrice);
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
                {colorBy === 'temp' && dest.climate && (
                  <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: '2px 0 0' }}>
                    ~{dest.climate.avgHigh}°C avg high
                  </p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
