import { jsPDF } from "jspdf";
import { UserProfile } from "../types";

export interface ExportOptions {
  themeColor?: "indigo" | "charcoal" | "emerald" | "blue";
  includeContact?: boolean;
  groupSkills?: boolean;
}

export function exportUserProfileToPDF(profile: UserProfile, options: ExportOptions = {}) {
  const themeColor = options.themeColor || "indigo";
  const includeContact = options.includeContact !== false;
  const groupSkills = options.groupSkills !== false;

  // Create an A4 PDF document in portrait mode, using mm as units
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageHeight = 297;
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2); // 180mm

  let y = 15;

  // Set theme colors based on choice
  let primaryRGB = [79, 70, 229]; // Indigo 600 default
  let tagBgRGB = [240, 244, 255]; // Indigo 50
  let tagTextRGB = [67, 56, 202]; // Indigo 700

  if (themeColor === "charcoal") {
    primaryRGB = [51, 65, 85]; // Slate 700
    tagBgRGB = [241, 245, 249]; // Slate 100
    tagTextRGB = [15, 23, 42]; // Slate 900
  } else if (themeColor === "emerald") {
    primaryRGB = [5, 150, 105]; // Emerald 600
    tagBgRGB = [236, 253, 245]; // Emerald 50
    tagTextRGB = [4, 120, 87]; // Emerald 700
  } else if (themeColor === "blue") {
    primaryRGB = [37, 99, 235]; // Blue 600
    tagBgRGB = [239, 246, 255]; // Blue 50
    tagTextRGB = [29, 78, 216]; // Blue 700
  }

  // Helper to check space and insert new page if needed
  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = 15;
      // Elegant running page header
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // light gray
      doc.text(`Currículum Vitae — ${profile.name}`, margin, y);
      
      // Right-aligned page number
      const pageStr = `${doc.getNumberOfPages()}`;
      doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), y);
      
      // Separator line for header
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      
      y += 10;
    }
  };

  // 1. HEADER SECTION (Professional Header)
  // Candidate Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate 800
  const candidateName = profile.name || "Candidato Profesional";
  doc.text(candidateName, margin, y);
  y += 6.5;

  // Contact Info bar
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500

  const contactItems: string[] = [];
  if (includeContact) {
    if (profile.email) contactItems.push(profile.email);
    if (profile.phone) contactItems.push(profile.phone);
  }
  if (profile.cvFileName && profile.cvFileName !== "Importado de LinkedIn") {
    contactItems.push(`CV: ${profile.cvFileName}`);
  } else if (profile.cvFileName === "Importado de LinkedIn") {
    contactItems.push("Perfil de LinkedIn Sincronizado");
  }

  const contactText = contactItems.join("  |  ");
  doc.text(contactText, margin, y);
  y += 5;

  // Thin elegant dividing line
  doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 2. SKILLS / COMPETENCIAS SECTION
  if (profile.skills && profile.skills.length > 0) {
    ensureSpace(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.text("HABILIDADES Y COMPETENCIAS TÉCNICAS", margin, y);
    y += 2.5;

    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    const tagPaddingX = 3.5;
    const tagHeight = 6;
    const tagGapX = 2;
    const tagGapY = 2;

    if (groupSkills) {
      // Group skills by category
      const categories = [
        { id: "Frontend", label: "Frontend" },
        { id: "Backend", label: "Backend" },
        { id: "Data Science", label: "Data Science" },
        { id: "Idiomas", label: "Idiomas" },
        { id: "Diseño / UX", label: "Diseño / UX" },
        { id: "DevOps / Cloud", label: "DevOps / Cloud" },
        { id: "Metodologías / Gestión", label: "Metodologías / Gestión" },
        { id: "Otras", label: "Otras / General" }
      ];

      const skillsByCategory: Record<string, string[]> = {};
      categories.forEach(cat => {
        skillsByCategory[cat.id] = [];
      });
      const uncategorizedSkills: string[] = [];

      profile.skills.forEach(skill => {
        const catId = profile.skillCategories?.[skill];
        if (catId && skillsByCategory[catId]) {
          skillsByCategory[catId].push(skill);
        } else {
          uncategorizedSkills.push(skill);
        }
      });

      categories.forEach(cat => {
        const skillsInCat = skillsByCategory[cat.id];
        if (skillsInCat && skillsInCat.length > 0) {
          ensureSpace(10);
          
          // Print category name left column style
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139); // Slate 500
          doc.text(cat.label, margin, y + 4.1);

          let x = margin + 45; // Indent skills tags to the right
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);

          skillsInCat.forEach(skill => {
            const textWidth = doc.getTextWidth(skill);
            const tagWidth = textWidth + (tagPaddingX * 2);

            // Wrap within right side bounds
            if (x + tagWidth > pageWidth - margin) {
              x = margin + 45;
              y += tagHeight + tagGapY;
              ensureSpace(tagHeight + 2);
            }

            doc.setFillColor(tagBgRGB[0], tagBgRGB[1], tagBgRGB[2]);
            doc.roundedRect(x, y, tagWidth, tagHeight, 1.2, 1.2, "F");

            doc.setTextColor(tagTextRGB[0], tagTextRGB[1], tagTextRGB[2]);
            doc.text(skill, x + tagPaddingX, y + 4.1);

            x += tagWidth + tagGapX;
          });

          y += tagHeight + 2;
        }
      });

      if (uncategorizedSkills.length > 0) {
        ensureSpace(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text("Otras", margin, y + 4.1);

        let x = margin + 45;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);

        uncategorizedSkills.forEach(skill => {
          const textWidth = doc.getTextWidth(skill);
          const tagWidth = textWidth + (tagPaddingX * 2);

          if (x + tagWidth > pageWidth - margin) {
            x = margin + 45;
            y += tagHeight + tagGapY;
            ensureSpace(tagHeight + 2);
          }

          doc.setFillColor(tagBgRGB[0], tagBgRGB[1], tagBgRGB[2]);
          doc.roundedRect(x, y, tagWidth, tagHeight, 1.2, 1.2, "F");

          doc.setTextColor(tagTextRGB[0], tagTextRGB[1], tagTextRGB[2]);
          doc.text(skill, x + tagPaddingX, y + 4.1);

          x += tagWidth + tagGapX;
        });

        y += tagHeight + 2;
      }

      y += 6; // Spacing after skills
    } else {
      // Render badges
      let x = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);

      profile.skills.forEach(skill => {
        const textWidth = doc.getTextWidth(skill);
        const tagWidth = textWidth + (tagPaddingX * 2);

        // Check if we need to wrap to next line
        if (x + tagWidth > pageWidth - margin) {
          x = margin;
          y += tagHeight + tagGapY;
          ensureSpace(tagHeight + 2);
        }

        // Draw tag background
        doc.setFillColor(tagBgRGB[0], tagBgRGB[1], tagBgRGB[2]);
        doc.roundedRect(x, y, tagWidth, tagHeight, 1.2, 1.2, "F");

        // Draw tag text
        doc.setTextColor(tagTextRGB[0], tagTextRGB[1], tagTextRGB[2]);
        doc.text(skill, x + tagPaddingX, y + 4.1);

        x += tagWidth + tagGapX;
      });

      y += tagHeight + 8; // spacing after skills section
    }
  }

  // 3. WORK EXPERIENCE SECTION
  if (profile.experience && profile.experience.length > 0) {
    ensureSpace(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.text("EXPERIENCIA LABORAL", margin, y);
    y += 2.5;

    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    profile.experience.forEach((exp) => {
      // Role & Duration row
      ensureSpace(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text(exp.role, margin, y);

      // Duration on the right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      const durationWidth = doc.getTextWidth(exp.duration);
      doc.text(exp.duration, pageWidth - margin - durationWidth, y);
      y += 4;

      // Company row
      ensureSpace(5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text(exp.company, margin, y);
      y += 4.5;

      // Description lines
      if (exp.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85); // Slate 700
        
        // Wrap description to content width
        const wrappedLines = doc.splitTextToSize(exp.description, contentWidth);
        
        wrappedLines.forEach((line: string) => {
          ensureSpace(4);
          doc.text(line, margin, y);
          y += 4.1;
        });
      }
      y += 4; // space between roles
    });
    y += 4; // space after experience section
  }

  // 4. EDUCATION SECTION
  if (profile.education && profile.education.length > 0) {
    ensureSpace(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.text("EDUCACIÓN Y CERTIFICACIONES", margin, y);
    y += 2.5;

    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    profile.education.forEach((edu) => {
      ensureSpace(12);

      // Degree & Duration
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text(edu.degree, margin, y);

      if (edu.duration) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139); // Slate 500
        const eduDurationWidth = doc.getTextWidth(edu.duration);
        doc.text(edu.duration, pageWidth - margin - eduDurationWidth, y);
      }
      y += 4;

      // Institution
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text(edu.institution, margin, y);
      y += 6; // spacing after item
    });
  }

  // Save the PDF
  const safeName = (profile.name || "Curriculum").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`CV_${safeName}.pdf`);
}
