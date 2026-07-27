import test from "node:test";
import assert from "node:assert/strict";

const { deriveProfileSignals } = await import("../../server/profileSignals");
const {
  calculateCompatibility,
  evaluateJobProfileEvidence,
  jobMatchesProfileDomain,
  mapAdzunaCountry,
  buildSourceQueries,
} = await import("../../server/aiHandlers");

const sysadminProfile = {
  skills: ["Linux", "Active Directory", "VMware", "Networking", "DNS", "Docker"],
  experience: [
    {
      role: "Administrador de Sistemas",
      company: "Bonobotek",
      duration: "2022-2026",
      description: "Administracion de servidores Linux, redes, DNS, Active Directory y virtualizacion.",
    },
  ],
  preferences: {
    locationType: "remoto",
    jobType: "completa",
    seniorityLevel: "semi-senior",
    residentCountry: "Perú",
    geographicScope: "latam",
  },
};

const relevantInfraJob = {
  id: "infra-1",
  title: "Linux System Administrator",
  company: "InfraCloud",
  location: "Remote LATAM",
  locationType: "remoto",
  jobType: "completa",
  salary: "$2500 - $3200",
  description: "Administracion de servidores Linux, DNS, Active Directory, redes y VMware para plataforma regional.",
  requirements: ["Linux", "DNS", "VMware", "Networking", "Active Directory"],
  sourcePlatform: "Adzuna",
  seniorityLevel: "semi-senior",
  postedDate: "Hace 1 dia",
  applyUrl: "https://example.com/infra-1",
};

const unrelatedMediaJob = {
  id: "media-1",
  title: "Cinematic Video Editor",
  company: "Studio Motion",
  location: "Remote",
  locationType: "remoto",
  jobType: "completa",
  salary: "$1500 - $2200",
  description: "Edicion cinematografica, motion graphics, storytelling audiovisual y Adobe Premiere.",
  requirements: ["Video editing", "Motion graphics", "Storytelling", "Adobe Premiere"],
  sourcePlatform: "Remotive",
  seniorityLevel: "semi-senior",
  postedDate: "Hace 2 dias",
  applyUrl: "https://example.com/media-1",
};

test("domain evidence and compatibility prefer infra jobs over unrelated media jobs", () => {
  const relevantEvidence = evaluateJobProfileEvidence(
    relevantInfraJob as any,
    deriveProfileSignals(sysadminProfile),
    sysadminProfile.preferences,
  );
  const unrelatedEvidence = evaluateJobProfileEvidence(
    unrelatedMediaJob as any,
    deriveProfileSignals(sysadminProfile),
    sysadminProfile.preferences,
  );

  assert.ok(relevantEvidence.domainFitScore >= 60);
  assert.ok(unrelatedEvidence.domainFitScore <= 20);

  const relevantCompatibility = calculateCompatibility(
    relevantInfraJob as any,
    sysadminProfile,
    sysadminProfile.preferences,
  );
  const unrelatedCompatibility = calculateCompatibility(
    unrelatedMediaJob as any,
    sysadminProfile,
    sysadminProfile.preferences,
  );

  assert.ok(relevantCompatibility.compatibilityScore >= 80);
  assert.ok(unrelatedCompatibility.compatibilityScore <= 35);
  assert.ok(relevantCompatibility.compatibilityScore > unrelatedCompatibility.compatibilityScore);
});

test("domain filter rejects unrelated jobs and keeps aligned jobs", () => {
  const signals = deriveProfileSignals(sysadminProfile);

  assert.equal(
    jobMatchesProfileDomain(relevantInfraJob as any, signals, sysadminProfile.preferences),
    true,
  );
  assert.equal(
    jobMatchesProfileDomain(unrelatedMediaJob as any, signals, sysadminProfile.preferences),
    false,
  );
});

test("source query builder adapts queries to provider and geography", () => {
  const signals = deriveProfileSignals(sysadminProfile);

  const remotiveQueries = buildSourceQueries("remotive", signals);
  const adzunaQueries = buildSourceQueries("adzuna", signals);

  assert.ok(remotiveQueries.some((query: string) => /remote|latam/i.test(query)));
  assert.ok(adzunaQueries.some((query: string) => /perú|peru/i.test(query)));
  assert.ok(adzunaQueries.some((query: string) => /semi-senior/i.test(query)));
});

test("adzuna country mapping uses resident country from profile signals", () => {
  assert.equal(mapAdzunaCountry(deriveProfileSignals(sysadminProfile)), "pe");

  const colombiaSignals = deriveProfileSignals({
    ...sysadminProfile,
    preferences: {
      ...sysadminProfile.preferences,
      residentCountry: "Colombia",
    },
  });

  assert.equal(mapAdzunaCountry(colombiaSignals), "co");
});
