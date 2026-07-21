import { Candidacy, JobOffer } from "./types";

export const SEED_CANDIDACIES: Candidacy[] = [
  {
    id: "cand-seed-1",
    jobId: "job-fb-1",
    jobTitle: "Senior React Developer",
    company: "TechNova Solutions",
    location: "Remoto (LATAM)",
    locationType: "remoto",
    status: "ofrecido",
    appliedDate: "15 ene 2026",
    notes: "Entrevista final técnica completada con éxito. Recibí oferta formal por $4,800 USD/mes.",
    history: [
      { date: "15/01/2026", status: "guardado", comment: "Guardado desde LinkedIn" },
      { date: "16/01/2026", status: "postulado", comment: "Postulado con CV analizado" },
      { date: "24/01/2026", status: "entrevista", comment: "Entrevista técnica excelente" },
      { date: "05/02/2026", status: "ofrecido", comment: "Carta de oferta recibida" }
    ]
  },
  {
    id: "cand-seed-2",
    jobId: "job-fb-2",
    jobTitle: "Full Stack Software Engineer",
    company: "InnovaCorp",
    location: "Bogotá, Colombia (Híbrido)",
    locationType: "hibrido",
    status: "entrevista",
    appliedDate: "10 feb 2026",
    notes: "Segunda ronda de entrevista técnica de sistemas orientada a APIs REST con Node.js.",
    history: [
      { date: "10/02/2026", status: "postulado", comment: "Postulado vía Indeed" },
      { date: "20/02/2026", status: "entrevista", comment: "Llamada inicial exitosa con HR" }
    ]
  },
  {
    id: "cand-seed-3",
    jobId: "job-fb-3",
    jobTitle: "Backend Node.js Developer",
    company: "CoreSystems Global",
    location: "Remoto",
    locationType: "remoto",
    status: "postulado",
    appliedDate: "18 feb 2026",
    notes: "Postulado desde el buscador inteligente con IA. Esperando respuesta para contacto inicial.",
    history: [
      { date: "18/02/2026", status: "postulado", comment: "Postulado con perfil Inteligente" }
    ]
  },
  {
    id: "cand-seed-4",
    jobId: "job-fb-4",
    jobTitle: "Product Designer (UI/UX)",
    company: "PixelCraft Agency",
    location: "Madrid, España (Presencial)",
    locationType: "presencial",
    status: "rechazado",
    appliedDate: "05 mar 2026",
    notes: "Proceso cerrado de mutuo acuerdo. Buscaban residencia europea presencial de inmediato.",
    history: [
      { date: "05/03/2026", status: "postulado", comment: "Postulado directamente" },
      { date: "15/03/2026", status: "rechazado", comment: "Rechazado amablemente por correo" }
    ]
  },
  {
    id: "cand-seed-5",
    jobId: "job-seed-5",
    jobTitle: "Frontend Engineer (React/TypeScript)",
    company: "FintechFlow Inc",
    location: "Remoto",
    locationType: "remoto",
    status: "entrevista",
    appliedDate: "14 mar 2026",
    notes: "Entrevista técnica de arquitectura frontend. Sólido feedback sobre optimización de carga.",
    history: [
      { date: "14/03/2026", status: "postulado", comment: "Postulado en fintech" },
      { date: "22/03/2026", status: "entrevista", comment: "Live-coding realizado con buen desempeño" }
    ]
  },
  {
    id: "cand-seed-6",
    jobId: "job-seed-6",
    jobTitle: "Lead JavaScript Developer",
    company: "PayLedger Corp",
    location: "Remoto (Global)",
    locationType: "remoto",
    status: "postulado",
    appliedDate: "25 mar 2026",
    notes: "Postulado con CV optimizado por IA. Excelente salario pactado tentativamente.",
    history: [
      { date: "25/03/2026", status: "postulado", comment: "Postulado" }
    ]
  },
  {
    id: "cand-seed-7",
    jobId: "job-seed-7",
    jobTitle: "React/NextJS Developer",
    company: "MedTech Healthcare",
    location: "Remoto",
    locationType: "remoto",
    status: "postulado",
    appliedDate: "12 abr 2026",
    notes: "Propuesta enfocada en telemedicina. Pendiente de seguimiento del equipo de reclutamiento.",
    history: [
      { date: "12/04/2026", status: "postulado", comment: "Aplicado" }
    ]
  },
  {
    id: "cand-seed-8",
    jobId: "job-seed-8",
    jobTitle: "E-Commerce Frontend Developer",
    company: "MegaShop Retail",
    location: "Lima, Perú (Híbrido)",
    locationType: "hibrido",
    status: "guardado",
    appliedDate: "22 abr 2026",
    notes: "Guardado para aplicar cuando culmine la optimización de mi portafolio.",
    history: [
      { date: "22/04/2026", status: "guardado", comment: "Guardado" }
    ]
  },
  {
    id: "cand-seed-9",
    jobId: "job-seed-9",
    jobTitle: "AI Frontend Specialist",
    company: "OpenAI Labs",
    location: "Remoto (EE.UU.)",
    locationType: "remoto",
    status: "rechazado",
    appliedDate: "08 may 2026",
    notes: "Rechazado amablemente. El rol exige radicar exclusivamente en San Francisco, California.",
    history: [
      { date: "08/05/2026", status: "postulado", comment: "Postulado vía portal" },
      { date: "12/05/2026", status: "rechazado", comment: "Filtro geográfico de visa" }
    ]
  },
  {
    id: "cand-seed-10",
    jobId: "job-seed-10",
    jobTitle: "Full Stack Developer (Node/Next.js)",
    company: "SaaSify Hub",
    location: "Remoto",
    locationType: "remoto",
    status: "postulado",
    appliedDate: "20 may 2026",
    notes: "Envié postulación por correo electrónico al fundador directa tras recomendación.",
    history: [
      { date: "20/05/2026", status: "postulado", comment: "Postulado por email directo" }
    ]
  },
  {
    id: "cand-seed-11",
    jobId: "job-seed-11",
    jobTitle: "React Frontend Developer",
    company: "EduTech Global",
    location: "Remoto",
    locationType: "remoto",
    status: "ofrecido",
    appliedDate: "04 jun 2026",
    notes: "¡Oferta formal recibida! Compensación competitiva y excelente cultura remota de aprendizaje.",
    history: [
      { date: "04/06/2026", status: "postulado", comment: "Postulado" },
      { date: "12/06/2026", status: "entrevista", comment: "Llamada técnica completada" },
      { date: "28/06/2026", status: "ofrecido", comment: "Propuesta formal enviada por email" }
    ]
  }
];

