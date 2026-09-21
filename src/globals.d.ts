declare const GEMINI_API_KEY: string;
declare const process: { env: Record<string, string | undefined> };

interface Window {
  aistudio?: {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  };
}