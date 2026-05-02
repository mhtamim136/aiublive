"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ConnectionStatus,
  ProjectPost,
  Student,
} from "./types";
import { mockProjects } from "./mock-data";
import {
  attemptLogin,
  findAccount,
  hasAnyAccount,
  type LoginResult,
  updateAccountProfile,
} from "./accounts";

type Message = {
  id: string;
  fromId: string; // "me" or student id
  toId: string;
  text: string;
  at: string; // ISO
};

type State = {
  me: Student | null;
  signedInId: string | null; // canonical AIUB student ID of the active session
  hasOnboarded: boolean;
  connections: Record<string, ConnectionStatus>; // by student id
  bookmarks: string[]; // student ids
  projects: ProjectPost[]; // includes user-created
  threads: Record<string, Message[]>; // by student id
  readNotifications: string[]; // notification ids that are read
  setMe: (s: Student, signedInId: string) => void;
  updateMe: (patch: Partial<Student>) => void;
  signIn: (studentId: string, password: string) => Promise<LoginResult>;
  signOut: () => void;
  /** Wipe everything including stored accounts. */
  reset: () => void;
  requestConnection: (id: string) => void;
  acceptConnection: (id: string) => void;
  toggleBookmark: (id: string) => void;
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
      setMe: (s, signedInId) =>
        set({ me: s, signedInId, hasOnboarded: true }),
      updateMe: (patch) =>
        set((state) => {
          if (!state.me) return state;
          const next = { ...state.me, ...patch };
          // Mirror profile changes back to the persisted account snapshot
          // so they survive a sign-out + sign-in cycle.
          updateAccountProfile(next);
          return { me: next };
        }),
      signIn: async (studentId, password) => {
        const result = await attemptLogin(studentId, password);
        if (result.ok) {
          set({
            me: result.account.profile,
            signedInId: result.account.studentId,
            hasOnboarded: true,
          });
        }
        return result;
      },
      signOut: () =>
        set({
          me: null,
          signedInId: null,
          // Keep bookmarks, projects, etc. tied to localStorage; they'll
          // be visible to whoever signs in next on this device. For a
          // single-user device this is the right behavior.
        }),
      reset: () => {
        // Clears the live state. Account credentials are wiped separately.
        set({
          me: null,
          signedInId: null,
          hasOnboarded: false,
          connections: {},
          bookmarks: [],
          projects: mockProjects,
          threads: {},
          readNotifications: [],
        });
      },
      requestConnection: (id) =>
        set((state) => ({
          connections: { ...state.connections, [id]: "pending" },
        })),
      acceptConnection: (id) =>
        set((state) => ({
          connections: { ...state.connections, [id]: "connected" },
        })),
      toggleBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(id)
            ? state.bookmarks.filter((x) => x !== id)
            : [...state.bookmarks, id],
        })),
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
      name: "aiub-live-store-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Re-export account helpers so consumers don't need a second import
export { findAccount, hasAnyAccount };
