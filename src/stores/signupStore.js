import { create } from "zustand";

const useSignupStore = create((set) => ({
  // ── Org data (step 1) ────────────────────────────────────────────────────
  orgData: {
    name:     "",
    industry: "",
    size:     "",
  },

  // ── Director info (step 2) — nested shape ────────────────────────────────
  directorInfo: {
    name:     "",
    email:    "",
    password: "",
  },

  // ── Director info — flat shape (also updated by setDirectorInfo) ─────────
  directorName:     "",
  directorEmail:    "",
  directorPassword: "",

  // ── Registration dedup flag (survives StrictMode remounts) ───────────────
  registrationFired: false,

  // ── Actions ──────────────────────────────────────────────────────────────
  setRegistrationFired: (val) => set({ registrationFired: val }),

  updateOrgData: (data) =>
    set((state) => ({ orgData: { ...state.orgData, ...data } })),

  setDirectorInfo: ({ name, email, password }) =>
    set({
      directorInfo:     { name, email, password },
      directorName:     name,
      directorEmail:    email,
      directorPassword: password,
    }),

  clearOrgData: () =>
    set({
      orgData:           { name: "", industry: "", size: "" },
      directorInfo:      { name: "", email: "", password: "" },
      directorName:      "",
      directorEmail:     "",
      directorPassword:  "",
      registrationFired: false,
    }),
}));

export default useSignupStore;
