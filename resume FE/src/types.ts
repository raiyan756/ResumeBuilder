export interface Contact {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  website: string;
}
export interface Experience {
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}
export interface Education {
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
}
export interface Certification {
  name: string;
  issuer: string;
  date: string;
}
export interface Project {
  name: string;
  link: string;
  description: string;
}
export interface ResumeDocument {
  contact: Contact;
  summary: string;
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  skills: string[];
  projects: Project[];
  achievements: string[];
}
export interface Draft {
  title: string;
  targetRole: string;
  document: ResumeDocument;
}
export interface SavedResume extends Draft {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface ResumeSummary {
  id: string;
  title: string;
  targetRole: string;
  fullName: string;
  updatedAt: string;
}
export interface Health {
  status: string;
  database: string;
  aiMode: "demo" | "gemini";
  pdfImportAvailable: boolean;
}
export type AiAction = "summary" | "experience" | "review" | "skills";
export interface AiSuggestion {
  provider: string;
  isSimulated: boolean;
  suggestedText: string;
  suggestions: string[];
  missingInformation: string[];
  recommendedSkills: string[];
}
export const emptyExperience = (): Experience => ({
  jobTitle: "",
  company: "",
  location: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
});
export const emptyDocument = (): ResumeDocument => ({
  contact: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedIn: "",
    website: "",
  },
  summary: "",
  experience: [],
  education: [],
  certifications: [],
  skills: [],
  projects: [],
  achievements: [],
});
export const emptyDraft = (): Draft => ({
  title: "My professional resume",
  targetRole: "Project Manager",
  document: emptyDocument(),
});
