import {
  assignmentError,
  availableDriverCandidates,
  autoAssignmentBlockReason,
  autoAssignmentResultError,
  buildUpdateAssignmentBody,
  createAssignmentDraft,
} from '../assignment';
import type { RideDetailResponse } from '../../types/api';

const ride: RideDetailResponse['ride'] = {
  id: 11,
  date: '2030-09-15T00:00:00.000Z',
  updatedAt: '2030-09-10T10:00:00.000Z',
  destination: '遠征先',
  meetingPlace: '学校',
  separateDirections: true,
  guardians: [{ id: 1, name: '保護者A', memberId: 1 }],
  children: [
    { id: 31, name: '子A', currentGrade: 4 },
    { id: 32, name: '子B', currentGrade: 3 },
  ],
  childAvailabilities: [
    { childId: 31, availability: true, selfDriving: false },
    { childId: 32, availability: true, selfDriving: false },
  ],
  availabilityDrivers: [
    { id: 21, type: 'driver', direction: 'both', seats: 3, availability: true, comment: null, guardian: { id: 1, name: '保護者A' } },
    { id: 22, type: 'escort', direction: 'both', seats: 0, availability: true, comment: null, guardian: { id: 2, name: '保護者B' } },
  ],
  drivers: [
    {
      id: 41,
      type: 'driver',
      direction: 'outbound',
      availabilityDriverId: 21,
      availabilityDriver: { guardian: { id: 1, name: '保護者A' }, seats: 3, comment: null },
      rideAssignments: [{ id: 51, child: { id: 31, name: '子A', currentGrade: 4 } }],
      escorts: [{
        id: 42,
        direction: 'outbound',
        availabilityDriverId: 22,
        availabilityDriver: { guardian: { id: 2, name: '保護者B' }, comment: null },
        rideAssignments: [{ id: 52, child: { id: 32, name: '子B', currentGrade: 3 } }],
      }],
    },
    {
      id: 43,
      type: 'driver',
      direction: 'inbound',
      availabilityDriverId: 21,
      availabilityDriver: { guardian: { id: 1, name: '保護者A' }, seats: 3, comment: null },
      rideAssignments: [{ id: 53, child: { id: 31, name: '子A', currentGrade: 4 } }],
      escorts: [],
    },
  ],
};

test('往復と引率者の子どもを保持して全件更新の本文を作る', () => {
  const draft = createAssignmentDraft(ride);
  const body = buildUpdateAssignmentBody(ride, draft);

  expect(body.expectedUpdatedAt).toBe(ride.updatedAt);
  expect(body.drivers).toEqual([
    expect.objectContaining({
      direction: 'outbound',
      rideAssignments: [{ childId: 31 }],
      escorts: [{ availabilityDriverId: 22, direction: 'outbound', rideAssignments: [{ childId: 32 }] }],
    }),
    expect.objectContaining({ direction: 'inbound', rideAssignments: [{ childId: 31 }] }),
  ]);
  expect(assignmentError(ride, draft)).toBeNull();
});

test('同じ方向への重複と満席超過を保存前に拒否する', () => {
  const draft = createAssignmentDraft(ride);
  draft[0].rideAssignments.push({ childId: 32 });
  expect(assignmentError(ride, draft)).toMatch(/複数回/);

  draft[0].rideAssignments.pop();
  draft[0].rideAssignments.push({ childId: 31 }, { childId: 32 });
  expect(assignmentError(ride, draft)).toMatch(/座席数/);
});


test('引率設定のある配車は自動再生成で消さない', () => {
  const draft = createAssignmentDraft(ride);
  expect(autoAssignmentBlockReason(ride, draft)).toMatch(/引率者/);
  draft[0].escorts = [];
  expect(autoAssignmentBlockReason(ride, draft)).toMatch(/引率者/);
});

test('未回答の子どもを参加扱いするAPIへリクエストしない', () => {
  const noEscorts = { ...ride, drivers: [] };
  expect(autoAssignmentBlockReason(noEscorts, [])).toBeNull();
  expect(autoAssignmentBlockReason({ ...noEscorts, childAvailabilities: ride.childAvailabilities.slice(0, 1) }, []))
    .toMatch(/回答が揃って/);
  expect(autoAssignmentBlockReason({ ...noEscorts, childAvailabilities: ride.childAvailabilities.map((a) => ({ ...a, selfDriving: true })) }, []))
    .toMatch(/参加回答がありません/);
});

