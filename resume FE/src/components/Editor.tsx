import { useState } from "react";
import type {
  Certification,
  Contact,
  Education,
  Experience,
  Project,
  ResumeDocument,
} from "../types";
import { emptyExperience } from "../types";
import Icon from "./Icon";

export const sections = [
  {
    key: "contact",
    name: "Personal details",
    icon: "user",
    note: "Make it easy for the right people to reach you.",
  },
  {
    key: "summary",
    name: "Professional summary",
    icon: "file",
    note: "A clear introduction to your experience and direction.",
  },
  {
    key: "experience",
    name: "Work experience",
    icon: "briefcase",
    note: "Show the work you did and the difference it made.",
  },
  {
    key: "education",
    name: "Education",
    icon: "book",
    note: "Your academic background and learning journey.",
  },
  {
    key: "certifications",
    name: "Certifications",
    icon: "medal",
    note: "Credentials that support your next step.",
  },
  {
    key: "skills",
    name: "Skills",
    icon: "spark",
    note: "Choose skills you can confidently demonstrate.",
  },
  {
    key: "projects",
    name: "Projects",
    icon: "grid",
    note: "Bring your experience to life with concrete examples.",
  },
  {
    key: "achievements",
    name: "Achievements",
    icon: "medal",
    note: "Highlight recognition and outcomes you can verify.",
  },
] as const;
export type Section = (typeof sections)[number]["key"];
type Field<T> = {
  key: keyof T;
  label: string;
  placeholder?: string;
  wide?: boolean;
  multiline?: boolean;
  max?: number;
};

