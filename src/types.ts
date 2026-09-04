export interface Message {
  role: 'user' | 'model';
  text: string;
  displayText?: string;
}

export interface ChatContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface Artifacts {
  prompt: string;
  code: string;
  report: string;
  requirements: string;
  skill: string;
}
