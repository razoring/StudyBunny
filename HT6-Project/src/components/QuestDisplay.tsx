import React, { useState } from "react";
import { api } from "../services/api";
import type { Quest } from "../services/api";

import continueIcon from '../assets/Error_Icon_8x.png';

interface QuestDisplayProps {
  quest: Quest;
  onContinue?: (quest: Quest) => void;
  onCompleted?: () => void; // called after a successful complete, so parent can refetch
}

export default function QuestDisplay({ quest, onContinue, onCompleted }: QuestDisplayProps) {
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDone = quest.status === "done";
  const isLocked = quest.status === "locked";
  const progress = isDone ? 100 : 0;

  async function handleClick() {
    if (isLocked) return;

    if (isDone) {
      // "Review" — just hand off to the parent, no backend call needed
      onContinue?.(quest);
      return;
    }

    // "Continue" on the active quest marks it done and unlocks the next one
    setCompleting(true);
    setError(null);
    try {
      await api.completeQuest(quest.id);
      onCompleted?.();
    } catch (err) {
      console.error("Error completing quest:", err);
      setError("Couldn't update. Try again.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div
      className="pixel-panel"
      style={{
        padding: "16px",
        opacity: isLocked ? 0.5 : 1,
        borderColor: isDone ? "var(--c-sage-dark)" : "var(--border-color)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "1.2rem",
            backgroundColor: isDone ? "var(--c-mint-pale)" : "var(--c-peach)",
            color: isDone ? "var(--c-sage-dark)" : "var(--c-clay)",
          }}
        >
          
          {isDone ? (
              "✓"
            ) : isLocked ? (
              "🔒"
            ) : (
              <img
                src={continueIcon}
                alt="In progress"
                style={{ width: '20px', height: '20px', objectFit: 'contain' }}
              />
            )}

        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h4
            style={{
              margin: 0,
              fontWeight: 800,
              color: "var(--c-brown-dark)",
              fontSize: "1rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {quest.title}
          </h4>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--c-sand-dark)" }}>
            {isDone ? "Completed" : isLocked ? "Locked" : quest.summary}
          </p>
        </div>
      </div>

      {!isLocked && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "5px" }}>
            <span style={{ color: "var(--c-sand-dark)" }}>Progress</span>
            <span style={{ fontWeight: 700, color: "var(--c-brown-dark)" }}>{progress}%</span>
          </div>
          <div
            style={{
              height: "8px",
              borderRadius: "4px",
              background: "var(--c-sand-light)",
              border: "1px solid var(--border-color)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: isDone ? "var(--c-sage-dark)" : "var(--c-clay)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {error && (
        <p style={{ fontSize: "0.75rem", color: "var(--c-red-brown)", marginBottom: "8px" }}>{error}</p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="pixel-button"
          onClick={handleClick}
          disabled={isLocked || completing}
          style={{
            fontSize: "0.8rem",
            padding: "6px 14px",
            opacity: isLocked ? 0.5 : 1,
            cursor: isLocked ? "not-allowed" : "pointer",
          }}
        >
          {completing ? "Saving..." : isDone ? "Review →" : isLocked ? "Locked" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
