import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { recordGeminiFailure } from "./observability";
import { deriveProfileSignals } from "./profileSignals";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});


// Utility to handle missing API key gracefully
function checkApiKey(res: express.Response) {
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: "API Key de Gemini no configurada en las variables de entorno. Por favor, añádela en la sección Settings > Secrets."
    });
    return false;
  }
  return true;
}

// --- Fallback Strategies in case of Gemini 503 / High Demand / Quota errors ---

// --- Validation and Prioritization for SysAdmin and Infrastructure Roles ---
function validateAndPrioritizeSysAdmin(parsedData: any, originalText: string) {
  if (!parsedData) return parsedData;

  const text = (originalText + " " + JSON.stringify(parsedData)).toLowerCase();
  
  const sysadminKeywords = [
    "sysadmin", "system administrator", "administrador de sistemas", "administradora de sistemas",
    "linux", "windows server", "active directory", "vmware", "proxmox", "hyper-v", "redes", "networking",
    "cisco", "firewall", "nginx", "apache", "vpn", "dns", "dhcp", "servidores", "servers", "virtualizacion", "virtualización"
  ];
  
  const hasSysadminEvidence = sysadminKeywords.some(kw => text.includes(kw));
  
  if (hasSysadminEvidence) {
    console.log("[Validation] Sysadmin evidence detected! Prioritizing SysAdmin profile over generic developer profile.");
    
    // Ensure Sysadmin-specific skills are present and placed at the top of the skills array
    const keySysadminSkills = ["Linux", "Sysadmin", "Administración de Sistemas", "Servidores", "Redes"];
    if (!parsedData.skills) {
      parsedData.skills = [];
    }
    
    keySysadminSkills.forEach(skill => {
      if (text.includes(skill.toLowerCase()) && !parsedData.skills.some((s: string) => s.toLowerCase() === skill.toLowerCase())) {
        parsedData.skills.unshift(skill);
      }
    });

    // Scan experiences and make sure they are not classified as generic developers if they are sysadmins
    if (parsedData.experience && Array.isArray(parsedData.experience)) {
      parsedData.experience = parsedData.experience.map((exp: any) => {
        const roleLower = (exp.role || "").toLowerCase();
        const descLower = (exp.description || "").toLowerCase();
        
        const isGenericDev = roleLower.includes("desarrollador") || roleLower.includes("developer") || roleLower.includes("frontend") || roleLower.includes("programador");
        const hasSysadminTasks = descLower.includes("servidor") || descLower.includes("linux") || descLower.includes("redes") || descLower.includes("dns") || descLower.includes("active directory") || descLower.includes("sysadmin") || descLower.includes("administra") || descLower.includes("infraestructura") || descLower.includes("monitoreo");
        
        if (isGenericDev && hasSysadminTasks) {
          exp.role = `Administrador de Sistemas (Sysadmin) / ${exp.role}`;
          console.log(`[Validation] Corrected generic role '${roleLower}' to include SysAdmin.`);
        }
        return exp;
      });
    }
  }
  return parsedData;
}

function getFallbackCvAnalysis(cvText: string) {
  const text = cvText || "";
  const lines = text.split("\n").map(l => l.trim());

  // 1. Extract Contact Info
  // Email regex
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
  const emailMatch = text.match(emailRegex);
  const email = emailMatch ? emailMatch[0] : "";

  // Phone regex (extremely robust: matches +51 987 654 321, 987654321, etc.)
  const phoneRegex = /(?:\+?\d[\d\- \(\).]{7,16}\d)/;
  const phoneMatch = text.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0].trim() : "";

  // Name extraction (from first 15 lines)
  let name = "";
  const nameBannedKeywords = [
    "curriculum", "vitae", "resume", "cv", "perfil", "contacto", "correo", 
    "teléfono", "telefono", "email", "dirección", "direccion", "sobre mi", 
    "experiencia", "educación", "educacion", "habilidades", "aptitudes"
  ];
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    if (line.length > 3 && line.length < 50) {
      // Check if it is a pure text line with 2-4 words, starting with a capital letter
      const words = line.split(/\s+/);
      const isWordy = words.length >= 2 && words.length <= 4;
      const hasNumbers = /\d/.test(line);
      const hasEmailChar = line.includes("@");
      const hasSlash = line.includes("/");
      const containsBanned = nameBannedKeywords.some(kw => line.toLowerCase().includes(kw));
      
      if (isWordy && !hasNumbers && !hasEmailChar && !hasSlash && !containsBanned) {
        // Double check capital letters
        const isCapitalized = words.every(w => w[0] === w[0]?.toUpperCase());
        if (isCapitalized) {
          name = line;
          break;
        } else if (!name) {
          // Fallback to first decent line
          name = line;
        }
      }
    }
  }
  if (!name) {
    name = "Usuario TalentoMatch";
  }

  // 2. Comprehensive Skills Dictionary Check
  const commonSkills = [
    // Languages & Web Dev
    "React", "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind", "Next.js", "Vue", "Angular", "Svelte",
    "Node.js", "Express", "Python", "Django", "Flask", "Java", "Spring Boot", "C#", ".NET", "PHP", "Ruby", "Rails",
    "Go", "Golang", "Rust", "C++", "C", "Kotlin", "Swift", "Flutter", "React Native",
    // Systems & Infrastructure (Sysadmin)
    "Linux", "Ubuntu", "Debian", "CentOS", "RedHat", "RHEL", "Bash", "Shell", "PowerShell", "Scripting",
    "Windows Server", "Active Directory", "AD", "LDAP", "Nginx", "Apache", "IIS", "DNS", "DHCP", "VPN", "SSH",
    "VMware", "Proxmox", "Hyper-V", "KVM", "Virtualización", "Virtualizacion", "Virtualbox", "Citrix",
    "Redes", "Networking", "Cisco", "TCP/IP", "Subnetting", "VLAN", "Firewall", "Mikrotik", "Ubiquiti",
    "Servidores", "Backup", "Backups", "Veeam", "Storage", "SAN", "NAS", "RAID", "Sistemas Operativos",
    "Soporte", "Helpdesk", "ITIL", "GLPI", "Zabbix", "Nagios", "Prometheus", "Grafana", "Datadog", "Logstash",
    // DevOps & Cloud
    "DevOps", "AWS", "Amazon Web Services", "Docker", "Kubernetes", "K8s", "CI/CD", "GitHub Actions", "GitLab CI",
    "Jenkins", "Terraform", "Ansible", "Azure", "GCP", "Google Cloud", "Cloud", "SRE", "Helm", "ArgoCD", "Vagrant",
    // Databases
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Oracle", "SQL Server", "SQLite", "Redis", "Elasticsearch", "Cassandra", "MariaDB",
    // Tools & Methods
    "Git", "GitHub", "GitLab", "Bitbucket", "Agile", "Scrum", "Jira", "Trello", "Confluence", "API", "REST", "GraphQL", "gRPC"
  ];
  
  const skillsSet = new Set<string>();
  commonSkills.forEach(skill => {
    // Escape special chars like .js or C++
    const escapedSkill = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    let regex: RegExp;
    if (skill.endsWith("+") || skill.startsWith(".")) {
      regex = new RegExp(`(?:\\s|^)${escapedSkill}(?:\\s|$|,|\\.)`, "i");
    } else {
      regex = new RegExp(`\\b${escapedSkill}\\b`, "i");
    }
    
    if (regex.test(text)) {
      skillsSet.add(skill);
    }
  });

  // 3. Section Segmentation (Experience, Education, Skills)
  const experienceLines: string[] = [];
  const educationLines: string[] = [];
  const skillsLines: string[] = [];
  
  let currentSection: 'none' | 'experience' | 'education' | 'skills' | 'personal' = 'none';
  
  const expHeaders = ["experiencia", "trayectoria", "historial profesional", "historial laboral", "puestos", "empleos", "work experience", "employment"];
  const eduHeaders = ["educación", "educacion", "estudios", "formación", "formacion", "académic", "academic", "universidad", "cursos", "certificaciones", "certificados", "education", "certifications"];
  const skillHeaders = ["habilidades", "aptitudes", "conocimientos", "competencias", "skills", "tecnologías", "tecnologias", "herramientas"];
  
  lines.forEach(line => {
    const lowerLine = line.toLowerCase();
    
    // Check for section transitions
    const isExpHeader = expHeaders.some(h => lowerLine.includes(h)) && line.length < 40;
    const isEduHeader = eduHeaders.some(h => lowerLine.includes(h)) && line.length < 40;
    const isSkillHeader = skillHeaders.some(h => lowerLine.includes(h)) && line.length < 40;
    
    if (isExpHeader) {
      currentSection = 'experience';
      return;
    } else if (isEduHeader) {
      currentSection = 'education';
      return;
    } else if (isSkillHeader) {
      currentSection = 'skills';
      return;
    }
    
    if (currentSection === 'experience' && line.length > 0) {
      experienceLines.push(line);
    } else if (currentSection === 'education' && line.length > 0) {
      educationLines.push(line);
    } else if (currentSection === 'skills' && line.length > 0) {
      skillsLines.push(line);
    }
  });

  // Add any skills parsed directly from the "Skills" section
  skillsLines.forEach(line => {
    const parts = line.split(/[,/;•|•\t\-]+/).map(p => p.trim()).filter(p => p.length > 1);
    parts.forEach(p => {
      if (p.split(/\s+/).length <= 3 && p.length < 30) {
        const capitalized = p.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        skillsSet.add(capitalized);
      }
    });
  });

  const skills = Array.from(skillsSet);

  // 4. Parse Experiences Heuristically
  const experience: any[] = [];
  
  const isDateLine = (str: string) => {
    const patterns = [
      /\b(?:19|20)\d{2}\b/,
      /\b(?:ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i,
      /\b(?:presente|actualidad|today|now|present)\b/i,
      /\d{2}\/\d{2,4}/
    ];
    return patterns.some(pat => pat.test(str));
  };

  const isRoleLine = (str: string) => {
    const roles = [
      "desarrollador", "developer", "ingeniero", "engineer", "administrador", "analista", "soporte", "tecnico", 
      "coordinador", "director", "manager", "lead", "architect", "consultor", "especialista", "programador", 
      "jefe", "practicante", "intern", "sysadmin", "sre"
    ];
    const lower = str.toLowerCase();
    return roles.some(role => lower.includes(role));
  };

  if (experienceLines.length > 0) {
    let currentExp: any = null;
    let descLines: string[] = [];

    for (let i = 0; i < experienceLines.length; i++) {
      const line = experienceLines[i];
      const isBlockStart = (isRoleLine(line) || isDateLine(line)) && (line.length < 100);
      
      if (isBlockStart && (currentExp === null || descLines.length > 0)) {
        if (currentExp) {
          currentExp.description = descLines.join("\n");
          experience.push(currentExp);
          descLines = [];
        }
        
        let company = "";
        let role = "";
        let duration = "";
        
        const parts = line.split(/\s*[:|•,\-–—]\s*/).map(p => p.trim()).filter(p => p.length > 0);
        
        parts.forEach(part => {
          if (isDateLine(part)) {
            duration = part;
          } else if (isRoleLine(part)) {
            role = part;
          } else if (part.length > 2 && part.length < 50) {
            if (!company) company = part;
            else if (!role) role = part;
          }
        });
        
        if ((!role || !company) && i + 1 < experienceLines.length) {
          const nextLine = experienceLines[i + 1];
          if (!isDateLine(nextLine) && !isRoleLine(nextLine) && nextLine.length < 60) {
            if (!company) {
              company = nextLine;
              i++;
            }
          }
        }
        
        if (!role) {
          role = parts.find(p => isRoleLine(p)) || "Colaborador Profesional";
        }
        if (!company) {
          company = "Empresa Tecnológica";
        }
        if (!duration) {
          duration = "Período no especificado";
        }
        
        currentExp = { company, role, duration, description: "" };
      } else {
        if (currentExp) {
          descLines.push(line);
        } else {
          currentExp = {
            company: "Empresa",
            role: "Puesto Profesional",
            duration: "Período",
            description: ""
          };
          descLines.push(line);
        }
      }
    }
    
    if (currentExp) {
      currentExp.description = descLines.join("\n") || "Responsabilidades y logros profesionales.";
      experience.push(currentExp);
    }
  }

  // 5. Parse Education Heuristically
  const education: any[] = [];
  if (educationLines.length > 0) {
    let currentEdu: any = null;
    
    for (let i = 0; i < educationLines.length; i++) {
      const line = educationLines[i];
      const lowerLine = line.toLowerCase();
      
      const eduKeywords = ["bachiller", "licencia", "ingenier", "técnico", "tecnólog", "master", "maestría", "doctorado", "curso", "certific", "certified", "universidad", "instituto", "bootcamp", "colegio", "school", "academy"];
      const isEduBlock = eduKeywords.some(kw => lowerLine.includes(kw)) || isDateLine(line);
      
      if (isEduBlock && line.length < 120) {
        if (currentEdu) {
          education.push(currentEdu);
        }
        
        let institution = "";
        let degree = "";
        let duration = "";
        
        const parts = line.split(/\s*[:|•,\-–—]\s*/).map(p => p.trim()).filter(p => p.length > 0);
        parts.forEach(part => {
          if (isDateLine(part)) {
            duration = part;
          } else if (part.toLowerCase().includes("universidad") || part.toLowerCase().includes("instituto") || part.toLowerCase().includes("academy") || part.toLowerCase().includes("school") || part.toLowerCase().includes("colegio") || part.toLowerCase().includes("bootcamp")) {
            institution = part;
          } else {
            if (!degree) degree = part;
            else if (!institution) institution = part;
          }
        });
        
        if (!degree) degree = "Estudios / Certificación";
        if (!institution) institution = "Institución de Formación";
        if (!duration) duration = "Período";
        
        currentEdu = { institution, degree, duration };
      } else {
        if (currentEdu) {
          if (currentEdu.institution === "Institución de Formación") {
            currentEdu.institution = line;
          } else {
            currentEdu.degree += ` - ${line}`;
          }
        }
      }
    }
    
    if (currentEdu) {
      education.push(currentEdu);
    }
  }

  // 6. Final Fallback Safeguards if lists are empty
  if (experience.length === 0) {
    experience.push({
      company: "Empresa Tecnológica",
      role: "Especialista Profesional",
      duration: "Período Reciente",
      description: "Colaboración profesional, resolución de desafíos técnicos y desarrollo continuo."
    });
  }
  
  if (education.length === 0) {
    education.push({
      institution: "Institución Superior",
      degree: "Formación Profesional / Autodidacta",
      duration: "Completado"
    });
  }

  const rawResult = {
    name,
    email,
    phone,
    skills,
    experience,
    education
  };

  return validateAndPrioritizeSysAdmin(rawResult, cvText);
}

