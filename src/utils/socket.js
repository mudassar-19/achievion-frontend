import { io } from "socket.io-client";
import { API_URL } from "@/lib/api";

// The server refuses sockets without a valid JWT (FE-039). The token is read at connect time, so it is
// always the current one: employee session first, otherwise the Software House session.
function currentToken() {
  try {
    const emp = JSON.parse(localStorage.getItem("achievion-auth") ?? "null")?.state?.token;
    if (emp) return emp;
    return JSON.parse(localStorage.getItem("achievion-org") ?? "null")?.state?.orgToken ?? null;
  } catch {
    return null;
  }
}

const socket = io(API_URL, {
  autoConnect: false,
  auth: (cb) => cb({ token: currentToken() }),
});

// FE-034 / FE-042: remember which rooms this browser wants and (re)join them on every
// connect, including automatic reconnects after a network drop.
let rooms = { userId: null, orgId: null };
socket.on("connect", () => {
  if (rooms.userId) socket.emit("join", rooms.userId);
  if (rooms.orgId)  socket.emit("joinOrg", rooms.orgId);
});

export function joinRooms({ userId = null, orgId = null }) {
  // View as (D-109): read-only, no live socket (the server refuses it too).
  try { if (JSON.parse(localStorage.getItem("achievion-auth") ?? "null")?.state?.viewAs) return; } catch { /* no state */ }
  rooms = { userId, orgId };
  if (socket.connected) {
    if (userId) socket.emit("join", userId);
    if (orgId)  socket.emit("joinOrg", orgId);
  } else {
    socket.connect(); // the "connect" handler above joins the rooms
  }
}

export default socket;
