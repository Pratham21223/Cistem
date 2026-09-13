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
      className="fixed z-40 w-72 rounded-2xl border border-border bg-surface shadow-lg"
      style={{ left: x, top: y }}
      role="dialog"
      aria-label="Comments"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="flex h-10 items-center justify-between border-b border-border px-3">
        <h3 className="font-hand text-[18px] font-semibold text-text-primary">Comments</h3>
        <Button variant="ghost" size="icon-sm" aria-label="Close comments" onClick={onClose}>
          <X size={14} strokeWidth={1.75} />
        </Button>
      </header>

      <div className="max-h-60 overflow-y-auto px-3 py-2">
        {comments.length === 0 ? (
          <p className="py-2 font-hand text-[16px] text-text-muted">No comments yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-sm bg-surface-secondary px-2 py-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-[13px] text-text-primary">
                    {comment.text}
                  </p>
                  <button
                    type="button"
                    aria-label="Delete comment"
                    className="rounded-xs px-1 text-caption text-text-faint transition-colors duration-fast hover:text-critical focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={() => removeComment(comment.id)}
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] text-text-faint">
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