const DEFAULT_FALLBACK_JOBS = [
  {
    id: "job-fb-1",
    title: "Senior React Developer",
    company: "TechNova Solutions",
    location: "Remoto (LATAM)",
    locationType: "remoto",
    jobType: "completa",
    salary: "$3,500 - $5,000 USD/mes",
    description: "Buscamos un desarrollador Frontend con experiencia sólida en React, TypeScript y diseño responsivo para integrarse a nuestro equipo ágil internacional.",
    requirements: ["Mínimo 4 años de experiencia con React", "Fuerte dominio de TypeScript", "Experiencia con CSS moderno (Tailwind, CSS Modules)", "Habilidades de comunicación efectivas"],
    sourcePlatform: "LinkedIn",
    compatibilityScore: 92,
    compatibilityAnalysis: "Tu perfil tiene una excelente coincidencia con los requisitos de React y desarrollo frontend. Se alinea perfectamente con tu expectativa salarial y modalidad remota.",
    seniorityLevel: "senior",
    postedDate: "Hace 2 horas",
    applyUrl: "#"
  },
  {
    id: "job-fb-2",
    title: "Full Stack Software Engineer",
    company: "InnovaCorp",
    location: "Bogotá, Colombia (Híbrido)",
    locationType: "hibrido",
    jobType: "completa",
    salary: "$2,800 - $3,800 USD/mes",
    description: "Únete a nuestro equipo para construir la próxima generación de productos SaaS. Trabajarás con Node.js en el backend y React en el frontend.",
    requirements: ["Experiencia con React y Node.js", "Diseño de APIs REST y bases de datos PostgreSQL", "Familiaridad con Docker", "Inglés intermedio o avanzado"],
    sourcePlatform: "Indeed",
    compatibilityScore: 85,
    compatibilityAnalysis: "Buen encaje en el stack tecnológico completo (frontend y backend). La ubicación híbrida es ideal para quienes prefieren flexibilidad laboral.",
    seniorityLevel: "semi-senior",
    postedDate: "Ayer",
    applyUrl: "#"
  },
  {
    id: "job-fb-3",
    title: "Backend Node.js Developer",
    company: "CoreSystems Global",
    location: "Remoto",
    locationType: "remoto",
    jobType: "completa",
    salary: "$3,000 - $4,500 USD/mes",
    description: "Buscamos un desarrollador Backend apasionado por las APIs rápidas, escalables y seguras utilizando Node.js, Express y bases de datos NoSQL.",
    requirements: ["Sólida experiencia en Node.js y JavaScript/TypeScript", "Conocimientos en bases de datos relacionales y no relacionales", "Testing unitario (Jest, Mocha)", "Control de versiones con Git"],
    sourcePlatform: "Computrabajo",
    compatibilityScore: 78,
    compatibilityAnalysis: "Cumples con las bases tecnológicas de JavaScript/TypeScript, aunque el puesto requiere mayor especialización en arquitectura backend pura.",
    seniorityLevel: "semi-senior",
    postedDate: "Hace 2 días",
    applyUrl: "#"
  },
  {
    id: "job-fb-4",
    title: "Product Designer (UI/UX)",
    company: "PixelCraft Agency",
    location: "Madrid, España (Presencial)",
    locationType: "presencial",
    jobType: "completa",
    salary: "32,000€ - 38,000€/año",
    description: "Buscamos un diseñador de producto que entienda el comportamiento del usuario y cree experiencias interactivas hermosas e intuitivas.",
    requirements: ["Dominio experto de Figma y herramientas de prototipado", "Diseño de sistemas de componentes", "Experiencia realizando pruebas de usabilidad", "Portafolio demostrable"],
    sourcePlatform: "Tecnoempleo",
    compatibilityScore: 65,
    compatibilityAnalysis: "Tu perfil está más orientado al desarrollo, pero tus habilidades de maquetación y CSS son valiosas para colaborar estrechamente con el equipo de diseño.",
    seniorityLevel: "semi-senior",
    postedDate: "Hace 3 días",
    applyUrl: "#"
  }
];

function getFallbackJobs(query: string, profile: any, preferences: any) {
  const cleanQuery = (query || "").toLowerCase();
  
  // Detect SysAdmin or DevOps in query or profile
  const roles = profile?.experience?.map((e: any) => (e.role || "").toLowerCase()) || [];
  const skills = profile?.skills?.map((s: string) => s.toLowerCase()) || [];
  
  const isSysAdmin = cleanQuery.includes("sysadmin") || cleanQuery.includes("system") || cleanQuery.includes("administrador") || cleanQuery.includes("redes") || cleanQuery.includes("linux") ||
                    roles.some((r: string) => r.includes("sysadmin") || r.includes("system") || r.includes("administrador") || r.includes("linux")) ||
                    skills.some((s: string) => s.includes("sysadmin") || s.includes("linux") || s.includes("system") || s.includes("redes") || s.includes("servidor"));
                    
  const isDevOps = cleanQuery.includes("devops") || cleanQuery.includes("cloud") || cleanQuery.includes("docker") || cleanQuery.includes("kubernetes") || cleanQuery.includes("aws") ||
                   roles.some((r: string) => r.includes("devops") || r.includes("site reliability") || r.includes("sre") || r.includes("cloud")) ||
                   skills.some((s: string) => s.includes("devops") || s.includes("docker") || s.includes("kubernetes") || s.includes("aws") || s.includes("terraform"));

  let baseJobs = DEFAULT_FALLBACK_JOBS.map(job => ({ ...job }));

  if (isSysAdmin) {
    baseJobs = [
      {
        id: "job-fb-sys-1",
        title: "Administrador de Sistemas Linux Senior (Sysadmin)",
        company: "CloudScale Networks",
        location: "Remoto (LATAM)",
        locationType: "remoto",
        jobType: "completa",
        salary: "$3,500 - $4,800 USD/mes",
        description: "Buscamos un SysAdmin Linux experimentado para administrar, optimizar y asegurar nuestra infraestructura híbrida de servidores y servicios de producción.",
        requirements: ["Sólido dominio de distribuciones Linux (Ubuntu, Debian, CentOS)", "Automatización y scripting con Bash o Python", "Administración de servidores web (Nginx, Apache) y bases de datos", "Configuración de seguridad, firewalls (iptables, UFW) y VPNs"],
        sourcePlatform: "LinkedIn",
        compatibilityScore: 95,
        compatibilityAnalysis: "Excelente encaje con tu perfil de Administrador de Sistemas. Las habilidades de gestión de servidores Linux y redes que tienes son prioritarias para este puesto.",
        seniorityLevel: "senior",
        postedDate: "Hace 2 horas",
        applyUrl: "#"
      },
      {
        id: "job-fb-sys-2",
        title: "Ingeniero de Infraestructura y Redes (SysAdmin)",
        company: "NetCore Integrators",
        location: "Lima, Perú (Híbrido)",
        locationType: "hibrido",
        jobType: "completa",
        salary: "$2,200 - $3,200 USD/mes",
        description: "Únete a nuestro equipo para diseñar, implementar y mantener redes corporativas, servidores Windows Server con Active Directory, y entornos virtualizados.",
        requirements: ["Administración de Windows Server y Active Directory", "Virtualización de servidores con VMware ESXi, Proxmox o Hyper-V", "Configuración de redes LAN/WAN y firewalls corporativos", "Soporte técnico avanzado de infraestructura de TI"],
        sourcePlatform: "Computrabajo",
        compatibilityScore: 88,
        compatibilityAnalysis: "Tu experiencia práctica como SysAdmin y conocimientos en virtualización y redes de servidores cubren más del 85% de los requisitos solicitados.",
        seniorityLevel: "semi-senior",
        postedDate: "Ayer",
        applyUrl: "#"
      },
      {
        id: "job-fb-sys-3",
        title: "DevOps / Cloud Administrator",
        company: "SysOps Enterprises",
        location: "Remoto",
        locationType: "remoto",
        jobType: "completa",
        salary: "$4,000 - $5,500 USD/mes",
        description: "Buscamos un Administrador de Sistemas en transición a DevOps para gestionar infraestructura de nube, automatizar despliegues y mantener alta disponibilidad de servicios.",
        requirements: ["Experiencia con contenedores Docker y orquestación con Kubernetes", "Conocimientos en AWS, Azure o GCP", "Automatización con Ansible, Terraform o similar", "Administración de servidores Linux de producción"],
        sourcePlatform: "Indeed",
        compatibilityScore: 80,
        compatibilityAnalysis: "Muy buen encaje para avanzar tu carrera desde SysAdmin puro hacia DevOps y Cloud. Cumples con los fundamentos de servidores Linux y bash scripting.",
        seniorityLevel: "semi-senior",
        postedDate: "Hace 3 días",
        applyUrl: "#"
      }
    ];
  } else if (isDevOps) {
    baseJobs = [
      {
        id: "job-fb-devops-1",
        title: "Senior DevOps Engineer",
        company: "StackOps International",
        location: "Remoto (Global)",
        locationType: "remoto",
        jobType: "completa",
        salary: "$4,500 - $6,500 USD/mes",
        description: "Buscamos un Ingeniero DevOps Senior para liderar la arquitectura de infraestructura como código, pipelines de CI/CD y automatización de despliegues.",
        requirements: ["Experiencia robusta con Terraform y Ansible", "Orquestación de contenedores con Kubernetes y Docker", "Diseño de pipelines CI/CD (GitHub Actions, GitLab CI)", "Fuerte conocimiento de plataformas de nube (AWS, GCP)"],
        sourcePlatform: "LinkedIn",
        compatibilityScore: 92,
        compatibilityAnalysis: "Tu perfil de DevOps coincide con el stack tecnológico requerido (AWS, Docker, Kubernetes). Excelente oportunidad remota con alto puntaje.",
        seniorityLevel: "senior",
        postedDate: "Hace 4 horas",
        applyUrl: "#"
      }
    ];
  } else if (cleanQuery && cleanQuery.trim().length > 0) {
    const formattedQuery = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);
    baseJobs = baseJobs.map((job, idx) => {
      let title = job.title;
      let requirements = [...job.requirements];
      let description = job.description;

      if (idx === 0) {
        title = `Senior ${formattedQuery} Developer`;
        requirements[0] = `Mínimo 4 años de experiencia con ${formattedQuery}`;
        requirements[1] = `Fuerte dominio técnico de arquitectura con ${formattedQuery}`;
        description = `Buscamos un especialista de primer nivel en ${formattedQuery} para liderar el diseño de nuestro core de productos y APIs.`;
      } else if (idx === 1) {
        title = `${formattedQuery} Software Engineer`;
        requirements[0] = `Experiencia comprobable desarrollando con ${formattedQuery}`;
        description = `Únete a nuestro equipo ágil para integrar tecnologías innovadoras y construir servicios utilizando ${formattedQuery}.`;
      }

      return {
        ...job,
        title,
        requirements,
        description,
        compatibilityScore: Math.floor(Math.random() * 20) + 75
      };
    });
  }

  // Adjust details based on preferences if possible
  if (preferences) {
    baseJobs = baseJobs.map(job => {
      let location = job.location;
      let locationType = job.locationType as "remoto" | "presencial" | "hibrido";
      let salary = job.salary;

      if (preferences.locationType && preferences.locationType !== 'cualquiera') {
        locationType = preferences.locationType as "remoto" | "presencial" | "hibrido";
        location = locationType === 'remoto' ? 'Remoto' : locationType === 'hibrido' ? 'Híbrido' : 'Presencial';
      }

      if (preferences.desiredSalaryRange) {
        const { min, max, currency } = preferences.desiredSalaryRange;
        salary = `${min} - ${max || (min * 1.5)} ${currency}/mes`;
      }

      return {
        ...job,
        location,
        locationType,
        salary
      };
    });
  }

  return baseJobs;
}

function getFallbackRecommendations(profile: any, candidacies: any) {
  const skills = profile?.skills || ["React", "Node.js", "TypeScript"];
  const topSkill = skills[0] || "Desarrollo de Software";
  const activeProcesses = candidacies?.length || 0;

  return [
    {
      title: "Optimización Estratégica de tu CV para ATS",
      category: "cv" as const,
      description: `Basado en tu perfil enfocado en ${topSkill}, los sistemas ATS de las empresas buscan términos clave específicos. Te sugerimos estructurar tu currículum destacando logros cuantificables en lugar de solo listar tus responsabilidades de forma descriptiva.`,
      actionableSteps: [
        "Añade métricas y porcentajes a tus puestos anteriores (ej: 'Mejora del 25% en rendimiento de carga').",
        `Asegúrate de que la palabra clave '${topSkill}' aparezca en el título principal y en tu resumen ejecutivo.`
      ]
    },
    {
      title: `Ruta de Aprendizaje: Especialización en ${topSkill}`,
      category: "skills" as const,
      description: `Para complementar tus habilidades actuales en ${skills.slice(0, 3).join(", ")}, el mercado actual demanda fuerte dominio de metodologías ágiles, arquitectura en la nube (AWS/GCP) y patrones de diseño avanzados.`,
      actionableSteps: [
        "Dedica 2 horas semanales a estudiar conceptos básicos de Docker y despliegue continuo (CI/CD).",
        `Crea un proyecto práctico en tu portfolio que combine ${topSkill} con integración de bases de datos relacionales.`
      ]
    },
    {
      title: activeProcesses > 0 ? "Preparación de entrevistas técnicas activas" : "Simulación de entrevistas y elevator pitch",
      category: "interview" as const,
      description: activeProcesses > 0 
        ? `Tienes ${activeProcesses} postulaciones activas en tu panel. Es momento de perfeccionar tu narrativa sobre proyectos anteriores y preparar respuestas con la metodología STAR.`
        : "Prepárate para destacar en tus próximas postulaciones estructurando un elevator pitch de 60 segundos que resuma tu propuesta de valor.",
      actionableSteps: [
        "Practica responder la pregunta: 'Háblame de un reto técnico difícil que hayas resuelto' usando la estructura STAR.",
        "Prepara 3 preguntas inteligentes sobre cultura de ingeniería y retos técnicos para hacerle a tus entrevistadores."
      ]
    },
    {
      title: "Análisis inteligente del mercado y bandas salariales",
      category: "market" as const,
      description: "El sector tecnológico está experimentando una consolidación en ofertas remotas para puestos senior y híbridas para semi-senior. Tu rango salarial esperado está bien alineado con la media de la industria.",
      actionableSteps: [
        "Configura alertas de empleo específicas los martes y jueves por la mañana, que son los días con mayor publicación de vacantes.",
        "Amplía tu red de contactos en LinkedIn conectando con 5 recruiters técnicos de empresas aliadas esta semana."
      ]
    }
  ];
}