test('行き帰りと参加する子どもが揃った自動配車案だけ適用する', () => {
  const draft = createAssignmentDraft(ride).map((driver) => ({
    ...driver,
    escorts: [],
    rideAssignments: [{ childId: 31 }, { childId: 32 }],
  }));
  expect(autoAssignmentResultError(ride, draft)).toBeNull();
  expect(autoAssignmentResultError(ride, draft.slice(0, 1))).toMatch(/参加回答/);
  expect(autoAssignmentResultError(ride, draft.map((driver) => ({ ...driver, rideAssignments: [{ childId: 31 }, { childId: 99 }] }))))
    .toMatch(/参加回答/);
  expect(autoAssignmentResultError({ ...ride, separateDirections: false }, draft)).toMatch(/往復設定/);
});


test('同じ保護者の運転回答は引率中の方向で候補から外し、別方向では選べる', () => {
  const withDriverAnswer = {
    ...ride,
    availabilityDrivers: [...ride.availabilityDrivers, {
      ...ride.availabilityDrivers[0], id: 23, guardian: { id: 2, name: '保護者B' },
    }],
  };
  const draft = createAssignmentDraft(withDriverAnswer);
  expect(availableDriverCandidates(withDriverAnswer, draft, 'outbound')).toEqual([]);
  expect(availableDriverCandidates(withDriverAnswer, draft, 'inbound').map((answer) => answer.id)).toEqual([23]);

  const extra = { ...draft[1], availabilityDriverId: 23, rideAssignments: [] };
  expect(assignmentError(withDriverAnswer, [...draft, { ...extra, direction: 'outbound' }])).toMatch(/同じ保護者/);
  expect(assignmentError(withDriverAnswer, [{ ...extra, direction: 'outbound' }, ...draft])).toMatch(/同じ保護者/);
  expect(assignmentError(withDriverAnswer, [...draft, extra])).toBeNull();
});

test('異なる回答IDでも同一保護者の引率重複を拒否する', () => {
  const sameGuardianRide = {
    ...ride,
    availabilityDrivers: [...ride.availabilityDrivers, { ...ride.availabilityDrivers[1], id: 24 }],
  };
  const draft = createAssignmentDraft(sameGuardianRide);
  draft[0].escorts.push({ availabilityDriverId: 24, direction: 'outbound', rideAssignments: [] });
  expect(assignmentError(sameGuardianRide, draft)).toMatch(/同じ保護者/);
});

test.each([
  [false, 'outbound', 'both', true],
  [false, 'outbound', 'outbound', false],
  [false, 'outbound', 'inbound', false],
  [true, 'outbound', 'both', true],
  [true, 'outbound', 'outbound', true],
  [true, 'outbound', 'inbound', false],
  [true, 'inbound', 'both', true],
  [true, 'inbound', 'inbound', true],
  [true, 'inbound', 'outbound', false],
] as const)('運転者候補と保存前検証で往復設定を守る（分離=%s、配車=%s、回答=%s）', (separateDirections, direction, answerDirection, allowed) => {
  const targetRide = {
    ...ride,
    separateDirections,
    availabilityDrivers: [{ ...ride.availabilityDrivers[0], direction: answerDirection }],
  };
  const draft = [{ ...createAssignmentDraft(ride)[0], direction, escorts: [] }];
  expect(availableDriverCandidates(targetRide, [], direction).length).toBe(allowed ? 1 : 0);
  expect(assignmentError(targetRide, draft) === null).toBe(allowed);
});

test.each([
  [false, 'outbound', 'both', true],
  [false, 'outbound', 'outbound', false],
  [false, 'outbound', 'inbound', false],
  [true, 'outbound', 'both', true],
  [true, 'outbound', 'outbound', true],
  [true, 'outbound', 'inbound', false],
  [true, 'inbound', 'both', true],
  [true, 'inbound', 'inbound', true],
  [true, 'inbound', 'outbound', false],
] as const)('保存済み引率者も実際の回答方向で検証する（分離=%s、配車=%s、回答=%s）', (separateDirections, direction, answerDirection, allowed) => {
  const targetRide = {
    ...ride,
    separateDirections,
    availabilityDrivers: [ride.availabilityDrivers[0], { ...ride.availabilityDrivers[1], direction: answerDirection }],
  };
  const saved = createAssignmentDraft(ride)[0];
  const draft = [{ ...saved, direction, escorts: saved.escorts.map((escort) => ({ ...escort, direction })) }];
  expect(assignmentError(targetRide, draft) === null).toBe(allowed);
  if (allowed) {
    expect(buildUpdateAssignmentBody(targetRide, draft).drivers[0].escorts[0].rideAssignments).toEqual([{ childId: 32 }]);
  }
});
