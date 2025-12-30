import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { useMemo } from "react";

export function useAvailabilityMembers(ride: RideDetailResponse['ride'] | undefined) {
  const members = useMemo(() => {
    if (!ride?.members) return [];
    return ride.members;
  }, [ride]);

  const registeredMemberIds = useMemo(() => {
    if (!ride?.availabilityDrivers) return new Set<number>();
    return new Set(
      ride.availabilityDrivers
        .filter(ad => ad.availability === true)
        .map(ad => ad.member.id)
    );
  }, [ride]);

  const existingAvailabilities = useMemo(() => {
    const map = new Map<number, { seats: number; availability: boolean }>();
    ride?.availabilityDrivers.forEach(driver => {
      map.set(driver.member.id, {
        seats: driver.seats,
        availability: driver.availability,
      });
    });
    return map;
  }, [ride]);

  return { members, registeredMemberIds, existingAvailabilities };
}