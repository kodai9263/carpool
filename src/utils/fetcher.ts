export const fetcher = async (url: string, token?: string) => {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}`}),
    },
  });

  if (!res.ok) {
    throw new Error('データの読み込みに失敗しました。');
  }

  return res.json();
}