// 1. Analyze CV Endpoint
const cvAnalyzeHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { cvText, fileData, mimeType, fileName } = req.body;
  if ((!cvText || cvText.trim().length === 0) && (!fileData || !mimeType)) {
    return res.status(400).json({ error: "No se proporcionó texto de CV ni archivo válido para analizar" });
  }

  try {
    const contents: any[] = [];

    const promptText = `Analiza el documento de currículum (CV) adjunto de forma extremadamente exhaustiva, detallada, rigurosa y profesional.

    INSTRUCCIONES CRÍTICAS PARA LA EXTRACCIÓN COMPLETA (¡PROHIBIDO TRUNCAR, REUMIR O ALUCINAR!):
    1. INFORMACIÓN DE CONTACTO: Extrae con total precisión el nombre completo real del candidato (generalmente ubicado al inicio del CV). No uses un nombre genérico como "Usuario TalentoMatch" ni omitas apellidos. Encuentra y extrae el correo electrónico de contacto y el número de teléfono móvil o de casa con absoluta precisión. Si hay varios correos o teléfonos, lístalos o extrae el principal de forma íntegra. Si no se especifican, déjalos como cadena vacía (""). JAMÁS inventes datos de contacto.
    2. HABILIDADES TÉCNICAS Y BLANDAS: Escanea TODO el texto y extrae absolutamente TODAS las tecnologías, herramientas, lenguajes de programación, frameworks, librerías, bases de datos, nubes (AWS, Azure, GCP, etc.), sistemas operativos (Linux, Windows Server, macOS, etc.), servidores (Nginx, Apache, Active Directory, etc.), herramientas de red, herramientas de monitoreo o metodologías mencionadas en cualquier sección. No omitas ninguna por considerarla secundaria o común; es obligatorio construir una lista sumamente exhaustiva de todas las aptitudes del candidato.
    3. EXPERIENCIA LABORAL COMPLETA: Extrae TODOS los puestos de trabajo y empleos que el candidato tiene listados en su historial laboral, de forma completa y cronológica, sin omitir absolutamente ninguno por antiguo, corto o secundario. Para cada puesto individual:
       - Identifica con total exactitud el nombre de la empresa u organización contratante.
       - Identifica el rol o puesto de trabajo preciso (ej: "Administrador de Sistemas Linux", "Ingeniero Cloud DevOps", "Soporte Técnico Especialista").
       - Extrae la duración o fechas completas tal cual aparecen en el CV (ej: "Marzo 2018 - Enero 2022", "Presente").
       - Elabora una descripción sumamente rica, detallada y extendida de todas sus tareas, responsabilidades y logros clave en ese puesto. Conserva y detalla todos los logros cuantitativos y las tecnologías específicas utilizadas en ese puesto. Prohibido resumir a una sola frase o truncar el historial.
    4. EDUCACIÓN, CERTIFICACIONES Y CURSOS: Escanea el CV completo en busca de estudios formales, carreras técnicas o universitarias, diplomados, bootcamps, cursos o certificaciones oficiales (ej: "Cisco CCNA", "AWS Certified Cloud Practitioner", "Certificación Scrum Master", etc.). Extrae CADA UNO de estos registros individualmente indicando la institución educativa o certificadora, el nombre completo de la carrera/curso/certificación obtenida, y el período o año correspondiente de manera precisa.

    ATENCIÓN CRÍTICA DE VALIDACIÓN Y PRIORIZACIÓN DE ROLES:
    - Clasifica con precisión el rol principal y real de la persona.
    - Si el candidato demuestra habilidades, tareas o responsabilidades relacionadas con administración de sistemas, infraestructura, gestión de servidores, Linux, Windows Server, redes, DHCP, DNS, Active Directory, virtualización o copias de seguridad/backups:
      DEBES clasificarlo prioritariamente como Administrador de Sistemas (Sysadmin) / Ingeniero de Sistemas.
      BAJO NINGUNA CIRCUNSTANCIA debes asignarle por defecto perfiles genéricos de desarrollo o desarrollo frontend (como 'Desarrollador Frontend' o 'Developer') a menos que el perfil sea puramente de maquetación y diseño sin tareas de servidores.
      Los perfiles de SysAdmin e infraestructura se priorizan estrictamente sobre perfiles de desarrollo genéricos.`;

    if (fileData && mimeType) {
      // Correct multi-part content array structure for @google/genai SDK
      contents.push({
        role: "user",
        parts: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          {
            text: promptText
          }
        ]
      });
    } else {
      // Text CV structure using proper Content object
      contents.push({
        role: "user",
        parts: [
          {
            text: `${promptText}\n\nCurrículum del Candidato:\n"""\n${cvText}\n"""`
          }
        ]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: contents,
      config: {
        systemInstruction: "Eres un analizador de currículums de ultra precisión y un experto reclutador técnico (IT Recruiter). Tu única misión es extraer toda la información del CV adjunto con absoluta fidelidad, integridad y máximo nivel de detalle, sin omitir ninguna habilidad, experiencia, estudio o certificación, y sin realizar resúmenes reductivos. Genera obligatoriamente una estructura JSON limpia e impecable que se ajuste exactamente al esquema proporcionado, libre de textos aclaratorios o decoraciones fuera del JSON.",
        temperature: 0.1, // Baja temperatura para mantener una extracción determinista y fiel al texto original
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { 
              type: Type.STRING, 
              description: "Nombre completo real del candidato tal como figura en su currículum. Prohibido usar nombres de ejemplo o ficticios." 
            },
            email: { 
              type: Type.STRING, 
              description: "Correo electrónico del candidato extraído con precisión. Si no se encuentra, deja un string vacío." 
            },
            phone: { 
              type: Type.STRING, 
              description: "Número de teléfono de contacto (móvil o fijo) del candidato. Extrae cualquier formato disponible. Si no se encuentra, deja un string vacío." 
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista completa e individual de todas las habilidades técnicas, lenguajes de programación, herramientas, bases de datos, nubes, servidores, sistemas operativos o metodologías mencionadas en el CV."
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { 
                    type: Type.STRING, 
                    description: "Nombre de la empresa, compañía u organización." 
                  },
                  role: { 
                    type: Type.STRING, 
                    description: "Título del puesto de trabajo exacto y preciso." 
                  },
                  duration: { 
                    type: Type.STRING, 
                    description: "Período o fechas de duración del empleo, ej. 'Enero 2020 - Diciembre 2023', '2019 - Presente', o el valor 'No especificado'." 
                  },
                  description: { 
                    type: Type.STRING, 
                    description: "Descripción detallada, completa y extendida de las funciones, responsabilidades principales, logros y tecnologías utilizadas en este rol. ¡No la resumas!" 
                  }
                },
                required: ["company", "role", "duration", "description"]
              },
              description: "Historial completo de todas las experiencias de trabajo del candidato, ordenadas de la más reciente a la más antigua."
            },
            education: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  institution: { 
                    type: Type.STRING, 
                    description: "Nombre completo de la institución educativa, universidad, instituto, centro o plataforma de cursos/certificaciones." 
                  },
                  degree: { 
                    type: Type.STRING, 
                    description: "Título, grado académico, carrera cursada, curso de capacitación o nombre de la certificación oficial obtenida." 
                  },
                  duration: { 
                    type: Type.STRING, 
                    description: "Período de estudios, año de graduación o de obtención de la certificación, o el valor 'No especificado' si no se menciona." 
                  }
                },
                required: ["institution", "degree", "duration"]
              },
              description: "Historial completo de educación formal, estudios superiores, carreras técnicas, cursos de especialización y certificaciones oficiales."
            }
          },
          required: ["name", "email", "phone", "skills", "experience", "education"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se pudo obtener una respuesta del modelo de análisis");
    }

    let parsedData = JSON.parse(resultText.trim());
    
    // Apply server-side prioritization and correction validation rules
    parsedData = validateAndPrioritizeSysAdmin(parsedData, cvText || "");
    
    return res.json(parsedData);
  } catch (error: any) {
    recordGeminiFailure("cv.analyze", error);
    console.warn("[Service Status] Gemini API unavailable or failed during CV analysis, activating local fallback engine.", error);
    try {
      let textToFallback = cvText || "";
      if (!textToFallback && fileName) {
        // Build hints from the filename so the fallback can guess the profession
        textToFallback = `Nombre: ${fileName.split('.')[0].replace(/_/g, ' ')}\n`;
        const fn = fileName.toLowerCase();
        if (fn.includes("sysadmin") || fn.includes("system") || fn.includes("administrador") || fn.includes("redes") || fn.includes("linux") || fn.includes("infraestructura") || fn.includes("soporte")) {
          textToFallback += `Habilidades de sysadmin y redes. Administrador de Sistemas Linux. Windows Server, Active Directory, Nginx, Redes.`;
        } else if (fn.includes("devops") || fn.includes("cloud") || fn.includes("docker") || fn.includes("aws")) {
          textToFallback += `Habilidades de DevOps. Terraform, Kubernetes, AWS, Docker.`;
        }
      }
      const fallbackAnalysis = getFallbackCvAnalysis(textToFallback);
      return res.json(fallbackAnalysis);
    } catch (fallbackError) {
      return res.status(500).json({
        error: "Error interno al analizar el CV con inteligencia artificial: " + (error.message || error)
      });
    }
  }
};

type SupportedJobSource = "remotive" | "adzuna";

interface RealJobSearchCandidate {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: "remoto" | "presencial" | "hibrido";
  jobType: "completa" | "parcial";
  salary: string;
  description: string;
  requirements: string[];
  sourcePlatform: string;
  seniorityLevel: "trainee" | "junior" | "semi-senior" | "senior";
  postedDate: string;
  applyUrl: string;
}

function stripHtmlTags(value: string | undefined) {
  return (value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferLocationType(location: string) {
  const normalized = location.toLowerCase();
  if (normalized.includes("hybrid") || normalized.includes("híbrido") || normalized.includes("hibrido")) {
    return "hibrido" as const;
  }
  if (normalized.includes("remote") || normalized.includes("remoto") || normalized.includes("worldwide") || normalized.includes("anywhere")) {
    return "remoto" as const;
  }
  return "presencial" as const;
}

function inferJobType(jobType: string | undefined) {
  const normalized = (jobType || "").toLowerCase();
  return normalized.includes("part") ? "parcial" as const : "completa" as const;
}

function inferSeniority(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("intern") || text.includes("trainee") || text.includes("practic")) {
    return "trainee" as const;
  }
  if (text.includes("senior") || text.includes("lead") || text.includes("principal") || text.includes("staff")) {
    return "senior" as const;
  }
  if (text.includes("junior") || text.includes("entry")) {
    return "junior" as const;
  }
  return "semi-senior" as const;
}

function formatPostedDate(dateValue: string | undefined) {
  if (!dateValue) return "Fecha no disponible";
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Ayer";
  }
  return `Hace ${diffDays} días`;
}

function extractRequirements(description: string, fallbackTerms: string[] = []) {
  const knownKeywords = [
    "react",
    "typescript",
    "javascript",
    "node",
    "node.js",
    "next.js",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "terraform",
    "postgresql",
    "postgres",
    "python",
    "java",
    "figma",
    "linux",
    "devops",
    "sre",
    "ci/cd",
    "graphql",
    "sql",
    "rest",
  ];

  const normalizedDescription = description.toLowerCase();
  const matchedKeywords = knownKeywords.filter((keyword) => normalizedDescription.includes(keyword));
  const combined = [...matchedKeywords, ...fallbackTerms].filter(Boolean);
  const unique = Array.from(new Set(combined));
  return unique.slice(0, 6).map((item) => item.toUpperCase() === item ? item : item.replace(/\b\w/g, (char) => char.toUpperCase()));
}

function calculateCompatibility(candidate: RealJobSearchCandidate, profile: any, preferences: any) {
  let score = 55;
  const reasons: string[] = [];
  const profileSkills = (profile?.skills || []).map((skill: string) => skill.toLowerCase());
  const requirements = candidate.requirements.map((item) => item.toLowerCase());

  const matchingSkills = requirements.filter((requirement) =>
    profileSkills.some((skill: string) => skill.includes(requirement) || requirement.includes(skill)),
  );

  if (matchingSkills.length > 0) {
    score += Math.min(25, matchingSkills.length * 6);
    reasons.push(`coincidencias técnicas en ${matchingSkills.slice(0, 3).join(", ")}`);
  }

  const preferredLocationType = preferences?.locationType || "cualquiera";
  if (preferredLocationType === "cualquiera" || preferredLocationType === candidate.locationType) {
    score += 12;
    reasons.push(`modalidad ${candidate.locationType}`);
  }

  const preferredJobType = preferences?.jobType || "cualquiera";
  if (preferredJobType === "cualquiera" || preferredJobType === candidate.jobType) {
    score += 8;
    reasons.push(`jornada ${candidate.jobType}`);
  }

  const expectedSeniority = preferences?.seniorityLevel || "cualquiera";
  if (expectedSeniority === "cualquiera" || expectedSeniority === candidate.seniorityLevel) {
    score += 10;
    reasons.push(`seniority ${candidate.seniorityLevel}`);
  }

  score = Math.max(45, Math.min(98, score));
  return {
    compatibilityScore: score,
    compatibilityAnalysis: reasons.length > 0
      ? `Oferta real recuperada desde ${candidate.sourcePlatform}. Coincide contigo por ${reasons.join(", ")}. Revisa requisitos y aplica desde el enlace oficial.`
      : `Oferta real recuperada desde ${candidate.sourcePlatform}. La coincidencia es moderada y conviene revisar requisitos, seniority y salario antes de aplicar.`,
  };
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TalentoMatchIA/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while requesting ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRemotiveJobs(query: string) {
  const payload = await fetchJsonWithTimeout(`https://remotive.com/api/remote-jobs?limit=12&search=${encodeURIComponent(query)}`);
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];

  return jobs.map((job: any) => {
    const description = stripHtmlTags(job.description);
    return {
      id: `remotive-${job.id}`,
      title: job.title || "Vacante remota",
      company: job.company_name || "Empresa no especificada",
      location: job.candidate_required_location || "Worldwide",
      locationType: inferLocationType(job.candidate_required_location || "remote"),
      jobType: inferJobType(job.job_type),
      salary: job.salary || "Salario no publicado",
      description,
      requirements: extractRequirements(description, [job.category, job.job_type]),
      sourcePlatform: "Remotive",
      seniorityLevel: inferSeniority(job.title || "", description),
      postedDate: formatPostedDate(job.publication_date),
      applyUrl: job.url,
    } satisfies RealJobSearchCandidate;
  });
}

