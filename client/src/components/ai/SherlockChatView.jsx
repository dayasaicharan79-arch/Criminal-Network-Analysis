/**
 * CONSTELLATION — Sherlock Investigative AI Assistant
 */
import React, { useState, useRef, useEffect } from 'react';
import { useInvestigationStore } from '../../store/investigationStore.js';
import { api } from '../../api/client.js';
import {
  Bot,
  Send,
  Sparkles,
  Shield,
  FileText,
  Share2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export function SherlockChatView() {
  const {
    activeCaseId,
    selectedEntityId,
    selectEntity,
    setActiveView,
  } = useInvestigationStore();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `### Sherlock Investigative Intelligence Ready\n\nI have direct read access to the live knowledge graph, CDR triangulations, bank settlement records, and forensic evidence for **${activeCaseId}**.\n\nAsk me about connections around key suspects, topological bridges, detected anomalies, or supporting physical evidence.`,
      supportingData: null,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (queryText = input) => {
    const q = (queryText || '').trim();
    if (!q) return;

    const userMsg = {
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.querySherlock({
        query: q,
        caseId: activeCaseId,
        selectedEntityId,
      });

      const assistantMsg = {
        role: 'assistant',
        text: res.data?.answer || 'No findings reported.',
        supportingData: res.data?.supportingData || null,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `**Investigation Error**: Failed to retrieve intelligence. ${err.message}`,
          supportingData: null,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'Show connections around Munshi',
    'What entities connect these two groups as a bridge?',
    'What evidence supports the Delhi safehouse raid?',
    'Find unusual communication patterns and shared IMEI devices',
    'Summarize chronological timeline of events',
  ];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'radial-gradient(ellipse at top, #0c182c 0%, #07090e 100%)',
    }}>
      {/* Header */}
      <div className="glass-panel" style={{
        margin: '16px 20px 0 20px',
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f2fe 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bot size={18} color="#07090e" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              Sherlock Investigative AI
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Connected to Live Knowledge Graph // Case: {activeCaseId}
            </div>
          </div>
        </div>

        <span className="badge badge-cyan">
          ZERO-HALLUCINATION ENGINE
        </span>
      </div>

      {/* Chat Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={idx}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                display: 'flex',
                gap: '10px',
              }}
            >
              {!isUser && (
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(0, 242, 254, 0.15)',
                  border: '1px solid var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Bot size={14} color="var(--accent-cyan)" />
                </div>
              )}

              <div
                className="glass-panel"
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  background: isUser ? 'rgba(0, 242, 254, 0.15)' : 'var(--bg-surface-glass)',
                  border: isUser ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-line',
                }}>
                  {m.text}
                </div>

                {/* Supporting Structured Attachments */}
                {m.supportingData?.entities?.length > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                      LINKED ENTITIES IN RECORD:
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {m.supportingData.entities.map(ent => (
                        <button
                          key={ent.id}
                          onClick={() => {
                            selectEntity(ent.id);
                            setActiveView('graph');
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '3px 8px', fontSize: '10px', color: 'var(--accent-cyan)' }}
                        >
                          <span>{ent.label}</span>
                          <ExternalLink size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  marginTop: '8px',
                  textAlign: 'right',
                }}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            <Sparkles size={14} className="pulsing-indicator" color="var(--accent-cyan)" />
            <span>Analyzing graph topology and cross-referencing forensic evidence...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sample Query Pills */}
      <div style={{ padding: '0 20px 8px 20px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
        {samplePrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="btn btn-ghost"
            style={{ padding: '4px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
          >
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div style={{ padding: '12px 20px 20px 20px' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-surface-glass)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: '8px 14px',
          }}
        >
          <input
            type="text"
            placeholder="Ask Sherlock about connections, bridge nodes, timeline, or evidence..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '6px 14px' }}
            disabled={!input.trim() || loading}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
