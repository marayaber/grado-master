import { useEffect, useMemo, useRef, useState } from "react";

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
  const [vista, setVista] = useState("flashcards");
const [examenIniciado, setExamenIniciado] = useState(false);
const [preguntaActual, setPreguntaActual] = useState(0);
const [mostrarTexto, setMostrarTexto] = useState(false);
const [preguntasOrales, setPreguntasOrales] = useState([]);
const [respuestasOrales, setRespuestasOrales] = useState([]);
const [grabando, setGrabando] = useState(false);
const [transcripcionActual, setTranscripcionActual] = useState("");
const [vozNoSoportada, setVozNoSoportada] = useState(false);
const [evaluandoOral, setEvaluandoOral] = useState(false);
const [informeOral, setInformeOral] = useState(null);
const recognitionRef = useRef(null);
const textoFinalRef = useRef("");
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
const cards = data.flashcards || [];
const oral = data.preguntas_orales || [];

setRecursos(lista);
setFlashcards(cards);
setPreguntasOrales(oral);

setFlashIndex(0);
setMostrarReverso(false);

setExamenIniciado(false);
setPreguntaActual(0);
setRespuestasOrales([]);
setTranscripcionActual("");
setInformeOral(null);
      setSaved((prev) => [
        {
          id: Date.now(),
          materia,
          titulo: titulo || archivo?.name || "Documento sin título",
          fecha: new Date().toLocaleString(),
          archivo: archivo?.name || null,
          recursos: lista,
          flashcards: cards,
          preguntas_orales: oral,
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
    setFlashcards(Array.isArray(item.flashcards) ? item.flashcards : []);
    setPreguntasOrales(Array.isArray(item.preguntas_orales) ? item.preguntas_orales : []);
    setI(0);
    setSel("");
    setShow(false);
    setExamenIniciado(false);
    setPreguntaActual(0);
    setRespuestasOrales([]);
    setTranscripcionActual("");
    setInformeOral(null);
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
    setPreguntasOrales([]);
    setExamenIniciado(false);
    setPreguntaActual(0);
    setRespuestasOrales([]);
    setTranscripcionActual("");
    setInformeOral(null);
  }

  function iniciarGrabacion() {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setVozNoSoportada(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-CL";
    recognition.continuous = true;
    recognition.interimResults = true;

    textoFinalRef.current = "";
    setTranscripcionActual("");

    recognition.onresult = (event) => {
      let interim = "";
      for (let idx = event.resultIndex; idx < event.results.length; idx++) {
        const transcript = event.results[idx][0].transcript;
        if (event.results[idx].isFinal) {
          textoFinalRef.current += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setTranscripcionActual((textoFinalRef.current + interim).trim());
    };

    recognition.onerror = () => {
      setGrabando(false);
    };

    recognition.onend = () => {
      setGrabando(false);
    };

    recognitionRef.current = recognition;
    setGrabando(true);
    recognition.start();
  }

  function detenerYContinuar() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setGrabando(false);

    const respuesta = transcripcionActual.trim();
    const nuevasRespuestas = [...respuestasOrales];
    nuevasRespuestas[preguntaActual] = respuesta;
    setRespuestasOrales(nuevasRespuestas);
    setTranscripcionActual("");

    if (preguntaActual + 1 >= preguntasOrales.length) {
      evaluarExamenOral(nuevasRespuestas);
    } else {
      setPreguntaActual((p) => p + 1);
    }
  }

  async function evaluarExamenOral(respuestasCompletas) {
    setEvaluandoOral(true);
    setError("");

    try {
      const res = await fetch("/api/evaluar-oral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materia,
          titulo,
          preguntas: preguntasOrales,
          respuestas: respuestasCompletas,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo evaluar el examen oral.");
      }

      setInformeOral(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setEvaluandoOral(false);
    }
  }

  function repetirExamenOral() {
    setExamenIniciado(false);
    setPreguntaActual(0);
    setRespuestasOrales([]);
    setTranscripcionActual("");
    setInformeOral(null);
    setGrabando(false);
  }

  return (
  <main className="wrap">

    <section className="hero">
      <div>

        <p className="eyebrow">Tu compañero de estudio</p>

        <h1>
          {vista === "flashcards"
            ? "📚 Grado Master | Flashcards"
            : vista === "quiz"
            ? "📝 Grado Master | Quiz"
            : "👨‍🏫 Grado Master | Profesor Exigente"}
        </h1>

        <p className="sub">
          {vista === "flashcards"
            ? "Memoriza el contenido de tus apuntes mediante flashcards."
            : vista === "quiz"
            ? "Evalúa tus conocimientos con preguntas de alternativa."
            : "Simula un examen oral de grado con IA."}
        </p>

      </div>

      <div
        className={
          vista === "flashcards"
            ? "pill flashcards"
            : vista === "quiz"
            ? "pill pillQuiz"
            : "pill profesor"
        }
      >
        {vista === "flashcards"
          ? "📚 Flashcards"
          : vista === "quiz"
          ? "📝 Quiz"
          : "👨‍🏫 Profesor Exigente"}
      </div>

    </section>
    <div className="tabs">
  <button
  className={vista === "flashcards" ? "activeTab" : ""}
  onClick={() => setVista("flashcards")}
>
    📚 Flashcards
  </button>

  <button
  className={vista === "quiz" ? "activeTab" : ""}
  onClick={() => setVista("quiz")}
>
    📝 Quiz
  </button>

  <button
  className={vista === "profesor" ? "activeTab" : ""}
  onClick={() => setVista("profesor")}
>
    👨‍🏫 Profesor Exigente
  </button>
</div>
      
 {vista === "profesor" && (
  <section className="profesorScreen">
    <div className="profesorHeader">
      <p className="eyebrow">Evaluación final</p>
      <h2>👨‍🏫 Profesor Exigente</h2>
      <p>
        Examen oral de grado
      </p>
    </div>

    <div className="profesorPanel">
      <h3>Bienvenido al examen oral</h3>

      <p>
        Se realizarán cinco preguntas sobre el documento seleccionado.
      </p>

      <p>
        El profesor no entregará retroalimentación durante el examen.
        La evaluación será realizada al finalizar las cinco preguntas.
      </p>

      <label>Materia</label>
      <select value={materia} onChange={(e) => setMateria(e.target.value)}>
        {materias.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <label>Documento para el examen</label>

      <div className="uploadBox">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={cargarArchivo}
        />

        <p>
          {archivo
            ? `📄 ${archivo.name}`
            : "Sube el documento que utilizarás para rendir el examen oral."}
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      <button
        className="primary"
        onClick={generar}
        disabled={loading}
      >
        {loading ? "Preparando examen..." : "Preparar examen oral"}
      </button>
    </div>
  </section>
)}

         {(vista === "flashcards" || vista === "quiz") && (
  <div className="grid">
    <div className="card">
      <h3>
        {vista === "flashcards" ? "📚 Generar Flashcards" : "📝 Generar Quiz"}
      </h3>

      <label>Materia</label>
      <select value={materia} onChange={(e) => setMateria(e.target.value)}>
        {materias.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      <label>Título del documento</label>
      <input
        type="text"
        placeholder="Ej: Contrato - Compraventa"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />

      <label>
        {vista === "flashcards"
          ? "Documento para generar flashcards"
          : "Documento para generar el quiz"}
      </label>

      <div className="uploadBox">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={cargarArchivo}
        />
        <p>{archivo ? `📄 ${archivo.name}` : "Ningún archivo seleccionado"}</p>
      </div>

      <button
        type="button"
        className="linkToggle"
        onClick={() => setMostrarTexto(!mostrarTexto)}
      >
        {mostrarTexto ? "▲" : "▼"} Pegar texto manualmente
      </button>

      {mostrarTexto && (
        <textarea
          placeholder="Pega aquí el contenido del documento si no quieres subir archivo..."
          value={apunte}
          onChange={(e) => setApunte(e.target.value)}
        />
      )}

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button className="primary" onClick={generar} disabled={loading}>
          {loading
            ? "Creando..."
            : vista === "flashcards"
            ? "🃏 Crear Flashcards"
            : "📝 Crear Quiz"}
        </button>
        <button className="secondary" onClick={limpiar}>
          Limpiar
        </button>
      </div>
    </div>

    <div className="card libraryCard">
      <h3>
        {vista === "flashcards" ? "📚 Biblioteca Flashcards" : "📝 Biblioteca Quiz"}
      </h3>

      {saved.filter((item) =>
        vista === "flashcards"
          ? item.flashcards?.length > 0
          : item.recursos?.length > 0
      ).length === 0 ? (
        <p className="muted">Aún no tienes nada guardado aquí.</p>
      ) : (
        saved
          .filter((item) =>
            vista === "flashcards"
              ? item.flashcards?.length > 0
              : item.recursos?.length > 0
          )
          .map((item) => (
            <div key={item.id} className="saved">
              <div
                style={{ cursor: "pointer" }}
                onClick={() => cargarGuardado(item)}
              >
                <b>{item.titulo}</b>
                <span>
                  {vista === "flashcards"
                    ? `${item.flashcards?.length || 0} flashcards`
                    : `${item.recursos?.length || 0} preguntas`}
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
          ))
      )}
    </div>
  </div>
)}
  {vista === "flashcards" && flashcards.length > 0 && (
  <section className="card">

    <h2>Flashcard {flashIndex + 1} de {flashcards.length}</h2>

    <div
      className="flashcard"
      onClick={() => setMostrarReverso(!mostrarReverso)}
    >
      {!mostrarReverso ? (
        <>
          <h3>Frente</h3>
          <p>{flashcards[flashIndex].frente}</p>
        </>
      ) : (
        <>
          <h3>Reverso</h3>
          <p>{flashcards[flashIndex].reverso}</p>

          {flashcards[flashIndex].cita_textual && (
            <blockquote>
              {flashcards[flashIndex].cita_textual}
            </blockquote>
          )}
        </>
      )}
    </div>

    <div className="actions">
      <button
        className="secondary"
        disabled={flashIndex === 0}
        onClick={() => {
          setFlashIndex(flashIndex - 1);
          setMostrarReverso(false);
        }}
      >
        ← Anterior
      </button>

      <button
        className="secondary"
        disabled={flashIndex === flashcards.length - 1}
        onClick={() => {
          setFlashIndex(flashIndex + 1);
          setMostrarReverso(false);
        }}
      >
        Siguiente →
      </button>
    </div>

  </section>
)}
      {vista === "quiz" && recursos.length > 0 && (
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
        {vista === "profesor" && (
  <section className="card">

    <h2>👨‍🏫 Profesor Exigente</h2>

    {preguntasOrales.length === 0 ? (
      <p className="muted">
        Sube un documento arriba y genera la simulación para comenzar el examen oral.
      </p>
    ) : informeOral ? (
      <div className="informeOral">
        <p className="nota">{Number(informeOral.nota).toFixed(1)}</p>
        <p>{informeOral.comentario_general}</p>

        {(informeOral.detalle || []).map((d, idx) => (
          <div key={idx} className="detalleOral">
            <h3>Pregunta {idx + 1}</h3>
            <p><b>{d.pregunta}</b></p>
            <p className="hint">Tu respuesta: {d.respuesta_alumno}</p>
            <p>{d.evaluacion}</p>
          </div>
        ))}

        <button className="primary" onClick={repetirExamenOral}>
          Repetir examen oral
        </button>
      </div>
    ) : !examenIniciado ? (
      <>
        <p>
          Bienvenido al examen oral.
        </p>

        <p>
          Se formularán cinco preguntas sobre el documento.
          Durante el examen no habrá comentarios ni retroalimentación.
          La evaluación será entregada únicamente al finalizar.
        </p>

        <button
          className="primary"
          onClick={() => setExamenIniciado(true)}
        >
          Comenzar examen
        </button>
      </>
    ) : evaluandoOral ? (
      <p>Evaluando tu examen oral...</p>
    ) : (
      <>
        <h3>Pregunta {preguntaActual + 1} de 5</h3>

        <h2>{preguntasOrales[preguntaActual]?.pregunta}</h2>

        {vozNoSoportada ? (
          <>
            <p className="hint">
              Tu navegador no soporta reconocimiento de voz. Escribe tu respuesta manualmente.
            </p>
            <textarea
              value={transcripcionActual}
              onChange={(e) => setTranscripcionActual(e.target.value)}
              placeholder="Escribe aquí tu respuesta..."
            />
            <button className="primary" onClick={detenerYContinuar}>
              Registrar respuesta y continuar
            </button>
          </>
        ) : (
          <>
            {grabando && <p className="hint">🔴 Grabando... habla tu respuesta.</p>}

            {transcripcionActual && (
              <p className="hint">{transcripcionActual}</p>
            )}

            {!grabando ? (
              <button className="primary" onClick={iniciarGrabacion}>
                🎤 Iniciar respuesta
              </button>
            ) : (
              <button className="primary" onClick={detenerYContinuar}>
                ⏹ Terminar respuesta y continuar
              </button>
            )}
          </>
        )}
      </>
    )}
  </section>
)}
    </main>
  );
}