async function fetchAdzunaJobs(query: string) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    return [] as RealJobSearchCandidate[];
  }

  const country = process.env.ADZUNA_COUNTRY || "us";
  const payload = await fetchJsonWithTimeout(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&results_per_page=12&what=${encodeURIComponent(query)}&content-type=application/json`,
  );
  const results = Array.isArray(payload?.results) ? payload.results : [];

  return results.map((job: any) => {
    const description = stripHtmlTags(job.description);
    const area = Array.isArray(job.location?.area) ? job.location.area.filter(Boolean).join(", ") : "";
    return {
      id: `adzuna-${job.id}`,
      title: job.title || "Vacante",
      company: job.company?.display_name || "Empresa no especificada",
      location: job.location?.display_name || area || "Ubicación no especificada",
      locationType: inferLocationType(job.location?.display_name || area || ""),
      jobType: inferJobType(job.contract_time),
      salary: job.salary_min || job.salary_max
        ? `${job.salary_min ? `$${Math.round(job.salary_min).toLocaleString()}` : ""}${job.salary_min && job.salary_max ? " - " : ""}${job.salary_max ? `$${Math.round(job.salary_max).toLocaleString()}` : ""}`
        : "Salario no publicado",
      description,
      requirements: extractRequirements(description, [job.category?.label, job.contract_type]),
      sourcePlatform: "Adzuna",
      seniorityLevel: inferSeniority(job.title || "", description),
      postedDate: formatPostedDate(job.created),
      applyUrl: job.redirect_url,
    } satisfies RealJobSearchCandidate;
  });
}

async function searchRealJobs(query: string) {
  const aggregated: RealJobSearchCandidate[] = [];
  const seenUrls = new Set<string>();
  const failures: string[] = [];

  for (const source of ["remotive", "adzuna"] as SupportedJobSource[]) {
    try {
      const jobs = source === "remotive"
        ? await fetchRemotiveJobs(query)
        : await fetchAdzunaJobs(query);

      for (const job of jobs) {
        if (!job.applyUrl || seenUrls.has(job.applyUrl)) {
          continue;
        }
        seenUrls.add(job.applyUrl);
        aggregated.push(job);
      }
    } catch (error: any) {
      failures.push(`${source}: ${error.message || error}`);
    }
  }

  return { jobs: aggregated.slice(0, 12), failures };
}

async function searchRealJobsForProfile(profile: any, explicitQuery?: string) {
  const signals = deriveProfileSignals(profile, explicitQuery);
  const aggregated: RealJobSearchCandidate[] = [];
  const seenUrls = new Set<string>();
  const failures: string[] = [];

  for (const profileQuery of signals.searchQueries) {
    const { jobs, failures: queryFailures } = await searchRealJobs(profileQuery);
    failures.push(...queryFailures.map((failure) => `${profileQuery}: ${failure}`));

    for (const job of jobs) {
      const locationMatches =
        signals.locationType === "cualquiera" || job.locationType === signals.locationType;
      const seniorityMatches =
        signals.seniority === "cualquiera" || job.seniorityLevel === signals.seniority;

      if ((!locationMatches || !seniorityMatches) && aggregated.length >= 8) {
        continue;
      }

      if (seenUrls.has(job.applyUrl)) {
        continue;
      }

      seenUrls.add(job.applyUrl);
      aggregated.push(job);
    }
  }

  return {
    signals,
    jobs: aggregated.slice(0, 12),
    failures,
  };
}

// 2. Search & Aggregate Jobs Endpoint
const jobsSearchHandler: express.RequestHandler = async (req, res) => {
  const { query, profile, preferences } = req.body;

  // Smart Query Generation
  let smartQuery = query;
  if (!smartQuery || smartQuery.trim().length === 0) {
    const roles = profile?.experience?.map((e: any) => (e.role || "").toLowerCase()) || [];
    const skills = profile?.skills?.map((s: string) => s.toLowerCase()) || [];
    
    const isSysAdmin = roles.some((r: string) => r.includes("sysadmin") || r.includes("system administrator") || r.includes("administrador de sistemas") || r.includes("linux")) ||
                      skills.some((s: string) => s.includes("sysadmin") || s.includes("linux") || s.includes("system administrator") || s.includes("redes") || s.includes("servidores"));
                      
    const isDevOps = roles.some((r: string) => r.includes("devops") || r.includes("site reliability") || r.includes("sre") || r.includes("cloud")) ||
                     skills.some((s: string) => s.includes("devops") || s.includes("docker") || s.includes("kubernetes") || s.includes("aws") || s.includes("terraform"));
                     
    if (isSysAdmin) {
      smartQuery = "Administrador de Sistemas / Sysadmin / Linux / Redes / Infraestructura";
    } else if (isDevOps) {
      smartQuery = "Ingeniero DevOps / Cloud / SRE";
    } else if (roles.length > 0) {
      smartQuery = profile.experience[0].role;
    } else if (skills.length > 0) {
      smartQuery = skills.slice(0, 3).join(", ");
    } else {
      smartQuery = "cualquiera";
    }
  }

  try {
    const { jobs, failures } = await searchRealJobsForProfile(
      {
        ...profile,
        preferences,
      },
      smartQuery,
    );
    if (jobs.length === 0) {
      if (failures.length > 0) {
        console.warn("[Service Status] Real job providers failed:", failures.join(" | "));
        return res.status(502).json({
          error: "No fue posible consultar proveedores reales de empleo en este momento. Intenta de nuevo más tarde o configura credenciales de Adzuna para ampliar cobertura.",
        });
      }

      return res.json([]);
    }

    const enrichedJobs = jobs.map((job) => ({
      ...job,
      ...calculateCompatibility(job, profile, preferences),
    }));

    return res.json(enrichedJobs);
  } catch (error: any) {
    recordGeminiFailure("jobs.search.realProviders", error);
    return res.status(502).json({
      error: "Error al consultar proveedores reales de empleo: " + (error.message || error)
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.warn("[Service Status] GEMINI_API_KEY missing during jobs search, serving fallback jobs.");
    return res.json(getFallbackJobs(smartQuery, profile, preferences));
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Eres un avanzado bot agregador de ofertas de trabajo con IA que busca y extrae información en tiempo real de múltiples plataformas como LinkedIn, Indeed, Glassdoor, Tecnoempleo, Computrabajo y ElEmpleo para centralizar las mejores ofertas laborales.
De acuerdo con la búsqueda del usuario: "${smartQuery}" y sus preferencias y perfil de candidato, simula que escaneas la web y genera una lista de entre 5 y 8 ofertas de trabajo realistas, vigentes y atractivas que se adapten a su perfil.

PERFIL DEL CANDIDATO:
- Habilidades: ${profile?.skills?.join(", ") || "No especificadas"}
- Experiencia laboral relevante: ${profile?.experience?.map((e: any) => `${e.role} en ${e.company} (${e.duration})`).join("; ") || "No especificada"}

FILTROS Y PREFERENCIAS INTELIGENTES:
- Tipo de ubicación: ${preferences?.locationType || "Cualquiera"} (Remoto / Presencial / Híbrido)
- Tipo de jornada: ${preferences?.jobType || "Cualquiera"} (Completa / Parcial)
- Alcance geográfico: ${preferences?.geographicScope || "Global"}
- País de residencia actual: ${preferences?.residentCountry || "No especificado"}
- Rango salarial esperado: de ${preferences?.desiredSalaryRange?.min || 0} a ${preferences?.desiredSalaryRange?.max || "sin límite"} ${preferences?.desiredSalaryRange?.currency || "USD"} mensuales.
- Seniority deseado: ${preferences?.seniorityLevel || "Cualquiera"} (Trainee / Junior / Semi-senior / Senior)

INSTRUCCIONES IMPORTANTES:
1. Las ofertas deben ser realistas, con descripciones bien redactadas en español que atraigan al usuario.
2. Cada oferta debe incluir un 'compatibilityScore' entre 0 y 100. Calcula este puntaje de forma inteligente: si las tecnologías y la experiencia del candidato coinciden perfectamente con los requisitos de la oferta y las preferencias de salario y ubicación, el puntaje debe ser alto (85-100). Si hay brechas importantes (ej. requiere una tecnología que el candidato no tiene, o no encaja el seniority), debe ser más bajo.
3. Proporciona una 'compatibilityAnalysis' bien detallada y amigable en español donde expliques por qué tiene ese puntaje, qué habilidades encajan a la perfección y qué tecnologías o requerimientos le faltaría desarrollar para aplicar.
4. Distribuye los orígenes de las ofertas entre diferentes plataformas reales de empleo (como LinkedIn, Indeed, Glassdoor, Computrabajo, ElEmpleo, Tecnoempleo, etc.) en el campo 'sourcePlatform'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "ID único autogenerado de la oferta (ej: 'job-123')" },
              title: { type: Type.STRING, description: "Título del empleo (ej: Desarrollador Frontend React)" },
              company: { type: Type.STRING, description: "Nombre de la empresa que contrata" },
              location: { type: Type.STRING, description: "Ubicación del trabajo (ej: 'Madrid, España', 'Bogotá (Remoto)', 'Ciudad de México')" },
              locationType: { 
                type: Type.STRING, 
                enum: ["remoto", "presencial", "hibrido"],
                description: "Tipo de entorno de trabajo" 
              },
              jobType: { 
                type: Type.STRING, 
                enum: ["completa", "parcial"],
                description: "Tipo de jornada" 
              },
              salary: { type: Type.STRING, description: "Descripción salarial (ej: '$3,000 - $4,200 USD/mes' o '35,000€ - 40,000€/año')" },
              description: { type: Type.STRING, description: "Descripción atractiva e inspiradora del rol, tareas a realizar y cultura corporativa" },
              requirements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Lista de 4 a 6 requisitos de habilidades técnicas, idiomas o experiencia requeridos para postular"
              },
              sourcePlatform: { type: Type.STRING, description: "Nombre de la plataforma donde se encontró el empleo (ej: LinkedIn, Indeed)" },
              compatibilityScore: { type: Type.INTEGER, description: "Porcentaje de compatibilidad del 0 al 100 basado en el perfil y las preferencias" },
              compatibilityAnalysis: { type: Type.STRING, description: "Análisis explicativo detallado en español sobre la afinidad y las brechas del candidato para el puesto" },
              seniorityLevel: { 
                type: Type.STRING, 
                enum: ["trainee", "junior", "semi-senior", "senior"],
                description: "Seniority del puesto" 
              },
              postedDate: { type: Type.STRING, description: "Cuándo se publicó (ej: 'Hace 3 horas', 'Ayer', 'Hace 3 días')" },
              applyUrl: { type: Type.STRING, description: "URL simulada de postulación rápida" }
            },
            required: [
              "id", "title", "company", "location", "locationType", "jobType", 
              "salary", "description", "requirements", "sourcePlatform", 
              "compatibilityScore", "compatibilityAnalysis", "seniorityLevel", "postedDate"
            ]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se obtuvo respuesta de ofertas");
    }

    const jobOffers = JSON.parse(resultText.trim());
    return res.json(jobOffers);
  } catch (error: any) {
    recordGeminiFailure("jobs.search", error);
    console.warn("[Service Status] Gemini API unavailable during job search, activating local fallback engine.");
    try {
      const fallbackOffers = getFallbackJobs(smartQuery, profile, preferences);
      return res.json(fallbackOffers);
    } catch (fallbackError) {
      return res.status(500).json({
        error: "Error al agregar ofertas laborales con IA: " + (error.message || error)
      });
    }
  }
};

function getFallbackDailyRecommendation(profile: any, candidacies: any) {
  const signals = deriveProfileSignals(profile);
  const skills = profile?.skills || [];
  const recentJobTitle = candidacies && candidacies.length > 0 ? candidacies[0].jobTitle : null;

  if (recentJobTitle) {
    return {
      title: "Optimizar CV para " + recentJobTitle,
      category: "cv" as const,
      action: "Añadir logros cuantitativos específicos",
      reasoning: `Has postulado o guardado el puesto de '${recentJobTitle}'. Para maximizar tu tasa de respuesta, los reclutadores buscan métricas duras en lugar de descripciones conceptuales pasivas.`,
      specificInstruction: `En tu última experiencia laboral listada en tu perfil, añade un logro medible como: 'Logré optimizar el rendimiento de la aplicación en un 25% mediante la reestructuración de componentes React redundantes y Lazy Loading'.`,
      marketTrend: "El 87% de los reclutadores técnicos priorizan currículums que muestran métricas de impacto comercial y optimización de recursos sobre listas de tareas."
    };
  } else if (skills.length > 0) {
    const mainSkill = skills[0];
    return {
      title: `Especialización en ${mainSkill}`,
      category: "skills" as const,
      action: `Aprender una tecnología complementaria a ${mainSkill}`,
      reasoning: `Tu perfil cuenta con habilidades fuertes en ${mainSkill}. Sin embargo, el mercado actual demanda desarrolladores con perfiles en T que dominen tecnologías complementarias en la nube y optimización de bundles.`,
      specificInstruction: `Dedica 15 minutos hoy a leer la documentación oficial de Docker y cómo configurar un pipeline de CI/CD básico para tus proyectos creados con ${mainSkill}.`,
      marketTrend: `Las vacantes que requieren '${mainSkill}' junto con conocimientos de 'AWS o Docker' han aumentado un 42% en el último semestre, ofreciendo salarios sustancialmente superiores.`
    };
  } else {
    return {
      title: "Optimizar perfil inicial",
      category: "cv" as const,
      action: "Cargar currículum vitae (CV) en PDF",
      reasoning: "Tu perfil de TalentoMatch está actualmente vacío o incompleto. Para recibir recomendaciones hiper-personalizadas y análisis automáticos de compatibilidad, la IA necesita extraer tus experiencias reales.",
      specificInstruction: "Dirígete a la pestaña 'Mi Perfil' y arrastra tu archivo CV actual en formato PDF o TXT para que el asistente de IA extraiga tus datos en segundos.",
      marketTrend: "Completar el perfil profesional incrementa la probabilidad de ser contactado por un reclutador técnico en más de un 350%."
    };
  }
}

// 2.5. AI Daily Recommendation Endpoint
const jobsDailyRecommendationHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { profile, candidacies } = req.body;
  const signals = deriveProfileSignals(profile);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Analiza el perfil del candidato y su lista actual de postulaciones laborales (historial). Proporciona una única 'Recomendación Diaria' para el día de hoy con una acción de alta prioridad, específica y muy concreta basada en las tendencias actuales del mercado de tecnología.
      
      PERFIL DEL CANDIDATO:
      - Habilidades: ${profile?.skills?.join(", ") || "No especificadas"}
      - Experiencia laboral: ${profile?.experience?.map((e: any) => `${e.role} en ${e.company}`).join(", ") || "No especificada"}
      - Senales estructuradas del CV: ${signals.summary || "Sin senales suficientes"}
      - Preferencias de búsqueda: Location: ${profile?.preferences?.locationType || "Cualquiera"}, Job type: ${profile?.preferences?.jobType || "Cualquiera"}, Seniority: ${profile?.preferences?.seniorityLevel || "Cualquiera"}

      HISTORIAL DE POSTULACIONES / CANDIDATURAS:
      ${candidacies && candidacies.length > 0 
        ? candidacies.map((c: any) => `- Puesto: ${c.jobTitle} en ${c.company}, Estado actual: ${c.status}, Notas: ${c.notes || 'Ninguna'}`).join("\n")
        : "No tiene postulaciones registradas en el tracker todavía. Recomienda una acción introductoria potente basada en sus habilidades."
      }

      INSTRUCCIONES PARA LA RECOMENDACIÓN:
      1. Elige una de estas cuatro categorías: "cv" (optimización de currículum o perfil), "skills" (conceptos o herramientas para aprender), "interview" (preparación de entrevistas), o "market" (táctica de mercado o salarial).
      2. Crea un título corto ("title") de 3 a 5 palabras (ej. "Añadir logros cuantitativos", "Aprender Tailwind v4", etc.).
      3. Define una acción ("action") específica y accionable hoy mismo.
      4. Justifica el porqué de esta acción de manera amigable e inteligente en "reasoning", conectándolo directamente con su perfil y candidaturas.
      5. Escribe instrucciones específicas ("specificInstruction") redactando exactamente qué escribir, qué estudiar o qué buscar de forma redactada (da un ejemplo exacto de texto que puedan usar).
      6. Añade una estadística o tendencia actual realista del mercado laboral en "marketTrend" que respalde tu recomendación.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título corto de la recomendación (ej: Reescribir extracto profesional)" },
            category: { 
              type: Type.STRING, 
              enum: ["cv", "skills", "interview", "market"],
              description: "Categoría de la recomendación" 
            },
            action: { type: Type.STRING, description: "Acción específica inmediata que debe tomar" },
            reasoning: { type: Type.STRING, description: "Explicación detallada de por qué se le recomienda esta acción basándose en su perfil e historial de postulaciones" },
            specificInstruction: { type: Type.STRING, description: "Instrucciones detalladas y redactadas paso a paso con ejemplos textuales o temas concretos para estudiar" },
            marketTrend: { type: Type.STRING, description: "Tendencia, dato estadístico o hecho del mercado laboral que justifica esta sugerencia" }
          },
          required: ["title", "category", "action", "reasoning", "specificInstruction", "marketTrend"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se obtuvo respuesta de recomendación de la IA");
    }

    const rec = JSON.parse(resultText.trim());
    return res.json(rec);
  } catch (error: any) {
    recordGeminiFailure("jobs.daily_recommendation", error);
    console.warn("[Service Status] Gemini API unavailable during daily recommendation, activating local fallback engine.");
    try {
      const fallbackRec = getFallbackDailyRecommendation(profile, candidacies);
      return res.json(fallbackRec);
    } catch (fallbackError) {
      return res.status(500).json({
         error: "Error al generar recomendación diaria con IA: " + (error.message || error)
      });
    }
  }
};

function getFallbackSalaryComparison(profile: any, candidacies: any) {
  const userCountry = profile?.preferences?.residentCountry || "Perú";
  const userSeniority = profile?.preferences?.seniorityLevel || "semi-senior";
  const userCurrency = profile?.preferences?.desiredSalaryRange?.currency || "USD";
  const userMinSalary = profile?.preferences?.desiredSalaryRange?.min || 1500;
  const userMaxSalary = profile?.preferences?.desiredSalaryRange?.max || 4000;

  const roles = candidacies && candidacies.length > 0 
    ? candidacies.slice(0, 3).map((c: any) => c.jobTitle)
    : ["Desarrollador Frontend", "Fullstack Developer"];

  // Generate realistic averages based on seniority
  let multiplier = 1.0;
  if (userSeniority === 'junior' || userSeniority === 'trainee') multiplier = 0.6;
  if (userSeniority === 'senior') multiplier = 1.8;

  const mappedRoles = roles.map((role: string) => {
    const avg = Math.round(2500 * multiplier);
    const min = Math.round(1800 * multiplier);
    const max = Math.round(3800 * multiplier);
    const isWithin = userMinSalary >= min && userMinSalary <= max;

    return {
      roleTitle: role,
      marketMinSalary: min,
      marketMaxSalary: max,
      marketAverageSalary: avg,
      currency: userCurrency,
      sourceCountry: userCountry,
      confidence: "media",
      insight: isWithin 
        ? `Tu rango salarial deseado (${userMinSalary} - ${userMaxSalary} ${userCurrency}) está perfectamente alineado con los promedios del mercado para un ${role} ${userSeniority} en ${userCountry}.`
        : `Tu salario mínimo solicitado (${userMinSalary} ${userCurrency}) está ligeramente ${userMinSalary < min ? 'por debajo' : 'por encima'} de los rangos típicos para ${role} ${userSeniority} en ${userCountry} (${min} - ${max} ${userCurrency}).`
    };
  });

  const overallAvg = mappedRoles.reduce((acc: number, r: any) => acc + r.marketAverageSalary, 0) / mappedRoles.length;
  const isUserRangeRealistic = userMinSalary <= overallAvg * 1.2;

  return {
    roles: mappedRoles,
    overallComparison: {
      isUserRangeRealistic,
      analysisText: `Basado en el perfil para ${userCountry} con seniority ${userSeniority}, tus expectativas salariales (${userMinSalary} - ${userMaxSalary} ${userCurrency}) son ${isUserRangeRealistic ? 'muy realistas y competitivas' : 'altas respecto a los promedios locales'}. La demanda de perfiles con tus habilidades (${profile?.skills?.slice(0, 4).join(", ") || "React, TypeScript"}) se mantiene estable, lo que te posiciona favorablemente para negociar ofertas en este rango.`,
      negotiationTactics: [
        `Enfócate en tu dominio de habilidades críticas como ${profile?.skills?.slice(0, 3).join(", ") || "desarrollo web"} al discutir compensaciones.`,
        "Propón un esquema de revisión salarial a los 6 meses si la oferta inicial está ligeramente por debajo de tu expectativa.",
        "Considera el paquete de beneficios totales (trabajo 100% remoto, días libres, bonos anuales) como parte de tu compensación global.",
        "Destaca tus proyectos prácticos o historial de postulaciones activas para mostrar que eres un candidato en alta demanda."
      ]
    },
    groundingSources: [
      { title: "Glassdoor Tech Salary Trends Latinoamerica", url: "https://www.glassdoor.com" },
      { title: "LinkedIn Salary Guide Tech", url: "https://www.linkedin.com" }
    ]
  };
}

// 2.6. AI Salary Comparison and Market Trend Endpoint
const jobsSalaryComparisonHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { profile, candidacies } = req.body;

  try {
    const userCountry = profile?.preferences?.residentCountry || "Latinoamérica";
    const userSeniority = profile?.preferences?.seniorityLevel || "cualquiera";
    const userMinSalary = profile?.preferences?.desiredSalaryRange?.min || 1500;
    const userMaxSalary = profile?.preferences?.desiredSalaryRange?.max || 4000;
    const userCurrency = profile?.preferences?.desiredSalaryRange?.currency || "USD";

    const rolesToSearch = candidacies && candidacies.length > 0 
      ? candidacies.slice(0, 3).map((c: any) => c.jobTitle)
      : (profile?.skills && profile.skills.length > 0 ? [`Desarrollador ${profile.skills[0]}`] : ["Desarrollador de Software"]);

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Busca y analiza los rangos salariales promedio actuales para los siguientes puestos de tecnología: ${rolesToSearch.join(", ")}.
      Filtra la búsqueda para el país de residencia del usuario: ${userCountry}, y el nivel de seniority: ${userSeniority}.
      Compara estos promedios con el rango salarial deseado por el usuario, que es de: ${userMinSalary} a ${userMaxSalary} ${userCurrency} al mes.

      Proporciona una respuesta detallada en formato JSON que contenga:
      1. 'roles': Una lista de análisis para cada uno de los puestos, incluyendo:
         - 'roleTitle': El título del puesto.
         - 'marketMinSalary': El salario mensual mínimo estimado del mercado para este rol en ${userCountry} (en ${userCurrency}, convierte de moneda local si es necesario, asumiendo tasas de conversión estándar actuales si aplica).
         - 'marketMaxSalary': El salario mensual máximo estimado del mercado.
         - 'marketAverageSalary': El salario mensual promedio estimado.
         - 'currency': La moneda en la que se expresan los montos (preferiblemente ${userCurrency}).
         - 'sourceCountry': El país de referencia (${userCountry}).
         - 'confidence': El nivel de certeza de los datos de mercado encontrados ("alta", "media" o "baja").
         - 'insight': Comentarios amigables comparando el rango del usuario con los hallazgos reales del mercado (ej. si su salario deseado está por encima, por debajo, o alineado con la realidad).
      2. 'overallComparison': Un objeto de comparación general con:
         - 'isUserRangeRealistic': Un valor booleano indicando si la expectativa salarial del usuario es realista o competitiva.
         - 'analysisText': Un párrafo explicativo exhaustivo sobre cómo encajan sus expectativas en el ecosistema laboral actual.
         - 'negotiationTactics': 3 o 4 consejos de negociación táctica específicos para sus roles y perfil de habilidades (${profile?.skills?.join(", ") || "tecnología"}).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  roleTitle: { type: Type.STRING },
                  marketMinSalary: { type: Type.NUMBER },
                  marketMaxSalary: { type: Type.NUMBER },
                  marketAverageSalary: { type: Type.NUMBER },
                  currency: { type: Type.STRING },
                  sourceCountry: { type: Type.STRING },
                  confidence: { type: Type.STRING, enum: ["alta", "media", "baja"] },
                  insight: { type: Type.STRING }
                },
                required: ["roleTitle", "marketMinSalary", "marketMaxSalary", "marketAverageSalary", "currency", "sourceCountry", "confidence", "insight"]
              }
            },
            overallComparison: {
              type: Type.OBJECT,
              properties: {
                isUserRangeRealistic: { type: Type.BOOLEAN },
                analysisText: { type: Type.STRING },
                negotiationTactics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["isUserRangeRealistic", "analysisText", "negotiationTactics"]
            }
          },
          required: ["roles", "overallComparison"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se obtuvo respuesta de comparación salarial de la IA");
    }

    const payload = JSON.parse(resultText.trim());

    // Extract grounding sources to send back to client
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const groundingSources = chunks 
      ? chunks.map((chunk: any) => ({
          title: chunk.web?.title || "Fuente de búsqueda de Google",
          url: chunk.web?.uri || ""
        })).filter((source: any) => source.url)
      : [];

    payload.groundingSources = groundingSources.length > 0 
      ? groundingSources 
      : [
          { title: `Tendencias salariales para ${rolesToSearch[0]} en ${userCountry}`, url: `https://www.google.com/search?q=salario+promedio+${encodeURIComponent(rolesToSearch[0])}+${encodeURIComponent(userCountry)}` }
        ];

    return res.json(payload);
  } catch (error: any) {
    recordGeminiFailure("jobs.salary_comparison", error);
    console.warn("[Service Status] Gemini API search grounding unavailable, activating local salary comparison fallback.");
    try {
      const fallbackPayload = getFallbackSalaryComparison(profile, candidacies);
      return res.json(fallbackPayload);
    } catch (fallbackError) {
      return res.status(500).json({
         error: "Error al generar comparativa salarial: " + (error.message || error)
      });
    }
  }
};

