import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("users", (t) => ({
    add: {
      jiraToken: t.text().nullable(),
    },
  }));
});
