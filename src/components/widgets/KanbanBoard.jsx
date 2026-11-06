import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable,
} from "@dnd-kit/core";

// Shared Kanban (V1 1.8). Drag with mouse/touch, or focus a card and use Space + arrow keys + Space.
// The parent decides each move (`decide`) and performs it (`onMove`, may throw → card snaps back).
//   columns: [{ key, label, color }]   tasks: [{ ..., status }]   getId(task)   renderCard(task, { dragging })
function Column({ col, count, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${col.label} column, ${count} task${count === 1 ? "" : "s"}`}
      className="flex w-[280px] shrink-0 flex-col rounded-2xl border p-2 transition-colors duration-150 md:w-auto md:min-w-0 md:flex-1"
      style={{
        borderColor: isOver ? col.color : "rgba(20,32,61,0.08)",
        background:  isOver ? `${col.color}0F` : "rgba(20,32,61,0.02)",
      }}
    >
      <header className="flex items-center gap-2 px-2 pb-2 pt-1">
        <span className="h-2 w-2 rounded-full" style={{ background: col.color }} aria-hidden="true" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">{col.label}</h2>
        <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-secondary bg-ink/[0.05]">{count}</span>
      </header>
      <div className="flex min-h-[96px] flex-col gap-2">{children}</div>
    </section>
  );
}

function Card({ id, children, disabled }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#2A62EC]/50 touch-none"
      style={{ opacity: isDragging ? 0.35 : 1, cursor: disabled ? "default" : "grab" }}
    >
      {children}
    </div>
  );
}

export default function KanbanBoard({ columns, tasks, getId = (t) => String(t._id ?? t.id), renderCard, decide, onMove, onRefuse, canDrag = () => true }) {
  const [pending, setPending] = useState({}); // id → status while the server call runs (optimistic)
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // a short click still opens the card's link
    useSensor(KeyboardSensor),
  );

  const statusOf = (t) => pending[getId(t)] ?? t.status;
  const byId = Object.fromEntries(tasks.map((t) => [getId(t), t]));
  const active = activeId ? byId[activeId] : null;

  async function handleEnd({ active: a, over }) {
    setActiveId(null);
    const task = byId[a.id];
    if (!task || !over) return;
    const to = String(over.id);
    const verdict = decide(task, to);
    if (!verdict.ok) { if (verdict.reason) onRefuse?.(verdict.reason); return; }
    if (verdict.action) { onMove(task, to, verdict.action); return; } // parent handles (e.g. submit form)
    setPending((p) => ({ ...p, [a.id]: to }));
    try {
      await onMove(task, to);
    } catch (err) {
      onRefuse?.(err?.message ?? "That move was not saved.");
    } finally {
      setPending((p) => { const n = { ...p }; delete n[a.id]; return n; });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active: a }) => setActiveId(a.id)}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleEnd}
      accessibility={{
        screenReaderInstructions: { draggable: "Press Space to pick up a task, use the arrow keys to choose a column, then press Space again to drop it. Press Escape to cancel." },
      }}
    >
      <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-2 md:mx-0 md:overflow-visible md:px-0">
        {columns.map((col) => {
          const items = tasks.filter((t) => statusOf(t) === col.key);
          return (
            <Column key={col.key} col={col} count={items.length}>
              {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-text-secondary">Nothing here</p>}
              {items.map((t) => (
                <Card key={getId(t)} id={getId(t)} disabled={!canDrag(t) || Boolean(pending[getId(t)])}>
                  {renderCard({ ...t, status: statusOf(t) }, { saving: Boolean(pending[getId(t)]) })}
                </Card>
              ))}
            </Column>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {active ? <div className="rotate-[1.5deg] rounded-xl shadow-[0_12px_32px_-8px_rgba(20,32,61,0.35)]">{renderCard(active, { dragging: true })}</div> : null}
      </DragOverlay>
    </DndContext>
  );
}
