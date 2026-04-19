import path from "path";

/** Repo root (parent of /web) when the app runs from ./web */
export function getProjectRoot(): string {
  return process.env.FINANCE_PROJECT_ROOT ?? path.join(process.cwd(), "..");
}
