/**
 * CivicGuard Law Enforcement Incident Stream Hook
 * Real-time Supabase WebSocket listener with precinct jurisdiction filtering,
 * optimistic cache updates, and audio/visual dispatch chime triggers.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { IncidentReport, IncidentStatus, UserProfile, UserRole } from '../types';
import { fetchActiveIncidents, subscribeToIncidents } from '../services/db';
import { isSupabaseConfigured, supabase } from '../services/supabase';

interface UseIncidentStreamOptions {
  currentUser: UserProfile;
  stationIdFilter?: string | 'all';
  enableAudioChime?: boolean;
}

interface IncidentStreamResult {
  incidents: IncidentReport[];
  loading: boolean;
  error: string | null;
  alertIncident: IncidentReport | null;
  clearAlert: () => void;
  refetch: () => Promise<void>;
  updateIncidentInCache: (updated: IncidentReport) => void;
}

/**
 * Web Audio API synthetic dispatch chime (two-tone tactical ping)
 * Avoids any external audio asset dependency.
 */
function playTacticalChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 784 Hz (G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Tone 2: 1046.5 Hz (C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0.1, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (err) {
    // Audio context may be restricted before user interaction
    console.debug('[AudioChime] AudioContext autoplay suppressed');
  }
}

export function useIncidentStream({
  currentUser,
  stationIdFilter = 'all',
  enableAudioChime = true,
}: UseIncidentStreamOptions): IncidentStreamResult {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertIncident, setAlertIncident] = useState<IncidentReport | null>(null);

  const filterRef = useRef(stationIdFilter);
  filterRef.current = stationIdFilter;

  // Initial Data Fetch
  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchActiveIncidents(
        {
          assigned_station_id: filterRef.current !== 'all' ? filterRef.current : undefined,
        },
        currentUser
      );
      setIncidents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to stream incident logs.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents, stationIdFilter]);

  // Real-Time Subscription Listener
  useEffect(() => {
    const handleBroadcast = ({
      event,
      incident,
    }: {
      event: 'INSERT' | 'UPDATE' | 'DELETE';
      incident: IncidentReport;
    }) => {
      // Check jurisdiction filter if specified
      if (
        filterRef.current !== 'all' &&
        incident.assigned_station_id &&
        incident.assigned_station_id !== filterRef.current
      ) {
        return;
      }

      setIncidents((prev) => {
        if (event === 'INSERT') {
          // Prevent duplicates
          if (prev.some((item) => item.id === incident.id)) return prev;

          // Audio/Visual alert trigger for incoming pending items
          if (incident.status === IncidentStatus.PENDING) {
            setAlertIncident(incident);
            if (enableAudioChime) {
              playTacticalChime();
            }
          }

          return [incident, ...prev];
        }

        if (event === 'UPDATE') {
          return prev.map((item) => (item.id === incident.id ? incident : item));
        }

        if (event === 'DELETE') {
          return prev.filter((item) => item.id !== incident.id);
        }

        return prev;
      });
    };

    // 1. Subscribe to shared incident service emitter
    const unsubscribeService = subscribeToIncidents(handleBroadcast);

    // 2. Direct Supabase Realtime channel if live configured
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`incident-stream-${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'incident_reports',
          },
          (payload) => {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
            const record = (payload.new || payload.old) as IncidentReport;
            if (record) {
              handleBroadcast({ event: eventType, incident: record });
            }
          }
        )
        .subscribe();
    }

    return () => {
      unsubscribeService();
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser.id, enableAudioChime]);

  const clearAlert = useCallback(() => {
    setAlertIncident(null);
  }, []);

  const updateIncidentInCache = useCallback((updated: IncidentReport) => {
    setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }, []);

  return {
    incidents,
    loading,
    error,
    alertIncident,
    clearAlert,
    refetch: loadIncidents,
    updateIncidentInCache,
  };
}
