import { change } from "../dbScript";

change(async (db) => {
  await db.changeTable("issues", (t) => ({
    labels: t.json().nullable(),
  }));
});
