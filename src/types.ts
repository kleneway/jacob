import { ResearchAgentActionType } from "~/server/db/enums";

export interface Research {
  type: ResearchAgentActionType;
  question: string;
  answer: string;
  issueId: string;
}

export type SidebarIcon = string;

export type Role = string;

export enum SpecialPhrases {
  // Define enum values here
}

export enum Mode {
  // Define enum values here
}

export { ResearchAgentActionType };