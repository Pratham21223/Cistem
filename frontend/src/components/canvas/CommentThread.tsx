import { X } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCanvasStore } from "@/stores/canvasStore";

type CommentThreadProps = {
  targetId: string;
  x: number;
  y: number;
  onClose: () => void;
};

export function CommentThread({ targetId, x, y, onClose }: CommentThreadProps) {
  const comments = useCanvasStore(
    useShallow((state) => state.comments.filter((comment) => comment.targetId === targetId)),
  );
  const addComment = useCanvasStore((state) => state.addComment);
  const removeComment = useCanvasStore((state) => state.removeComment);
  const [draft, setDraft] = useState("");

  const submit = (): void => {
    const text = draft.trim();
    if (text.length === 0) return;
    addComment({
      id: crypto.randomUUID(),
      targetId,
      author: "You",
      text,
      createdAt: new Date().toISOString(),
    });
    setDraft("");
  };

  return (
    <div
      className="panel-surface fixed z-40 flex w-72 flex-col overflow-hidden animate-in fade-in-0 zoom-in-95"
      style={{ left: x, top: y }}
      role="dialog"
      aria-label="Comments"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border pl-3 pr-2">
        <h3 className="text-panel-title text-text-primary">Comments</h3>
        <Button variant="ghost" size="icon-sm" aria-label="Close comments" onClick={onClose}>
          <X size={14} strokeWidth={1.75} />
        </Button>
      </header>

      <div className="max-h-60 overflow-y-auto p-3">
        {comments.length === 0 ? (
          <p className="py-2 text-body text-text-muted">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-md bg-surface-secondary px-2.5 py-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-control text-text-primary">
                    {comment.text}
                  </p>
                  <button
                    type="button"
                    aria-label="Delete comment"
                    className="focus-ring rounded-xs px-1 text-micro text-text-faint transition-colors duration-fast hover:text-critical"
                    onClick={() => removeComment(comment.id)}
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-1 text-micro text-text-faint">
                  {comment.author} ·{" "}
                  {new Date(comment.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-3">
        <Textarea
          value={draft}
          placeholder="Leave a note for yourself…"
          aria-label="New comment"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button variant="primary" size="sm" onClick={submit} disabled={draft.trim().length === 0}>
            Comment
          </Button>
        </div>
      </div>
    </div>
  );
}
