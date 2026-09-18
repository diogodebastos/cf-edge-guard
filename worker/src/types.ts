export interface Env {
  AI: Ai;
  EVENTS: KVNamespace;
  POSTURE: string;
  TURNSTILE_SECRET: string;
  AI_MODEL: string;
}

export type PostureRule = {
  phase: string;
  scope: string;
  expression: string;
  action: string;
  description: string;
};

export type Posture = {
  zone: string;
  hostname: string;
  plan: string;
  ai_model: string;
  ddos_note: string;
  turnstile: { mode: string; sitekey: string };
  bot_fight_mode: { enabled: boolean; scope: string; description: string };
  zone_settings: { setting: string; value: string; scope: string }[];
  rules: PostureRule[];
};
