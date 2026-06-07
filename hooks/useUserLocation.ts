import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface UserCoords {
  lat: number;
  lng: number;
}

export type LocationStatus = 'loading' | 'granted' | 'denied' | 'unavailable';

export interface UserLocationResult {
  coords: UserCoords | null;
  status: LocationStatus;
}

export function useUserLocation(): UserLocationResult {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('loading');

  useEffect(() => {
    void (async () => {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        setStatus('denied');
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setStatus('granted');
      } catch {
        setStatus('unavailable');
      }
    })();
  }, []);

  return { coords, status };
}
