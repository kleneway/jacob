import type { Selectable, Insertable, Updateable, Queryable } from "orchid-orm";
import { BaseTable } from "../baseTable";

export enum TodoStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  ERROR = "ERROR",
}

export type Todo = Selectable<TodosTable>;
export type NewTodo = Insertable<TodosTable>;
export type TodoUpdate = Updateable<TodosTable>;
export type TodoQueryable = Queryable<TodosTable>;

export class TodosTable extends BaseTable {
  readonly table = "todos";
  columns = this.setColumns((t) => ({
    id: t.varchar(255).primaryKey(),
    description: t.text(0, Infinity),
    name: t.text(0, Infinity),
    status: t.enum("status", Object.values(TodoStatus)),
    issueId: t.bigint().nullable(),
    stepsToAddressIssue: t.text(0, Infinity).nullable(),
    issueQualityScore: t.numeric().nullable(),
    commitTitle: t.text(0, Infinity).nullable(),
    filesToCreate: t.array(t.text(0, Infinity)).nullable(),
    filesToUpdate: t.array(t.text(0, Infinity)).nullable(),
    ...t.timestamps(),
  }));
}
