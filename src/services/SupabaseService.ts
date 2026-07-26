import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- Types ---
export interface Experience {
  id?: string;
  company: string;
  project: string;
  duration: string;
  achievements: string;
}

export interface Keyword {
  id?: string;
  wrong_word: string;
  correct_word: string;
}

export interface UserProfile {
  id?: string;
  first_name: string;
  last_name: string;
  role: string;
  about_me: string;
  experiences?: Experience[];
  keywords?: Keyword[];
}

export interface Session {
  id: string;
  name: string;
  created_at: string;
  messages?: SessionMessage[];
}

export interface SessionMessage {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

// --- API Methods ---

export async function getProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, experiences:user_experiences(*), keywords:user_keywords(*)')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile | null> {
  // Insert or update profile
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .insert([{
      first_name: profile.first_name,
      last_name: profile.last_name,
      role: profile.role,
      about_me: profile.about_me
    }])
    .select()
    .single();

  if (profileError || !profileData) {
    console.error('Error saving profile:', profileError);
    return null;
  }

  // Insert experiences if any
  if (profile.experiences && profile.experiences.length > 0) {
    const exps = profile.experiences.map(exp => ({
      profile_id: profileData.id,
      company: exp.company,
      project: exp.project,
      duration: exp.duration,
      achievements: exp.achievements
    }));
    await supabase.from('user_experiences').insert(exps);
  }

  // Insert keywords if any
  if (profile.keywords && profile.keywords.length > 0) {
    const kwds = profile.keywords.map(kw => ({
      profile_id: profileData.id,
      wrong_word: kw.wrong_word,
      correct_word: kw.correct_word
    }));
    await supabase.from('user_keywords').insert(kwds);
  }

  return getProfile(); // return with experiences and keywords
}

export async function getSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('interview_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function createSession(name: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('interview_sessions')
    .insert([{ name }])
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  const { data, error } = await supabase
    .from('session_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function addSessionMessage(message: SessionMessage) {
  const { error } = await supabase
    .from('session_messages')
    .insert([{
      session_id: message.session_id,
      role: message.role,
      content: message.content
    }]);

  if (error) console.error('Error saving message:', error);
}

export async function saveTranscription(text: string, isFinal: boolean) {
  if (!text || text.trim() === '' || !isFinal) return;
  const { error } = await supabase
    .from('transcriptions')
    .insert([{ text, created_at: new Date().toISOString() }])
  if (error) console.error('Error saving transcription:', error)
}

export async function saveAiInteraction(context: string, response: string) {
  const { error } = await supabase
    .from('ai_interactions')
    .insert([{ context, response, created_at: new Date().toISOString() }])
  if (error) console.error('Error saving AI interaction:', error)
}
