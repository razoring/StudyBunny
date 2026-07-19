import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Quest } from "../services/api";

interface QuestProgressProps {
  documentId: string;
  onQuestSelect?: (quest: Quest) => void;
  refreshCounter?: number;
}

export default function QuestProgress({
  documentId,
  onQuestSelect,
  refreshCounter = 0,
}: QuestProgressProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  async function fetchQuests() {
    try {
      const data = await api.listQuests(documentId);
      setQuests(data.sort((a, b) => a.order - b.order));
      setError(null);
    } catch (err) {
      console.error("Error fetching quests:", err);
      setError("Couldn't load quests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!documentId) return;
    fetchQuests();
  }, [documentId, refreshCounter]);

  const done = quests.filter((q) => q.status === "done").length;
  const pct = quests.length ? Math.round((done / quests.length) * 100) : 0;
  const currentId = quests.find((q) => q.status === "active")?.id;

  function handleQuestClick(quest: Quest) {
    if (quest.status === "locked") return;
    onQuestSelect?.(quest);
  }

  async function handleComplete(e: React.MouseEvent, quest: Quest) {
    e.stopPropagation();
    if (quest.status !== "active" || completingId) return;

    setCompletingId(quest.id);
    try {
      await api.completeQuest(quest.id);
      await fetchQuests();
    } catch (err) {
      console.error("Error completing quest:", err);
      setError("Couldn't update quest. Try again.");
    } finally {
      setCompletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <p style={{ color: "var(--c-sand-dark)", fontWeight: 700, margin: 0 }}>
          Loading quests...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pixel-panel" style={{ padding: "16px" }}>
        <p style={{ color: "var(--c-red-brown)", fontWeight: 700, margin: 0 }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="pixel-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", height: "100%", overflow: "hidden", minHeight: 0 }}>
      <div>
        <h3 style={{ fontFamily: "var(--font-retro)", fontSize: "1.3rem", color: "var(--c-red-brown)", margin: 0 }}>
          Quest Progress
        </h3>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--c-sand-dark)" }}>
          {done}/{quests.length}
        </span>
      </div>

      <div
        style={{
          width: "100%",
          height: "10px",
          background: "var(--c-sand-light)",
          border: "2px solid var(--border-color)",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "var(--c-sage-dark)",
            width: `${pct}%`,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto", paddingRight: "5px", paddingBottom: "10px", minHeight: 0 }}>
        {quests.map((q, i) => {
          const isDone = q.status === "done";
          const isCurrent = q.id === currentId;
          const isLocked = q.status === "locked";
          const isCompleting = completingId === q.id;

          return (
            <div
              key={q.id}
              className="pixel-panel"
              onClick={() => handleQuestClick(q)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.55 : 1,
                borderColor: isCurrent ? "var(--c-sage-dark)" : "var(--border-color)",
                backgroundColor: isCurrent ? "var(--c-mint-pale)" : "var(--bg-panel)",
              }}
            >
              {/* O — checkmark/status circle, interactable only when active */}
              <span
                role={isCurrent ? "checkbox" : undefined}
                aria-checked={isDone}
                onClick={(e) => isCurrent && handleComplete(e, q)}
                style={{
                  flexShrink: 0,
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: "2.5px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  cursor: isCurrent ? "pointer" : "default",
                  backgroundColor: isDone
                    ? "var(--c-sage-dark)"
                    : isLocked
                    ? "var(--c-sand-light)"
                    : "var(--bg-panel)",
                  color: isDone ? "white" : "var(--c-brown-dark)",
                }}
              >
                {isCompleting ? "…" : isDone ? "✓" : isLocked ? "🔒" : i + 1}
              </span>

              {/* Quest description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    color: isLocked ? "var(--c-sand-med)" : "var(--c-brown-dark)",
                  }}
                >
                  {q.title}
                </p>
                {!isLocked && (
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: "0.8rem",
                      color: "var(--c-sand-dark)",
                    }}
                  >
                    {q.summary}
                  </p>
                )}
              </div>

              {/* Mark done — only shown for the active quest */}
              {isCurrent && !isCompleting && (
                <button
                  onClick={(e) => handleComplete(e, q)}
                  className="pixel-button"
                  style={{ flexShrink: 0, fontSize: "0.75rem", padding: "4px 10px" }}
                >
                  Mark done
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
