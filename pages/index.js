import { useEffect, useMemo, useState } from "react";

const materias = [
  "Derecho Civil",
  "Derecho Procesal",
  "Derecho Constitucional",
  "Derecho Penal",
  "Derecho Laboral",
  "Derecho Familia",
  "Derecho Comercial",
  "Derecho Administrativo",
];

export default function Home() {
  const [materia, setMateria] = useState("Derecho Civil");
  const [titulo, setTitulo] = useState("");
  const [apunte, setApunte] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recursos, setRecursos] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [flashIndex, setFlashIndex] = useState(0);
const [mostrarReverso, setMostrarReverso] = useState(false);
  const [i, setI] = useState(0);
  const [sel, setSel] = useState("");
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    setSaved(JSON.parse(localStorage.getItem("gradoMasterRecursos") || "[]"));
  }, []);

  useEffect(() => {
    localStorage.setItem("gradoMasterRecursos", JSON.stringify(saved));
  }, [saved]);

  const current = recursos[i];
  const score = useMemo(() => recursos.filter((r) => r._ok).length, [recursos]);

  function normal(x) {
    return String(x || "").trim().toLowerCase();
  }

  async function cargarArchivo(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivo(file);
    setError("");

    const nombreSinExtension = file.name.replace(/\.[^/.]+$/, "");
    if (!titulo.trim()) setTitulo(nombreSinExtension);

    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      setApunte(text);
    }
  }

  async function generar() {
    setError("");
    setLoading(true);
    setRecursos([]);
    setI(0);
    setSel("");
    setShow(false);

    try {
      if (!archivo && apunte.trim().length < 200) {
        throw new Error("Sube un PDF/Word/TXT o pega al menos 200 caracteres.");
      }

      const formData = new FormData();
      formData.append("materia", materia);
      formData.append("titulo", titulo);
      formData.append("apunte", apunte);

      if (archivo) {
        formData.append("archivo", archivo);
      }

      const res = await fetch("/api/generar", {
        method: "POST",
        body: formData,
      });

     const data = await res.json();

if (!res.ok)
  throw new Error(data.error || "No se pudo generar el quiz.");

const lista = data.recursos || [];
const tarjetas = data.flashcards || [];

setRecursos(lista);
setFlashcards(tarjetas);

      setSaved((prev) => [
        {
          id: Date.now(),
          materia,
          titulo: titulo || archivo?.name || "Documento sin título",
          fecha: new Date().toLocaleString(),
          archivo: archivo?.name || null,
          recursos: lista,
        },
        ...prev,
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function responder(k) {
    if (show) return;

    setSel(k);
    setShow(true);

    setRecursos((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, _ok: normal(k) === normal(r.respuesta_correcta) } : r
      )
    );
  }

  function siguiente() {
    setSel("");
    setShow(false);
    setI((v) => v + 1);
  }

  function cargarGuardado(item) {
    setMateria(item.materia);
    setTitulo(item.titulo);
    setRecursos(item.recursos);
    setI(0);
    setSel("");
    setShow(false);
    window.scrollTo(0, 0);
  }
function eliminarGuardado(id) {
  if (!window.confirm("¿Eliminar este documento de la biblioteca?")) return;

  setSaved((prev) => prev.filter((item) => item.id !== id));
}
  function limpiar() {
    setTitulo("");
    setApunte("");
    setArchivo(null);
    setRecursos([]);
    setError("");
    setI(0);
    setSel("");
    setShow(false);
  }

  return (
    <main className="wrap">
      <section className="hero">
        <div>
          <p className="eyebrow">tu compañero de estudio</p>
          <h1>Grado Master</h1>
          <p className="sub">
            Sube tus documentos de estudio y transforma tus apuntes en recursos
            para aprender Derecho.
          </p>
        </div>
        <div className="pill">Derecho Chile</div>
      </section>

      <section className="grid">
        <div className="card big">
          <h2>1. Cargar documento</h2>

          <label>Materia</label>
          <select value={materia} onChange={(e) => setMateria(e.target.value)}>
            {materias.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>

          <label>Título del documento</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Contratos - Compraventa"
          />

          <label>Documento</label>
          <div className="uploadBox">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={cargarArchivo}
            />
            <p>
              {archivo
                ? `Archivo seleccionado: ${archivo.name}`
                : "Selecciona PDF, Word o TXT"}
            </p>
          </div>

          <details className="manualText" open>
            <summary>Pegar texto manualmente</summary>
            <textarea
              value={apunte}
              onChange={(e) => setApunte(e.target.value)}
              placeholder="Pega aquí el contenido del documento si no quieres subir archivo..."
            />
          </details>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <button className="primary" onClick={generar} disabled={loading}>
              {loading ? "Analizando..." : "Analizar documento"}
            </button>
            <button className="secondary" onClick={limpiar} disabled={loading}>
              Limpiar
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Biblioteca local</h2>
          {saved.length === 0 && (
            <p className="muted">Todavía no hay documentos guardados.</p>
          )}

         {saved.map((item) => (
  <div key={item.id} className="saved">
    <div
      style={{ cursor: "pointer" }}
      onClick={() => cargarGuardado(item)}
    >
      <b>{item.titulo}</b>
      <span>
        {item.materia} · {item.recursos.length} preguntas
      </span>
    </div>

    <button
      className="secondary"
      style={{ marginTop: "10px" }}
      onClick={() => eliminarGuardado(item.id)}
    >
      🗑 Eliminar
    </button>
  </div>
))}
        </div>
      </section>

      {recursos.length > 0 && (
        <section className="card quiz">
          {i < recursos.length ? (
            <>
              <div className="top">
                <span>
                  Pregunta {i + 1} de {recursos.length}
                </span>
                <span>
                  Puntaje: {score}/{recursos.length}
                </span>
              </div>

              <h2>{current.pregunta}</h2>

              <div className="options">
                {Object.entries(current.opciones || {}).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => responder(k)}
                    className={
                      show
                        ? normal(k) === normal(current.respuesta_correcta)
                          ? "ok"
                          : normal(k) === normal(sel)
                          ? "bad"
                          : "dim"
                        : ""
                    }
                  >
                    <b>{k.toUpperCase()}.</b> {v}
                  </button>
                ))}
              </div>

              {show && (
                <div className="feedback">
                  <h3>
                    {normal(sel) === normal(current.respuesta_correcta)
                      ? "Correcta ✅"
                      : "Incorrecta"}
                  </h3>
                  <p>{current.explicacion}</p>
                  {current.cita_textual && (
                    <blockquote>{current.cita_textual}</blockquote>
                  )}
                  <button className="primary" onClick={siguiente}>
                    {i + 1 === recursos.length ? "Ver resultado" : "Siguiente"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="final">
              <h2>Resultado final</h2>
              <p className="nota">
                {score}/{recursos.length}
              </p>
              <button
                className="primary"
                onClick={() => {
                  setI(0);
                  setRecursos((r) => r.map((x) => ({ ...x, _ok: false })));
                }}
              >
                Repetir quiz
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
