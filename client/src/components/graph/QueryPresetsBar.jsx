import React, { useState } from 'react';
import { Bookmark, Plus, X, Check, Filter, Zap, DollarSign, Smartphone, GitCommit } from 'lucide-react';
import { useInvestigationStore } from '../../store/investigationStore';

export default function QueryPresetsBar() {
  const {
    activePresetId,
    applyPreset,
    customPresets,
    saveCustomPreset,
    deleteCustomPreset,
    filterEntityTypes,
    filterMinConfidence,
  } = useInvestigationStore();

  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleSave = (e) => {
    e?.preventDefault();
    if (!newPresetName.trim()) return;
    saveCustomPreset(newPresetName.trim());
    setNewPresetName('');
    setIsSaving(false);
  };

  const BUILTIN_PRESETS = [
    {
      id: 'hawala',
      label: 'Hawala Links',
      icon: DollarSign,
      color: '#fbbf24',
      badge: 'FIN',
      tooltip: 'Filter financial transactions & high-confidence hawala nodes',
    },
    {
      id: 'burner',
      label: 'Burner IMEI Cluster',
      icon: Smartphone,
      color: '#00f0ff',
      badge: 'COMMS',
      tooltip: 'Highlight burner phones, devices, and communication links',
    },
    {
      id: 'bridges',
      label: 'Bridge Nodes',
      icon: GitCommit,
      color: '#d946ef',
      badge: 'STRUCT',
      tooltip: 'Focus on top betweenness centrality brokers and bridge nodes',
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        background: 'rgba(10, 15, 29, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '5px 10px',
        borderRadius: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 4 }}>
        <Bookmark size={14} color="#00f0ff" />
        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em', color: '#94a3b8', textTransform: 'uppercase' }}>
          Presets:
        </span>
      </div>

      {/* Clear / All Entities chip */}
      <button
        onClick={() => applyPreset('clear')}
        style={{
          background: !activePresetId ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
          border: `1px solid ${!activePresetId ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
          color: !activePresetId ? '#ffffff' : '#64748b',
          borderRadius: 4,
          padding: '3px 8px',
          fontSize: '0.68rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        All
      </button>

      {/* Builtin Preset Chips */}
      {BUILTIN_PRESETS.map(preset => {
        const Icon = preset.icon;
        const isActive = activePresetId === preset.id;
        return (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset.id)}
            title={preset.tooltip}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: isActive ? `${preset.color}22` : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isActive ? preset.color : 'rgba(255, 255, 255, 0.08)'}`,
              color: isActive ? preset.color : '#94a3b8',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: '0.68rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: isActive ? `0 0 10px ${preset.color}33` : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={12} color={isActive ? preset.color : '#94a3b8'} />
            <span>{preset.label}</span>
          </button>
        );
      })}

      {/* Custom Presets Chips */}
      {customPresets.map(preset => {
        const isActive = activePresetId === preset.id;
        return (
          <div
            key={preset.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: isActive ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isActive ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            <button
              onClick={() => applyPreset(preset.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isActive ? '#00f0ff' : '#cbd5e1',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {preset.name}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteCustomPreset(preset.id);
              }}
              title="Delete Custom Preset"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}

      {/* Save Custom Preset Form / Button */}
      {isSaving ? (
        <form onSubmit={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Preset name..."
            autoFocus
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid #00f0ff',
              borderRadius: 4,
              color: '#ffffff',
              fontSize: '0.68rem',
              padding: '2px 6px',
              width: 110,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'rgba(0, 240, 255, 0.2)',
              border: '1px solid #00f0ff',
              color: '#00f0ff',
              borderRadius: 4,
              padding: '2px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Check size={11} />
          </button>
          <button
            type="button"
            onClick={() => setIsSaving(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={11} />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setIsSaving(true)}
          title="Save current filters & physics as preset"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            background: 'transparent',
            border: '1px dashed rgba(255, 255, 255, 0.2)',
            color: '#94a3b8',
            borderRadius: 4,
            padding: '3px 7px',
            fontSize: '0.66rem',
            cursor: 'pointer',
          }}
        >
          <Plus size={10} />
          <span>Save</span>
        </button>
      )}
    </div>
  );
}
