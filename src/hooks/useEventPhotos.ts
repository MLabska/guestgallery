import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchPhoto, fetchPhotoPage, signedUrls } from '../api/photos';
import { supabase } from '../lib/supabase';
import {
  PAGE_SIZE,
  appendPage,
  applyDelete,
  applyInsert,
  nextCursor,
  replaceFirstPage,
} from '../lib/photoList';
import type { GalleryPhoto } from '../lib/photoList';

export type EventPhotos = {
  photos: GalleryPhoto[];
  /** Signed thumbnail URLs by storage path. */
  urls: Record<string, string>;
  /** True until the first page has loaded (or failed). */
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  /** Set when the last (re)load failed; the loaded photos stay visible (DESIGN.md §9). */
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  /** Call when a thumbnail fails to load: its signed URL probably expired (DESIGN.md §9). */
  reportImageError: () => void;
};

/**
 * Paged gallery of one event with a realtime subscription (DESIGN.md §5, SPEC 4.1).
 * Newest first, 30 per page. INSERTs are filtered by event_id; DELETEs cannot be filtered,
 * so every deleted photo id is checked against the loaded list.
 */
export function useEventPhotosState(eventId: string): EventPhotos {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const photosRef = useRef<GalleryPhoto[]>([]);
  const busyRef = useRef(false);
  const resigningRef = useRef(false);

  const setList = useCallback((next: GalleryPhoto[]) => {
    photosRef.current = next;
    setPhotos(next);
  }, []);

  const sign = useCallback(async (list: GalleryPhoto[]) => {
    const fresh = await signedUrls(list.map((p) => p.thumb_path));
    setUrls((old) => ({ ...old, ...fresh }));
  }, []);
  // Silent refetch of the first page (initial load, reconnect, back from background).
  const fetchFirst = useCallback(async () => {
    try {
      const page = await fetchPhotoPage(eventId, null);
      const merged = replaceFirstPage(photosRef.current, page);
      setList(merged);
      setHasMore(page.length === PAGE_SIZE || merged.length > page.length);
      setError(null);
      await sign(merged).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load photos');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [eventId, setList, sign]);

  /** Pull-to-refresh: same as fetchFirst, with the spinner. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFirst();
  }, [fetchFirst]);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore || photosRef.current.length === 0) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPhotoPage(eventId, nextCursor(photosRef.current));
      setList(appendPage(photosRef.current, page));
      setHasMore(page.length === PAGE_SIZE);
      setError(null);
      await sign(page).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load photos');
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [eventId, hasMore, setList, sign]);

  const reportImageError = useCallback(() => {
    if (resigningRef.current) return;
    resigningRef.current = true;
    sign(photosRef.current)
      .catch(() => undefined)
      .finally(() => {
        // Do not hammer the server if the image keeps failing.
        setTimeout(() => {
          resigningRef.current = false;
        }, 5000);
      });
  }, [sign]);

  // First page.
  useEffect(() => {
    void fetchFirst();
  }, [fetchFirst]);

  // Realtime: INSERT filtered by event, DELETE unfiltered.
  useEffect(() => {
    let subscribedBefore = false;
    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'photos', filter: `event_id=eq.${eventId}` },
        (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (!id) return;
          fetchPhoto(id)
            .then((photo) => {
              if (!photo) return;
              setList(applyInsert(photosRef.current, photo));
              return sign([photo]);
            })
            .catch(() => undefined);
        },
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'photos' }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setList(applyDelete(photosRef.current, id));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // After a reconnect we may have missed events: refetch the first page.
          if (subscribedBefore) void fetchFirst();
          subscribedBefore = true;
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, fetchFirst, setList, sign]);

  // Back from the background: realtime was probably paused (DESIGN.md §9, R6).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void fetchFirst();
    });
    return () => sub.remove();
  }, [fetchFirst]);

  return {
    photos,
    urls,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    reportImageError,
  };
}

const EventPhotosContext = createContext<EventPhotos | null>(null);

/** Shares one gallery state (and one realtime channel) between the Gallery tab and the viewer. */
export function EventPhotosProvider({ eventId, children }: { eventId: string; children: ReactNode }) {
  const value = useEventPhotosState(eventId);
  return createElement(EventPhotosContext.Provider, { value }, children);
}

export function useEventPhotos(): EventPhotos {
  const value = useContext(EventPhotosContext);
  if (!value) throw new Error('useEventPhotos must be used inside an event route');
  return value;
}
