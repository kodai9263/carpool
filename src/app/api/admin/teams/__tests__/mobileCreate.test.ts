/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';

jest.mock('@/utils/withAuth', () => ({ withAuth: (_request: unknown, action: (id: number) => unknown) => action(7) }));
jest.mock('@/lib/prisma', () => ({ prisma: { admin: { findUnique: jest.fn() }, team: { count: jest.fn(), create: jest.fn() } } }));
jest.mock('@/utils/serverAnalytics', () => ({ trackServerEvent: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(async () => 'test-pin-hash') }));

const submit = (body: unknown) => POST(new NextRequest('http://localhost/api/admin/teams', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.admin.findUnique as jest.Mock).mockResolvedValue({ billingPlan: 'free' });
  (prisma.team.count as jest.Mock).mockResolvedValue(0);
  (prisma.team.create as jest.Mock).mockResolvedValue({ id: 11, teamName: 'ジュニア', teamCode: 'generated' });
});

test('チームIDなしで作成しサーバーが識別子を発行する', async () => {
  const response = await submit({ teamName: ' ジュニア ', pin: '1234' });
  expect(response.status).toBe(201);
  expect(prisma.team.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ teamName: 'ジュニア', teamCode: expect.stringMatching(/^team-[0-9a-f-]{36}$/), maxGrade: 6 }) }));
});

test('既存Webが指定したチームIDと中学生設定を維持する', async () => {
  expect((await submit({ teamName: 'ジュニア', teamCode: 'existing-code', pin: '1234', isMiddleSchool: true })).status).toBe(201);
  expect(prisma.team.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ teamCode: 'existing-code', maxGrade: 3 }) }));
});

test('無料チーム数上限では作成しない', async () => {
  (prisma.team.count as jest.Mock).mockResolvedValue(1);
  expect((await submit({ teamName: 'ジュニア', pin: '1234' })).status).toBe(402);
  expect(prisma.team.create).not.toHaveBeenCalled();
});
