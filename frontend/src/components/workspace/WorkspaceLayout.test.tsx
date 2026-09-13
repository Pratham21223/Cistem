import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { WorkspaceLayout } from "@/components/workspace/WorkspaceLayout";
import { useCanvasStore } from "@/stores/canvasStore";
import { useProjectStore } from "@/stores/projectStore";
import type { SemanticNode } from "@/types/canvas";

function semantic(id: string, x = 0, y = 0): SemanticNode {
  return {
    id,
    type: "semantic",
    position: { x, y },
    width: 176,
    height: 64,
    data: {},
    label: `Node ${id}`,
    componentType: "api_server",
    category: "compute",
    provenance: "user_selected",
    confidence: null,
  };
}

function resetStores(): void {
  useCanvasStore.getState().loadDocument({
    schemaVersion: 1,
    nodes: [],
    edges: [],
    strokes: [],
    comments: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  });
  useCanvasStore.getState().setTool("select");
  useProjectStore.setState({
    uiPreferences: {
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      activeRightTab: "context",
      theme: "light",
    },
  });
}

describe("WorkspaceLayout", () => {
  beforeEach(resetStores);

  it("renders the app shell", () => {
    render(<WorkspaceLayout />);

    expect(screen.getByText("Cistem")).toBeInTheDocument();
    expect(screen.getByText("Components")).toBeInTheDocument();
    expect(screen.getByText("Understanding")).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Canvas tools" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Zoom controls" })).toBeInTheDocument();
    expect(screen.getByText("Start designing")).toBeInTheDocument();
  });

  it("teases the component palette when a category is expanded", async () => {
    const user = userEvent.setup();
    render(<WorkspaceLayout />);

    const networking = screen.getByRole("button", { name: /Networking/ });
    expect(networking).toHaveAttribute("aria-expanded", "false");

    await user.click(networking);

    expect(networking).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Palette loads in Phase P2")).toBeInTheDocument();
  });

  it("shows collected signals in the context panel once the canvas has nodes", () => {
    act(() => {
      useCanvasStore.getState().loadDocument({
        schemaVersion: 1,
        nodes: [semantic("a"), semantic("b", 240, 0)],
        edges: [
          {
            id: "e1",
            source: "a",
            target: "b",
            type: "request_flow",
          },
        ],
        strokes: [],
        comments: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });
    });

    render(<WorkspaceLayout />);

    expect(screen.getByText("Signals collected")).toBeInTheDocument();
    expect(screen.getByText("Connections")).toBeInTheDocument();
    expect(screen.queryByText("Start designing")).not.toBeInTheDocument();
  });

  it("switches canvas tools from the toolbar", async () => {
    const user = userEvent.setup();
    render(<WorkspaceLayout />);

    const rectangleTool = screen.getByRole("button", { name: "Rectangle" });
    await user.click(rectangleTool);

    expect(useCanvasStore.getState().tool).toBe("rectangle");
    expect(rectangleTool).toHaveAttribute("aria-pressed", "true");
  });

  it("enables undo once history exists and undoes with the top bar control", async () => {
    const user = userEvent.setup();
    render(<WorkspaceLayout />);

    const undoButton = screen.getByRole("button", { name: "Undo" });
    expect(undoButton).toBeDisabled();

    act(() => {
      useCanvasStore.getState().addNode(semantic("a"));
    });
    expect(undoButton).toBeEnabled();

    await user.click(undoButton);
    expect(useCanvasStore.getState().nodes).toHaveLength(0);
  });

  it("mounts a 150-node design without errors", () => {
    act(() => {
      useCanvasStore.getState().loadDocument({
        schemaVersion: 1,
        nodes: Array.from({ length: 150 }, (_, index) =>
          semantic(`n${index}`, (index % 15) * 220, Math.floor(index / 15) * 120),
        ),
        edges: [],
        strokes: [],
        comments: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      });
    });

    render(<WorkspaceLayout />);

    expect(useCanvasStore.getState().nodes).toHaveLength(150);
    expect(screen.getByRole("toolbar", { name: "Canvas tools" })).toBeInTheDocument();
  });
});
