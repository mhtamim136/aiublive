"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ConnectionStatus, ProjectPost, Student } from "./types";
import { mockProjects } from "./mock-data";

// ── Realtime / messaging types ──────────────────────────────────────────

export type AppNotification = {
  id: number;
  kind:
    | "connection-request"
    | "connection-accepted"
    | "message"
    | "team-activity";
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type AppMessage = {
  id: number;
  threadId: number;
  senderId: number;
  body: string;
  createdAt: string;
};

export type ThreadSummary = {
  threadId: number;
  peerId: number;
  lastMessageAt: string;
  lastMessage: { id: number; senderId: number; body: string } | null;
};

export type LoginResult =
  | { ok: true; name: string }
  | {
      ok: false;
      /** Machine-readable hint from `/api/auth/login` or networking. */
      code: string;
      message: string;
      lockedUntil?: number;
      remainingAttempts?: number;
    };

async function readJsonBody(res: Response): Promise<Record<string, unknown>> {
  try {
    const j: unknown = await res.json();
    return typeof j === "object" && j !== null
      ? (j as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

type State = {
  // ── Session ────────────────────────────────────────────────────────────
  me: Student | null;
  signedInId: string | null;
  hasOnboarded: boolean;
  sessionChecked: boolean;
  // ── Social graph ───────────────────────────────────────────────────────
  connections: Record<string, ConnectionStatus>;
  bookmarks: string[];
  // ── Projects (local-only, persisted) ──────────────────────────────────
  projects: ProjectPost[];
  // ── Realtime (DB-backed) ──────────────────────────────────────────────
  notifications: AppNotification[];
  unreadCount: number;
  threadSummaries: ThreadSummary[];
  /** Per-peer message lists, keyed by peerId (string). */
  threadMessages: Record<string, AppMessage[]>;
  realtimeConnected: boolean;
  /** Bumped whenever a campus-wide event arrives (signup, etc.) so views
   *  that aren't tied to per-user notifications can still reflect live
   *  changes. */
  campusTick: number;

  // ── Auth actions ──────────────────────────────────────────────────────
  setMe: (s: Student, signedInId: string) => void;
  updateMe: (patch: Partial<Student>) => Promise<boolean>;
  signIn: (studentId: string, password: string) => Promise<LoginResult>;
  signOut: () => Promise<void>;
  reset: () => void;
  refreshSession: () => Promise<boolean>;

  // ── Social actions ────────────────────────────────────────────────────
  requestConnection: (id: string) => Promise<void>;
  acceptConnection: (id: string) => Promise<void>;
  toggleBookmark: (id: string) => Promise<void>;

  // ── Project actions ───────────────────────────────────────────────────
  createProject: (
    p: Omit<
      ProjectPost,
      "id" | "createdAt" | "members" | "status" | "ownerId"
    > & { ownerId?: string },
  ) => ProjectPost;
  joinProject: (projectId: string, studentId: string) => void;

  // ── Notifications ─────────────────────────────────────────────────────
  loadNotifications: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // ── Messaging ─────────────────────────────────────────────────────────
  loadThreads: () => Promise<void>;
  loadMessagesWithPeer: (peerId: string) => Promise<void>;
  sendMessage: (toId: string, body: string) => Promise<boolean>;

  // ── Realtime fan-out (called by useRealtime hook) ─────────────────────
  pushIncomingNotification: (n: AppNotification) => void;
  pushIncomingMessage: (
    msg: AppMessage & { peerId: number },
  ) => void;
  applyConnectionUpdate: (
    peerId: number,
    status: "pending" | "connected",
  ) => void;
  setRealtimeConnected: (on: boolean) => void;
  /** Called by the realtime hook on campus-wide events. */
  bumpCampusTick: () => void;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      // session
      me: null,
      signedInId: null,
      hasOnboarded: false,
      sessionChecked: false,
      // social
      connections: {},
      bookmarks: [],
      // projects
      projects: mockProjects,
      // realtime
      notifications: [],
      unreadCount: 0,
      threadSummaries: [],
      threadMessages: {},
      realtimeConnected: false,
      campusTick: 0,

      setMe: (s, signedInId) =>
        set({ me: s, signedInId, hasOnboarded: true }),

      refreshSession: async () => {
        try {
          const res = await fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store",
          });
          const data = await readJsonBody(res);
          if (!res.ok || data.ok !== true) {
            set({
              me: null,
              signedInId: null,
              hasOnboarded: false,
              connections: {},
              bookmarks: [],
              notifications: [],
              unreadCount: 0,
              threadSummaries: [],
              threadMessages: {},
              sessionChecked: true,
            });
            return false;
          }
          set({
            me: data.student as Student,
            signedInId: String(data.signedStudentId ?? ""),
            hasOnboarded: true,
            connections:
              (data.connections as Record<string, ConnectionStatus>) ?? {},
            bookmarks: (data.bookmarks as string[]) ?? [],
            sessionChecked: true,
          });
          return true;
        } catch {
          set((s) => ({ ...s, sessionChecked: true }));
          return false;
        }
      },

      updateMe: async (patch) => {
        const me = get().me;
        if (!me) return false;
        const optimistic = { ...me, ...patch };
        set({ me: optimistic });
        try {
          const res = await fetch("/api/me/profile", {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const data = await readJsonBody(res);
          if (!res.ok || data.ok !== true) throw new Error("save failed");
          set({ me: data.student as Student });
          return true;
        } catch {
          set({ me });
          return false;
        }
      },

      signIn: async (studentIdRaw, password) => {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentId: studentIdRaw,
              password,
            }),
          });
          const data = await readJsonBody(res);

          if (data.ok === true) {
            set({
              me: data.student as Student,
              signedInId: String(data.signedStudentId ?? ""),
              hasOnboarded: true,
              connections:
                (data.connections as Record<string, ConnectionStatus>) ?? {},
              bookmarks: (data.bookmarks as string[]) ?? [],
              sessionChecked: true,
            });
            return {
              ok: true,
              name: String(data.name ?? (data.student as Student)?.name ?? ""),
            };
          }

          const codeRaw = String(data.code ?? "");
          const failCode =
            codeRaw === "wrong-password"
              ? "wrong-password"
              : codeRaw === "locked"
                ? "locked"
                : ("wrong-credentials" as const);

          return {
            ok: false,
            code: failCode,
            message: String(
              data.message ??
                "We couldn't find an account with that ID and password.",
            ),
            lockedUntil:
              typeof data.lockedUntil === "number"
                ? data.lockedUntil
                : undefined,
            remainingAttempts:
              typeof data.remainingAttempts === "number"
                ? data.remainingAttempts
                : undefined,
          };
        } catch {
          return {
            ok: false,
            code: "server",
            message: "Network error — try again.",
          };
        }
      },

      signOut: async () => {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "include",
          });
        } catch {
          /* ignore */
        }
        set({
          me: null,
          signedInId: null,
          hasOnboarded: false,
          connections: {},
          bookmarks: [],
          notifications: [],
          unreadCount: 0,
          threadSummaries: [],
          threadMessages: {},
          sessionChecked: true,
        });
      },

      reset: () => {
        set({
          me: null,
          signedInId: null,
          hasOnboarded: false,
          connections: {},
          bookmarks: [],
          projects: mockProjects,
          notifications: [],
          unreadCount: 0,
          threadSummaries: [],
          threadMessages: {},
          sessionChecked: true,
        });
      },

      requestConnection: async (id) => {
        const numeric = /^[0-9]+$/.test(id);
        if (!numeric) {
          set((state) => ({
            connections: { ...state.connections, [id]: "pending" },
          }));
          return;
        }
        try {
          const res = await fetch("/api/connections", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peerUserId: id, action: "request" }),
          });
          const data = await readJsonBody(res);
          if (res.ok && data.ok === true) {
            set({
              connections:
                (data.connections as Record<string, ConnectionStatus>) ?? {
                  ...get().connections,
                  [id]: "pending",
                },
            });
            return;
          }
        } catch {
          //
        }
        set((state) => ({
          connections: { ...state.connections, [id]: "pending" },
        }));
      },

      acceptConnection: async (id) => {
        if (!/^[0-9]+$/.test(id)) {
          set((state) => ({
            connections: { ...state.connections, [id]: "connected" },
          }));
          return;
        }
        try {
          const res = await fetch("/api/connections", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              peerUserId: id,
              action: "complete-outgoing-demo",
            }),
          });
          const data = await readJsonBody(res);
          if (res.ok && data.ok === true) {
            set({
              connections:
                (data.connections as Record<string, ConnectionStatus>) ?? {
                  ...get().connections,
                  [id]: "connected",
                },
            });
            return;
          }
        } catch {
          //
        }
        set((state) => ({
          connections: { ...state.connections, [id]: "connected" },
        }));
      },

      toggleBookmark: async (id) => {
        const on = !get().bookmarks.includes(id);
        const prev = [...get().bookmarks];
        set((state) => ({
          bookmarks: on
            ? [...state.bookmarks, id]
            : state.bookmarks.filter((x) => x !== id),
        }));
        if (!/^[0-9]+$/.test(id)) return;
        try {
          const res = await fetch("/api/bookmarks", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId: id, on }),
          });
          const data = await readJsonBody(res);
          if (res.ok && data.ok === true) {
            set({ bookmarks: (data.bookmarks as string[]) ?? get().bookmarks });
            return;
          }
          throw new Error("bookmark failed");
        } catch {
          set({ bookmarks: prev });
        }
      },

      createProject: (p) => {
        const id = `proj_${Math.random().toString(36).slice(2, 8)}`;
        const me = get().me;
        const ownerId = p.ownerId ?? me?.id ?? "me";
        const post: ProjectPost = {
          id,
          title: p.title,
          description: p.description,
          skillsWanted: p.skillsWanted,
          rolesNeeded: p.rolesNeeded,
          teamSize: p.teamSize,
          tags: p.tags ?? [],
          ownerId,
          members: [ownerId],
          status: "open",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ projects: [post, ...state.projects] }));
        return post;
      },

      joinProject: (projectId, studentId) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId && !p.members.includes(studentId)
              ? { ...p, members: [...p.members, studentId] }
              : p,
          ),
        })),

      // ── Notifications ────────────────────────────────────────────────
      loadNotifications: async () => {
        try {
          const res = await fetch("/api/notifications", {
            credentials: "include",
            cache: "no-store",
          });
          const data = await readJsonBody(res);
          if (res.ok && data.ok === true) {
            set({
              notifications:
                (data.notifications as AppNotification[]) ?? [],
              unreadCount: Number(data.unread ?? 0),
            });
          }
        } catch {
          //
        }
      },

      markAllNotificationsRead: async () => {
        const prev = get().notifications;
        // Optimistic — flip every readAt to "now".
        const nowIso = new Date().toISOString();
        set({
          notifications: prev.map((n) =>
            n.readAt ? n : { ...n, readAt: nowIso },
          ),
          unreadCount: 0,
        });
        try {
          await fetch("/api/notifications", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
        } catch {
          //
        }
      },

      // ── Messaging ────────────────────────────────────────────────────
      loadThreads: async () => {
        try {
          const res = await fetch("/api/messages/threads", {
            credentials: "include",
            cache: "no-store",
          });
          const data = await readJsonBody(res);
          if (res.ok && data.ok === true) {
            set({ threadSummaries: (data.threads as ThreadSummary[]) ?? [] });
          }
        } catch {
          //
        }
      },

      loadMessagesWithPeer: async (peerId) => {
        if (!/^[0-9]+$/.test(peerId)) return;
        try {
          const res = await fetch(
            `/api/messages?peer=${encodeURIComponent(peerId)}`,
            { credentials: "include", cache: "no-store" },
          );
          const data = await readJsonBody(res);
          if (res.ok && data.ok === true) {
            set((state) => ({
              threadMessages: {
                ...state.threadMessages,
                [peerId]: (data.messages as AppMessage[]) ?? [],
              },
            }));
          }
        } catch {
          //
        }
      },

      sendMessage: async (toId, body) => {
        const me = get().me;
        if (!me) return false;
        const trimmed = body.trim();
        if (!trimmed) return false;
        if (!/^[0-9]+$/.test(toId)) return false;

        const tempId = -Date.now();
        const optimistic: AppMessage = {
          id: tempId,
          threadId: 0,
          senderId: Number(me.id),
          body: trimmed,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [toId]: [...(state.threadMessages[toId] ?? []), optimistic],
          },
        }));

        try {
          const res = await fetch("/api/messages", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ peerUserId: toId, body: trimmed }),
          });
          const data = await readJsonBody(res);
          if (!res.ok || data.ok !== true) throw new Error("send failed");
          const real = data.message as AppMessage;
          set((state) => {
            const list = state.threadMessages[toId] ?? [];
            return {
              threadMessages: {
                ...state.threadMessages,
                [toId]: list.map((m) => (m.id === tempId ? real : m)),
              },
              threadSummaries: bumpThreadSummary(
                state.threadSummaries,
                Number(toId),
                real,
              ),
            };
          });
          return true;
        } catch {
          // Roll back the optimistic message on failure.
          set((state) => ({
            threadMessages: {
              ...state.threadMessages,
              [toId]: (state.threadMessages[toId] ?? []).filter(
                (m) => m.id !== tempId,
              ),
            },
          }));
          return false;
        }
      },

      // ── Realtime fan-out ─────────────────────────────────────────────
      pushIncomingNotification: (n) =>
        set((state) => ({
          notifications: [n, ...state.notifications].slice(0, 60),
          unreadCount: state.unreadCount + (n.readAt ? 0 : 1),
        })),

      pushIncomingMessage: (msg) =>
        set((state) => {
          const peerKey = String(msg.peerId);
          const existing = state.threadMessages[peerKey] ?? [];
          // Idempotent: skip if id already present (e.g. our own echo).
          if (existing.some((m) => m.id === msg.id)) return state;
          const nextMessages = [...existing, msg];
          return {
            threadMessages: {
              ...state.threadMessages,
              [peerKey]: nextMessages,
            },
            threadSummaries: bumpThreadSummary(
              state.threadSummaries,
              msg.peerId,
              msg,
            ),
          };
        }),

      applyConnectionUpdate: (peerId, status) =>
        set((state) => ({
          connections: {
            ...state.connections,
            [String(peerId)]: status,
          },
        })),

      setRealtimeConnected: (on) => set({ realtimeConnected: on }),

      bumpCampusTick: () =>
        set((state) => ({ campusTick: state.campusTick + 1 })),
    }),
    {
      name: "aiub-live-store-v3-realtime",
      partialize: (s) => ({
        // Only the local-only `projects` survives reloads. Auth, social,
        // notifications and messaging are all server-canonical now.
        projects: s.projects,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

function bumpThreadSummary(
  list: ThreadSummary[],
  peerId: number,
  msg: AppMessage,
): ThreadSummary[] {
  const idx = list.findIndex((t) => t.peerId === peerId);
  const updated: ThreadSummary = {
    threadId: msg.threadId || (idx >= 0 ? list[idx].threadId : 0),
    peerId,
    lastMessageAt: msg.createdAt,
    lastMessage: { id: msg.id, senderId: msg.senderId, body: msg.body },
  };
  if (idx >= 0) {
    const next = list.slice();
    next.splice(idx, 1);
    return [updated, ...next];
  }
  return [updated, ...list];
}
