// View as (F-1/F-3): hides every write control in every portal. Controls opt in with data-write-action; anything
// else that is clearly a write (by its label) is tagged here so a new button cannot slip through. The server still
// answers 403 VIEW_ONLY to any non-GET, so this is the courtesy layer, not the lock.
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useViewOnly from "@/hooks/useViewOnly";

// Labels that write. Matched at the start of a button's text or aria-label.
const WRITE = /^(new|create|add|save|submit|approve|reject|delete|remove|edit|start|log time|send|post|invite|assign|publish|upload|check.?in|archive|restore|deactivate|suspend|reactivate|adjust|reopen|resolve|dismiss|confirm|apply|rename|change|reply|mark|request|decline|counter|extend|escalate|generate|buy|claim|equip|redeem|purchase|use |join|leave|follow|vote|react|retry|close project|close with|cancel task|save current)/i;
const KEEP = "[data-view-as-banner],[data-keep-in-view-only],nav,[role=search],[role=tablist]";
const SEL = "button,[role=button],input[type=submit]";

function tag(root) {
  root.querySelectorAll?.(SEL).forEach((el) => {
    if (el.dataset.writeAction || el.closest(KEEP)) return;
    const text = (el.getAttribute("aria-label") || el.textContent || "").trim();
    if (WRITE.test(text) && !/^(close|cancel)\b/i.test(text)) el.dataset.writeAction = "1";
  });
}

export default function ViewOnlyGuard() {
  const viewOnly = useViewOnly();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.toggleAttribute("data-view-only", viewOnly);
    if (!viewOnly) return undefined;
    tag(document.body);
    const mo = new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && tag(n))));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [viewOnly]);

  // Create flows opened by link (?new=1, /new) show nothing to do while viewing.
  useEffect(() => {
    if (viewOnly && /(^|&)new=1(&|$)/.test(search.slice(1))) navigate(pathname, { replace: true });
  }, [viewOnly, pathname, search, navigate]);

  return null;
}
