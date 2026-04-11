export interface Message {
  role: 'user' | 'model';
  text: string;
  displayText?: string;
}

export interface Artifacts {
  prompt: string;
  code: string;
  report: string;
  requirements: string;
  skill: string;
}
