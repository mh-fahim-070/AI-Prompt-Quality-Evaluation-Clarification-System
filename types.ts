
export interface MCQQuestion {
  question: string;
  options: string[];
}

export interface PromptEngineResponse {
  intent_category: string;
  translated_text: string;
  best_prompt: string;
  needs_clarification: boolean;
  mcq_questions: MCQQuestion[];
}

export interface HistoryItem {
  id: string; // Internal unique ID
  displayId: string; // Visible ID like ARC-101
  originalInput: string; // The "Bad" prompt
  bestPrompt: string; // The "Good" prompt
  category: string;
  timestamp: number;
  processingTime: number; // Latency in seconds
}
