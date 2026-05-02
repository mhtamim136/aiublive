"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ConnectionStatus, ProjectPost, Student } from "./types";
import { mockProjects } from "./mock-data";

type Message = {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  at: string;
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
    return typeof j === "object" && j !== null ? (j as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

type State = {
  me: Student | null;
  signedInId: string | null;
  hasOnboarded: boolean;
  connections: Record<string, ConnectionStatus>;
  bookmarks: string[];
  projects: ProjectPost[];
  threads: Record<string, Message[]>;
  readNotifications: string[];
  sessionChecked: boolean;
  setMe: (s: Student, signedInId: string) => void;
  updateMe: (patch: Partial<Student>) => Promise<boolean>;
  signIn: (studentId: string, password: string) => Promise<LoginResult>;
  signOut: () => Promise<void>;
  reset: () => void;
  refreshSession: () => Promise<boolean>;
  requestConnection: (id: string) => Promise<void>;
  acceptConnection: (id: string) => Promise<void>;
  toggleBookmark: (id: string) => Promise<void>;
  createProject: (
    p: Omit<ProjectPost, "id" | "createdAt" | "members" | "status" | "ownerId"> & {
      ownerId?: string;
    },
  ) => ProjectPost;
  joinProject: (projectId: string, studentId: string) => void;
  sendMessage: (toId: string, text: string) => void;
  markNotificationsRead: (ids: string[]) => void;
  markAllNotificationsRead: (ids: string[]) => void;
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      me: null,
      signedInId: null,
      hasOnboarded: false,
      connections: {},
      bookmarks: [],
      projects: mockProjects,
      threads: {},
      readNotifications: [],
      sessionChecked: false,

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
              sessionChecked: true,
            });
            return false;
          }
          set({
            me: data.student as Student,
            signedInId: String(data.signedStudentId ?? ""),
            hasOnboarded: true,
            connections: (data.connections as Record<
              string,
              ConnectionStatus
            >) ?? {},
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
          set({ me }); // rollback visuals
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
              connections: (data.connections as Record<
                string,
                ConnectionStatus
              >) ?? {},
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
              typeof data.lockedUntil === "number" ?
                data.lockedUntil
              : undefined,
            remainingAttempts:
              typeof data.remainingAttempts === "number" ?
                data.remainingAttempts
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
          threads: {},
          readNotifications: [],
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
              connections: (data.connections as Record<
                string,
                ConnectionStatus
              >) ?? { ...get().connections, [id]: "pending" },
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
              connections: (data.connections as Record<
                string,
                ConnectionStatus
              >) ?? { ...get().connections, [id]: "connected" },
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
          bookmarks: on ?
              [...state.bookmarks, id]
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
            p.id === projectId && !p.members.includes(studentId) ?
              { ...p, members: [...p.members, studentId] }
            : p,
          ),
        })),

      sendMessage: (toId, text) =>
        set((state) => {
          const me = state.me;
          if (!me) return {};
          const msg: Message = {
            id: Math.random().toString(36).slice(2),
            fromId: me.id,
            toId,
            text,
            at: new Date().toISOString(),
          };
          const existing = state.threads[toId] ?? [];
          return {
            threads: { ...state.threads, [toId]: [...existing, msg] },
          };
        }),

      markNotificationsRead: (ids) =>
        set((state) => ({
          readNotifications: Array.from(
            new Set([...state.readNotifications, ...ids]),
          ),
        })),
      markAllNotificationsRead: (ids) =>
        set(() => ({ readNotifications: [...ids] })),
    }),
    {
      name: "aiub-live-store-v2-api",
      partialize: (s) => ({
        projects: s.projects,
        threads: s.threads,
        readNotifications: s.readNotifications,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
