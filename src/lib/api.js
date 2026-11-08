// ── API base URL ──────────────────────────────────────────────────────────────
// Set VITE_API_URL in client/.env to override (e.g., production backend URL).
// FE-022: this is the single definition; socket.js and the pages that build file URLs import it.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const BASE_URL = API_URL;

// FE-023: no request may hang forever.
const TIMEOUT_MS = 60_000; // ponytail: Railway cold-start can take 30-60s on hobby tier
const UPLOAD_TIMEOUT_MS = 120_000;

// FE-021 / FE-R006: these endpoints answer 401 for "wrong credentials", not for "session expired",
// so a 401 from them must not log the user out.
const KEEP_SESSION_ON_401 = [/^\/api\/auth\/(login|register|password|reset-password)/, /^\/api\/org\//];

// ── Token retrieval ───────────────────────────────────────────────────────────
// Reads directly from the Zustand persist key to avoid a circular import with
// authStore.  The persist middleware stores data as { state: { token }, ... }.
function getToken() {
  try {
    const raw = localStorage.getItem("achievion-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

// FE-028: many pages swallow request errors. Failures that the user cannot fix by editing a form
// (server down, 5xx, 403) are announced once through an "api:error" event (see components/ui/ApiErrorToaster).
function announce(err, path, options) {
  if (options?.silent) return;
  if (err.status === 0 || err.status >= 500 || err.status === 403) {
    window.dispatchEvent(new CustomEvent("api:error", { detail: { message: err.message, status: err.status, path, code: err.data?.code } }));
  }
}

// View as (D-109): the viewer's own session waits in the persisted state while a read-only token is used.
const VIEW_AS_EXIT = "/api/auth/view-as/exit";
function viewAsState() {
  try { return JSON.parse(localStorage.getItem("achievion-auth") ?? "null")?.state?.viewAs ?? null; } catch { return null; }
}
// The view ended on the server (expired / viewer signed out elsewhere): go back to the viewer, not to login.
function endViewAs(v) {
  try {
    const raw = JSON.parse(localStorage.getItem("achievion-auth"));
    raw.state = { ...raw.state, token: v.viewerToken, user: v.viewerUser, viewAs: null };
    localStorage.setItem("achievion-auth", JSON.stringify(raw));
  } catch { localStorage.removeItem("achievion-auth"); }
  window.location.href = v.returnPath || "/";
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const viewAs = viewAsState();
  if (viewAs && !["GET", "HEAD"].includes(options.method ?? "GET") && path !== VIEW_AS_EXIT) {
    const err = new Error("Read-only in View as");
    err.status = 403;
    err.data = { code: "view_as_read_only" };
    announce(err, path, options);
    throw err;
  }

  // If body is FormData, let the browser set Content-Type (with multipart boundary).
  // Otherwise default to application/json.
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      signal: options.signal ?? AbortSignal.timeout(isFormData ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS),
      ...options,
      headers,
    });
  } catch (cause) {
    // Network down, CORS, timeout: normalise to an Error with a readable message and status 0.
    const err = new Error(
      cause?.name === "TimeoutError" || cause?.name === "AbortError"
        ? "The server took too long to answer. Please try again."
        : "Cannot reach the server. Check your connection and try again."
    );
    err.status = 0;
    err.network = true;
    announce(err, path, options);
    throw err;
  }

  // Parse body — even error responses include a JSON body from our API
  let data;
  try {
    data = await response.json();
  } catch {
    // Non-JSON body (e.g. 502 from a proxy)
    data = { error: `HTTP ${response.status} — unexpected response format` };
  }

  if (!response.ok) {
    const err = new Error(data.error ?? `HTTP ${response.status}`);
    err.status = response.status;
    err.data = data; // field errors / extra info (e.g. { fields }, { openTasks })
    // Auto-redirect only when a stored session was rejected, not for wrong-credential 401s
    if (response.status === 401 && token && viewAs && !KEEP_SESSION_ON_401.some((r) => r.test(path))) {
      endViewAs(viewAs);
    } else if (response.status === 401 && token && !KEEP_SESSION_ON_401.some((r) => r.test(path))) {
      localStorage.removeItem("achievion-auth");
      window.location.href = "/login";
    }
    announce(err, path, options);
    throw err;
  }

  return data;
}

// ── Exported HTTP methods ─────────────────────────────────────────────────────
export const api = {
  get:    (path, opts = {})       => request(path, { method: "GET",    ...opts }),
  post:   (path, body, opts = {}) => request(path, { method: "POST",   body: JSON.stringify(body), ...opts }),
  put:    (path, body, opts = {}) => request(path, { method: "PUT",    body: JSON.stringify(body), ...opts }),
  patch:  (path, body, opts = {}) => request(path, { method: "PATCH",  body: JSON.stringify(body), ...opts }),
  delete: (path, opts = {})       => request(path, { method: "DELETE", ...opts }),
  // Multipart upload — pass a FormData instance; Content-Type set automatically by browser
  upload: (path, formData)        => request(path, { method: "POST",   body: formData }),
  // File download (PDF / CSV): resolves to a Blob; errors read like request() errors.
  download: async (path) => {
    const token = getToken();
    let r;
    try { r = await fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(TIMEOUT_MS) }); }
    catch { const err = new Error("Cannot reach the server. Check your connection and try again."); err.status = 0; throw err; }
    if (!r.ok) { const d = await r.json().catch(() => ({})); const err = new Error(d.error ?? `HTTP ${r.status}`); err.status = r.status; throw err; }
    return r.blob();
  },
};

export default api;
