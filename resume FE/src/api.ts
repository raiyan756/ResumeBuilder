import type {
  AiAction,
  AiSuggestion,
  Draft,
  Health,
  ResumeDocument,
  ResumeSummary,
  SavedResume,
} from "./types";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 75000);
  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      signal: controller.signal,
      headers:
        init.body instanceof FormData
          ? init.headers
          : { "Content-Type": "application/json", ...init.headers },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      const validation = error?.errors
        ? Object.values(error.errors).flat().join(" ")
        : "";
      throw new Error(
        validation ||
          error?.detail ||
          error?.title ||
          `Request failed (${response.status}). Please try again.`,
      );
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error("The request took too long. Please try again.");
    if (error instanceof TypeError)
      throw new Error(
        "Cannot reach the server. Check that Docker Compose is running.",
      );
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  health: () => request<Health>("/health"),
  list: () => request<ResumeSummary[]>("/resumes"),
  get: (id: string) => request<SavedResume>(`/resumes/${id}`),
  save: (draft: Draft, id?: string) =>
    request<SavedResume>(id ? `/resumes/${id}` : "/resumes", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(draft),
    }),
  delete: (id: string) => request<void>(`/resumes/${id}`, { method: "DELETE" }),
  improve: (draft: Draft, action: AiAction, experienceIndex?: number) =>
    request<AiSuggestion>("/ai/improve", {
      method: "POST",
      body: JSON.stringify({ ...draft, action, experienceIndex }),
    }),
  import: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request<{ document: ResumeDocument; notice: string }>(
      "/imports/pdf",
      { method: "POST", body },
    );
  },
};
