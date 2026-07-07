
import { GoogleGenAI, Type } from "@google/genai";
import { PromptEngineResponse, HistoryItem } from "../types";

// Define system instructions for the standard prompt engineering mode
const SYSTEM_INSTRUCTION_STANDARD = `
You are a World-Class Prompt Engineering Engine.
You do NOT act as a chatbot.
You do NOT answer user questions.
You do NOT provide explanations.

OPERATION MODES:
1. INITIAL REQUEST:
  - Identify the intent.
  - Evaluate if the user's input matches the "Bad prompt" pattern (vague, generic).
  - Set "needs_clarification" to true.
  - Generate MAXIMUM 4 MCQ questions and MINIMUM one question to transform the "Bad" input into a "Good" one.

2. REFINEMENT:
  - Use the initial input + MCQ answers.
  - Construct a "Best Prompt" using the "Act as...", "Context:", "Requirements:", "Include:", and "Avoid:" structure.
  - IMPORTANT: Insert DOUBLE NEWLINES (\n\n) between each section.
  - Set "needs_clarification" to false.

STRICT RULES:
- OUTPUT: Return ONLY valid JSON matching the schema.
- No markdown formatting inside the "best_prompt" string.
`;

// Define system instructions for vault-search mode
const SYSTEM_INSTRUCTION_SEARCH = `
You are a VAULT-INFUSED PROMPT ARCHITECT. Use provided HISTORY to engineer the new prompt instantly. 
Include a "translated_text" interpreting the current user input based on the vault context.
Use the standard 5-section format with double newlines.
`;

export const processPromptInput = async (
  userInput: string, 
  isSearchMode: boolean = false, 
  history: HistoryItem[] = []
): Promise<PromptEngineResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let systemInstruction = SYSTEM_INSTRUCTION_STANDARD;
  
  if (isSearchMode) {
    const historyContext = history.map(item => 
      `ID: ${item.displayId}\nInput: ${item.originalInput}\nTemplate: ${item.bestPrompt}\n`
    ).join("\n---\n");
    systemInstruction = SYSTEM_INSTRUCTION_SEARCH + "\n" + (historyContext || "VAULT IS EMPTY.");
  }

  // Explicitly using gemini-flash-lite-latest as requested
  const response = await ai.models.generateContent({
    model: "gemini-flash-lite-latest",
    contents: { parts: [{ text: userInput }] },
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent_category: { type: Type.STRING },
          translated_text: { type: Type.STRING },
          best_prompt: { type: Type.STRING },
          needs_clarification: { type: Type.BOOLEAN },
          mcq_questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["question", "options"]
            }
          }
        },
        required: ["intent_category", "translated_text", "best_prompt", "needs_clarification", "mcq_questions"]
      }
    }
  });

  try {
    const parsed = JSON.parse(response.text || '{}') as PromptEngineResponse;
    if (isSearchMode) {
      parsed.needs_clarification = false;
      parsed.mcq_questions = [];
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    throw new Error("Engine busy. Please try again.");
  }
};