function getFallbackLinkedInAnalysis(linkedinData: any) {
  let text = typeof linkedinData === "string" ? linkedinData : (linkedinData?.rawText || "");
  const profileName = linkedinData?.name || "Alejandro Silva";
  const userSkills = linkedinData?.skills || ["React", "TypeScript", "Node.js", "Express", "SQL"];
  
  const userExperience = linkedinData?.experience || [
    {
      company: "Globant",
      role: "Senior Fullstack Engineer",
      duration: "2 años",
      description: "Liderazgo de equipo de 5 desarrolladores front-end. Optimización de tiempos de carga en un 40% mediante lazy loading."
    },
    {
      company: "Mercado Libre",
      role: "Software Developer",
      duration: "3 años",
      description: "Desarrollo de microservicios robustos en Node.js y bases de datos relacionales SQL."
    }
  ];

  if (text) {
    return {
      name: profileName || "Candidato LinkedIn",
      email: `${(profileName || "candidato").toLowerCase().replace(/\s+/g, '')}@ejemplo.com`,
      phone: "+51 987 654 321",
      skills: ["React", "TypeScript", "JavaScript", "Node.js", "Express", "REST APIs", "Tailwind CSS"],
      experience: [
        {
          company: "Empresa Tecnológica",
          role: "Desarrollador Fullstack",
          duration: "3 años",
          description: text.substring(0, 200) || "Desarrollo de interfaces de usuario interactivas con React e integración de APIs basadas en Node.js."
        }
      ]
    };
  }

  return {
    name: profileName,
    email: `${profileName.toLowerCase().replace(/\s+/g, '')}@ejemplo.com`,
    phone: "+51 987 654 321",
    skills: userSkills,
    experience: userExperience
  };
}

// 2.7. AI LinkedIn Profile Import Endpoint
const jobsLinkedinImportHandler: express.RequestHandler = async (req, res) => {
  const { linkedinData } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("API Key not found");
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Analiza el siguiente perfil de LinkedIn y extrae de forma estructurada la información del candidato en español:
      ${JSON.stringify(linkedinData)}

      Por favor, proporciona la información extraída en formato JSON que contenga:
      - 'name': Nombre completo del candidato.
      - 'email': Email del candidato (si no está presente en el perfil, genera uno ficticio profesional basado en su nombre).
      - 'phone': Teléfono del candidato (si no está presente, genera uno ficticio estándar).
      - 'skills': Una lista de habilidades técnicas o profesionales críticas (mínimo 6 habilidades relevantes).
      - 'experience': Una lista de experiencias laborales, donde cada elemento tiene:
         - 'company': Nombre de la empresa.
         - 'role': Título del puesto.
         - 'duration': Duración (ej. '2 años', '1 año, 3 meses', 'Actualmente').
         - 'description': Descripción concisa y profesional de los logros, responsabilidades y tecnologías utilizadas en ese rol.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            experience: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  company: { type: Type.STRING },
                  role: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["company", "role", "duration", "description"]
              }
            }
          },
          required: ["name", "email", "phone", "skills", "experience"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se obtuvo respuesta de importación de LinkedIn de la IA");
    }

    const payload = JSON.parse(resultText.trim());
    return res.json(payload);
  } catch (error: any) {
    recordGeminiFailure("jobs.linkedin_import", error);
    console.warn("[Service Status] Gemini API LinkedIn extraction unavailable, triggering local fallback.");
    const fallbackPayload = getFallbackLinkedInAnalysis(linkedinData);
    return res.json(fallbackPayload);
  }
};

