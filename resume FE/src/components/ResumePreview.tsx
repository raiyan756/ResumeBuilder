import type { ResumeDocument } from "../types";

function dates(start: string, end: string, current = false) {
  return [start, current ? "Present" : end].filter(Boolean).join(" – ");
}
function Lines({ text }: { text: string }) {
  return (
    <ul className="resume-bullets">
      {text
        .split("\n")
        .filter((x) => x.trim())
        .map((x, i) => (
          <li key={i}>{x.replace(/^[•\-]\s*/, "")}</li>
        ))}
    </ul>
  );
}
export default function ResumePreview({
  document: d,
}: {
  document: ResumeDocument;
}) {
  const contacts = [
    d.contact.location,
    d.contact.email,
    d.contact.phone,
    d.contact.linkedIn,
    d.contact.website,
  ].filter(Boolean);
  return (
    <article className="resume-paper" aria-label="Live resume preview">
      <header className="resume-heading">
        <h1>{d.contact.fullName || "Your name"}</h1>
        {contacts.length > 0 && <p>{contacts.join("  ·  ")}</p>}
      </header>
      {d.summary && (
        <section>
          <h2>Professional summary</h2>
          <p className="preserve-lines">{d.summary}</p>
        </section>
      )}
      {d.experience.length > 0 && (
        <section>
          <h2>Experience</h2>
          {d.experience.map((item, i) => (
            <div className="resume-item" key={i}>
              <div className="resume-item-head">
                <h3>{item.jobTitle || "Job title"}</h3>
                <span>
                  {dates(item.startDate, item.endDate, item.isCurrent)}
                </span>
              </div>
              <p className="resume-subtitle">
                {[item.company, item.location].filter(Boolean).join(" · ")}
              </p>
              {item.description && <Lines text={item.description} />}
            </div>
          ))}
        </section>
      )}
      {d.education.length > 0 && (
        <section>
          <h2>Education</h2>
          {d.education.map((item, i) => (
            <div className="resume-item" key={i}>
              <div className="resume-item-head">
                <h3>{item.degree}</h3>
                <span>{dates(item.startDate, item.endDate)}</span>
              </div>
              <p>{item.institution}</p>
            </div>
          ))}
        </section>
      )}
      {d.skills.length > 0 && (
        <section>
          <h2>Skills</h2>
          <p>{d.skills.join(" · ")}</p>
        </section>
      )}
      {d.certifications.length > 0 && (
        <section>
          <h2>Certifications</h2>
          {d.certifications.map((item, i) => (
            <div className="resume-item compact" key={i}>
              <div className="resume-item-head">
                <h3>{item.name}</h3>
                <span>{item.date}</span>
              </div>
              <p>{item.issuer}</p>
            </div>
          ))}
        </section>
      )}
      {d.projects.length > 0 && (
        <section>
          <h2>Projects</h2>
          {d.projects.map((item, i) => (
            <div className="resume-item" key={i}>
              <h3>{item.name}</h3>
              {item.link && <p className="resume-subtitle">{item.link}</p>}
              <p className="preserve-lines">{item.description}</p>
            </div>
          ))}
        </section>
      )}
      {d.achievements.length > 0 && (
        <section>
          <h2>Achievements</h2>
          <ul className="resume-bullets">
            {d.achievements.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      {!d.summary &&
        !d.experience.length &&
        !d.education.length &&
        !d.skills.length && (
          <div className="preview-placeholder">
            Your story starts here.
            <br />
            Add your details to see your resume take shape.
          </div>
        )}
    </article>
  );
}
