describe('fetcher', () => {
  let mockGetSession: jest.Mock;
  let mockApiGet: jest.Mock;

  beforeEach(() => {
    jest.resetModules();       // モジュールのキャッシュ変数をリセット
    jest.useFakeTimers();      // Date.now() を制御可能にする

    mockGetSession = jest.fn().mockResolvedValue({
      data: { session: { access_token: 'test-token-123' } },
    });
    mockApiGet = jest.fn().mockResolvedValue({ status: 'OK' });

    jest.doMock('../supabase', () => ({
      supabase: { auth: { getSession: mockGetSession } },
    }));
    jest.doMock('../api', () => ({
      api: { get: mockApiGet },
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('初回リクエストでgetSession()を呼ぶ', async () => {
    const { fetcher } = require('../fetcher');
    await fetcher('/api/test');
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  test('キャッシュ有効期限内の2回目はgetSession()を呼ばない', async () => {
    const { fetcher } = require('../fetcher');
    await fetcher('/api/test');
    await fetcher('/api/test');
    expect(mockGetSession).toHaveBeenCalledTimes(1); // 1回のまま
  });

  test('55分経過後はgetSession()を再度呼ぶ', async () => {
    const { fetcher } = require('../fetcher');
    await fetcher('/api/test');
    jest.advanceTimersByTime(55 * 60 * 1000); // 55分進める
    await fetcher('/api/test');
    expect(mockGetSession).toHaveBeenCalledTimes(2); // 再取得される
  });

  test('取得したトークンをAPIリクエストに使う', async () => {
    const { fetcher } = require('../fetcher');
    await fetcher('/api/test');
    expect(mockApiGet).toHaveBeenCalledWith('/api/test', 'test-token-123');
  });

  test('セッションがない場合はundefinedをAPIに渡す', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { fetcher } = require('../fetcher');
    await fetcher('/api/test');
    expect(mockApiGet).toHaveBeenCalledWith('/api/test', undefined);
  });
});
