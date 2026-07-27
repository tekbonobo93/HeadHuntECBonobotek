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
  coreSkillSet: string[];
  seniority: string;
  locationType: string;
  residentCountry: string | null;
  geographicScope: string;
  careerFamily: string;
  allowedRoleKeywords: string[];
  blockedRoleKeywords: string[];
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

const CAREER_FAMILY_CONFIG: Record<string, { roleKeywords: string[]; skillKeywords: string[]; blockedKeywords: string[]; roleVariants: string[]; defaultRole: string | null }> = {
  infrastructure: {
    roleKeywords: [
      "sysadmin",
      "system administrator",
      "administrador de sistemas",
      "systems administrator",
      "infrastructure",
      "infraestructura",
      "network administrator",
      "soporte tecnico",
      "it support",
      "linux administrator",
      "windows server",
    ],
    skillKeywords: [
      "linux",
      "active directory",
      "dns",
      "dhcp",
      "nginx",
      "apache",
      "vmware",
      "proxmox",
      "firewall",
      "redes",
      "servidores",
    ],
    blockedKeywords: ["video editor", "cinematic", "videographer", "motion graphics", "graphic designer", "copywriter", "sales", "marketing"],
    roleVariants: ["System Administrator", "Linux Administrator", "Infrastructure Engineer", "Network Administrator"],
    defaultRole: "System Administrator",
  },
  devops: {
    roleKeywords: ["devops", "site reliability", "sre", "platform engineer", "cloud engineer", "cloud architect"],
    skillKeywords: ["docker", "kubernetes", "terraform", "aws", "azure", "gcp", "ci/cd", "ansible", "helm"],
    blockedKeywords: ["video editor", "cinematic", "videographer", "motion graphics", "graphic designer", "copywriter", "sales", "marketing"],
    roleVariants: ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer", "Platform Engineer"],
    defaultRole: "DevOps Engineer",
  },
  backend: {
    roleKeywords: ["backend", "api", "server", "software engineer", "fullstack", "full stack"],
    skillKeywords: ["node", "postgresql", "python", "java", "sql", "rest", "graphql"],
    blockedKeywords: ["video editor", "cinematic", "videographer", "motion graphics", "graphic designer", "copywriter", "sales", "marketing"],
    roleVariants: ["Backend Engineer", "Software Engineer", "Fullstack Engineer"],
    defaultRole: "Backend Engineer",
  },
  frontend: {
    roleKeywords: ["frontend", "front end", "ui engineer", "web developer", "react developer"],
    skillKeywords: ["react", "typescript", "javascript", "nextjs", "css", "html"],
    blockedKeywords: ["video editor", "cinematic", "videographer", "motion graphics", "graphic designer", "copywriter", "sales", "marketing"],
    roleVariants: ["Frontend Engineer", "React Developer", "Web Developer"],
    defaultRole: "Frontend Engineer",
  },
  design: {
    roleKeywords: ["product designer", "ux", "ui", "designer", "figma"],
    skillKeywords: ["figma", "prototype", "design system"],
    blockedKeywords: ["sales", "marketing"],
    roleVariants: ["Product Designer", "UX Designer", "UI Designer"],
    defaultRole: "Product Designer",
  },
  general: {
    roleKeywords: [],
    skillKeywords: [],
    blockedKeywords: ["video editor", "cinematic", "videographer", "motion graphics", "graphic designer", "copywriter", "sales", "marketing"],
    roleVariants: [],
    defaultRole: null,
  },
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeSkill(skill: string) {
  const raw = normalizeText(skill);
  for (const [canonical, aliases] of Object.entries(COMMON_SKILL_ALIASES)) {
    if (aliases.some((alias) => raw === normalizeText(alias) || raw.includes(normalizeText(alias)))) {
      return canonical;
    }
  }
  return raw;
}

function scoreCareerFamily(roles: string[], skills: string[], family: keyof typeof CAREER_FAMILY_CONFIG) {
  const config = CAREER_FAMILY_CONFIG[family];
  const roleScore = config.roleKeywords.reduce((total, keyword) => (
    total + (roles.some((role) => role.includes(normalizeText(keyword))) ? 3 : 0)
  ), 0);
  const skillScore = config.skillKeywords.reduce((total, keyword) => (
    total + (skills.some((skill) => skill.includes(normalizeText(keyword))) ? 2 : 0)
  ), 0);
  return roleScore + skillScore;
}

function inferCareerFamily(roles: string[], skills: string[]) {
  const rankedFamilies = (Object.keys(CAREER_FAMILY_CONFIG) as Array<keyof typeof CAREER_FAMILY_CONFIG>)
    .filter((family) => family !== "general")
    .map((family) => ({ family, score: scoreCareerFamily(roles, skills, family) }))
    .sort((a, b) => b.score - a.score);

  return rankedFamilies[0] && rankedFamilies[0].score > 0 ? rankedFamilies[0].family : "general";
}

function inferPrimaryRole(careerFamily: string, recentRoles: string[]) {
  if (recentRoles.length > 0) {
    return recentRoles[0];
  }
  return CAREER_FAMILY_CONFIG[careerFamily]?.defaultRole || null;
}

function buildQueries(
  primaryRole: string | null,
  recentRoles: string[],
  coreSkills: string[],
  seniority: string,
  country: string | null,
  careerFamily: string,
  explicitQuery?: string | null,
) {
  const familyConfig = CAREER_FAMILY_CONFIG[careerFamily] || CAREER_FAMILY_CONFIG.general;
  const queries: string[] = [];
  const normalizedExplicitQuery = explicitQuery?.trim();

  if (normalizedExplicitQuery && normalizedExplicitQuery.length >= 3) {
    queries.push(normalizedExplicitQuery);
  }

  if (primaryRole) {
    queries.push(primaryRole);
    if (country) {
      queries.push(`${primaryRole} ${country}`);
    }
    if (coreSkills.length > 0) {
      queries.push(`${primaryRole} ${coreSkills.slice(0, 2).join(" ")}`);
    }
    if (seniority !== "cualquiera") {
      queries.push(`${seniority} ${primaryRole}`);
    }
  }

  for (const role of recentRoles.slice(0, 3)) {
    queries.push(role);
    if (country) {
      queries.push(`${role} ${country}`);
    }
  }

  for (const variant of familyConfig.roleVariants.slice(0, 3)) {
    queries.push(variant);
    if (country) {
      queries.push(`${variant} ${country}`);
    }
  }

  if (!primaryRole && coreSkills.length > 0) {
    queries.push(coreSkills.slice(0, 2).join(" "));
  }

  return uniqueStrings(
    queries
      .map((item) => item.trim())
      .filter((item) => item.length >= 3),
  ).slice(0, 8);
}

export function deriveProfileSignals(profile: ProfileLike | undefined, explicitQuery?: string | null): ProfileSignals {
  const experience = Array.isArray(profile?.experience) ? profile!.experience : [];
  const recentRoles = uniqueStrings(
    experience
      .map((item) => normalizeText(item.role || ""))
      .filter((item) => item.length > 0),
  );

  const normalizedSkills = uniqueStrings((profile?.skills || []).map(normalizeSkill));
  const headlineSkills = normalizedSkills.slice(0, 6);
  const coreSkillSet = normalizedSkills.slice(0, 4);
  const careerFamily = inferCareerFamily(recentRoles, normalizedSkills);
  const primaryRole = inferPrimaryRole(careerFamily, recentRoles);
  const familyConfig = CAREER_FAMILY_CONFIG[careerFamily] || CAREER_FAMILY_CONFIG.general;
  const seniority = profile?.preferences?.seniorityLevel || "cualquiera";
  const locationType = profile?.preferences?.locationType || "cualquiera";
  const residentCountry = profile?.preferences?.residentCountry?.trim() || null;
  const geographicScope = profile?.preferences?.geographicScope || "global";

  const searchQueries = buildQueries(
    primaryRole,
    recentRoles,
    coreSkillSet,
    seniority,
    residentCountry,
    careerFamily,
    explicitQuery,
  );

  const summaryParts = [
    primaryRole ? `Rol principal: ${primaryRole}` : null,
    careerFamily !== "general" ? `Familia profesional: ${careerFamily}` : null,
    coreSkillSet.length > 0 ? `Skills clave: ${coreSkillSet.join(", ")}` : null,
    seniority !== "cualquiera" ? `Seniority objetivo: ${seniority}` : null,
    locationType !== "cualquiera" ? `Modalidad preferida: ${locationType}` : null,
    residentCountry ? `Pais de residencia: ${residentCountry}` : null,
    geographicScope ? `Alcance geografico: ${geographicScope}` : null,
  ].filter(Boolean);

  return {
    primaryRole,
    recentRoles,
    normalizedSkills,
    headlineSkills,
    coreSkillSet,
    seniority,
    locationType,
    residentCountry,
    geographicScope,
    careerFamily,
    allowedRoleKeywords: uniqueStrings([primaryRole || "", ...recentRoles, ...familyConfig.roleVariants].filter(Boolean)),
    blockedRoleKeywords: familyConfig.blockedKeywords,
    searchQueries: uniqueStrings(searchQueries).slice(0, 8),
    summary: summaryParts.join(" | "),
  };
}
