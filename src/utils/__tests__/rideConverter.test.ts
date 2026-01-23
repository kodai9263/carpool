import { convertRideDetailToFormValues, DriverFormAPI } from '../rideConverter';

describe('convertRideDetailToFormValues', () => {
  test('完全なデータを正しく変換する', () => {
    const apiDate = {
      date: '2024-12-25',
      destination: 'テストグラウンド',
      drivers: [
        {
          id: 1,
          availabilityDriverId: 10,
          seats: 3,
          rideAssignments: [
            { id: 100, child: { id: 1, name: '太郎'} },
            { id: 101, child: { id: 2, name: '花子'} },
          ],
        },
      ],
    };

    const result = convertRideDetailToFormValues(apiDate);

    expect(result.date).toEqual(new Date('2024-12-25'));
    expect(result.destination).toBe('テストグラウンド');
    expect(result.drivers).toHaveLength(1);
    expect(result.drivers[0].availabilityDriverId).toBe(10);
    expect(result.drivers[0].seats).toBe(3);
    expect(result.drivers[0].rideAssignments).toHaveLength(2);
    expect(result.drivers[0].rideAssignments[0].childId).toBe(1);
    expect(result.drivers[0].rideAssignments[1].childId).toBe(2);
  });

  test('dateがundefinedの場合,nullを返す', () => {
    const apiDate = {
      destination: 'テストグラウンド',
      drivers: [],
    };

    const result = convertRideDetailToFormValues(apiDate);

    expect(result.date).toBeNull();
    expect(result.destination).toBe('テストグラウンド');
  });

  test('driversがundefinedの場合、空配列を返す', () => {
    const apiDate = {
      date: '2024-12-25',
      destination: 'テストグラウンド',
    };

    const result = convertRideDetailToFormValues(apiDate);

    expect(result.drivers).toEqual([]);
  });

  test('seatsがundefinedの場合, 0を返す', () => {
    const apiDate = {
      date: '2024-12-25',
      destination: 'テストグラウンド',
      drivers: [
        {
          id: 1,
          availabilityDriverId: 20,
          rideAssignments: [],
        },
      ],
    };

    const result = convertRideDetailToFormValues(apiDate);

    expect(result.drivers[0].seats).toBe(0);
  });

  test('複数のドライバーを正しく変換する', () => {
    const apiData = {
      date: '2024-12-25',
      destination: '野球場',
      drivers: [
        {
          id: 1,
          availabilityDriverId: 10,
          seats: 4,
          rideAssignments: [
            { id: 100, child: { id: 1, name: '太郎' } },
          ],
        },
        {
          id: 2,
          availabilityDriverId: 20,
          seats: 3,
          rideAssignments: [
            { id: 101, child: { id: 2, name: '花子' } },
            { id: 102, child: { id: 3, name: '次郎' } },
          ],
        },
      ],
    };

    const result = convertRideDetailToFormValues(apiData);

    expect(result.drivers).toHaveLength(2);
    expect(result.drivers[0].seats).toBe(4);
    expect(result.drivers[1].seats).toBe(3);
    expect(result.drivers[0].rideAssignments).toHaveLength(1);
    expect(result.drivers[1].rideAssignments).toHaveLength(2);
  });

  test('rideAssignmentsが空の場合も正しく処理する', () => {
    const apiData = {
      date: '2024-12-25',
      destination: 'サッカー場',
      drivers: [
        {
          id: 1,
          availabilityDriverId: 30,
          seats: 5,
          rideAssignments: [],
        },
      ],
    };

    const result = convertRideDetailToFormValues(apiData);

    expect(result.drivers[0].rideAssignments).toEqual([]);
  });
})