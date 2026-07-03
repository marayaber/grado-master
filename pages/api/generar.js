export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({error:'Método no permitido'});
  const {materia,titulo,apunte} = req.body || {};
  if(!apunte || apunte.trim().length < 200) return res.status(400).json({error:'El apunte debe tener al menos 200 caracteres.'});
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if(!apiKey){ return res.status(200).json({recursos: demo(apunte)}); }
  try{
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({model:'gemini-1.5-flash', generationConfig:{responseMimeType:'application/json', temperature:0.1}});
    const prompt = `Eres un preparador de examen de grado de Derecho en Chile. Genera 8 preguntas de alternativa con 4 opciones basadas EXCLUSIVAMENTE en el apunte. No inventes artículos ni doctrina externa. Responde solo JSON válido con esta forma: {"recursos":[{"pregunta":"","opciones":{"a":"","b":"","c":"","d":""},"respuesta_correcta":"a|b|c|d","explicacion":"","cita_textual":"frase exacta del apunte"}]}. Materia: ${materia}. Título: ${titulo||''}. Apunte: ${apunte.slice(0,20000)}`;
    const result = await model.generateContent(prompt);
    const txt = result.response.text();
    const data = JSON.parse(txt);
    const recursos = (data.recursos||[]).filter(r=>r.pregunta && r.opciones && r.respuesta_correcta);
    if(!recursos.length) throw new Error('Gemini no devolvió preguntas válidas.');
    res.status(200).json({recursos});
  }catch(e){ res.status(500).json({error:e.message || 'Error generando recursos'}); }
}
function demo(apunte){
  const clean = apunte.replace(/\s+/g,' ').trim();
  const frases = clean.match(/[^.!?]+[.!?]+/g)?.slice(0,6) || [clean.slice(0,250)];
  return frases.slice(0,5).map((f,i)=>({
    pregunta:`Según el apunte, ¿cuál es la idea central del fragmento ${i+1}?`,
    opciones:{a:f.slice(0,120), b:'Una afirmación no contenida en el apunte', c:'Una regla inventada por la aplicación', d:'Un concepto ajeno al texto'},
    respuesta_correcta:'a',
    explicacion:'La alternativa correcta reproduce una idea contenida directamente en el apunte pegado.',
    cita_textual:f.trim()
  }));
}