function InputField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  max = 200,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  max?: number;
  type?: string;
}) {
  return (
    <label className={`field ${multiline ? "wide" : ""}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={max}
          rows={6}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={max}
        />
      )}
    </label>
  );
}

function Repeatable<T extends object>({
  items,
  onChange,
  fields,
  create,
  label,
  max = 30,
  current,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  fields: Field<T>[];
  create: () => T;
  label: string;
  max?: number;
  current?: keyof T;
}) {
  function update(index: number, key: keyof T, value: string | boolean) {
    onChange(
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }
  return (
    <div className="repeatable">
      {items.length === 0 && (
        <div className="empty-section">
          <Icon name="plus" size={26} />
          <p>No {label.toLowerCase()} added yet.</p>
          <span>Add an entry when you are ready.</span>
        </div>
      )}
      {items.map((item, i) => (
        <div className="entry" key={i}>
          <div className="entry-heading">
            <h3>
              {label} {i + 1}
            </h3>
            <button
              className="icon-button danger"
              type="button"
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              onClick={() => onChange(items.filter((_, n) => n !== i))}
            >
              <Icon name="trash" size={17} />
            </button>
          </div>
          <div className="fields-grid">
            {fields.map((field) => (
              <div
                className={field.wide || field.multiline ? "wide" : ""}
                key={String(field.key)}
              >
                <InputField
                  label={field.label}
                  value={String(item[field.key] ?? "")}
                  onChange={(value) => update(i, field.key, value)}
                  placeholder={field.placeholder}
                  multiline={field.multiline}
                  max={field.max ?? (field.multiline ? 6000 : 200)}
                />
              </div>
            ))}
          </div>
          {current && (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={Boolean(item[current])}
                onChange={(e) => update(i, current, e.target.checked)}
              />{" "}
              I currently work here (end date is ignored)
            </label>
          )}
        </div>
      ))}
      <button
        type="button"
        className="button add-entry"
        disabled={items.length >= max}
        onClick={() => onChange([...items, create()])}
      >
        <Icon name="plus" size={18} />
        Add {label.toLowerCase()}
      </button>
    </div>
  );
}

function StringList({
  items,
  onChange,
  label,
  max,
  itemMax,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  label: string;
  max: number;
  itemMax: number;
}) {
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  function add() {
    const next = value.trim();
    if (
      next &&
      (editing !== null || items.length < max) &&
      !items.some(
        (x, i) => i !== editing && x.toLowerCase() === next.toLowerCase(),
      )
    ) {
      onChange(
        editing === null
          ? [...items, next]
          : items.map((item, i) => (i === editing ? next : item)),
      );
      setValue("");
      setEditing(null);
    }
  }
  return (
    <>
      <div className="inline-input">
        <InputField
          label={`${editing === null ? "Add" : "Edit"} ${label}`}
          value={value}
          onChange={setValue}
          placeholder={
            label === "skill"
              ? "e.g. Stakeholder communication"
              : "A verified outcome or recognition"
          }
          max={itemMax}
        />
        <button
          className="button primary"
          type="button"
          onClick={add}
          disabled={!value.trim() || (editing === null && items.length >= max)}
        >
          {editing === null ? "Add" : "Update"}
        </button>
      </div>
      <p className="hint">
        {items.length} / {max} added. Select an item to edit it, or × to remove
        it.
      </p>
      <div className={label === "skill" ? "chips" : "achievement-list"}>
        {items.map((item, i) => (
          <div className="editable-chip" key={i}>
            <button
              type="button"
              className="chip-label"
              aria-label={`Edit ${item}`}
              onClick={() => {
                setEditing(i);
                setValue(item);
              }}
            >
              {item}
            </button>
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => {
                onChange(items.filter((_, n) => n !== i));
                setEditing(null);
                setValue("");
              }}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

const experienceFields: Field<Experience>[] = [
  { key: "jobTitle", label: "Job title", placeholder: "Project Coordinator" },
  { key: "company", label: "Company", placeholder: "Company name" },
  { key: "location", label: "Location", placeholder: "City or Remote" },
  { key: "startDate", label: "Start date", placeholder: "2023-03", max: 40 },
  { key: "endDate", label: "End date", placeholder: "2025-06", max: 40 },
  {
    key: "description",
    label: "Responsibilities & outcomes",
    placeholder:
      "One responsibility or achievement per line. Include numbers only when you can verify them.",
    multiline: true,
  },
];
const educationFields: Field<Education>[] = [
  {
    key: "institution",
    label: "Institution",
    placeholder: "University or school",
  },
  {
    key: "degree",
    label: "Degree / field of study",
    placeholder: "BSc, Computer Science",
  },
  { key: "startDate", label: "Start date", placeholder: "2020", max: 40 },
  { key: "endDate", label: "End date", placeholder: "2024", max: 40 },
];
const certificationFields: Field<Certification>[] = [
  {
    key: "name",
    label: "Certification",
    placeholder: "Professional certification",
    wide: true,
  },
  { key: "issuer", label: "Issuing organization" },
  { key: "date", label: "Date", placeholder: "2025", max: 40 },
];
const projectFields: Field<Project>[] = [
  { key: "name", label: "Project name", wide: true },
  {
    key: "link",
    label: "Project link (optional)",
    placeholder: "https://…",
    wide: true,
    max: 500,
  },
  { key: "description", label: "What you did and achieved", multiline: true },
];
const contactFields: Field<Contact>[] = [
  {
    key: "fullName",
    label: "Full name",
    placeholder: "Alex Morgan",
    max: 150,
    wide: true,
  },
  { key: "email", label: "Email", placeholder: "you@example.com", max: 250 },
  { key: "phone", label: "Phone", placeholder: "+880 …", max: 60 },
  {
    key: "location",
    label: "Location",
    placeholder: "Dhaka, Bangladesh",
    wide: true,
  },
  {
    key: "linkedIn",
    label: "LinkedIn (optional)",
    placeholder: "linkedin.com/in/your-name",
    max: 500,
    wide: true,
  },
  {
    key: "website",
    label: "Website / portfolio (optional)",
    placeholder: "yourwebsite.com",
    max: 500,
    wide: true,
  },
];

export default function Editor({
  section,
  document: d,
  onChange,
  busy,
}: {
  section: Section;
  document: ResumeDocument;
  onChange: (d: ResumeDocument) => void;
  busy: boolean;
}) {
  const info = sections.find((s) => s.key === section)!;
  return (
    <div className="editor-content">
      <div className="section-title">
        <span className="eyebrow">YOUR STORY, YOUR WORDS</span>
        <h2>{info.name}</h2>
        <p>{info.note}</p>
      </div>
      <fieldset disabled={busy} className="editor-fields">
        {section === "contact" && (
          <div className="fields-grid">
            {contactFields.map((f) => (
              <div key={f.key} className={f.wide ? "wide" : ""}>
                <InputField
                  label={f.label}
                  value={d.contact[f.key]}
                  onChange={(value) =>
                    onChange({
                      ...d,
                      contact: { ...d.contact, [f.key]: value },
                    })
                  }
                  placeholder={f.placeholder}
                  max={f.max}
                  type={f.key === "email" ? "email" : "text"}
                />
              </div>
            ))}
          </div>
        )}
        {section === "summary" && (
          <>
            <InputField
              label="Professional summary"
              value={d.summary}
              onChange={(summary) => onChange({ ...d, summary })}
              placeholder="Introduce your experience, strengths and the kind of role you are looking for. Aim for 3–4 concise sentences."
              multiline
              max={6000}
            />
            <p className="hint">
              {d.summary.length} / 6,000 characters · Use the AI assistant for a
              starting point.
            </p>
          </>
        )}
        {section === "experience" && (
          <Repeatable
            items={d.experience}
            onChange={(experience) => onChange({ ...d, experience })}
            create={emptyExperience}
            fields={experienceFields}
            label="Experience"
            current="isCurrent"
          />
        )}
        {section === "education" && (
          <Repeatable
            items={d.education}
            onChange={(education) => onChange({ ...d, education })}
            create={() => ({
              institution: "",
              degree: "",
              startDate: "",
              endDate: "",
            })}
            fields={educationFields}
            label="Education"
            max={20}
          />
        )}
        {section === "certifications" && (
          <Repeatable
            items={d.certifications}
            onChange={(certifications) => onChange({ ...d, certifications })}
            create={() => ({ name: "", issuer: "", date: "" })}
            fields={certificationFields}
            label="Certification"
          />
        )}
        {section === "skills" && (
          <StringList
            key="skills"
            items={d.skills}
            onChange={(skills) => onChange({ ...d, skills })}
            label="skill"
            max={80}
            itemMax={150}
          />
        )}
        {section === "projects" && (
          <Repeatable
            items={d.projects}
            onChange={(projects) => onChange({ ...d, projects })}
            create={() => ({ name: "", link: "", description: "" })}
            fields={projectFields}
            label="Project"
          />
        )}
        {section === "achievements" && (
          <StringList
            key="achievements"
            items={d.achievements}
            onChange={(achievements) => onChange({ ...d, achievements })}
            label="achievement"
            max={30}
            itemMax={2000}
          />
        )}
      </fieldset>
    </div>
  );
}
