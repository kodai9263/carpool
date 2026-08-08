type DirectionalDriver = {
  id: number;
  availabilityDriverId: number;
  direction?: string;
};

const normalizeDirection = (direction?: string) => direction ?? "outbound";

export const createDirectionalDriverKey = (
  availabilityDriverId: number,
  direction?: string,
) => `${availabilityDriverId}:${normalizeDirection(direction)}`;

export const createDirectionalDriverIdMap = (drivers: DirectionalDriver[]) =>
  new Map(
    drivers.map((driver) => [
      createDirectionalDriverKey(driver.availabilityDriverId, driver.direction),
      driver.id,
    ]),
  );

export const getDirectionalDriverId = (
  driverIdMap: Map<string, number>,
  availabilityDriverId: number,
  direction?: string,
) => {
  const driverId = driverIdMap.get(
    createDirectionalDriverKey(availabilityDriverId, direction),
  );

  if (driverId === undefined) {
    throw new Error("作成した配車のIDを特定できませんでした");
  }

  return driverId;
};
