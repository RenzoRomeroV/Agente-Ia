import { useState, useEffect } from 'react';
import { getProfile, saveProfile } from '../services/SupabaseService';
import type { UserProfile, Experience } from '../services/SupabaseService';
import { User, Briefcase, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface Props {
  onNext: () => void;
}

export default function ConfigurationScreen({ onNext }: Props) {
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    role: '',
    about_me: '',
    experiences: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    getProfile().then(data => {
      if (data) setProfile(data);
      setLoading(false);
    });
  }, []);

  const loadIdealProfile = () => {
    setProfile({
      first_name: 'Candidato',
      last_name: 'Estrella',
      role: 'QA Automation Jr | Frontend Jr | QA Funcional Sr',
      about_me: 'Soy un profesional versátil con un perfil híbrido. Como QA Funcional Senior, lidero estrategias de pruebas, y como QA Automation/Frontend Junior, desarrollo scripts con Playwright, React y TypeScript. Tengo sólidos fundamentos basados en ISTQB. Mi objetivo y lo que deseo aportar a la empresa es asegurar la calidad de punta a punta, uniendo el desarrollo frontend con la automatización para construir productos robustos y escalables desde el primer día.',
      experiences: [
        {
          company: 'Tech Solutions Inc',
          project: 'E-commerce Platform',
          duration: '3 años',
          achievements: 'Diseñé la estrategia de pruebas manuales (ISTQB) asegurando cobertura del 100% en flujos críticos. Luego, automaticé el 40% de las regresiones con Playwright y TypeScript. Además, apoyé al equipo Frontend desarrollando componentes UI en React, lo que aceleró las entregas.'
        }
      ],
      keywords: [
        { wrong_word: '', correct_word: 'ISTQB' },
        { wrong_word: '', correct_word: 'Playwright' },
        { wrong_word: '', correct_word: 'TypeScript' },
        { wrong_word: '', correct_word: 'React' },
        { wrong_word: '', correct_word: 'Frontend' },
        { wrong_word: '', correct_word: 'Automation' }
      ]
    });
  };

  const addExperience = () => {
    setProfile({
      ...profile,
      experiences: [
        ...(profile.experiences || []),
        { company: '', project: '', duration: '', achievements: '' }
      ]
    });
  };

  const updateExperience = (index: number, field: keyof Experience, value: string) => {
    const newExps = [...(profile.experiences || [])];
    newExps[index] = { ...newExps[index], [field]: value };
    setProfile({ ...profile, experiences: newExps });
  };

  const removeExperience = (index: number) => {
    const newExps = [...(profile.experiences || [])];
    newExps.splice(index, 1);
    setProfile({ ...profile, experiences: newExps });
  };

  const handleSave = async () => {
    setSaving(true);
    await saveProfile(profile);
    setSaving(false);
    onNext();
  };

  if (loading) return <div className="glass-panel loading">Cargando perfil...</div>;

  return (
    <div className="glass-panel config-container scrollable">
      <div className="config-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <User size={32} className="accent-icon" />
          <h2>Configuración de Candidato</h2>
          <p>Prepara tu perfil para respuestas personalizadas.</p>
        </div>
        <button onClick={loadIdealProfile} className="secondary-btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', backgroundColor: 'var(--accent)', color: 'white' }}>
          ✨ Autocompletar Perfil Ideal
        </button>
      </div>

      <div className="tabs-container" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={() => setActiveTab(0)}
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 0 ? '2px solid var(--primary)' : 'none', color: activeTab === 0 ? 'var(--primary)' : 'inherit', fontWeight: activeTab === 0 ? 'bold' : 'normal', transition: 'all 0.2s' }}
        >
          Datos Personales
        </button>
        <button 
          onClick={() => setActiveTab(1)}
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 1 ? '2px solid var(--primary)' : 'none', color: activeTab === 1 ? 'var(--primary)' : 'inherit', fontWeight: activeTab === 1 ? 'bold' : 'normal', transition: 'all 0.2s' }}
        >
          Experiencias
        </button>
        <button 
          onClick={() => setActiveTab(2)}
          style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', borderBottom: activeTab === 2 ? '2px solid var(--primary)' : 'none', color: activeTab === 2 ? 'var(--primary)' : 'inherit', fontWeight: activeTab === 2 ? 'bold' : 'normal', transition: 'all 0.2s' }}
        >
          Palabras Clave
        </button>
      </div>

      {activeTab === 0 && (
        <div className="form-group animation-fade-in">
          <div className="input-row">
            <input 
              type="text" 
              placeholder="Nombres" 
              value={profile.first_name} 
              onChange={e => setProfile({...profile, first_name: e.target.value})}
              className="glass-input"
            />
            <input 
              type="text" 
              placeholder="Apellidos" 
              value={profile.last_name} 
              onChange={e => setProfile({...profile, last_name: e.target.value})}
              className="glass-input"
            />
          </div>
          <input 
            type="text" 
            placeholder="Cargo Deseado (Ej: Senior Frontend Developer)" 
            value={profile.role} 
            onChange={e => setProfile({...profile, role: e.target.value})}
            className="glass-input full-width"
          />
          <textarea 
            placeholder="Sobre Mí (Resumen profesional)" 
            value={profile.about_me} 
            onChange={e => setProfile({...profile, about_me: e.target.value})}
            className="glass-input full-width textarea"
            rows={3}
          />
        </div>
      )}

      {activeTab === 1 && (
        <div className="experience-section animation-fade-in">
          <div className="exp-header">
            <h3><Briefcase size={20} /> Experiencias</h3>
            <button className="icon-btn add-btn" onClick={addExperience}><Plus size={18} /></button>
          </div>
          
          {(profile.experiences || []).map((exp, idx) => (
            <div key={idx} className="experience-card glass-input">
              <div className="exp-card-header">
                <h4>Experiencia #{idx + 1}</h4>
                <button className="icon-btn delete-btn" onClick={() => removeExperience(idx)}><Trash2 size={16} /></button>
              </div>
              <div className="input-row">
                <input 
                  type="text" 
                  placeholder="Empresa" 
                  value={exp.company}
                  onChange={e => updateExperience(idx, 'company', e.target.value)}
                  className="glass-input-sm"
                />
                <input 
                  type="text" 
                  placeholder="Tiempo (Ej: 2 años)" 
                  value={exp.duration}
                  onChange={e => updateExperience(idx, 'duration', e.target.value)}
                  className="glass-input-sm"
                />
              </div>
              <input 
                type="text" 
                placeholder="Proyecto" 
                value={exp.project}
                onChange={e => updateExperience(idx, 'project', e.target.value)}
                className="glass-input-sm full-width mt-2"
              />
              <textarea 
                placeholder="Logros / Tareas (Ej: Hice casos de uso, planifiqué...)" 
                value={exp.achievements}
                onChange={e => updateExperience(idx, 'achievements', e.target.value)}
                className="glass-input-sm full-width mt-2 textarea-sm"
                rows={2}
              />
            </div>
          ))}
        </div>
      )}

      {activeTab === 2 && (
        <div className="experience-section animation-fade-in">
          <div className="exp-header">
            <h3><Briefcase size={20} /> Diccionario de Palabras Clave</h3>
            <button className="icon-btn add-btn" onClick={() => {
              setProfile({
                ...profile,
                keywords: [...(profile.keywords || []), { wrong_word: '', correct_word: '' }]
              });
            }}><Plus size={18} /></button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Agrega palabras clave técnicas (Ej: JMeter, TypeScript) para que la IA las reconozca mejor en caso de mala pronunciación.
          </p>

          {(profile.keywords || []).map((kw, idx) => (
            <div key={`kw-${idx}`} className="input-row align-center" style={{ marginBottom: '8px' }}>
              <input 
                type="text" 
                placeholder="Palabra Clave (ej: JMeter)" 
                value={kw.correct_word}
                onChange={e => {
                  const newKw = [...(profile.keywords || [])];
                  newKw[idx] = { ...newKw[idx], correct_word: e.target.value };
                  setProfile({ ...profile, keywords: newKw });
                }}
                className="glass-input-sm full-width"
              />
              <button className="icon-btn delete-btn" style={{ flex: 'none', marginLeft: '8px' }} onClick={() => {
                const newKw = [...(profile.keywords || [])];
                newKw.splice(idx, 1);
                setProfile({ ...profile, keywords: newKw });
              }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="config-footer">
        <button className="primary-btn pulse" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Continuar'} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
