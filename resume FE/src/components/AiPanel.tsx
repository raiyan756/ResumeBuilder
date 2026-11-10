import { useState } from "react";
import { api } from "../api";
import type {
  AiAction,
  AiSuggestion,
  Draft,
  Health,
  ResumeDocument,
} from "../types";
import Icon from "./Icon";

type Result = {
  data: AiSuggestion;
  action: AiAction;
  index: number;
  baseline: string;
};
export default function AiPanel({
  draft,
  health,
  onChange,
  onBusy,
  notify,
  disabled,
}: {
  draft: Draft;
  health: Health | null;
  onChange: (d: ResumeDocument) => void;
  onBusy: (busy: boolean) => void;
  notify: (text: string, error?: boolean) => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<AiAction>("review");
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const baseline = JSON.stringify({
    document: draft.document,
    targetRole: draft.targetRole,
  });
  const stale = !!result && result.baseline !== baseline;
  async function generate() {
    setBusy(true);
    onBusy(true);
    setResult(null);
    setSelectedSkills([]);
    try {
      const data = await api.improve(draft, action, index);
      setResult({ data, action, index, baseline });
    } catch (error) {
      notify((error as Error).message, true);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  function apply() {
    if (!result || stale) return;
    const d = draft.document;
    if (result.action === "summary")
      onChange({ ...d, summary: result.data.suggestedText });
    if (result.action === "experience")
      onChange({
        ...d,
        experience: d.experience.map((item, i) =>
          i === result.index
            ? { ...item, description: result.data.suggestedText }
            : item,
        ),
      });
    if (result.action === "skills") {
      const additions = selectedSkills.filter(
        (x) => !d.skills.some((s) => s.toLowerCase() === x.toLowerCase()),
      );
      if (d.skills.length + additions.length > 80) {
        notify(
          "You can add up to 80 skills. Remove a few before adding more.",
          true,
        );
        return;
      }
      onChange({ ...d, skills: [...d.skills, ...additions] });
    }
    setResult(null);
    notify("Suggestion applied. Save your resume to keep the change.");
  }
  return (
    <section className="ai-panel" aria-label="AI assistant">
      <div className="ai-heading">
        <span className="ai-icon">
          <Icon name="spark" />
        </span>
        <div>
          <h3>A little help from AI</h3>
          <p>Your experience. Better expressed.</p>
        </div>
      </div>
      <div className={`mode-notice ${health?.aiMode === "demo" ? "demo" : ""}`}>
        {health?.aiMode === "demo"
          ? "Demo mode · suggestions are simulated"
          : health?.aiMode === "gemini"
            ? "Powered by Gemini · review every suggestion"
            : "Checking AI availability…"}
      </div>
      <label className="field">
        <span>What would you like to improve?</span>
        <select
          value={action}
          disabled={busy || disabled}
          onChange={(e) => {
            setAction(e.target.value as AiAction);
            setResult(null);
          }}
        >
          <option value="review">Review my resume</option>
          <option value="summary">Write a professional summary</option>
          <option value="experience">Improve work experience</option>
          <option value="skills">Suggest relevant skills</option>
        </select>
      </label>
      {action === "experience" && (
        <label className="field">
          <span>Experience to improve</span>
          <select
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            disabled={busy || disabled}
          >
            {draft.document.experience.length === 0 && (
              <option>Add an experience entry first</option>
            )}
            {draft.document.experience.map((e, i) => (
              <option value={i} key={i}>
                {e.jobTitle || `Experience ${i + 1}`}
                {e.company ? ` · ${e.company}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <button
        type="button"
        className="button ai-button"
        onClick={generate}
        disabled={
          busy ||
          disabled ||
          !health ||
          !draft.targetRole.trim() ||
          (action === "experience" && !draft.document.experience[index])
        }
      >
        <Icon name="spark" size={17} />
        {busy ? "Thinking about your resume…" : "Get suggestions"}
      </button>
      {busy && (
        <p className="hint" role="status">
          This can take up to a minute. Your draft stays here.
        </p>
      )}
      {result && (
        <div className="ai-result" aria-live="polite">
          <div className="result-heading">
            <strong>
              {result.data.isSimulated
                ? "Simulated suggestions"
                : "Your suggestions"}
            </strong>
            <button
              className="icon-button"
              aria-label="Dismiss suggestions"
              onClick={() => setResult(null)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          {stale && (
            <p className="stale-notice">
              Your resume changed. Generate fresh suggestions before applying.
            </p>
          )}
          {result.data.suggestedText && (
            <>
              <span className="result-label">SUGGESTED WORDING</span>
              <p className="suggested-text">{result.data.suggestedText}</p>
            </>
          )}
          {result.data.suggestions.length > 0 && (
            <ul>
              {result.data.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {result.data.missingInformation.length > 0 && (
            <>
              <strong className="result-label">
                INFORMATION TO STRENGTHEN
              </strong>
              <ul>
                {result.data.missingInformation.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {result.action === "skills" &&
            result.data.recommendedSkills.length > 0 && (
              <>
                <p className="hint">Select only skills you actually have.</p>
                <div className="skill-options">
                  {[...new Set(result.data.recommendedSkills)].map((skill) => (
                    <label key={skill} className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(skill)}
                        disabled={stale}
                        onChange={(e) =>
                          setSelectedSkills(
                            e.target.checked
                              ? [...selectedSkills, skill]
                              : selectedSkills.filter((s) => s !== skill),
                          )
                        }
                      />
                      {skill}
                    </label>
                  ))}
                </div>
              </>
            )}
          {((result.data.suggestedText &&
            ["summary", "experience"].includes(result.action)) ||
            (result.action === "skills" &&
              result.data.recommendedSkills.length > 0)) && (
            <button
              type="button"
              className="button primary"
              onClick={apply}
              disabled={
                stale ||
                (result.action === "skills" && selectedSkills.length === 0)
              }
            >
              <Icon name="check" size={16} />
              {result.action === "skills"
                ? "Add selected skills"
                : "Apply suggestion"}
            </button>
          )}
        </div>
      )}
      <p className="ai-footnote">
        You stay in control. Suggestions are never applied automatically. Real
        AI sends resume content to Google; contact details are excluded from
        improvement requests.
      </p>
    </section>
  );
}