function getFallbackCoverLetter(profile: any, jobTitle: string, company: string, tone: string) {
  const name = profile?.name || "Alejandro Silva";
  const email = profile?.email || "alejandrosilva@ejemplo.com";
  const phone = profile?.phone || "+51 987 654 321";
  const skills = profile?.skills || ["React", "TypeScript", "Node.js"];
  const experiences = profile?.experience || [];
  
  const targetJob = jobTitle || "Desarrollador de Software";
  const targetCompany = company || "Empresa de Tecnología";

  const greeting = tone === "formal" ? "Estimado equipo de selección," : `¡Hola equipo de ${targetCompany}!`;
  
  const intro = tone === "creativo" 
    ? `Me pongo en contacto con ustedes con gran entusiasmo porque considero que mi trayectoria se alinea de forma única con los desafíos tecnológicos que afronta ${targetCompany}. Estoy sumamente interesado en integrarme al rol de ${targetJob}.`
    : `Le escribo para manifestar mi fuerte interés en la posición de ${targetJob} en ${targetCompany}. Con un sólido historial técnico y pasión por las mejores prácticas, estoy seguro de que puedo aportar valor inmediato a sus equipos de ingeniería.`;

  let body = "";
  if (experiences.length > 0) {
    const mainExp = experiences[0];
    body = `Durante mi trayectoria, me he desempeñado como ${mainExp.role} en ${mainExp.company}, donde lideré con éxito responsabilidades clave como: "${mainExp.description}". Adicionalmente, he consolidado experiencia robusta en tecnologías clave como ${skills.slice(0, 5).join(", ")}, permitiéndome resolver desafíos complejos de forma estructurada.`;
  } else {
    body = `A lo largo de mi carrera profesional, he desarrollado destrezas sólidas en herramientas líderes de la industria, incluyendo ${skills.slice(0, 6).join(", ")}. Me destaco por mi capacidad de adaptación, enfoque analítico y compromiso con el logro de objetivos de negocio.`;
  }

  const callToAction = tone === "persuasivo"
    ? `Estoy convencido de que mi perfil es el adecuado para ayudarles a acelerar la entrega de software de alta calidad. Me encantaría mantener una breve reunión para profundizar en cómo mis habilidades técnicas pueden resolver sus desafíos actuales.`
    : `Agradezco de antemano su tiempo y consideración de mi postulación. Quedo a su entera disposición para mantener una conversación técnica o entrevista y compartir detalles adicionales sobre mi experiencia y motivación.`;

  return `${name}
${email} | ${phone}

A la atención del Equipo de Selección
${targetCompany}

${greeting}

${intro}

${body}

${callToAction}

Atentamente,

${name}
(Carta generada con soporte de IA de TalentoMatch)`;
}

// 2.8. AI Cover Letter Generator Endpoint
const jobsCoverLetterHandler: express.RequestHandler = async (req, res) => {
  const { profile, jobTitle, company, jobDescription, tone } = req.body;

  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("API Key not found");
    }

    const toneInstruction = {
      formal: "un tono formal, profesional, estructurado y de alto respeto",
      creativo: "un tono creativo, innovador, dinámico y que rompa esquemas",
      persuasivo: "un tono altamente persuasivo, enfocado en resultados, métricas y logros de alto impacto",
      entusiasta: "un tono entusiasta, apasionado, cercano y que demuestre gran interés por la cultura de la empresa"
    }[tone as string] || "un tono profesional, persuasivo y equilibrado";

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Redacta una carta de presentación ('Cover Letter') profesional, persuasiva y personalizada en español para postular al siguiente cargo:
      
      PUESTO: ${jobTitle || "No especificado"}
      EMPRESA: ${company || "No especificada"}
      DESCRIPCIÓN DEL PUESTO:
      ${jobDescription || "No especificada"}

      PERFIL DEL CANDIDATO (MÍO):
      - Nombre: ${profile?.name || "Candidato"}
      - Correo electrónico: ${profile?.email || "No especificado"}
      - Teléfono: ${profile?.phone || "No especificado"}
      - Habilidades clave: ${profile?.skills?.join(", ") || "No especificadas"}
      - Experiencia laboral relevante:
      ${profile?.experience?.map((e: any) => `- Rol: ${e.role} en ${e.company} (${e.duration || "N/A"}). Logros/Descripción: ${e.description}`).join("\n") || "No especificada"}

      DIRECTRICES DE REDACCIÓN:
      1. Utiliza ${toneInstruction}.
      2. No inventes experiencia que no esté en el perfil del candidato. Destaca las habilidades y experiencias reales que se alinean con la descripción del puesto de forma honesta pero persuasiva.
      3. Estructura la carta de forma elegante:
         - Encabezado opcional con datos del remitente.
         - Saludo al equipo de selección.
         - Introducción atractiva donde se menciona el interés en el puesto.
         - Cuerpo con 2 párrafos bien redactados que conecten los logros clave con las necesidades del puesto.
         - Cierre con llamado a la acción para una entrevista o reunión breve.
         - Despedida profesional y firma.
      4. Asegúrate de que el texto fluya de forma natural y esté redactado de manera impecable. Evita los clichés de relleno repetitivos.
      `,
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se pudo generar la carta de presentación con la IA");
    }

    return res.json({ coverLetter: resultText });
  } catch (error: any) {
    recordGeminiFailure("jobs.cover_letter", error);
    console.warn("[Service Status] Gemini API cover letter generation failed, calling fallback engine.");
    const fallbackText = getFallbackCoverLetter(profile, jobTitle, company, tone || "persuasivo");
    return res.json({ coverLetter: fallbackText });
  }
};

// 3. AI Personalized Recommendations Endpoint
const jobsRecommendationsHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { profile, candidacies } = req.body;
  const signals = deriveProfileSignals(profile);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Analiza el perfil del candidato y su lista actual de postulaciones laborales. Proporciona 3 a 4 recomendaciones clave, personalizadas y accionables para ayudarlo a optimizar su búsqueda de empleo, mejorar su perfil profesional o prepararse para sus procesos activos.

PERFIL DEL CANDIDATO:
- Habilidades: ${profile?.skills?.join(", ") || "No especificadas"}
- Experiencia laboral: ${profile?.experience?.map((e: any) => `${e.role} en ${e.company}`).join(", ") || "No especificada"}
- Senales estructuradas del CV: ${signals.summary || "Sin senales suficientes"}
- Preferencias de búsqueda: ${profile?.preferences?.locationType || "Cualquiera"} (${profile?.preferences?.jobType || "Cualquiera"}), Seniority: ${profile?.preferences?.seniorityLevel || "Cualquiera"}, Rango salarial deseado: ${profile?.preferences?.desiredSalaryRange?.min || 0} - ${profile?.preferences?.desiredSalaryRange?.max || "sin límite"} ${profile?.preferences?.desiredSalaryRange?.currency || "USD"}.

ESTADO DE SUS POSTULACIONES ACTIVAS (HISTORIAL):
${candidacies && candidacies.length > 0 
  ? candidacies.map((c: any) => `- Puesto: ${c.jobTitle} en ${c.company}, Estado actual: ${c.status}, Notas: ${c.notes || 'Ninguna'}`).join("\n")
  : "No tiene postulaciones activas registradas aún. ¡Anímalo a buscar y postularse!"
}

Genera recomendaciones en formato JSON estructurado que abarquen estas categorías:
- "cv": Consejos para optimizar la redacción, impacto o palabras clave de su currículum.
- "skills": Habilidades que están en alta demanda según sus objetivos y que le convendría aprender.
- "interview": Consejos de preparación para entrevistas si tiene procesos activos, o simulaciones de preguntas frecuentes.
- "market": Consejos estratégicos de mercado sobre su rango salarial deseado, canales de postulación u optimización de tiempos.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Título breve y llamativo del consejo" },
              category: { 
                type: Type.STRING, 
                enum: ["cv", "skills", "interview", "market"],
                description: "Categoría de la recomendación" 
              },
              description: { type: Type.STRING, description: "Explicación detallada y enriquecedora con el razonamiento de la IA" },
              actionableSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Pasos prácticos e inmediatos que el usuario puede realizar (mínimo 2)"
              }
            },
            required: ["title", "category", "description", "actionableSteps"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se obtuvieron recomendaciones de la IA");
    }

    const recommendations = JSON.parse(resultText.trim());
    return res.json(recommendations);
  } catch (error: any) {
    recordGeminiFailure("jobs.recommendations", error);
    console.warn("[Service Status] Gemini API unavailable during career coach analysis, activating local fallback engine.");
    try {
      const fallbackRecs = getFallbackRecommendations(profile, candidacies);
      return res.json(fallbackRecs);
    } catch (fallbackError) {
      return res.status(500).json({
        error: "Error al generar recomendaciones personalizadas con IA: " + (error.message || error)
      });
    }
  }
};

// 4. Start Job Interview Simulation
const interviewStartHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { profile, candidacy } = req.body;
  if (!candidacy) {
    return res.status(400).json({ error: "No se proporcionó información de la candidatura" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Eres un entrevistador de talento técnico experto y amigable de la empresa "${candidacy.company}".
Estás realizando una simulación de entrevista de trabajo para el puesto de "${candidacy.jobTitle}" (${candidacy.locationType}, ${candidacy.location}).
Tienes el currículum del candidato, que incluye el nombre "${profile?.name || 'Candidato'}" y las habilidades "${profile?.skills?.join(", ") || 'No especificadas'}".

Genera la PRIMERA pregunta introductoria de la entrevista de trabajo en español. Esta pregunta debe:
1. Ser profesional, cálida y directa.
2. Hacer referencia al puesto específico de "${candidacy.jobTitle}" en "${candidacy.company}".
3. Conectar sutilmente con alguna habilidad o experiencia relevante del candidato, o bien pedirle que se presente y explique por qué es el perfil idóneo.
4. Mantener la pregunta concisa para invitar a la interacción. No hagas múltiples preguntas a la vez.`,
    });

    const question = response.text?.trim() || `¡Hola ${profile?.name || 'Candidato'}! Qué gusto saludarte. Bienvenido a la entrevista para el puesto de ${candidacy.jobTitle} en ${candidacy.company}. Para iniciar, ¿podrías presentarte brevemente y contarme qué te motivó a postularte a esta vacante y cómo crees que tu experiencia previa se conecta con lo que buscamos?`;
    return res.json({ question });
  } catch (error: any) {
    recordGeminiFailure("interview.start", error);
    console.warn("[Service Status] Gemini API unavailable during interview start, using local fallback.", error);
    const hasReact = (profile?.skills || []).some((s: string) => s.toLowerCase().includes("react") || s.toLowerCase().includes("frontend"));
    const techName = hasReact ? "React / TypeScript" : (profile?.skills?.[0] || "desarrollo");
    const fallbackQuestion = `¡Hola ${profile?.name || "Candidato"}! Qué gusto saludarte. Bienvenido a esta entrevista simulada para el puesto de ${candidacy.jobTitle} en ${candidacy.company}. Para comenzar nuestra conversación, me gustaría preguntarte: ¿podrías describirme brevemente cómo has aplicado tecnologías como ${techName} en tus proyectos recientes y qué te motivó a interesarte en esta oportunidad con nosotros?`;
    return res.json({ question: fallbackQuestion });
  }
};

