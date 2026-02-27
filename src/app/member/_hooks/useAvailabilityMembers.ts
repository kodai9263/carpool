import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { useMemo } from "react";

export function useAvailabilityMembers(ride: RideDetailResponse['ride'] | undefined) {
  const guardians = useMemo(() => {
    if (!ride?.guardians) return [];
    return ride.guardians;
  }, [ride]);

  const registeredGuardianIds = useMemo(() => {
    if (!ride?.availabilityDrivers) return new Set<number>();
    return new Set(
      ride.availabilityDrivers
        .filter(ad => ad.availability === true)
        .map(ad => ad.guardian.id)
    );
  }, [ride]);

  const existingDriverAvailabilities = useMemo(() => {
    const map = new Map<number, { seats: number; availability: boolean; comment: string | null }>();
    ride?.availabilityDrivers
      .filter(d => d.type === 'driver')
      .forEach(d => {
        map.set(d.guardian.id, {
          seats: d.seats,
          availability: d.availability,
          comment: d.comment,
        });
      });
    return map;
  }, [ride]);

  const existingEscortAvailabilities = useMemo(() => {
    const map = new Map<number, { availability: boolean; comment: string | null }>();
    ride?.availabilityDrivers
      .filter(d => d.type === 'escort')
      .forEach(d => {
        map.set(d.guardian.id, {
          availability: d.availability,
          comment: d.comment,
        });
      });
    return map;
  }, [ride]);

  return { guardians, registeredGuardianIds, existingDriverAvailabilities, existingEscortAvailabilities };
}
