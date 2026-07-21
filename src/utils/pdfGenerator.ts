import { jsPDF } from "jspdf";
import { UserProfile } from "../types";

export function exportUserProfileToPDF(profile: UserProfile) {
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
  if (profile.email) contactItems.push(profile.email);
  if (profile.phone) contactItems.push(profile.phone);
  if (profile.cvFileName && profile.cvFileName !== "Importado de LinkedIn") {
    contactItems.push(`CV: ${profile.cvFileName}`);
  } else if (profile.cvFileName === "Importado de LinkedIn") {
    contactItems.push("Perfil de LinkedIn Sincronizado");
  }

  const contactText = contactItems.join("  |  ");
  doc.text(contactText, margin, y);
  y += 5;

  // Thin elegant dividing line
  doc.setDrawColor(79, 70, 229); // Indigo 600
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // 2. SKILLS / COMPETENCIAS SECTION
  if (profile.skills && profile.skills.length > 0) {
    ensureSpace(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text("HABILIDADES Y COMPETENCIAS TÉCNICAS", margin, y);
    y += 2.5;

    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // Render badges
    let x = margin;
    const tagPaddingX = 3.5;
    const tagHeight = 6;
    const tagGapX = 2;
    const tagGapY = 2;

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

      // Draw tag background (light blueish/indigo background)
      doc.setFillColor(240, 244, 255); // Indigo 50
      doc.roundedRect(x, y, tagWidth, tagHeight, 1.2, 1.2, "F");

      // Draw tag text (indigo text)
      doc.setTextColor(67, 56, 202); // Indigo 700
      doc.text(skill, x + tagPaddingX, y + 4.1);

      x += tagWidth + tagGapX;
    });

    y += tagHeight + 8; // spacing after skills section
  }

  // 3. WORK EXPERIENCE SECTION
  if (profile.experience && profile.experience.length > 0) {
    ensureSpace(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229); // Indigo 600
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
      doc.setTextColor(79, 70, 229); // Indigo 600
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
    doc.setTextColor(79, 70, 229); // Indigo 600
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
