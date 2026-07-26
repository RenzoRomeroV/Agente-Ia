import { useState, useEffect } from 'react';
import { getSessions, createSession } from '../services/SupabaseService';
import type { Session } from '../services/SupabaseService';
import { Clock, Plus, ChevronRight, Settings } from 'lucide-react';

interface Props {
  onSessionSelect: (session: Session) => void;
  onGoConfig: () => void;
}

export default function SessionManager({ onSessionSelect, onGoConfig }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSessionName, setNewSessionName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const data = await getSessions();
    setSessions(data);
    setLoading(false);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    
    setCreating(true);
    const newSession = await createSession(newSessionName);
    if (newSession) {
      setSessions([newSession, ...sessions]);
      setNewSessionName('');
      onSessionSelect(newSession); // Enter directly
    }
    setCreating(false);
  };

  return (
    <div className="glass-panel session-container">
      <div className="session-header-top">
        <button className="icon-btn config-btn" onClick={onGoConfig} title="Configuración de Perfil">
          <Settings size={20} />
        </button>
      </div>
      <div className="session-header">
        <Clock size={32} className="accent-icon" />
        <h2>Tus Entrevistas</h2>
        <p>Selecciona una sesión anterior o crea una nueva.</p>
      </div>

      <form onSubmit={handleCreateSession} className="new-session-form">
        <input 
          type="text" 
          placeholder="Nombre de la nueva entrevista (Ej: Inetum Técnica)" 
          value={newSessionName} 
          onChange={e => setNewSessionName(e.target.value)}
          className="glass-input full-width"
        />
        <button type="submit" className="primary-btn mt-2" disabled={creating || !newSessionName.trim()}>
          <Plus size={18} /> {creating ? 'Creando...' : 'Nueva Sesión'}
        </button>
      </form>

      <div className="session-list mt-4">
        {loading ? (
          <div className="loading-text">Cargando sesiones...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">No tienes entrevistas registradas aún.</div>
        ) : (
          sessions.map(session => (
            <div key={session.id} className="session-card" onClick={() => onSessionSelect(session)}>
              <div className="session-info">
                <h4>{session.name}</h4>
                <span className="session-date">{new Date(session.created_at).toLocaleDateString()}</span>
              </div>
              <ChevronRight size={20} className="text-muted" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
