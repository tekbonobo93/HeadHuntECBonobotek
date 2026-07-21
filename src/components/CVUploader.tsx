import React, { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, Sparkles, Check } from "lucide-react";
import { UserProfile } from "../types";
import CVPreviewVerifier from "./CVPreviewVerifier";

interface CVUploaderProps {
  onAnalysisComplete: (profileData: Partial<UserProfile>) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function CVUploader({ onAnalysisComplete, isLoading, setIsLoading }: CVUploaderProps) {
  const [cvText, setCvText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [parsedDataToReview, setParsedDataToReview] = useState<Partial<UserProfile> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processText = async (text: string, name: string) => {
    if (text.trim().length < 50) {
      setError("El contenido parece demasiado corto para ser un currículum válido.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText: text }),
      });

      if (!response.ok) {
        let errMsg = "Error al analizar el currículum";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          try {
            const textText = await response.text();
            if (textText && textText.length < 200) {
              errMsg = textText;
            } else {
              errMsg = `Error de servidor: ${response.status} ${response.statusText}`;
            }
          } catch (inner) {}
        }
        throw new Error(errMsg);
      }

      const parsedProfile = await response.json();
      setParsedDataToReview({
        ...parsedProfile,
        cvText: text,
        cvFileName: name || "Currículum_Cargado.txt",
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al analizar el CV. Por favor intenta de nuevo o pega el texto directamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const processFileBinary = async (base64Data: string, mimeType: string, name: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileData: base64Data, 
          mimeType: mimeType,
          fileName: name
        }),
      });

      if (!response.ok) {
        let errMsg = "Error al analizar el currículum";
        try {
          const errData = await response.json();
          errMsg = errData.error || errMsg;
        } catch (e) {
          try {
            const textText = await response.text();
            if (textText && textText.length < 200) {
              errMsg = textText;
            } else {
              errMsg = `Error de servidor: ${response.status} ${response.statusText}`;
            }
          } catch (inner) {}
        }
        throw new Error(errMsg);
      }

      const parsedProfile = await response.json();
      
      // Reconstruct a text representation of the CV from parsed fields so other components can view/search it
      const skillsStr = parsedProfile.skills ? parsedProfile.skills.join(", ") : "";
      const expStr = parsedProfile.experience 
        ? parsedProfile.experience.map((e: any) => `${e.role} en ${e.company} (${e.duration}): ${e.description}`).join("\n\n")
        : "";
      const eduStr = parsedProfile.education
        ? parsedProfile.education.map((e: any) => `${e.degree} en ${e.institution} (${e.duration || "No especificado"})`).join("\n")
        : "";
      const generatedText = `Currículum de ${parsedProfile.name || "Candidato"}
Contacto: Email: ${parsedProfile.email || "No especificado"}, Teléfono: ${parsedProfile.phone || "No especificado"}

Habilidades Técnicas:
${skillsStr}

Experiencia Laboral:
${expStr}

Educación:
${eduStr}`;

      setParsedDataToReview({
        ...parsedProfile,
        cvText: generatedText,
        cvFileName: name || "Currículum_Cargado.pdf",
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al analizar el CV. Te sugerimos copiar y pegar el contenido de tu currículum usando la pestaña 'Pegar Texto'.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setError(null);

    // If it's a plain text file, we can read it directly
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processText(text, file.name);
      };
      reader.onerror = () => {
        setError("Error al leer el archivo de texto.");
      };
      reader.readAsText(file);
    } else {
      // For PDF, Docx, etc. read as Data URL to send base64 data to the server
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const commaIndex = result.indexOf(",");
        const base64Data = result.substring(commaIndex + 1);
        
        let mimeType = file.type;
        // Guess standard mimetype if browser leaves it empty
        if (!mimeType) {
          if (file.name.endsWith(".pdf")) mimeType = "application/pdf";
          else if (file.name.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          else mimeType = "application/octet-stream";
        }
        
        processFileBinary(base64Data, mimeType, file.name);
      };
      reader.onerror = () => {
        setError("Error al leer el archivo binario.");
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  if (parsedDataToReview) {
    return (
      <CVPreviewVerifier
        initialData={parsedDataToReview}
        onConfirm={(verifiedData) => {
          onAnalysisComplete(verifiedData);
          setParsedDataToReview(null);
          setFileName("");
          setCvText("");
        }}
        onCancel={() => {
          setParsedDataToReview(null);
          setFileName("");
          setCvText("");
        }}
      />
    );
  }

  return (
    <div id="cv-uploader-container" className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-neutral-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Análisis de CV con IA
          </h2>
          <p className="text-sm text-neutral-500">
            Sube tu currículum para que la inteligencia artificial extraiga tus habilidades y experiencia automáticamente.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPasteMode(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              !pasteMode
                ? "bg-indigo-50 text-indigo-600"
                : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            Subir Archivo
          </button>
          <button
            onClick={() => setPasteMode(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              pasteMode
                ? "bg-indigo-50 text-indigo-600"
                : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            Pegar Texto
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg text-red-600 text-xs flex items-start gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Aviso: </span>
            {error}
            <button
              onClick={() => setPasteMode(true)}
              className="block mt-1 underline font-medium hover:text-red-700"
            >
              Intentar pegando el texto directamente
            </button>
          </div>
        </div>
      )}

      {!pasteMode ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerInput}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-50/30"
              : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-indigo-600">Analizando CV con Gemini 3.6...</p>
              <p className="text-xs text-neutral-400 text-center max-w-xs">
                Extrayendo experiencia laboral, habilidades técnicas y de contacto...
              </p>
            </div>
          ) : fileName ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-3">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-neutral-800">{fileName}</p>
              <p className="text-xs text-neutral-400 mt-1">¡CV leído! Analizando de nuevo si haces click aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-neutral-50 text-neutral-400 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-neutral-800">
                Arrastra tu CV aquí o <span className="text-indigo-600 underline">búscalo</span>
              </p>
              <p className="text-xs text-neutral-400 mt-2 max-w-xs">
                Soporta archivos .txt, .pdf, .docx. Para archivos PDF o Word complejos, te sugerimos la opción "Pegar Texto".
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Pega todo el texto de tu currículum (información personal, habilidades, experiencia laboral...) aquí."
            rows={6}
            disabled={isLoading}
            className="w-full text-sm border border-neutral-200 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans resize-y"
          />
          <div className="flex justify-end">
            <button
              onClick={() => processText(cvText, "CV_Pegado.txt")}
              disabled={isLoading || cvText.trim().length === 0}
              className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 ${
                (isLoading || cvText.trim().length === 0) && "opacity-50 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analizando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Analizar Texto de CV
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
