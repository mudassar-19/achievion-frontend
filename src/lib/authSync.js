// Item 62: what a tab does when ANOTHER tab changes the shared saved login ("achievion-auth" in localStorage).
// The old handler cleared this tab's login whenever the saved token differed. That also wrote an empty state back to the
// shared key, so the tab that had just signed in saw "logged out" and cleared itself in turn: both tabs ended on /login and the
// second sign-in looked as if it had failed. Rule now: never write on a sign-in from elsewhere, just reload and read it.
//   "logout" - the other tab signed out (this tab only clears what is already saved)   "reload" - another tab signed in
// Item 62 follow-up: a sign-in is refused when the shared saved login already holds a token this tab does not own
// (another tab signed in a moment ago), instead of silently switching the account under the other tab.
export const ALREADY_SIGNED_IN = "You are already signed in as another account in this browser. Sign out first.";
export function alreadySignedIn(savedValue, currentToken) {
  try { const t = savedValue == null ? null : (JSON.parse(savedValue)?.state?.token ?? null); return !!t && t !== (currentToken ?? null); }
  catch { return false; }
}

export function syncAction(currentToken, newValue) {
  let incoming;
  try { incoming = newValue == null ? null : (JSON.parse(newValue)?.state?.token ?? null); } catch { return "none"; }
  if (incoming === (currentToken ?? null)) return "none";
  return incoming === null ? "logout" : "reload";
}
