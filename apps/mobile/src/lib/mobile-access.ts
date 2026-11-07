export type MobileAccessStatus = 'checking' | 'allowed' | 'locked' | 'error';

export type MobileAccessState = {
  userId: string | null;
  status: MobileAccessStatus;
  hasOpened: boolean;
};

export const initialMobileAccessState: MobileAccessState = {
  userId: null,
  status: 'checking',
  hasOpened: false,
};

// 古いAPIや不正なレスポンスを無料契約と混同せず、確認エラーとして扱う。
export function readMobileAccess(value: unknown): boolean {
  if (!value || typeof value !== 'object') throw new Error('Invalid billing response');
  const response = value as { status?: unknown; billing?: { mobileAccess?: unknown } };
  if (response.status !== 'OK' || typeof response.billing?.mobileAccess !== 'boolean') {
    throw new Error('Invalid billing response');
  }
  return response.billing.mobileAccess;
}

export function createMobileAccessController({
  fetchStatus,
  onChange,
  timeoutMs = 15000,
}: {
  fetchStatus: (token: string, signal: AbortSignal) => Promise<unknown>;
  onChange: (state: MobileAccessState) => void;
  timeoutMs?: number;
}) {
  let state = initialMobileAccessState;
  let generation = 0;
  let cancel: (() => void) | undefined;

  function publish(next: MobileAccessState) {
    state = next;
    onChange(next);
  }

  function suspend(userId: string | null) {
    generation += 1;
    cancel?.();
    cancel = undefined;
    publish({ userId, status: 'checking', hasOpened: userId !== null && userId === state.userId && state.hasOpened });
  }

  async function check(userId: string, token: string) {
    suspend(userId);
    const current = generation;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const interrupted = new Promise<never>((_, reject) => {
      cancel = () => {
        abort.abort();
        reject(new Error('Cancelled'));
      };
      timer = setTimeout(() => {
        abort.abort();
        reject(new Error('Timeout'));
      }, timeoutMs);
    });
    try {
      const result = await Promise.race([fetchStatus(token, abort.signal), interrupted]);
      if (current !== generation) return;
      const allowed = readMobileAccess(result);
      publish({ userId, status: allowed ? 'allowed' : 'locked', hasOpened: state.hasOpened || allowed });
    } catch {
      if (current === generation) publish({ ...state, status: 'error' });
    } finally {
      clearTimeout(timer);
      if (current === generation) cancel = undefined;
    }
  }

  return { check, suspend };
}
