import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { meApi, type AddressInput } from '../lib/api-client/resources';
import { errorMessage } from '../lib/api-client/client';
import { colors, font, radius, spacing } from '../lib/theme';
import { toast } from './feedback';
import { Button, Checkbox, Field } from './ui';

// Native port of website/components/account/{address-form,location-picker}.tsx.

type GeocodedAddress = Pick<AddressInput, 'line1' | 'city' | 'state' | 'postalCode' | 'country'>;

// Same OpenStreetMap lookup the website uses; the fallback when the platform geocoder
// isn't available (web) or comes back empty.
async function nominatimReverse(lat: number, lon: number): Promise<GeocodedAddress> {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Reverse geocoding failed');
  const data = await res.json();
  const addr = data.address ?? {};
  return {
    line1: [addr.house_number, addr.road].filter(Boolean).join(' ') || addr.suburb || data.display_name?.split(',')[0] || '',
    city: addr.city || addr.town || addr.village || addr.suburb || '',
    state: addr.state || '',
    postalCode: addr.postcode || '',
    country: addr.country || '',
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<GeocodedAddress> {
  if (Platform.OS !== 'web') {
    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (place) {
        return {
          line1: [place.streetNumber, place.street].filter(Boolean).join(' ') || place.name || place.district || '',
          city: place.city || place.subregion || place.district || '',
          state: place.region || '',
          postalCode: place.postalCode || '',
          country: place.country || '',
        };
      }
    } catch {
      // fall through to Nominatim
    }
  }
  return nominatimReverse(lat, lon);
}

const EMPTY: AddressInput = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
  isDefault: false,
};

const FIELDS: { key: Exclude<keyof AddressInput, 'isDefault'>; label: string; optional?: boolean; half?: boolean }[] = [
  { key: 'label', label: 'Label (e.g. Home, Work)' },
  { key: 'line1', label: 'Address line 1' },
  { key: 'line2', label: 'Address line 2 (optional)', optional: true },
  { key: 'city', label: 'City', half: true },
  { key: 'state', label: 'State', half: true },
  { key: 'postalCode', label: 'Postal code', half: true },
  { key: 'country', label: 'Country', half: true },
  { key: 'phone', label: 'Phone number' },
];

export function AddressForm({ onSaved }: { onSaved?: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [locating, setLocating] = useState(false);
  const [locateMessage, setLocateMessage] = useState<{ text: string; error: boolean } | null>(null);

  const missing = FIELDS.filter((f) => !f.optional && !String(form[f.key] ?? '').trim());

  const add = useMutation({
    mutationFn: () => meApi.addAddress({ ...form, line2: form.line2 || undefined }),
    onSuccess: () => {
      setForm(EMPTY);
      setLocateMessage(null);
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Address added');
      onSaved?.();
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not add address')),
  });

  const useCurrentLocation = async () => {
    setLocating(true);
    setLocateMessage(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocateMessage({ text: 'Location permission denied. You can still enter your address manually.', error: true });
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      try {
        const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        setForm((f) => ({ ...f, ...address }));
        setLocateMessage({ text: 'Address fields filled from your location — double-check them before saving.', error: false });
      } catch {
        setLocateMessage({ text: 'Found your location, but could not look up the address. Fill it in manually.', error: true });
      }
    } catch {
      setLocateMessage({ text: 'Could not determine your location.', error: true });
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.locate}>
        <Text style={[font.label, { flex: 1 }]}>Pin your location</Text>
        <Button title="Use current location" icon="locate-outline" size="sm" variant="secondary" loading={locating} onPress={useCurrentLocation} />
      </View>
      {locateMessage && (
        <Text style={{ fontSize: 12, color: locateMessage.error ? colors.danger : colors.discount }}>{locateMessage.text}</Text>
      )}

      <View style={styles.grid}>
        {FIELDS.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            value={String(form[f.key] ?? '')}
            onChangeText={(t) => setForm((prev) => ({ ...prev, [f.key]: t }))}
            keyboardType={f.key === 'phone' ? 'phone-pad' : f.key === 'postalCode' ? 'number-pad' : 'default'}
            autoCapitalize={f.key === 'label' || f.key === 'city' || f.key === 'state' || f.key === 'country' ? 'words' : 'sentences'}
            containerStyle={f.half ? styles.half : styles.full}
          />
        ))}
      </View>

      <Checkbox label="Set as default address" checked={form.isDefault} onChange={(isDefault) => setForm((f) => ({ ...f, isDefault }))} />

      <Button
        title="Add address"
        icon="add"
        loading={add.isPending}
        disabled={missing.length > 0}
        onPress={() => add.mutate()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  locate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  full: { width: '100%' },
  half: { width: '48.5%' },
});
