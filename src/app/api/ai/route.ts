import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { normalizeTranscription } from '@/services/PhoneticDictionary';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { context, profile, session, provider = 'groq', action = 'respond' } = await request.json();

    if (!context || context.trim() === '') {
      return NextResponse.json({ response: '' });
    }

    const normalizedContext = normalizeTranscription(context);

    if (action === 'correct') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }
      const openai = new OpenAI({ apiKey });
      const chatCompletion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Eres un normalizador de texto avanzado. Recibirás una transcripción de voz a texto de una entrevista de TI (QA, Dev, etc.) que puede tener errores de reconocimiento de voz. Tu único trabajo es deducir las palabras técnicas (ej: 'smog testing' -> 'Smoke Testing', 'join que tienes' -> 'Imagina que tienes') y devolver el MISMO texto corregido gramaticalmente. NO respondas a la pregunta, SÓLO corrige el texto. NUNCA agregues comillas ni explicaciones."
          },
          {
            role: "user",
            content: normalizedContext
          }
        ],
        model: "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 500,
      });
      return NextResponse.json({ response: chatCompletion.choices[0]?.message?.content || context });
    }


    // Build profile context
    let profileContext = '';
    if (profile) {
      const keywordText = profile.keywords && profile.keywords.length > 0
        ? `\n<keywords>\nPALABRAS CLAVE TÉCNICAS (Presta especial atención a estas palabras si el texto transcrito tiene errores fonéticos):\n${profile.keywords.map((k: any) => k.correct_word).filter(Boolean).join(', ')}\n</keywords>`
        : '';

      profileContext = `
<candidate_profile trust_level="trusted">
<name>${profile.first_name} ${profile.last_name}</name>
<role>${profile.role}</role>
<about_me>${profile.about_me}</about_me>
<experiences>
${profile.experiences ? profile.experiences.map((e: any) => `<experience company="${e.company}" duration="${e.duration}" project="${e.project}">\n${e.achievements}\n</experience>`).join('\n') : ''}
</experiences>${keywordText}
</candidate_profile>

REGLA BÁSICA DE IDENTIDAD: 
Usa la información de <candidate_profile> como base inamovible para tus respuestas. Nunca inventes nada que no esté explícitamente aquí.
`;
    }

    const systemPrompt = `# IDENTIDAD Y ROL

Eres un desarrollador / QA senior de TI en una entrevista técnica real, respondiendo preguntas en tiempo real. 
Tu única misión es generar la respuesta hablada que el candidato va a decir en voz alta al entrevistador.

# DIRECTRICES CRÍTICAS DE VOZ Y PSICOLOGÍA

1. **EVITA REPETICIONES Y MULETILLAS CONSTANTES (¡Cero patrones!)**:
   - Tienes **PROHIBIDO** iniciar tus respuestas con la frase "Bueno, la verdad es que..." o "Bueno,..." en cada turno. Varía completamente las aperturas.
   - Usa diferentes inicios de manera aleatoria: "Mira...", "Básicamente...", "A ver, te cuento...", "En mi caso...", "Normalmente...", "Fíjate que...", o simplemente responde directo a la pregunta sin preámbulos.
   - Evita discursos estructurados en 3 o 4 párrafos perfectos con inicio, desarrollo y conclusión formal.

2. **PROHIBIDO EL RELLENO CORPORATIVO Y LAS CONCLUSIONES**:
   - Tienes **ESTRICTAMENTE PROHIBIDO** usar frases como: "En resumen", "En conclusión", "En resumidas cuentas", "Esto me ha permitido...", "Es crucial", "Adicionalmente", "Asimismo", "Resulta fundamental", "Considero que...".
   - **REGLA DE ORO DE CIERRE**: Cuando termines de explicar tu idea principal o tu ejemplo técnico, **SIMPLEMENTE DEJA DE HABLAR**. No agregues un párrafo final redundante diciendo "y por eso considero que es muy útil...". Corta la respuesta de forma natural cuando completes el concepto.

3. **MANTÉN EL HILO DE LA CONVERSACIÓN**:
   - El entrevistador te hará preguntas basadas en tus respuestas anteriores (por ejemplo, si mencionaste "TestNG" o "scripts", te preguntará "¿has trabajado con eso?" o "¿para qué sirve?").
   - Analiza el historial de mensajes de la conversación y responde directamente sobre el concepto que se te está preguntando en relación al contexto de la charla. No actúes como si cada pregunta fuera aislada.

4. **ENFOQUE PRÁCTICO Y NO ACADÉMICO**:
   - No des definiciones de diccionario o Wikipedia. Explica cómo usas la tecnología en la realidad: "Yo hago...", "Normalmente lo que hago es...", "Me ha tocado implementar...".

5. **ESTRUCTURA DE CONVERSACIÓN FLUIDA**:
   - NUNCA uses listas numeradas, guiones o viñetas. Escribe en oraciones continuas, fluidas y fáciles de pronunciar en voz alta sin perder el aire.
   - La longitud debe ser conversacional: entre 50 y 100 palabras por respuesta promedio. Manténlo directo, al grano y conciso.

6. **CERO ALUCINACIONES**:
   - Limítate estrictamente a las herramientas, proyectos y experiencia descritos en el perfil del candidato. Si no se detalla algo en el perfil, menciónalo como conocimiento conceptual o explica cómo te adaptarías.
`;

    // Construct native message array for LLM
    const apiMessages: any[] = [];
    apiMessages.push({ role: 'system', content: systemPrompt });

    // Inject history as real chat messages
    if (session && session.messages && session.messages.length > 0) {
      // slice latest 6 messages to keep context window clean
      const previousMessages = session.messages.slice(-6);
      previousMessages.forEach((msg: any) => {
        apiMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // Append current user query
    apiMessages.push({ role: 'user', content: normalizedContext });

    let generatedText = '';

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
      }
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: apiMessages,
        temperature: 0.8,
      });
      generatedText = completion.choices[0]?.message?.content || '';
    } else {
      // Default to groq
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
      }
      const groq = new Groq({ apiKey });
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: apiMessages,
        temperature: 0.8,
      });
      generatedText = completion.choices[0]?.message?.content || '';
    }

    return NextResponse.json({ response: generatedText });
  } catch (err: any) {
    console.error('AI Proxy Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
