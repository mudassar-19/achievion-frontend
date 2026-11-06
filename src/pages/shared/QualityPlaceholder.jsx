// Tester "Quality" group placeholders (E-1). The real QA queue, bug board and test cases come in E-4 (Employee UX §5).
import { Bug, ClipboardCheck, ListTodo } from "lucide-react";
import Page from "@/components/ui/Page";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";

const COPY = {
  qa: { title: "QA queue", icon: ClipboardCheck, sub: "Tasks and modules waiting for your sign-off.",
    body: "Signing off from here comes in a later step. For now a \"QA sign-off needed\" notification opens the task." },
  bugs: { title: "Bug board", icon: Bug, sub: "Bugs you report and verify, from Open to Closed.",
    body: "Reporting and moving bugs comes in a later step." },
  "test-cases": { title: "Test cases", icon: ListTodo, sub: "Test cases per task or module, with their last result.",
    body: "Writing and running test cases comes in a later step." },
};

export default function QualityPlaceholder({ which }) {
  const c = COPY[which];
  return (
    <Page>
      <PageHeader title={c.title} subtitle={c.sub} />
      <Panel title={c.title} icon={c.icon}>
        <EmptyState heading="Not built yet" body={c.body} action={{ label: "Open My tasks", to: "/workspace/tasks" }} />
      </Panel>
    </Page>
  );
}
