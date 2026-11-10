import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import {
  emptyDraft,
  type Draft,
  type Health,
  type ResumeDocument,
  type ResumeSummary,
} from "./types";
import { sampleDraft } from "./sample";
import Icon from "./components/Icon";
import Editor, { sections, type Section } from "./components/Editor";
import ResumePreview from "./components/ResumePreview";
import AiPanel from "./components/AiPanel";

export default function App() {
  const [view, setView] = useState<"dashboard" | "editor">("dashboard");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [id, setId] = useState<string>();
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [resumes, setResumes] = useState<ResumeSummary[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [section, setSection] = useState<Section>("contact");
  const [tab, setTab] = useState<"editor" | "preview">("editor");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(
    null,
  );
  const [printHint, setPrintHint] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dirty = view === "editor" && JSON.stringify(draft) !== savedSnapshot;
  const locked = busy || aiBusy;
  const notify = useCallback(
    (text: string, error = false) => setNotice({ text, error }),
    [],
  );

  useEffect(() => {
    let active = true;
    Promise.all([api.health(), api.list()])
      .then(([h, r]) => {
        if (active) {
          setHealth(h);
          setResumes(r);
        }
      })
      .catch((error: Error) => {
        if (active) notify(error.message, true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [notify]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    document.title =
      view === "editor"
        ? `${draft.title || "Resume"} · PM Circle`
        : "Resume Studio · PM Circle";
  }, [view, draft.title]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);

  function start(next: Draft = emptyDraft()) {
    setDraft(structuredClone(next));
    setId(undefined);
    setSavedSnapshot("");
    setSection("contact");
    setTab("editor");
    setView("editor");
    setNotice(null);
  }
  async function refresh() {
    setLoading(true);
    try {
      const [h, r] = await Promise.all([api.health(), api.list()]);
      setHealth(h);
      setResumes(r);
      setNotice(null);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }
  async function openResume(resumeId: string) {
    setBusy(true);
    try {
      const r = await api.get(resumeId);
      const next = {
        title: r.title,
        targetRole: r.targetRole,
        document: r.document,
      };
      setDraft(next);
      setId(r.id);
      setSavedSnapshot(JSON.stringify(next));
      setSection("contact");
      setTab("editor");
      setView("editor");
      setNotice(null);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!draft.title.trim() || !draft.targetRole.trim()) {
      notify("Add a resume title and target role before saving.", true);
      return;
    }
    setBusy(true);
    try {
      const r = await api.save(draft, id);
      const next = {
        title: r.title,
        targetRole: r.targetRole,
        document: r.document,
      };
      setId(r.id);
      setDraft(next);
      setSavedSnapshot(JSON.stringify(next));
      notify("Resume saved. You can return to it any time.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function goHome() {
    if (
      dirty &&
      !window.confirm("You have unsaved changes. Leave without saving?")
    )
      return;
    setView("dashboard");
    setPrintHint(false);
    setNotice(null);
    await refresh();
  }
  async function deleteResume(resume: ResumeSummary) {
    if (!window.confirm(`Delete “${resume.title}”? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await api.delete(resume.id);
      setResumes((items) => items.filter((r) => r.id !== resume.id));
      notify("Resume deleted.");
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  async function importPdf(file?: File) {
    if (!file) return;
    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      file.size > 5 * 1024 * 1024 ||
      file.size === 0
    ) {
      notify("Choose a PDF file up to 5 MiB.", true);
      return;
    }
    setBusy(true);
    try {
      const result = await api.import(file);
      start({
        title: file.name.replace(/\.pdf$/i, "").slice(0, 150),
        targetRole: "Project Manager",
        document: result.document,
      });
      notify(result.notice);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }
  function changeDocument(document: ResumeDocument) {
    setDraft((current) => ({ ...current, document }));
  }
  const completed = sections.filter((s) =>
    s.key === "contact"
      ? !!draft.document.contact.fullName.trim()
      : s.key === "summary"
        ? !!draft.document.summary.trim()
        : draft.document[s.key].length > 0,
  ).length;

  return (
    <>
      <header className="app-header">
        <button
          className="brand"
          onClick={() => {
            if (view === "editor" && !locked) void goHome();
          }}
          aria-label="PM Circle home"
        >
          <span className="brand-mark">
            <span />
          </span>
          <span>
            PM Circle<span className="brand-divider">/</span>
            <span className="brand-product">Resume Studio</span>
          </span>
        </button>
        <div className="header-right">
          <span className="workspace-label">
            <span className="status-dot" />
            YOUR CAREER WORKSPACE
          </span>
          <span className="avatar">PM</span>
        </div>
      </header>
      {notice && (
        <div
          className={`notice ${notice.error ? "notice-error" : "notice-success"}`}
          role={notice.error ? "alert" : "status"}
        >
          <span>{notice.text}</span>
          <button
            className="icon-button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss notification"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      {view === "dashboard" ? (
        <main className="dashboard">
          <div className="dashboard-top">
            <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
            <span className={`connection-badge ${health ? "" : "offline"}`}>
              <span className="status-dot" />
              {loading
                ? "Connecting…"
                : health
                  ? "Workspace ready"
                  : "Server unavailable"}
            </span>
          </div>
          <section className="hero">
            <div className="hero-copy">
              <h1>
                Good experience.
                <br />
                <span>A better first impression.</span>
              </h1>
              <p>
                Turn the work you’ve done into a resume that tells your story.
                Build with clarity, refine with AI, and take your next step with
                confidence.
              </p>
              <div className="hero-actions">
                <button
                  className="button primary large"
                  disabled={busy}
                  onClick={() => start()}
                >
                  <Icon name="plus" />
                  Create a resume
                </button>
                <button
                  className="button secondary large"
                  disabled={busy}
                  onClick={() => uploadRef.current?.click()}
                >
                  <Icon name="upload" />
                  {busy ? "Working…" : "Import existing PDF"}
                </button>
              </div>
              <p className="upload-note">
                PDF, up to 5 MiB. Import sends your CV to Google Gemini for
                extraction.
                <br />
                {health?.aiMode === "demo"
                  ? "AI demo mode is active. PDF import needs a Gemini API key."
                  : "You’ll review and correct all extracted information before saving."}
              </p>
              <button
                className="text-button"
                onClick={() => start(sampleDraft)}
                disabled={busy}
              >
                Explore a fictional sample resume{" "}
                <Icon name="arrow" size={16} />
              </button>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-orbit" />
              <div className="mini-resume">
                <div className="mini-label">YOUR EXPERIENCE, REFINED</div>
                <h3>Alex Morgan</h3>
                <p>Project Manager</p>
                <div className="mini-line wide-line" />
                <div className="mini-line" />
                <h4>EXPERIENCE</h4>
                <strong>Turning plans into progress.</strong>
                <div className="mini-line wide-line" />
                <div className="mini-line" />
                <div className="mini-line short-line" />
                <h4>SKILLS</h4>
                <div className="mini-tags">
                  <span>Leadership</span>
                  <span>Agile delivery</span>
                  <span>Planning</span>
                </div>
              </div>
              <div className="art-badge">
                <span>
                  <Icon name="spark" size={20} />
                </span>
                <div>
                  <strong>A stronger story</strong>
                  <small>With a little help from AI</small>
                </div>
              </div>
            </div>
          </section>
          <div className="journey-strip">
            {[
              {
                n: "01",
                title: "Add your experience",
                note: "Start fresh or bring your CV",
              },
              {
                n: "02",
                title: "Make it your own",
                note: "Refine for the role you want",
              },
              {
                n: "03",
                title: "Put your best foot forward",
                note: "Preview and export as PDF",
              },
            ].map((step) => (
              <div key={step.n}>
                <span className="step-number">{step.n}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.note}</p>
                </div>
              </div>
            ))}
          </div>
          <section className="saved-section">
            <div className="saved-heading">
              <div>
                <h2>
                  Your resumes <span>{resumes.length}</span>
                </h2>
                <p>A work in progress today. Your next opportunity tomorrow.</p>
              </div>
              <button
                className="button subtle"
                disabled={loading || busy}
                onClick={refresh}
              >
                Refresh
              </button>
            </div>
            {loading ? (
              <p className="empty-loading" role="status">
                Loading your workspace…
              </p>
            ) : resumes.length === 0 ? (
              <div className="empty-drafts">
                <span className="empty-icon">
                  <Icon name="file" size={29} />
                </span>
                <h3>A fresh page, full of possibilities.</h3>
                <p>
                  Your saved resumes will appear here. Create your first one to
                  get started.
                </p>
                <button
                  className="text-button"
                  onClick={() => start()}
                  disabled={busy}
                >
                  Create your first resume <Icon name="arrow" size={16} />
                </button>
              </div>
            ) : (
              <div className="draft-grid">
                {resumes.map((resume) => (
                  <article className="draft-card" key={resume.id}>
                    <span className="draft-icon">
                      <Icon name="file" />
                    </span>
                    <button
                      className="icon-button danger draft-delete"
                      disabled={busy}
                      aria-label={`Delete ${resume.title}`}
                      onClick={() => deleteResume(resume)}
                    >
                      <Icon name="trash" size={17} />
                    </button>
                    <h3>{resume.title}</h3>
                    <p>{resume.targetRole}</p>
                    <div className="draft-card-footer">
                      <span>
                        Updated{" "}
                        {new Date(resume.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => openResume(resume.id)}
                      >
                        Continue <Icon name="arrow" size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <footer className="dashboard-footer">
            <span>Made for the next step in your career.</span>
            <span>PM Circle · Resume Studio</span>
          </footer>
        </main>
      ) : (
        <main className={`workspace mobile-${tab}`}>
          <div className="editor-toolbar">
            <div className="toolbar-title">
              <button
                className="icon-button"
                aria-label="Back to resumes"
                disabled={locked}
                onClick={goHome}
              >
                <Icon name="back" />
              </button>
              <div>
                <label className="resume-title-label">
                  <span className="sr-only">Resume title</span>
                  <input
                    aria-label="Resume title"
                    value={draft.title}
                    maxLength={150}
                    disabled={locked}
                    onChange={(e) =>
                      setDraft({ ...draft, title: e.target.value })
                    }
                  />
                </label>
                <span className={`save-status ${dirty ? "unsaved" : ""}`}>
                  {dirty ? "Unsaved changes" : "All changes saved"}
                </span>
              </div>
            </div>
            <div className="toolbar-actions">
              <button
                className="button secondary"
                onClick={save}
                disabled={locked || !dirty}
              >
                <Icon name="save" size={17} />
                {busy ? "Saving…" : "Save resume"}
              </button>
              <button
                className="button primary"
                onClick={() => setPrintHint(true)}
                disabled={locked}
              >
                <Icon name="download" size={17} />
                Export PDF
              </button>
            </div>
          </div>
          <div className="mobile-view-toggle">
            <button
              className={tab === "editor" ? "active" : ""}
              onClick={() => setTab("editor")}
            >
              Edit resume
            </button>
            <button
              className={tab === "preview" ? "active" : ""}
              onClick={() => setTab("preview")}
            >
              <Icon name="eye" size={16} />
              Live preview
            </button>
          </div>
          <div className="workspace-grid">
            <aside className="section-sidebar">
              <div className="sidebar-top">
                <span className="eyebrow">BUILD YOUR RESUME</span>
                <div className="completion">
                  <span>{completed} of 8 sections started</span>
                  <span>{Math.round((completed / 8) * 100)}%</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${(completed / 8) * 100}%` }} />
                </div>
              </div>
              <nav aria-label="Resume sections">
                {sections.map((s, i) => (
                  <button
                    key={s.key}
                    className={section === s.key ? "active" : ""}
                    onClick={() => {
                      setSection(s.key);
                      setTab("editor");
                    }}
                  >
                    <Icon name={s.icon} size={18} />
                    <span>{s.name}</span>
                    <small>{String(i + 1).padStart(2, "0")}</small>
                  </button>
                ))}
              </nav>
              <div className="sidebar-note">
                <Icon name="spark" size={19} />
                <p>
                  Keep it honest.
                  <br />
                  Make it specific.
                  <br />
                  <strong>Make it yours.</strong>
                </p>
              </div>
            </aside>
            <div className="editing-column">
              <div className="target-role">
                <label className="field">
                  <span>TAILORING YOUR RESUME FOR</span>
                  <input
                    list="roles"
                    value={draft.targetRole}
                    maxLength={150}
                    disabled={locked}
                    onChange={(e) =>
                      setDraft({ ...draft, targetRole: e.target.value })
                    }
                    placeholder="Choose or enter a target role"
                  />
                  <datalist id="roles">
                    <option value="Project Coordinator" />
                    <option value="Scrum Master" />
                    <option value="Project Manager" />
                    <option value="Senior Project Manager" />
                  </datalist>
                </label>
                <span className="role-icon">
                  <Icon name="briefcase" size={20} />
                </span>
              </div>
              <Editor
                section={section}
                document={draft.document}
                onChange={changeDocument}
                busy={locked}
              />
              <div className="section-pagination">
                <button
                  className="text-button"
                  disabled={sections[0].key === section}
                  onClick={() =>
                    setSection(
                      sections[sections.findIndex((s) => s.key === section) - 1]
                        .key,
                    )
                  }
                >
                  <Icon name="back" size={16} />
                  Previous
                </button>
                <button
                  className="text-button"
                  disabled={sections[sections.length - 1].key === section}
                  onClick={() =>
                    setSection(
                      sections[sections.findIndex((s) => s.key === section) + 1]
                        .key,
                    )
                  }
                >
                  Next section
                  <Icon name="arrow" size={16} />
                </button>
              </div>
              <AiPanel
                draft={draft}
                health={health}
                onChange={changeDocument}
                onBusy={setAiBusy}
                notify={notify}
                disabled={busy}
              />
            </div>
            <aside className="preview-column">
              <div className="preview-toolbar">
                <span>
                  <span className="status-dot" />
                  LIVE PREVIEW
                </span>
                <span className="template-badge">Classic · A4</span>
              </div>
              <ResumePreview document={draft.document} />
              <p className="preview-note">
                <Icon name="eye" size={14} />
                Updates as you write. Export uses a clean, print-ready layout.
              </p>
            </aside>
          </div>
        </main>
      )}
      <input
        ref={uploadRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-label="Upload existing resume PDF"
        onChange={(e) => {
          void importPdf(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {busy && view === "dashboard" && (
        <div className="working-indicator" role="status">
          <span className="spinner" />
          Working on your resume… Please keep this page open.
        </div>
      )}
      {printHint && (
        <div className="modal-backdrop" onClick={() => setPrintHint(false)}>
          <section
            className="export-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="export-icon">
              <Icon name="download" size={25} />
            </span>
            <h2 id="export-title">Your next step, on paper.</h2>
            <p>
              In the print window, choose <strong>Save as PDF</strong>, paper
              size <strong>A4</strong>, and turn off browser headers and
              footers.
            </p>
            <p className="hint">
              Your current edits are included, even if you haven’t saved them
              yet. Review the pages before downloading.
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setPrintHint(false)}
              >
                Cancel
              </button>
              <button
                autoFocus
                className="button primary"
                onClick={() => {
                  window.print();
                  setPrintHint(false);
                }}
              >
                Continue to PDF
                <Icon name="arrow" size={16} />
              </button>
            </div>
          </section>
        </div>
      )}
      {view === "editor" && (
        <div className="print-root">
          <ResumePreview document={draft.document} />
        </div>
      )}
    </>
  );
}
