import formidable from "formidable";
import fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { fields, files } = await parseForm(req);

    const materia = fields.materia?.[0] || "Derecho Civil";
    const titulo = fields.titulo?.[0] || "";
    let apunte = fields.apunte?.[0] || "";

    const file = files.archivo?.[0];

    if (file) {
      apunte = await extraerTexto(file);
    }

    if (!apunte || apunte.trim().length < 200) {
      return res.status(400).json({
        error: "El documento debe tener al menos 200 caracteres de texto legible.",
      });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(200).json({ recursos: demo(apunte) });
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });
const prompt = `
Eres un preparador experto.

Analiza EXCLUSIVAMENTE el documento proporcionado.

Debes generar:

1. Flashcards de estudio.
2. Un quiz de alternativa.

Las flashcards deben cubrir TODO el documento.

Cantidad de flashcards:

- Documento hasta 50 páginas → 20 flashcards.
- 51 a 100 páginas → 40 flashcards.
- 101 a 150 páginas → 60 flashcards.
- 151 a 200 páginas → 80 flashcards.
- Más de 200 páginas → genera la cantidad necesaria para cubrir completamente el contenido.

Cada flashcard debe tener este formato:

{
  "frente":"",
  "reverso":"",
  "cita_textual":""
}

Luego genera un quiz de 15 preguntas.

Reglas:

- No inventar información.
- No usar conocimiento externo.
- La explicación debe basarse únicamente en el documento.
- La cita_textual debe existir literalmente en el documento.
- Devuelve únicamente JSON válido.

Formato:

{
  "flashcards":[
    {
      "frente":"",
      "reverso":"",
      "cita_textual":""
    }
  ],
  "quiz":[
    {
      "pregunta":"",
      "opciones":{
        "a":"",
        "b":"",
        "c":"",
        "d":""
      },
      "respuesta_correcta":"a",
      "explicacion":"",
      "cita_textual":""
    }
  ]
}

Materia:
${materia}

Título:
${titulo}

Documento:

${apunte.slice(0,30000)}
`;
