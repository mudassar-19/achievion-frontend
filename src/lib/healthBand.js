// ONE health scale in the app (QA4 D-QA4-11): >= 75 healthy ("On track" on a project), 60-74 needs attention, < 60 at risk.
// Same numbers as the server's healthBand(). Three tiers, green / amber / red. The old 70/40 and 75/50 sets and "Off track" are gone.
export const HEALTHY_MIN = 75, ATTENTION_MIN = 60;

/** Project label for a score. */
export const healthBand = (score) => (score >= HEALTHY_MIN ? "On track" : score >= ATTENTION_MIN ? "Needs attention" : "At risk");
/** Org-level label for a score ("Healthy" instead of "On track"). */
export const orgBand = (score) => (score >= HEALTHY_MIN ? "Healthy" : score >= ATTENTION_MIN ? "Needs attention" : "At risk");
/** Colour for a score (text-safe shades). */
export const bandColor = (score) => (score >= HEALTHY_MIN ? "#0E6A30" : score >= ATTENTION_MIN ? "#B45309" : "#B01F17");
/** A project row from the API → its band. No score or no tasks yet = "Not started" (never red). */
export const bandOfProject = (p) => (p?.healthScore == null || p?.healthBand === "Not started" ? "Not started" : healthBand(p.healthScore));
