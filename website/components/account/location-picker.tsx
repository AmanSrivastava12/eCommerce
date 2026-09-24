'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GeocodedAddress {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

async function reverseGeocode(lat: number, lon: number): Promise<GeocodedAddress> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  const addr = data.address ?? {};
  const line1 = [addr.house_number, addr.road].filter(Boolean).join(' ') || addr.suburb || data.display_name?.split(',')[0] || '';
  return {
    line1,
    city: addr.city || addr.town || addr.village || addr.suburb || '',
    state: addr.state || '',
    postalCode: addr.postcode || '',
    country: addr.country || '',
  };
}

export function LocationPicker({ onLocate }: { onLocate: (address: GeocodedAddress) => void }) {
  const [status, setStatus] = useState<'idle' | 'locating' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setError('Geolocation is not supported by this browser.');
      return;
    }
    setStatus('locating');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        try {
          const address = await reverseGeocode(latitude, longitude);
          onLocate(address);
          setStatus('done');
        } catch {
          setStatus('error');
          setError('Found your location, but could not look up the address. Fill it in manually.');
        }
      },
      (err) => {
        setStatus('error');
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. You can still enter your address manually.'
            : 'Could not determine your location.',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--foreground)]">Pin your location</p>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={status === 'locating'}
          className="flex items-center gap-1.5 rounded-md border border-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] transition hover:bg-[var(--surface)] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {status === 'locating' ? 'Locating…' : 'Use current location'}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-[var(--danger)]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {coords && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 180 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden rounded-md"
          >
            <iframe
              title="Pinned location"
              className="h-[180px] w-full border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.01}%2C${coords.lat - 0.01}%2C${coords.lon + 0.01}%2C${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat}%2C${coords.lon}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
