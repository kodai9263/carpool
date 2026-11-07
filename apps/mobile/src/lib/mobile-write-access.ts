// 画面を隠すだけでは、すでに開いている確認ダイアログの保存操作を止められない。
// 契約確認済みの現在のtokenにだけ、アプリからの更新操作を許可する。
let allowedToken: string | null = null;

export function setMobileWriteAccess(token: string | null) {
  allowedToken = token;
}

export function requireMobileWriteAccess(token: string) {
  if (!token || allowedToken !== token) {
    throw new Error('Proの契約状況を確認してから、もう一度お試しください。');
  }
}