export const SIMULATED_JOB_POOL: Omit<JobOffer, "compatibilityScore" | "compatibilityAnalysis">[] = [
  {
    id: "sim-job-1",
    title: "Senior React Developer",
    company: "FintechFlow Inc",
    location: "Remoto",
    locationType: "remoto",
    jobType: "completa",
    salary: "$4,500 - $5,500 USD/mes",
    description: "Buscamos un Ingeniero Frontend React Senior para liderar el desarrollo de nuestros nuevos tableros financieros interactivos de alta velocidad.",
    requirements: ["React 18+", "TypeScript", "Tailwind CSS", "Recharts", "Redux/Zustand"],
    sourcePlatform: "LinkedIn",
    seniorityLevel: "senior",
    postedDate: "Hace unos momentos",
    applyUrl: "https://linkedin.com/jobs"
  },
  {
    id: "sim-job-2",
    title: "Desarrollador Junior Frontend React",
    company: "SaaSify Hub",
    location: "Bogotá, Colombia",
    locationType: "hibrido",
    jobType: "completa",
    salary: "$1,200 - $1,800 USD/mes",
    description: "Excelente oportunidad para iniciar tu carrera como desarrollador de software construyendo componentes de UI y optimizando flujos de registro en nuestra plataforma SaaS.",
    requirements: ["React básico", "CSS / Tailwind", "Git", "Ganas de aprender"],
    sourcePlatform: "Indeed",
    seniorityLevel: "junior",
    postedDate: "Hace unos momentos",
    applyUrl: "https://indeed.com"
  },
  {
    id: "sim-job-3",
    title: "Backend Node.js Developer",
    company: "DeepTech AI Labs",
    location: "Ciudad de México, México",
    locationType: "presencial",
    jobType: "completa",
    salary: "$3,200 - $4,200 USD/mes",
    description: "Forma parte de nuestro equipo de inteligencia artificial escalando APIs, microservicios robustos e integraciones avanzadas de modelos de lenguaje natural.",
    requirements: ["Node.js / Express", "MongoDB", "PostgreSQL", "Docker", "REST APIs"],
    sourcePlatform: "Glassdoor",
    seniorityLevel: "semi-senior",
    postedDate: "Hace unos momentos",
    applyUrl: "https://glassdoor.com"
  },
  {
    id: "sim-job-4",
    title: "Product Designer (UI/UX)",
    company: "PixelCraft Agency",
    location: "Remoto (LATAM)",
    locationType: "remoto",
    jobType: "completa",
    salary: "$2,500 - $3,500 USD/mes",
    description: "Diseña experiencias digitales interactivas, prototipos interactivos y wireframes modernos para clientes de comercio electrónico globales.",
    requirements: ["Figma", "UI/UX", "Design Systems", "Prototipado", "Inglés intermedio"],
    sourcePlatform: "LinkedIn",
    seniorityLevel: "semi-senior",
    postedDate: "Hace unos momentos",
    applyUrl: "https://linkedin.com"
  },
  {
    id: "sim-job-5",
    title: "Lead AI Engineer",
    company: "NovaCloud Global",
    location: "Remoto",
    locationType: "remoto",
    jobType: "completa",
    salary: "$6,000 - $8,000 USD/mes",
    description: "Buscamos un Ingeniero Líder en IA para guiar la adopción de agentes autónomos inteligentes y pipelines de datos embebidos en el sector salud.",
    requirements: ["Python", "PyTorch/Tensorflow", "Gemini API / OpenAI SDK", "LangChain", "Inglés avanzado"],
    sourcePlatform: "LinkedIn",
    seniorityLevel: "senior",
    postedDate: "Hace unos momentos",
    applyUrl: "https://linkedin"
  },
  {
    id: "sim-job-6",
    title: "Full Stack Developer Trainee",
    company: "EduTech Global",
    location: "Santiago, Chile",
    locationType: "hibrido",
    jobType: "parcial",
    salary: "$600 - $900 USD/mes",
    description: "Inicia tus primeros pasos en el desarrollo web colaborando a tiempo parcial con nuestro equipo de educación interactiva para América Latina.",
    requirements: ["Javascript", "HTML/CSS", "React básico", "Node.js introductorio"],
    sourcePlatform: "Computrabajo",
    seniorityLevel: "trainee",
    postedDate: "Hace unos momentos",
    applyUrl: "https://computrabajo.com"
  },
  {
    id: "sim-job-7",
    title: "React Frontend Engineer",
    company: "ShopSphere Commerce",
    location: "Remoto",
    locationType: "remoto",
    jobType: "completa",
    salary: "$3,000 - $4,000 USD/mes",
    description: "Únete a un equipo ágil e internacional para desarrollar la siguiente generación de portales e-commerce headless utilizando React y Next.js.",
    requirements: ["React / Next.js", "Tailwind CSS", "GraphQL", "TypeScript", "Performance Tuning"],
    sourcePlatform: "Indeed",
    seniorityLevel: "semi-senior",
    postedDate: "Hace unos momentos",
    applyUrl: "https://indeed.com"
  }
];

