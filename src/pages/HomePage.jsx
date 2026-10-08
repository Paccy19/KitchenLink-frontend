import React from 'react';
import HomeFeed from '../components/home/HomeFeed';
import LocationPrimer from '../components/home/LocationPrimer';

/**
 * Homepage route. The feed itself lives in `HomeFeed` so the component can be
 * reused (e.g. embedded views). The location primer is shown on first load to
 * explain why we ask for geolocation.
 */
export default function HomePage() {
  return (
    <>
      <HomeFeed />
      <LocationPrimer />
    </>
  );
}
