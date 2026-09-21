import React, { useEffect, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Clock, Layers, Flame, Gauge, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useInvestigationStore } from '../../store/investigationStore';

export default function TimelinePlaybackBar({ isOpen, onClose }) {
  const {
    timelineEvents,
    timelinePlayback,
    setTimelinePlayback,
    togglePlayback,
    stepPlayback,
    resetPlayback,
    selectedEventId,
    setSelectedEvent,
  } = useInvestigationStore();

  const sortedEvents = useMemo(() => {
    return [...(timelineEvents || [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [timelineEvents]);

  const { isPlaying, currentTime, speed, windowMode, activeEventIndex } = timelinePlayback;

  // Active event object
  const currentEvent = useMemo(() => {
    if (activeEventIndex >= 0 && activeEventIndex < sortedEvents.length) {
      return sortedEvents[activeEventIndex];
    }
    if (currentTime) {
      return sortedEvents.find(e => e.timestamp === currentTime) || null;
    }
    return null;
  }, [activeEventIndex, currentTime, sortedEvents]);

  // Autoplay ticker
  useEffect(() => {
    if (!isPlaying || sortedEvents.length === 0) return;

    // Interval based on speed: base 1600ms per event step
    const intervalMs = Math.max(250, Math.round(1600 / speed));

    const timer = setInterval(() => {
      const curIdx = useInvestigationStore.getState().timelinePlayback.activeEventIndex;
      const nextIdx = curIdx + 1;

      if (nextIdx >= sortedEvents.length) {
        // Stop playback when reaching the end
        setTimelinePlayback({ isPlaying: false });
      } else {
        const nextEv = sortedEvents[nextIdx];
        setTimelinePlayback({
          activeEventIndex: nextIdx,
          currentTime: nextEv.timestamp,
        });
        if (nextEv.id) {
          setSelectedEvent(nextEv.id);
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed, sortedEvents, setTimelinePlayback, setSelectedEvent]);

  if (!isOpen) return null;

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    if (idx >= 0 && idx < sortedEvents.length) {
      const targetEv = sortedEvents[idx];
      setTimelinePlayback({
        activeEventIndex: idx,
        currentTime: targetEv.timestamp,
      });
      if (targetEv.id) {
        setSelectedEvent(targetEv.id);
      }
    }
  };

  const speeds = [0.5, 1, 2, 4];

  const formatDate = (isoStr) => {
    if (!isoStr) return 'NO TEMPORAL DATA';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        width: 'min(92%, 820px)',
        background: 'rgba(10, 15, 29, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 240, 255, 0.3)',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(0, 240, 255, 0.12)',
        color: '#e0e6ed',
        fontFamily: "'Inter', sans-serif",
        padding: '14px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color="#00f0ff" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00f0ff' }}>
            Timeline Playback Sync
          </span>
          {isPlaying && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 999,
                fontSize: '0.68rem',
                fontWeight: 600,
                background: 'rgba(0, 240, 255, 0.15)',
                color: '#00f0ff',
                border: '1px solid rgba(0, 240, 255, 0.4)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#00f0ff',
                  boxShadow: '0 0 8px #00f0ff',
                  display: 'inline-block',
                }}
              />
              STREAMING
            </span>
          )}
        </div>

        {/* Current Event / Date Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', fontFamily: 'monospace' }}>
              {formatDate(currentTime || (sortedEvents[0]?.timestamp))}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentEvent ? `${currentEvent.type || 'EVENT'}: ${currentEvent.title || currentEvent.description || 'Investigation Milestone'}` : 'Timeline ready'}
            </div>
          </div>

          <button
            onClick={onClose}
            title="Minimize Playback HUD"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrubber Range Slider */}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="range"
          min={0}
          max={Math.max(0, sortedEvents.length - 1)}
          step={1}
          value={activeEventIndex >= 0 ? activeEventIndex : 0}
          onChange={handleSliderChange}
          disabled={sortedEvents.length === 0}
          style={{
            width: '100%',
            accentColor: '#00f0ff',
            cursor: 'pointer',
            height: 6,
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: '0.66rem', color: '#64748b', fontFamily: 'monospace' }}>
          <span>{sortedEvents.length > 0 ? formatDate(sortedEvents[0]?.timestamp).split(',')[0] : 'START'}</span>
          <span>
            {sortedEvents.length > 0 ? `STEP ${Math.max(0, activeEventIndex) + 1} OF ${sortedEvents.length}` : '0 EVENTS'}
          </span>
          <span>{sortedEvents.length > 0 ? formatDate(sortedEvents[sortedEvents.length - 1]?.timestamp).split(',')[0] : 'END'}</span>
        </div>
      </div>

      {/* Control Actions Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 4 }}>
        {/* Playback Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={resetPlayback}
            title="Restart Timeline"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              borderRadius: 6,
              padding: '6px 9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={() => stepPlayback(-1)}
            disabled={activeEventIndex <= 0}
            title="Step Back (-1 Event)"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: activeEventIndex <= 0 ? '#475569' : '#cbd5e1',
              borderRadius: 6,
              padding: '6px 9px',
              cursor: activeEventIndex <= 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={togglePlayback}
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
            style={{
              background: isPlaying ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 240, 255, 0.2)',
              border: `1px solid ${isPlaying ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 240, 255, 0.5)'}`,
              color: isPlaying ? '#ef4444' : '#00f0ff',
              borderRadius: 6,
              padding: '6px 14px',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: isPlaying ? '0 0 12px rgba(239, 68, 68, 0.25)' : '0 0 12px rgba(0, 240, 255, 0.25)',
            }}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>

          <button
            onClick={() => stepPlayback(1)}
            disabled={activeEventIndex >= sortedEvents.length - 1}
            title="Step Forward (+1 Event)"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: activeEventIndex >= sortedEvents.length - 1 ? '#475569' : '#cbd5e1',
              borderRadius: 6,
              padding: '6px 9px',
              cursor: activeEventIndex >= sortedEvents.length - 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Speed Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Gauge size={13} color="#64748b" style={{ marginRight: 2 }} />
          {speeds.map(s => (
            <button
              key={s}
              onClick={() => setTimelinePlayback({ speed: s })}
              style={{
                background: speed === s ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${speed === s ? 'rgba(0, 240, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                color: speed === s ? '#00f0ff' : '#94a3b8',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Mode Toggle: Cumulative vs Slice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Mode:</span>
          <div style={{ display: 'inline-flex', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 6, padding: 2, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setTimelinePlayback({ windowMode: 'cumulative' })}
              title="Cumulative: Highlights all entities and relations up to the current timestamp"
              style={{
                background: windowMode === 'cumulative' ? 'rgba(0, 240, 255, 0.25)' : 'transparent',
                border: 'none',
                color: windowMode === 'cumulative' ? '#00f0ff' : '#64748b',
                borderRadius: 4,
                padding: '3px 9px',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cumulative
            </button>
            <button
              onClick={() => setTimelinePlayback({ windowMode: 'slice' })}
              title="Window Slice: Emphasizes only entities active in the current temporal window"
              style={{
                background: windowMode === 'slice' ? 'rgba(255, 170, 0, 0.25)' : 'transparent',
                border: 'none',
                color: windowMode === 'slice' ? '#ffaa00' : '#64748b',
                borderRadius: 4,
                padding: '3px 9px',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Slice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
