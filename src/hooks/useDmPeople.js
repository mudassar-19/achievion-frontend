// The channel list gives a DM as "dm-<id>-<id>" with bare member ids (UI-C audit, rule G4). This looks the other
// person up once per DM through GET /api/chat/channels/:id/members, which already returns names.
// → personOf(dm): undefined while loading, null when the other account is gone, else { _id, name, role }.
// ponytail: one request per DM thread; fold into the list answer when the server sends the name itself.
import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";

export default function useDmPeople(dms, meId) {
  const [people, setPeople] = useState({});
  const asked = useRef(new Set());
  useEffect(() => {
    for (const d of dms) {
      const id = String(d._id);
      if (d._dmTarget || asked.current.has(id)) continue;
      asked.current.add(id);
      api.get(`/api/chat/channels/${id}/members`, { silent: true })
        .then((ms) => setPeople((p) => ({ ...p, [id]: ms.find((m) => String(m._id) !== String(meId)) ?? null })))
        .catch(() => setPeople((p) => ({ ...p, [id]: null })));
    }
  }, [dms, meId]);
  return useCallback((dm) => dm?._dmTarget ?? people[String(dm?._id)], [people]);
}
