async function parseJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const j: unknown = await res.json();
    return typeof j === "object" && j !== null
      ? (j as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export async function apiGet(url: string) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw Object.assign(
      new Error((data.message as string) || res.statusText || "Request failed"),
      { status: res.status, data },
    );
  }
  return data;
}

export async function apiPost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw Object.assign(
      new Error((data.message as string) || res.statusText || "Request failed"),
      { status: res.status, data },
    );
  }
  return data;
}

export async function apiPatch(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw Object.assign(
      new Error((data.message as string) || res.statusText || "Request failed"),
      { status: res.status, data },
    );
  }
  return data;
}

export async function apiDelete(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await parseJson(res);
  if (!res.ok) {
    throw Object.assign(
      new Error((data.message as string) || res.statusText || "Request failed"),
      { status: res.status, data },
    );
  }
  return data;
}
