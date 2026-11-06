// Project detail → Report tab (M-6): this project's delivery (last 30 days) + Lessons learned, and a link to the full report.
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { BTN } from "@/components/ui/buttons";
import { DeliveryTab, LessonsTab } from "./ReportTabs";

export default function ProjectReportTab({ project }) {
  const q = `project=${project._id}`;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">Delivery for the last 30 days, and what the team learned on this project.</p>
        <Link to={`/manager/reports?${q}`} className={BTN.secondary}><ExternalLink size={15} aria-hidden="true" />Open full report</Link>
      </div>
      <DeliveryTab query={q} compact />
      <LessonsTab query={q} compact />
    </div>
  );
}