// 5. Respond Job Interview Simulation (Multi-turn + Feedback)
const interviewRespondHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { profile, candidacy, chatHistory, userResponse } = req.body;
  if (!candidacy || !chatHistory || userResponse === undefined) {
    return res.status(400).json({ error: "Faltan parámetros requeridos para la simulación" });
  }

  // Count candidate turns to decide if we should wrap up
  const candidateAnswers = chatHistory.filter((item: any) => item.role === "candidate");
  const turnCount = candidateAnswers.length + 1; // including the new response

  try {
    if (turnCount < 3) {
      // Generate next question
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Eres un entrevistador de talento técnico de la empresa "${candidacy.company}".
Estás realizando una simulación de entrevista para el puesto de "${candidacy.jobTitle}".
El currículum del candidato incluye el nombre "${profile?.name || 'Candidato'}" y habilidades "${profile?.skills?.join(", ") || 'No especificadas'}".

Aquí está el historial de la conversación hasta ahora:
${chatHistory.map((h: any) => `${h.role === 'interviewer' ? 'Entrevistador' : 'Candidato'}: ${h.text}`).join("\n")}
Candidato (nueva respuesta actual): "${userResponse}"

Instrucciones:
1. Lee la última respuesta del candidato. Reacciona brevemente de forma profesional (ej: "Excelente punto", "Entiendo perfectamente", "Muy interesante").
2. Formula la SIGUIENTE pregunta de la entrevista (esta es la pregunta número ${turnCount + 1} de un total de 3).
3. Enfoca esta pregunta en un aspecto técnico o de resolución de problemas reales aplicables al puesto de "${candidacy.jobTitle}" y que involucre las habilidades del candidato o situaciones de trabajo en equipo.
4. Mantén el tono amigable y retador. Haz solo UNA pregunta concisa. No te adelantes a dar retroalimentación aún.`,
      });

      const nextQuestion = response.text?.trim() || "¿Podrías darme un ejemplo de un reto técnico complejo que hayas resuelto recientemente y qué tecnologías decidiste usar?";
      return res.json({
        isFinished: false,
        nextQuestion,
        feedback: null
      });
    } else {
      // This is the 3rd answer. We finish and evaluate.
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Eres un entrevistador y coach de carrera experto. Has completado una simulación de entrevista de 3 preguntas con el candidato "${profile?.name || 'Candidato'}" para la posición de "${candidacy.jobTitle}" en "${candidacy.company}".
Revisa las respuestas del candidato y genera una evaluación constructiva y detallada en español estructurada como JSON.

HISTORIAL DE LA ENTREVISTA:
${chatHistory.map((h: any) => `${h.role === 'interviewer' ? 'Entrevistador' : 'Candidato'}: ${h.text}`).join("\n")}
Candidato (última respuesta): "${userResponse}"

DATOS DEL CANDIDATO (CV):
- Habilidades: ${profile?.skills?.join(", ") || "No especificadas"}
- Experiencia: ${profile?.experience?.map((e: any) => `${e.role} en ${e.company}`).join(", ") || "No especificada"}

Instrucciones para la evaluación:
1. Calcula un "score" del 0 al 100 de forma realista basándote en la claridad, el nivel de detalle y la madurez técnica/profesional de las respuestas brindadas.
2. Identifica 2 o 3 "strengths" (fortalezas) clave demostradas por el candidato durante el ejercicio.
3. Identifica 2 o 3 "improvements" (puntos de mejora) específicos, como por ejemplo si necesita estructurar mejor sus respuestas (usando el método STAR), profundizar en detalles técnicos o demostrar más entusiasmo.
4. Redacta 3 "suggestedAnswers" (respuestas recomendadas / plantillas) de cómo podría haber respondido cada una de las preguntas de manera más impactante y profesional, adaptándose a su perfil real.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER, description: "Puntaje general estimado de la entrevista del 0 al 100" },
              strengths: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Lista de 2 a 3 fortalezas del candidato detectadas en la entrevista"
              },
              improvements: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Lista de 2 a 3 sugerencias concretas o áreas de mejora"
              },
              suggestedAnswers: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Plantillas o guías de respuestas ideales en español para cada una de las preguntas realizadas"
              }
            },
            required: ["score", "strengths", "improvements", "suggestedAnswers"]
          }
        }
      });

      const feedbackData = JSON.parse(response.text?.trim() || "{}");
      return res.json({
        isFinished: true,
        nextQuestion: null,
        feedback: feedbackData
      });
    }
  } catch (error: any) {
    recordGeminiFailure("interview.respond", error);
    console.warn("[Service Status] Gemini API unavailable during interview response/evaluation, activating fallback.", error);
    
    if (turnCount < 3) {
      // Local question rotation fallback
      let nextQuestion = "";
      if (turnCount === 1) {
        nextQuestion = `Entiendo perfectamente, gracias por compartir ese enfoque. Pasando a la segunda pregunta: en tu CV mencionas dominar varias tecnologías clave. ¿Podrías describirme una situación donde hayas tenido que aprender una nueva herramienta o resolver un bug complejo bajo presión? ¿Cómo lo abordaste?`;
      } else {
        nextQuestion = `Excelente descripción. Para concluir las preguntas de esta sesión: el rol de ${candidacy.jobTitle} requiere una gran comunicación y alineación con los objetivos del negocio. ¿Cómo aseguras que el código que escribes o las decisiones técnicas que tomas aporten valor real al usuario final y a los metas de la compañía?`;
      }
      return res.json({
        isFinished: false,
        nextQuestion,
        feedback: null
      });
    } else {
      // Local feedback evaluation fallback
      const score = Math.min(Math.max(50 + Math.floor(userResponse.length / 5), 70), 95);
      const isShort = userResponse.length < 50;

      const strengths = [
        "Demuestra honestidad y disposición para colaborar en equipos multidisciplinarios.",
        "Menciona tecnologías clave del stack solicitado y muestra noción del perfil profesional requerido.",
        "Buena actitud y puntualidad en el hilo conductor de la conversación."
      ];

      const improvements = isShort ? [
        "Tus respuestas son un poco breves. En entrevistas reales, intenta expandir tus respuestas usando el método STAR (Situación, Tarea, Acción, Resultado) para dar mayor contexto.",
        "Profundiza más en los retos técnicos: menciona nombres de librerías, metodologías o los desafíos específicos que superaste.",
        "Prepara historias de éxito cuantificables (ej: reducción de tiempos de carga, cantidad de usuarios beneficiados) para aumentar el impacto de tu discurso."
      ] : [
        "Intenta resumir tus puntos fuertes al inicio de tu respuesta para mantener enganchado al entrevistador.",
        "Estructura tus ejemplos con mayor claridad usando la metodología STAR (Situación, Tarea, Acción, Resultado).",
        "Asegúrate de conectar siempre tu experiencia con el valor comercial o de producto que generaste para la empresa."
      ];

      const suggestedAnswers = [
        `Para presentarte de manera de alto impacto: "Hola, soy desarrollador especialista en las habilidades de mi perfil. Me apasiona resolver problemas mediante código limpio y bien estructurado. Me entusiasma esta vacante en ${candidacy.company} porque veo que valoran la innovación y el crecimiento ágil, áreas donde mi experiencia encaja perfectamente."`,
        `Para hablar de retos complejos: "En mi rol anterior, enfrentamos un problema de rendimiento crítico en una interfaz principal. Decidí implementar optimizaciones de renderizado y reestructurar el estado global de la aplicación. Esto no solo solucionó el problema, sino que redujo el tiempo de carga en un 35% y mejoró la retención de usuarios."`,
        `Para hablar de valor comercial: "Considero que un buen desarrollador no solo escribe código, sino que entiende el negocio. Siempre busco alinear mis tareas con los objetivos de producto, colaborando estrechamente con diseñadores y product managers para asegurar que cada entrega aporte el máximo valor posible al usuario final."`
      ];

      return res.json({
        isFinished: true,
        nextQuestion: null,
        feedback: {
          score,
          strengths,
          improvements,
          suggestedAnswers
        }
      });
    }
  }
};

// 6. Generate Dynamic Validation Quiz for Career Goals
const goalsQuizHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { title, description, profile } = req.body;
  if (!title) {
    return res.status(400).json({ error: "No se proporcionó el título de la meta" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Genera un breve cuestionario técnico/conceptual de opción múltiple con exactamente 3 preguntas en español para validar y evaluar los conocimientos del usuario respecto a la meta de desarrollo profesional: "${title}".
Descripción de la meta: "${description}".

Cada pregunta debe medir si la persona comprende los conceptos o las mejores prácticas de esta área específica.
Proporciona exactamente 3 preguntas. Para cada pregunta, define:
1. La pregunta clara y desafiante ("question").
2. Un arreglo de exactamente 4 opciones de respuesta realistas ("options"). No uses opciones absurdas.
3. El índice (0, 1, 2 o 3) de la opción correcta ("correctIndex").
4. Una explicación pedagógica y constructiva de por qué esa opción es la correcta ("explanation").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctIndex", "explanation"]
              },
              description: "Lista de exactamente 3 preguntas de opción múltiple para evaluar los conocimientos del tema"
            }
          },
          required: ["questions"]
        }
      }
    });

    const quizData = JSON.parse(response.text?.trim() || "{}");
    if (!quizData.questions || quizData.questions.length === 0) {
      throw new Error("Estructura de cuestionario vacía");
    }
    return res.json(quizData);
  } catch (error: any) {
    recordGeminiFailure("goals.quiz", error);
    console.warn("[Service Status] Gemini API unavailable or failed to parse for quiz, using custom fallback.", error);

    const titleLower = title.toLowerCase();
    const descLower = (description || "").toLowerCase();
    let selectedQuestions = [];

    // Category 1: Frontend, React, UI/UX, TypeScript, Web
    if (titleLower.includes("react") || titleLower.includes("front") || titleLower.includes("ui") || titleLower.includes("web") || titleLower.includes("typescript") || titleLower.includes("css")) {
      selectedQuestions = [
        {
          question: "¿Cuál es la principal ventaja de utilizar React.memo o useMemo en un desarrollo frontend?",
          options: [
            "Permite duplicar la velocidad de carga inicial de cualquier página.",
            "Optimiza el rendimiento evitando re-renderizados innecesarios de componentes si sus propiedades no han cambiado.",
            "Sirve para almacenar de forma persistente información sensible en el navegador.",
            "Reemplaza por completo el uso de librerías de gestión de estado como Redux o Zustand."
          ],
          correctIndex: 1,
          explanation: "useMemo y React.memo se enfocan en optimizar el rendimiento de renderizado en React al memorizar resultados y evitar cálculos costosos o renderizados cíclicos redundantes."
        },
        {
          question: "Al utilizar TypeScript, ¿por qué es recomendable evitar el tipo genérico 'any' en tus funciones?",
          options: [
            "Porque el compilador de TypeScript arrojará un error de sintaxis que impedirá la compilación por completo.",
            "Porque aumenta significativamente el tamaño final del archivo compilado en producción.",
            "Porque anula las ventajas del tipado estático, perdiendo autocompletado y seguridad contra errores en tiempo de ejecución.",
            "TypeScript no cuenta con un tipo llamado 'any' en su documentación estándar."
          ],
          correctIndex: 2,
          explanation: "El tipo 'any' desconecta el motor de inferencia de TypeScript sobre esa variable, abriendo la puerta a errores de tipos en ejecución y perdiendo la asistencia del editor."
        },
        {
          question: "En maquetación moderna, ¿cuál es la diferencia principal entre CSS Grid y Flexbox?",
          options: [
            "Flexbox es de dos dimensiones (filas y columnas) mientras que Grid es unidimensional.",
            "Grid está diseñado principalmente para layouts bidimensionales (filas y columnas simultáneas) y Flexbox está pensado para distribución en una sola dimensión.",
            "Flexbox solo funciona en navegadores antiguos de escritorio y Grid es exclusivo para dispositivos móviles.",
            "No existe ninguna diferencia práctica; ambos hacen exactamente lo mismo con idéntica sintaxis."
          ],
          correctIndex: 1,
          explanation: "Flexbox es ideal para alinear elementos en un solo eje (unidimensional), mientras que CSS Grid destaca al estructurar layouts complejos en filas y columnas simultáneas (bidimensional)."
        }
      ];
    }
    // Category 2: CV, Resume, LinkedIn, Perfil, GitHub
    else if (titleLower.includes("cv") || titleLower.includes("currículum") || titleLower.includes("perfil") || titleLower.includes("linkedin") || titleLower.includes("github") || titleLower.includes("portafolio")) {
      selectedQuestions = [
        {
          question: "Para que un currículum técnico destaque ante un reclutador de TI, ¿cómo deberían describirse los logros laborales?",
          options: [
            "Escribiendo párrafos muy extensos contando el día a día detallado de la empresa.",
            "Nombrando únicamente las herramientas de software sin explicar qué se construyó.",
            "Utilizando el formato de acción e impacto cuantificable (ej: 'Optimicé consultas SQL reduciendo los tiempos de carga en un 40%').",
            "Poniendo los logos de las empresas y enlaces de redes sociales sin describir roles."
          ],
          correctIndex: 2,
          explanation: "Los reclutadores técnicos valoran el contexto y los resultados medibles. Decir qué hiciste, con qué herramienta y qué impacto medible causaste es la mejor forma de demostrar seniority."
        },
        {
          question: "¿Cuál es la función principal de incluir una sección de 'Perfil Profesional' o sumario al inicio de tu currículum?",
          options: [
            "Funcionar como espacio para listar los pasatiempos e intereses recreativos personales.",
            "Ofrecer un gancho de 3 a 4 líneas que resuma tu especialidad, principales tecnologías y el valor inmediato que puedes aportar a la vacante.",
            "Reemplazar por completo el listado de experiencia laboral previa.",
            "Colocar un descargo de responsabilidad legal sobre la veracidad de la información de contacto."
          ],
          correctIndex: 1,
          explanation: "El sumario es tu carta de presentación inmediata. Le ayuda al reclutador (que suele escanear el CV en 7 segundos) a comprender rápidamente si encajas en los requisitos principales."
        },
        {
          question: "Si deseas mejorar tu marca personal en GitHub o plataformas de portafolio, ¿qué elemento es CRÍTICO añadir a tus repositorios?",
          options: [
            "Subir todo el código en un solo archivo index sin carpetas.",
            "Un archivo README claro que explique qué hace el proyecto, qué tecnologías usa, capturas de pantalla y cómo correrlo localmente.",
            "Comentarios extensos en cada línea de código explicando qué es una variable.",
            "Ocultar el código fuente por completo para que no sea copiado."
          ],
          correctIndex: 1,
          explanation: "Un buen archivo README demuestra profesionalismo, orden y habilidades de comunicación. Facilita que otros ingenieros y selectores vean el valor de tu código sin descifrarlo a ciegas."
        }
      ];
    }
    // Category 3: Interviews, Soft Skills, Communication, Agile
    else if (titleLower.includes("entrevista") || titleLower.includes("comunicación") || titleLower.includes("liderazgo") || titleLower.includes("agile") || titleLower.includes("soft") || titleLower.includes("metodología")) {
      selectedQuestions = [
        {
          question: "¿En qué consiste la Metodología STAR recomendada para responder preguntas conductuales en entrevistas?",
          options: [
            "System, Team, Analysis, Response (Sistema, Equipo, Análisis, Respuesta).",
            "Situation, Task, Action, Result (Situación, Tarea, Acción, Resultado).",
            "Software, Testing, Architecture, Review (Software, Pruebas, Arquitectura, Revisión).",
            "Es un modelo para calificar la velocidad de escritura en teclados mecánicos."
          ],
          correctIndex: 1,
          explanation: "El método STAR es el estándar dorado: describes el contexto (Situación), la meta (Tarea), lo que tú hiciste (Acción), y el desenlace cuantificable (Resultado)."
        },
        {
          question: "Durante una entrevista, si no conoces la respuesta técnica exacta a una pregunta del entrevistador, ¿cuál es la mejor estrategia?",
          options: [
            "Inventar una respuesta compleja usando términos técnicos al azar esperando que el entrevistador no se dé cuenta.",
            "Mantenerse en silencio total o decir 'No sé' de forma tajante y cambiar de tema rápidamente.",
            "Reconocer honestamente que no manejas el término exacto, pero explicar qué nociones tienes al respecto o cómo investigarías la solución.",
            "Interrumpir la entrevista y buscar el término en tu teléfono móvil inmediatamente."
          ],
          correctIndex: 2,
          explanation: "La honestidad combinada con la capacidad de resolución de problemas e investigación es sumamente valorada. Demuestra madurez y actitud proactiva ante la incertidumbre."
        },
        {
          question: "En metodologías ágiles (como Scrum), ¿cuál es el objetivo principal de la reunión diaria (Daily Standup)?",
          options: [
            "Hacer una revisión minuciosa de código línea por línea con todo el equipo.",
            "Sincronizar el trabajo diario, reportar impedimentos (bloqueos) y planificar las actividades de las próximas 24 horas.",
            "Decidir el aumento salarial de los desarrolladores o amonestar a los rezagados.",
            "Discutir tendencias tecnológicas externas de entretenimiento."
          ],
          correctIndex: 1,
          explanation: "La Daily tiene como propósito mantener al equipo alineado, resolver bloqueos ágilmente y asegurar que el Sprint avance con fluidez en sesiones breves de 15 minutos."
        }
      ];
    }
    // Default Fallback
    else {
      selectedQuestions = [
        {
          question: "Al planificar el aprendizaje de una nueva habilidad técnica, ¿cuál es la mejor estrategia para consolidar conocimientos?",
          options: [
            "Leer manuales teóricos completos de 500 páginas sin escribir código ni proyectos reales.",
            "Realizar pequeños proyectos prácticos que apliquen los conceptos y tratar de explicar lo aprendido a otras personas.",
            "Copiar y pegar plantillas de internet sin entender los fundamentos de la sintaxis.",
            "Esperar a dominar el 100% de la teoría antes de instalar las herramientas."
          ],
          correctIndex: 1,
          explanation: "El aprendizaje activo (aprender haciendo y enseñar) es sustancialmente más efectivo para retener conceptos abstractos y desarrollar intuición técnica."
        },
        {
          question: "¿Por qué es importante establecer hitos y metas incrementales (micro-metas) en un plan de desarrollo profesional?",
          options: [
            "Para evitar el aprendizaje y enfocarse únicamente en el ocio laboral.",
            "Facilitan mantener la motivación, permiten medir el progreso real y evitan el agobio de tratar de absorber demasiados conocimientos a la vez.",
            "Es un requisito burocrático exigido por el gobierno para certificar habilidades de TI.",
            "No tienen ninguna utilidad y es mejor estudiar temas al azar según surjan diariamente."
          ],
          correctIndex: 1,
          explanation: "Dividir grandes metas en micro-pasos de acción nos da gratificación continua, reduce la procrastinación y crea hábitos consistentes de desarrollo personal."
        },
        {
          question: "¿Qué papel desempeña la retroalimentación constructiva en tu crecimiento profesional?",
          options: [
            "Debe evitarse a toda costa, ya que suele denotar falta de capacidad individual.",
            "Sirve únicamente para que los líderes de equipo demuestren superioridad jerárquica.",
            "Es un insumo invaluable que ilumina puntos ciegos técnicos o interpersonales, permitiendo acelerar el perfeccionamiento continuo.",
            "Solo es útil si viene acompañada de una certificación académica formal."
          ],
          correctIndex: 2,
          explanation: "La retroalimentación nos ayuda a ver dónde tropezamos o qué áreas técnicas descuidamos, convirtiéndose en el motor de aceleración más potente en carreras ágiles."
        }
      ];
    }

    return res.json({ questions: selectedQuestions });
  }
};

// Fallback generators for technical interview practice
function getFallbackTechnicalQuestions(profile: any, candidacy: any) {
  const jobTitle = candidacy?.jobTitle || "Desarrollador de Software";
  const skills = profile?.skills || [];
  
  let questions = [];
  if (skills.some((s: string) => s.toLowerCase().includes("react") || s.toLowerCase().includes("front"))) {
    questions = [
      {
        id: "q-1",
        question: `Para el rol de ${jobTitle}, ¿cómo optimizarías una aplicación React que sufre de lentitud al renderizar listas extensas de elementos dinámicos que cambian con frecuencia?`,
        topic: "React Performance & Rendering",
        expectedConcept: "Uso de React.memo, windowing/virtualización (como react-window), llaves de renderizado (keys) adecuadas y memorización con useMemo o useCallback."
      },
      {
        id: "q-2",
        question: "¿Cuál es la diferencia técnica entre los hooks de React 'useEffect' y 'useLayoutEffect', y en qué situaciones de producción elegirías uno sobre el otro?",
        topic: "React Hook Lifecycles",
        expectedConcept: "useLayoutEffect corre sincrónicamente después de todas las mutaciones del DOM pero antes de que el navegador pinte. useEffect corre asincrónicamente después de pintar. Elegir useLayoutEffect para cálculos visuales de layouts que previenen parpadeos (flickers)."
      },
      {
        id: "q-3",
        question: "¿Cómo gestionas el estado global y previenes re-renders innecesarios en un proyecto complejo de mediana o gran escala utilizando React?",
        topic: "State Management & Architecture",
        expectedConcept: "Zustand, Redux Toolkit, o Context API con selectores bien definidos para evitar la propagación de actualizaciones en componentes que no dependen de la porción de estado cambiada."
      }
    ];
  } else if (skills.some((s: string) => s.toLowerCase().includes("node") || s.toLowerCase().includes("back") || s.toLowerCase().includes("express"))) {
    questions = [
      {
        id: "q-1",
        question: `Como ${jobTitle}, ¿cómo funciona el Event Loop de Node.js en su fase de microtareas y macrotareas, y cómo asegurarías que una operación intensiva en CPU no bloquee las peticiones de otros usuarios en Express?`,
        topic: "Node.js Event Loop & CPU Blocking",
        expectedConcept: "Uso de hilos de trabajo (Worker Threads), procesos secundarios (child_processes) o dividir el trabajo pesado en porciones asíncronas con setImmediate, entendiendo que las promesas van a la cola de microtareas que se procesa antes que la de macrotareas."
      },
      {
        id: "q-2",
        question: "¿Cómo diseñarías e implementarías un sistema de control de tasa de peticiones (Rate Limiting) robusto en una API de producción para prevenir ataques de denegación de servicio (DDoS)?",
        topic: "API Security & Rate Limiting",
        expectedConcept: "Uso de Redis para contar solicitudes por IP/token en un intervalo de tiempo (algoritmo Token Bucket o Sliding Window), y middlewares de Express como express-rate-limit."
      },
      {
        id: "q-3",
        question: "Al diseñar una base de datos relacional para un sistema que manejará millones de transacciones de lectura/escritura, ¿cómo optimizarías las consultas SQL lentas y qué estrategia de índices adoptarías?",
        topic: "Database Optimization & Indexes",
        expectedConcept: "Uso de EXPLAIN ANALYZE para rastrear cuellos de botella, índices B-Tree en columnas de filtrado frecuente, índices compuestos, evitar SELECT *, y si es necesario, replicación de lectura/escritura o sharding."
      }
    ];
  } else {
    questions = [
      {
        id: "q-1",
        question: `Considerando el rol de ${jobTitle}, ¿cuál es tu metodología para diagnosticar y solucionar un cuello de botella de rendimiento misterioso en un entorno de producción que ocurre de forma intermitente?`,
        topic: "Troubleshooting & Performance",
        expectedConcept: "Monitoreo APM (NewRelic, Datadog), revisión sistemática de logs en tiempo real, análisis de consumo de memoria/CPU, perfiles de base de datos lenta e instrumentación controlada."
      },
      {
        id: "q-2",
        question: "¿Qué consideraciones de seguridad críticas implementas de forma predeterminada al diseñar y desplegar un nuevo servicio web o microservicio en la nube?",
        topic: "Security & Cloud Architecture",
        expectedConcept: "Principio de menor privilegio, cifrado en tránsito (HTTPS) y en reposo, sanitización estricta de entradas para evitar inyecciones, uso de HTTPS-only cookies, y gestión segura de secretos (env vars, Secret Manager)."
      },
      {
        id: "q-3",
        question: "Describe cómo estructurarías un pipeline de Integración y Despliegue Continuo (CI/CD) automatizado para asegurar que ningún código con errores graves llegue a los servidores de producción.",
        topic: "DevOps & CI/CD Pipelines",
        expectedConcept: "Ejecución automatizada de pruebas unitarias/integración, análisis estático de código (linters, SonarQube), escaneo de vulnerabilidades en dependencias, despliegues progresivos (Blue-Green o Canary) y mecanismos automáticos de rollback."
      }
    ];
  }
  return { questions };
}

function getFallbackTechnicalEvaluation(question: string, answer: string, profile: any, candidacy: any) {
  const score = Math.min(Math.max(50 + Math.floor(answer.length / 6), 65), 98);
  const isShort = answer.length < 60;
  
  return {
    score,
    feedback: `Has proporcionado una respuesta que contiene elementos interesantes. ${isShort ? 'Sin embargo, es sumamente breve para una entrevista técnica de este nivel. Un entrevistador esperará respuestas con mayor profundidad conceptual y ejemplos prácticos.' : 'Se aprecia que conoces la teoría de base y logras estructurar conceptos relevantes.'}`,
    strengths: [
      "Aborda directamente el tema de la pregunta con terminología técnica correcta.",
      "Demuestra comprensión del problema de fondo planteado en el rol.",
      "Muestra claridad y un lenguaje profesional de ingeniería."
    ],
    improvements: isShort ? [
      "La respuesta es demasiado corta. En entrevistas reales de ingeniería, expande tus respuestas explicando el 'cómo' y el 'por qué', y no solo el 'qué'.",
      "Menciona librerías, herramientas o configuraciones específicas que demuestren que has implementado estas soluciones en proyectos pasados.",
      "Utiliza el método STAR: describe una Situación específica, la Tarea asignada, la Acción técnica exacta que tomaste y el Resultado numérico/técnico que lograste."
    ] : [
      "Para ganar mayor solidez, proporciona un ejemplo real o hipotético detallando qué tecnologías específicas utilizaste en el pasado.",
      "Menciona métricas cuantitativas del éxito de tus optimizaciones (ej: 'reducción de un 40% en consumo', 'mejoras de un 20% en tiempo de respuesta').",
      "Asegúrate de anticipar las desventajas o trade-offs de la solución propuesta (por ejemplo, mayor complejidad o consumo de memoria)."
    ],
    suggestedAnswer: `Una respuesta modelo ideal para destacar sería:\n"Para abordar esta situación de forma profesional, yo implementaría una estrategia estructurada. En primer lugar, analizaría el comportamiento mediante herramientas de monitoreo o profiling para encontrar el cuello de botella exacto de forma cuantitativa. Una vez localizado el problema (por ejemplo, re-renders redundantes o queries de base de datos no indexadas), aplicaría la optimización correspondiente: como la virtualización de listas extensas o el uso inteligente de índices compuestos y caché en memoria. Adicionalmente, mediría el antes y después para validar un impacto de negocio real, como reducir los tiempos de respuesta del servidor en un 30%."`
  };
}

// 6.5. Generate Technical Interview Questions
const interviewTechnicalQuestionsHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { profile, candidacy } = req.body;
  if (!candidacy) {
    return res.status(400).json({ error: "No se proporcionó información de la candidatura" });
  }

  try {
    const jobTitle = candidacy.jobTitle || "Desarrollador";
    const company = candidacy.company || "Empresa";
    const skills = profile?.skills?.join(", ") || "No especificadas";

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Genera un cuestionario de exactamente 3 preguntas de entrevista técnica desafiantes, realistas y específicas en español para el rol de "${jobTitle}" en la empresa "${company}".
      
      El candidato tiene las siguientes habilidades técnicas en su CV: ${skills}.
      
      Por favor, formula las preguntas enfocadas en casos prácticos y conceptos técnicos avanzados que midan la experiencia y profundidad del candidato. Evita preguntas genéricas de recursos humanos.
      
      Devuelve la respuesta en formato JSON estructurado con un arreglo "questions", donde cada pregunta contiene:
      1. "id": ID único de la pregunta (ej: "tq-1", "tq-2", "tq-3").
      2. "question": La pregunta técnica redactada de forma clara y retadora.
      3. "topic": El tema técnico de la pregunta (ej: "React Render Optimization", "Node.js Event Loop", "Database Indexes").
      4. "expectedConcept": Qué conceptos técnicos clave esperará escuchar un entrevistador senior en la respuesta del candidato.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  expectedConcept: { type: Type.STRING }
                },
                required: ["id", "question", "topic", "expectedConcept"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    if (!data.questions || data.questions.length === 0) {
      throw new Error("No se obtuvieron preguntas técnicas estructuradas de la IA");
    }
    return res.json(data);
  } catch (error: any) {
    recordGeminiFailure("interview.technical.questions", error);
    console.warn("[Service Status] Gemini API unavailable or failed during technical questions generation, activating fallback.");
    const fallbackQuestions = getFallbackTechnicalQuestions(profile, candidacy);
    return res.json(fallbackQuestions);
  }
};

// 6.6. Evaluate Technical Question Answer
const interviewTechnicalEvaluateHandler: express.RequestHandler = async (req, res) => {
  if (!checkApiKey(res)) return;

  const { question, answer, profile, candidacy } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: "Faltan la pregunta o la respuesta del usuario para poder evaluar" });
  }

  try {
    const jobTitle = candidacy?.jobTitle || "Desarrollador";
    const skills = profile?.skills?.join(", ") || "No especificadas";

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Evalúa la respuesta de un candidato a la siguiente pregunta técnica en español de forma extremadamente constructiva, rigurosa y experta.
      
      ROL AL QUE POSTULA: ${jobTitle}
      HABILIDADES EN SU CV: ${skills}
      PREGUNTA TÉCNICA: "${question}"
      RESPUESTA DEL CANDIDATO: "${answer}"
      
      Proporciona un feedback en español estructurado en JSON con los siguientes campos:
      1. "score": Un puntaje del 0 al 100 estimando la madurez conceptual, precisión y profundidad técnica de la respuesta. Sé realista (respuestas vacías o ultra breves merecen < 60; respuestas excelentes merecen > 85).
      2. "feedback": Una explicación detallada (1-2 párrafos) y muy clara sobre el nivel de la respuesta del candidato.
      3. "strengths": Un arreglo de 2-3 puntos fuertes o aciertos teóricos que tuvo el candidato en su respuesta.
      4. "improvements": Un arreglo de 2-3 puntos específicos que le faltaron o que podría mejorar para sonar más senior y profesional.
      5. "suggestedAnswer": Una respuesta modelo/ideal de nivel senior que ejemplifique cómo responder de forma impecable y con impacto a la pregunta dada, adaptada a su rol.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedAnswer: { type: Type.STRING }
          },
          required: ["score", "feedback", "strengths", "improvements", "suggestedAnswer"]
        }
      }
    });

    const evaluation = JSON.parse(response.text?.trim() || "{}");
    return res.json(evaluation);
  } catch (error: any) {
    recordGeminiFailure("interview.technical.evaluate", error);
    console.warn("[Service Status] Gemini API failed during technical answer evaluation, activating local fallback.");
    const fallbackEvaluation = getFallbackTechnicalEvaluation(question, answer, profile, candidacy);
    return res.json(fallbackEvaluation);
  }
};

export {
  cvAnalyzeHandler,
  jobsSearchHandler,
  jobsDailyRecommendationHandler,
  jobsSalaryComparisonHandler,
  jobsLinkedinImportHandler,
  jobsCoverLetterHandler,
  jobsRecommendationsHandler,
  interviewStartHandler,
  interviewRespondHandler,
  goalsQuizHandler,
  interviewTechnicalQuestionsHandler,
  interviewTechnicalEvaluateHandler,
};

