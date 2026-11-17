// Drop-in for <input type="date"> (QA4 M-36, QA3 X-1): same props and same real input (picker, min/max, required, keyboard),
// but at rest it shows the date in the app's format ("Nov 13, 2026") instead of the browser's "dd/mm/yyyy".
// While the field has focus the native segments show, because that is what you type into.
import { fmtDate } from "@/lib/dates";

export default function DateInput({ value, className = "", placeholder = "Pick a date", style, ...rest }) {
  return (
    <span className="relative inline-flex min-w-0 max-w-full">
      <input {...rest} type="date" value={value ?? ""} style={style}
        className={`peer ${className} text-transparent focus:text-text-primary`} />
      <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-3 flex items-center truncate text-sm peer-focus:hidden ${value ? "text-text-primary" : "text-slate-500"}`}>
        {value ? fmtDate(`${value}T12:00:00`) : placeholder}
      </span>
    </span>
  );
}
