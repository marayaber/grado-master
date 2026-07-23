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
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

   const prompt = `
Eres un preparador experto.

Trabaja EXCLUSIVAMENTE con el documento proporcionado.

No inventes información.
No uses conocimiento externo.
No inventes artículos.
No inventes conceptos.

Primero genera flashcards.

La cantidad debe depender del tamaño del documento:

- Hasta 50 páginas: 20 flashcards.
- 51 a 100 páginas: 40 flashcards.
- 101 a 150 páginas: 60 flashcards.
- 151 a 200 páginas: 80 flashcards.
- Más de 200 páginas: genera las necesarias para cubrir completamente el contenido.

Las flashcards deben cubrir todo el documento y mezclar:

- Definiciones.
- Requisitos.
- Clasificaciones.
- Diferencias.
- Enumeraciones.
- Excepciones.
- Conceptos importantes.

Después genera un quiz de 15 preguntas de alternativa.

Cada pregunta debe tener:

- 4 alternativas.
- Una sola correcta.
- Explicación del porqué.
- Cita textual del documento.

Devuelve únicamente JSON válido.

Formato:

{
  "flashcards":[
    {
      "frente":"",
      "reverso":"",
      "cita_textual":""
    }
  ],
  "recursos":[
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
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    const recursos = (data.recursos || []).filter(
      (r) => r.pregunta && r.opciones && r.respuesta_correcta
    );

    if (!recursos.length) {
      throw new Error("Gemini no devolvió preguntas válidas.");
    }

    return res.status(200).json({ recursos });
  } catch (e) {
    return res.status(500).json({
      error: e.message || "Error generando recursos",
    });
  }
}

function parseForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

async function extraerTexto(file) {
  const buffer = await fs.readFile(file.filepath);
  const name = file.originalFilename?.toLowerCase() || "";
  const type = file.mimetype || "";

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const data = await pdf(buffer);
    return data.text;
  }

  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const data = await mammoth.extractRawText({ buffer });
    return data.value;
  }

  if (type === "text/plain" || name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Formato no soportado. Usa PDF, DOCX o TXT.");
}

function demo(apunte) {
  const clean = apunte.replace(/\s+/g, " ").trim();
  const frases = clean.match(/[^.!?]+[.!?]+/g)?.slice(0, 8) || [
    clean.slice(0, 250),
  ];

  return frases.slice(0, 5).map((f, i) => ({
    pregunta: `Según el apunte, ¿cuál es la idea central del fragmento ${i + 1}?`,
    opciones: {
      a: f.slice(0, 120),
      b: "Una afirmación no contenida en el apunte",
      c: "Una regla inventada por la aplicación",
      d: "Un concepto ajeno al texto",
    },
    respuesta_correcta: "a",
    explicacion:
      "La alternativa correcta reproduce una idea contenida directamente en el apunte.",
    cita_textual: f.trim(),
  }));
}
