import type { Draft } from "./types";
// Fictional sample data only; never substituted for an imported user's resume.
export const sampleDraft: Draft = {
  title: "Alex Morgan · Project Manager",
  targetRole: "Project Manager",
  document: {
    contact: {
      fullName: "Alex Morgan",
      email: "alex.morgan@example.com",
      phone: "+1 555 010 2040",
      location: "Austin, TX",
      linkedIn: "linkedin.com/in/alex-morgan-example",
      website: "",
    },
    summary:
      "Project coordinator with experience supporting cross-functional product teams. Skilled in sprint planning, stakeholder communication and keeping complex work organized. Looking to bring a thoughtful, delivery-focused approach to a Project Manager role.",
    experience: [
      {
        jobTitle: "Project Coordinator",
        company: "Northstar Digital (sample)",
        location: "Austin, TX",
        startDate: "2023-03",
        endDate: "",
        isCurrent: true,
        description:
          "Coordinated delivery schedules across design, engineering and operations.\nMaintained project plans, risk registers and weekly stakeholder updates.\nFacilitated sprint planning and tracked action items through completion.",
      },
      {
        jobTitle: "Operations Associate",
        company: "Clearpath Studio (sample)",
        location: "Remote",
        startDate: "2021-06",
        endDate: "2023-02",
        isCurrent: false,
        description:
          "Organized client onboarding and maintained internal process documentation.\nWorked with account managers to resolve delivery issues and communicate next steps.",
      },
    ],
    education: [
      {
        institution: "Sample State University",
        degree: "BBA, Business Administration",
        startDate: "2017",
        endDate: "2021",
      },
    ],
    certifications: [
      {
        name: "Certified ScrumMaster (sample)",
        issuer: "Scrum Alliance",
        date: "2024",
      },
    ],
    skills: [
      "Project planning",
      "Stakeholder communication",
      "Jira",
      "Sprint planning",
      "Risk tracking",
      "Documentation",
    ],
    projects: [
      {
        name: "Customer onboarding redesign",
        link: "",
        description:
          "Coordinated a cross-functional initiative to document and simplify the client onboarding process.",
      },
    ],
    achievements: [],
  },
};
