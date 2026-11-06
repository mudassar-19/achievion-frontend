import TeamChatLayout from "@/components/widgets/TeamChatLayout";

// Full-bleed layout — chat fills the workspace main area
export default function ChatHomePage() {
  return (
    <div style={{ height: "calc(100vh - 96px)" }}>
      <TeamChatLayout />
    </div>
  );
}
