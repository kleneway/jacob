import { table, text, timestamp, uuid } from "orchid-orm";

export const chatSessions = table("chat_sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  sessionStart: timestamp().notNull().defaultNow(),
  sessionEnd: timestamp(),
  summary: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
