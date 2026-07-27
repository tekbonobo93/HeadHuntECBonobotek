interface ExperienceLike {
  role?: string;
  company?: string;
  duration?: string;
  description?: string;
}

interface PreferencesLike {
  locationType?: string;
  jobType?: string;
  seniorityLevel?: string;
  residentCountry?: string;
  geographicScope?: string;
}

interface ProfileLike {
  skills?: string[];
  experience?: ExperienceLike[];
  preferences?: PreferencesLike;
}

export interface ProfileSignals {
  primaryRole: string | null;
  recentRoles: string[];
  normalizedSkills: string[];
  headlineSkills: string[];
  seniority: string;
  locationType: string;
  residentCountry: string | null;
  geographicScope: string;
  searchQueries: string[];
  summary: string;
}

const COMMON_SKILL_ALIASES: Record<string, string[]> = {
  react: ["react", "react.js", "reactjs"],
  typescript: ["typescript", "ts"],
  javascript: ["javascript", "js", "ecmascript"],
  node: ["node", "node.js", "nodejs"],
  nextjs: ["next.js", "nextjs"],
  postgresql: ["postgres", "postgresql"],
  aws: ["aws", "amazon web services"],
  azure: ["azure"],
  gcp: ["gcp", "google cloud"],
  docker: ["docker"],
  kubernetes: ["kubernetes", "k8s"],
  terraform: ["terraform"],
  linux: ["linux"],
  devops: ["devops"],
  sre: ["sre", "site reliability"],
  python: ["python"],
  java: ["java"],
  figma: ["figma"],
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeSkill(skill: string) {
  const raw = skill.trim().toLowerCase();
  for (const [canonical, aliases] of Object.entries(COMMON_SKILL_ALIASES)) {
    if (aliases.some((alias) => raw === alias || raw.includes(alias))) {
      return canonical;
    }
  }
  return raw;
}

function inferRoleFromSkills(skills: string[]) {
  const normalized = skills.map(normalizeSkill);
  if (normalized.some((skill) => ["linux", "docker", "kubernetes", "terraform", "aws", "azure", "gcp", "devops", "sre"].includes(skill))) {
    return "DevOps Engineer";
  }
  if (normalized.some((skill) => ["react", "typescript", "javascript", "nextjs"].includes(skill))) {
    return "Frontend Engineer";
  }
  if (normalized.some((skill) => ["node", "postgresql", "python", "java"].includes(skill))) {
    return "Backend Engineer";
  }
  if (normalized.includes("figma")) {
    return "Product Designer";
  }
  return null;
}

function buildQueries(primaryRole: string | null, skills: string[], seniority: string, country: string | null) {
  const headline = skills.slice(0, 4);
  const queries: string[] = [];

  if (primaryRole) {
    queries.push(primaryRole);
    if (headline.length > 0) {
      queries.push(`${primaryRole} ${headline.slice(0, 2).join(" ")}`);
    }
    if (country) {
      queries.push(`${primaryRole} ${country}`);
    }
  }

  if (headline.length >= 2) {
    queries.push(`${headline[0]} ${headline[1]}`);
  }
  if (headline.length >= 3) {
    queries.push(headline.slice(0, 3).join(" "));
  }

  if (seniority !== "cualquiera" && primaryRole) {
    queries.push(`${seniority} ${primaryRole}`);
  }

  return uniqueStrings(queries.map((item) => item.trim()).filter((item) => item.length >= 3)).slice(0, 6);
}

export function deriveProfileSignals(profile: ProfileLike | undefined, explicitQuery?: string | null): ProfileSignals {
  const experience = Array.isArray(profile?.experience) ? profile!.experience : [];
  const recentRoles = uniqueStrings(
    experience
      .map((item) => (item.role || "").trim())
      .filter((item) => item.length > 0),
  );

  const normalizedSkills = uniqueStrings((profile?.skills || []).map(normalizeSkill));
  const headlineSkills = normalizedSkills.slice(0, 6);
  const primaryRole = recentRoles[0] || inferRoleFromSkills(headlineSkills);
  const seniority = profile?.preferences?.seniorityLevel || "cualquiera";
  const locationType = profile?.preferences?.locationType || "cualquiera";
  const residentCountry = profile?.preferences?.residentCountry?.trim() || null;
  const geographicScope = profile?.preferences?.geographicScope || "global";

  const queries = explicitQuery && explicitQuery.trim().length > 0
    ? [explicitQuery.trim(), ...buildQueries(primaryRole, headlineSkills, seniority, residentCountry)]
    : buildQueries(primaryRole, headlineSkills, seniority, residentCountry);

  const summaryParts = [
    primaryRole ? `Rol principal: ${primaryRole}` : null,
    headlineSkills.length > 0 ? `Skills clave: ${headlineSkills.join(", ")}` : null,
    seniority !== "cualquiera" ? `Seniority objetivo: ${seniority}` : null,
    locationType !== "cualquiera" ? `Modalidad preferida: ${locationType}` : null,
    residentCountry ? `País de residencia: ${residentCountry}` : null,
    geographicScope ? `Alcance geográfico: ${geographicScope}` : null,
  ].filter(Boolean);

  return {
    primaryRole,
    recentRoles,
    normalizedSkills,
    headlineSkills,
    seniority,
    locationType,
    residentCountry,
    geographicScope,
    searchQueries: uniqueStrings(queries).slice(0, 6),
    summary: summaryParts.join(" | "),
  };
}
