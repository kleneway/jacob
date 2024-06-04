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
    description: t.text(),
    name: t.text(),
    status: t.enum(TodoStatus, { required: true }),
    issueId: t.bigint().nullable(),
    stepsToAddressIssue: t.text().nullable(),
    issueQualityScore: t.decimal().nullable(),
    commitTitle: t.text().nullable(),
    filesToCreate: t.array(t.text()).nullable(),
    filesToUpdate: t.array(t.text()).nullable(),
    ...t.timestamps(),
  }));
}
