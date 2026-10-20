import { useQuery } from '@tanstack/react-query';
import { fetchVendorOffers } from '../api/endpoints';
import { normalizeVendor, pickList } from '../api/normalize';
import { useLocation } from '../context/LocationContext';

const round = (value) => Number(Number(value).toFixed(4));

/** GET /vendors/offers — upcoming "Offer Days" announced by kitchens. */
export default function useVendorOffers({ enabled = true } = {}) {
  const { coords } = useLocation();

  return useQuery({
    queryKey: ['home', 'offers', round(coords.lat), round(coords.lng)],
    queryFn: () => fetchVendorOffers({ lat: coords.lat, lng: coords.lng }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    select: (data) =>
      pickList(data, 'offers').map((offer) => ({
        id: offer.id,
        title: offer.title,
        details: offer.details || '',
        offerDate: offer.offer_date,
        vendor: normalizeVendor(offer.vendor ?? {}),
      })),
  });
}
