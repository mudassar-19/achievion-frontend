// The Quests card on Today (Batch 3, E13): the running quest that ends first, or how many are open to join.
import { Link } from "react-router-dom";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import useLoad from "../manager/project/useLoad";
import { Progress, Reward } from "./QuestBoardPage";

export default function QuestStrip() {
  const { data: d, error } = useLoad("/api/workspace/quests");
  if (error) return <p role="alert" className="px-5 py-4 text-sm text-text-secondary">Your quests could not be loaded. They are on the Quests page.</p>;
  if (!d) return <div aria-busy="true" aria-label="Loading your quests" className="p-5"><Skeleton className="h-16 rounded-xl" /></div>;
  const q = d.mine[0], open = d.open.length;
  if (!q && !open) return <EmptyState heading="No active quest" body="Quests your Manager publishes show up here." action={{ label: "Open Quests", to: "/workspace/quests" }} />;
  return (
    <div className="flex flex-col gap-3 px-5 py-4 text-sm">
      {q && (<>
        <p className="font-bold text-text-primary [overflow-wrap:anywhere]">{q.title}</p>
        <Progress q={q} />
        <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary"><Reward q={q} /><span className="tabular-nums">{q.daysLeft === 0 ? "Ends today" : `${q.daysLeft} ${q.daysLeft === 1 ? "day" : "days"} left`}</span></p>
      </>)}
      <Link to="/workspace/quests" className="self-start font-bold text-accent-text underline underline-offset-2">
        {open ? `${open} ${open === 1 ? "quest is" : "quests are"} open to join` : d.mine.length > 1 ? `See all ${d.mine.length} quests` : "Open Quests"}
      </Link>
    </div>
  );
}
