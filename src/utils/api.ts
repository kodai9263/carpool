export const api = {
  async get(url: string, token?: string) {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      const error: any = new Error("取得に失敗しました。");
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  async post<TBody = unknown>(url: string, body: TBody, token?: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw {
        status: res.status,
        message: json.message || "登録に失敗しました。",
      };
    }
    return res.json();
  },

  async put<TBody = unknown>(url: string, body: TBody, token: string) {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("更新に失敗しました。");
    return res.json();
  },

  async delete(url: string, token: string) {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error("削除に失敗しました。");
    return;
  },
};
