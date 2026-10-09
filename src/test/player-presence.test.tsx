import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const backend = vi.hoisted(() => ({ rpc: vi.fn(), incoming: false, accepted: false }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/game/store", () => ({ useGame: () => ({ lives: [] }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: async () => ({ data: { user: { id: "me" } } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  rpc: backend.rpc,
  from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }),
} }));
import { PlayerPresence } from "@/components/room28/PlayerPresence";

describe("Player connection consent", () => {
  beforeEach(() => {
    backend.incoming = false; backend.accepted = false;
    backend.rpc.mockReset().mockImplementation(async (name: string) => {
      if (name === "directory") return { data: [{ id: "other", display_name: "Alex", city_id: "lagos", cars: 1 }], error: null };
      if (name === "friend_list") return { data: backend.incoming || backend.accepted ? [{ friendship_id: "request", other: "other", display_name: "Alex", city_id: "lagos", incoming: true, status: backend.accepted ? "accepted" : "pending" }] : [], error: null };
      if (name === "befriend") { backend.accepted = backend.incoming; return { data: backend.accepted ? "accepted" : "pending", error: null }; }
      return { data: [], error: null };
    });
  });
  it("opens a profile without sending a request and allows Not now", async () => {
    render(<PlayerPresence />);
    fireEvent.click(await screen.findByRole("button", { name: /Alex/ }));
    expect(screen.getByText("Would you like to connect with Alex?")).toBeInTheDocument();
    expect(backend.rpc.mock.calls.some(c => c[0] === "befriend")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("sends a request only after confirmation", async () => {
    render(<PlayerPresence />);
    fireEvent.click(await screen.findByRole("button", { name: /Alex/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send connection request" }));
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledWith("befriend", { _other: "other" }));
  });
  it("asks recipients to accept and reads back accepted friendship", async () => {
    backend.incoming = true;
    render(<PlayerPresence />);
    fireEvent.click(await screen.findByRole("button", { name: /^A Alex/ }));
    expect(screen.getByText("Alex wants to connect. Would you like to accept?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Accept connection" }));
    expect(await screen.findByText("You’re friends")).toBeInTheDocument();
  });
});