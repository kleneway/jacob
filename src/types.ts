import { ResearchAgentActionType } from "./server/agent/research";

export interface Research {
  type: ResearchAgentActionType;
  question: string;
  answer: string;
  issueId: string;
}

// Add other types and interfaces as needed