import { ResearchAgentActionType } from "./server/db/enums";

export interface Research {
  type: ResearchAgentActionType;
  question: string;
  answer: string;
  issueId: string;
}

// Add other types and interfaces as needed
