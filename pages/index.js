import { useEffect, useMemo, useState } from 'react';

const materias = ['Derecho Civil','Derecho Procesal','Derecho Constitucional','Derecho Penal','Derecho Laboral','Derecho Familia','Derecho Comercial','Derecho Administrativo'];

export default function Home(){
  const [materia,setMateria]=useState('Derecho Civil');
  const [titulo,setTitulo]=useState('');
  const [apunte,setApunte]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [recursos,setRecursos]=useState([]);
  const [i,setI]=useState(0);
  const [sel,setSel]=useState('');
  const [show,setShow]=useState(false);
  const [saved,setSaved]=useState([]);

  useEffect(()=>{ setSaved(JSON.parse(localStorage.getItem('gradoMasterRecursos')||'[]')); },[]);
  useEffect(()=>{ localStorage.setItem('gradoMasterRecursos', JSON.stringify(saved)); },[saved]);

  const current = recursos[i];
  const score = useMemo(()=> recursos.filter(r=>r._ok).length, [recursos]);

  async function generar(){
    setError(''); setLoading(true); setRecursos([]); setI(0); setSel(''); setShow(false);
    try{
      if(apunte.trim().length < 200) throw new Error('Pega un apunte más largo, mínimo 200 caracteres.');
      const res = await fetch('/api/generar', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ materia, titulo, apunte }) });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || 'No se pudo generar el quiz.');
      const lista = data.recursos || [];
      setRecursos(lista);
      setSaved(prev=>[{id:Date.now(), materia, titulo: titulo || 'Apunte sin título', fecha:new Date().toLocaleString(), recursos:lista}, ...prev]);
    }catch(e){ setError(e.message); }
    finally{ setLoading(false); }
  }

  function responder(k){
    if(show) return;
    setSel(k); setShow(true);
    setRecursos(prev=>prev.map((r,idx)=>idx===i?{...r,_ok: normal(k)===normal(r.respuesta_correcta)}:r));
  }
  function normal(x){ return String(x||'').trim().toLowerCase(); }
  function siguiente(){ setSel(''); setShow(false); setI(v=>v+1); }
  function cargarGuardado(item){ setMateria(item.materia); setTitulo(item.titulo); setRecursos(item.recursos); setI(0); setSel(''); setShow(false); window.scrollTo(0,0); }

  return <main className="wrap">
    <section className="hero">
      <div><p className="eyebrow">MVP funcional</p><h1>Grado Master</h1><p className="sub">Pega tus apuntes y genera un quiz basado en ese texto. Primero que funcione; después lo dejamos precioso.</p></div>
      <div className="pill">Derecho Chile</div>
    </section>

    <section className="grid">
      <div className="card big">
        <h2>1. Cargar apunte</h2>
        <label>Materia</label><select value={materia} onChange={e=>setMateria(e.target.value)}>{materias.map(m=><option key={m}>{m}</option>)}</select>
        <label>Título del apunte</label><input value={titulo} onChange={e=>setTitulo(e.target.value)} placeholder="Ej: Contratos - Compraventa" />
        <label>Texto del apunte</label><textarea value={apunte} onChange={e=>setApunte(e.target.value)} placeholder="Pega aquí tu apunte..." />
        {error && <p className="error">{error}</p>}
        <button className="primary" onClick={generar} disabled={loading}>{loading?'Generando con IA...':'Generar quiz'}</button>
        <p className="hint">Para IA real configura GOOGLE_GEMINI_API_KEY en Secrets de Replit. Si no la configuras, igual genera un demo básico para probar la app.</p>
      </div>

      <div className="card">
        <h2>Biblioteca local</h2>
        {saved.length===0 && <p className="muted">Todavía no hay quizzes guardados.</p>}
        {saved.map(item=><button className="saved" key={item.id} onClick={()=>cargarGuardado(item)}><b>{item.titulo}</b><span>{item.materia} · {item.recursos.length} preguntas</span></button>)}
      </div>
    </section>

    {recursos.length>0 && <section className="card quiz">
      {i < recursos.length ? <>
        <div className="top"><span>Pregunta {i+1} de {recursos.length}</span><span>Puntaje: {score}/{recursos.length}</span></div>
        <h2>{current.pregunta}</h2>
        <div className="options">{Object.entries(current.opciones||{}).map(([k,v])=><button key={k} onClick={()=>responder(k)} className={show ? (normal(k)===normal(current.respuesta_correcta)?'ok':normal(k)===normal(sel)?'bad':'dim') : ''}><b>{k.toUpperCase()}.</b> {v}</button>)}</div>
        {show && <div className="feedback"><h3>{normal(sel)===normal(current.respuesta_correcta)?'Correcta ✅':'Incorrecta'}</h3><p>{current.explicacion}</p>{current.cita_textual && <blockquote>{current.cita_textual}</blockquote>}<button className="primary" onClick={siguiente}>{i+1===recursos.length?'Ver resultado':'Siguiente'}</button></div>}
      </> : <div className="final"><h2>Resultado final</h2><p className="nota">{score}/{recursos.length}</p><button className="primary" onClick={()=>{setI(0); setRecursos(r=>r.map(x=>({...x,_ok:false})));}}>Repetir quiz</button></div>}
    </section>}
  </main>
}
