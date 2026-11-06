import { TALLY_POSES } from "./tallyPoses";

/**
 * The mascot. Decorative by default (aria-hidden); pass `label` when it carries meaning.
 * pose: idle | wave | cheer | celebrate | thinking | working | sleeping | encouraging | alert
 */
export default function Tally({ pose = "idle", size = 96, label, className = "" }) {
  const svg = TALLY_POSES[pose] ?? TALLY_POSES.idle;
  return (
    <svg
      className={`mascot ${className}`}
      data-pose={pose}
      style={{ "--m": `${size}px` }}
      viewBox="-6 -8 132 132"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      // static, first-party artwork (tallyPoses.js), never user input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
