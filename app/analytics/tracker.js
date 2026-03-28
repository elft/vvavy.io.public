/**
 * Privacy-focused analytics tracker for VVavy
 * Tracks audio source usage, visual preferences, and session duration
 * Data is aggregated and anonymized - no PII collected
 */

import { bus, EVT } from '../event-bus.js';

class AnalyticsTracker {
  constructor() {
    this.enabled = false;
    this.sessionStart = Date.now();
    this.endpoint = '/api/analytics';
    this.queue = [];
    this.flushInterval = 30000; // Deprecated: kept for reference
    this.maxQueueSize = 10; // Deprecated: flush now happens only on unload
    this.heartbeatIntervalMs = 5 * 60 * 1000; // Flush queue every 5 minutes while tab is active
    this.heartbeatTimer = null;
    this.currentVisual = null;
    this.currentSource = null;
    this.visualStartTime = null;
    this.sourceStartTime = null;
    this.hasFlushed = false;

    // Handle back/forward cache restoration
    this._handlePageShow = this._handlePageShow.bind(this);
    if (typeof window !== 'undefined') {
        window.addEventListener('pageshow', this._handlePageShow);
    }
  }

  /**
   * Handle page restore from bfcache
   */
  _handlePageShow(event) {
    if (event.persisted) {
      this.sessionStart = Date.now();
      this.hasFlushed = false;
      this.queue = [];
      this.visualStartTime = this.currentVisual ? Date.now() : null;
      this.sourceStartTime = this.currentSource ? Date.now() : null;
      this._registerUnloadHandlers(); // Re-bind handlers if they were once:true
      this._startHeartbeat(); // Restart timer after bfcache restore
    }
  }

  /**
   * Initialize analytics tracking
   */
  init() {
    if (this.enabled) return;

    this.enabled = true;
    this._setupEventListeners();
    this._trackPageView();

    // Track session end on page unload/pagehide for maximum reliability
    this._registerUnloadHandlers();

    // Also flush on visibility change (more reliable than unload)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this._flush(true);
      }
    });

    this._startHeartbeat();
  }

  /**

   * Setup event listeners for tracking
   */
  _setupEventListeners() {
    // Track visual changes
    bus.on(EVT.VISUAL_CHANGE, ({ id }) => {
      if (this.currentVisual && this.visualStartTime) {
        // Track time spent on previous visual
        const duration = Date.now() - this.visualStartTime;
        this._trackEvent('visual_duration', {
          visual: this.currentVisual,
          duration_ms: duration,
        });
      }

      this.currentVisual = id;
      this.visualStartTime = Date.now();

      this._trackEvent('visual_selected', { visual: id });
    });

    // Track audio source selection
    bus.on(EVT.SOURCE_SELECTED, ({ kind, payload }) => {
      if (this.currentSource && this.sourceStartTime) {
        // Track time spent with previous source
        const duration = Date.now() - this.sourceStartTime;
        this._trackEvent('source_duration', {
          source: this.currentSource,
          duration_ms: duration,
        });
      }

      let sourceType = kind;
      if (kind === 'stream' && payload?.provider) {
        sourceType = `stream_${payload.provider}`;
      }

      this.currentSource = sourceType;
      this.sourceStartTime = Date.now();

      this._trackEvent('source_selected', {
        source: sourceType,
        // Don't track specific IDs, just the type
      });
    });

    // Track when audio actually loads
    bus.on(EVT.SOURCE_LOADED, ({ kind }) => {
      this._trackEvent('source_loaded', { source: kind });
    });

    // Track playback events
    bus.on(EVT.TRANSPORT_PLAY, () => {
      this._trackEvent('playback_start', {
        visual: this.currentVisual,
        source: this.currentSource,
      });
    });

    bus.on(EVT.TRANSPORT_PAUSE, () => {
      this._trackEvent('playback_pause', {
        visual: this.currentVisual,
        source: this.currentSource,
      });
    });

    // Track export usage
    bus.on(EVT.EXPORT_START, () => {
      this._trackEvent('export_started', {
        visual: this.currentVisual,
      });
    });

    bus.on(EVT.EXPORT_COMPLETE, () => {
      this._trackEvent('export_completed', {
        visual: this.currentVisual,
      });
    });

    // Track create-visual overlay opens
    bus.on(EVT.CUSTOM_VISUAL_CREATE_OPEN, ({ source } = {}) => {
      this._trackEvent('custom_visual_create_open', {
        source: source || 'unknown',
      });
    });

    // Track custom visual preview
    bus.on(EVT.CUSTOM_VISUAL_PREVIEWED, ({ id, name }) => {
      this._trackEvent('custom_visual_previewed', {
        visual_id: id,
        visual_name: name,
      });
      this._flush();
    });

    // Track custom visual creation
    bus.on(EVT.CUSTOM_VISUAL_SAVED, ({ id, name }) => {
      this._trackEvent('custom_visual_saved', {
        visual_id: id,
        visual_name: name,
      });
      // Immediately flush critical events
      this._flush();
    });

    // Track favorite clicks
    bus.on(EVT.VISUAL_FAVORITE_CLICKED, ({ visual, favorite_name, count, is_favorited } = {}) => {
      const normalizedCount =
        Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
      this._trackEvent('visual_favorite_clicked', {
        visual: visual || null,
        favorite_name: favorite_name || visual || null,
        count: normalizedCount,
        is_favorited: Boolean(is_favorited),
      });
    });
  }

  /**
   * Track a page view
   */
  _trackPageView() {
    const urlParams = new URLSearchParams(window.location.search);
    this._trackEvent('page_view', {
      visual: urlParams.get('visual') || 'galactic-kaleidoscope',
      source: urlParams.get('source') || null,
      referrer: document.referrer ? new URL(document.referrer).hostname : null,
    });
  }

  /**
   * Track an analytics event
   */
  _trackEvent(eventType, data = {}) {
    if (!this.enabled) return;

    const event = {
      type: eventType,
      timestamp: Date.now(),
      data,
    };

    this.queue.push(event);
  }

  /**
   * Track session end
   */
  _onSessionEnd() {
    if (this.hasFlushed) return;
    const now = Date.now();
    let sessionDuration = now - this.sessionStart;

    // Cap excessive durations (e.g. > 24 hours) typically due to idle tabs
    // This prevents skewing the average with outliers
    const MAX_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    if (sessionDuration > MAX_DURATION) {
        sessionDuration = MAX_DURATION;
    }

    // Track final visual duration
    if (this.currentVisual && this.visualStartTime) {
      let visualDuration = now - this.visualStartTime;
      if (visualDuration > MAX_DURATION) visualDuration = MAX_DURATION;

      this._trackEvent('visual_duration', {
        visual: this.currentVisual,
        duration_ms: visualDuration,
      });
    }

    // Track final source duration
    if (this.currentSource && this.sourceStartTime) {
      let sourceDuration = now - this.sourceStartTime;
      if (sourceDuration > MAX_DURATION) sourceDuration = MAX_DURATION;

      this._trackEvent('source_duration', {
        source: this.currentSource,
        duration_ms: sourceDuration,
      });
    }

    // Track session end
    this._trackEvent('session_end', {
      duration_ms: sessionDuration,
      session_started_at: this.sessionStart,
    });

    // Force flush on unload
    this._flush(true);
    this.hasFlushed = true;
  }

  /**
   * Flush queued events to server
   */
  _flush(sync = false) {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    const payload = {
      events,
    };

    if (sync) {
      // Use sendBeacon for synchronous sending on unload
      if (navigator.sendBeacon) {
        // Use Blob with Content-Type for better compatibility
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const success = navigator.sendBeacon(this.endpoint, blob);
        return;
      }
    }

    // Fallback to async fetch (may be ignored on unload if beacon unavailable)
    fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(err => {
      console.error('[Analytics] Failed to flush events:', err);});
  }

  _isTabActive() {
    if (typeof document === 'undefined') return false;
    const isVisible = document.visibilityState === 'visible';
    const isFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
    return isVisible && isFocused;
  }

  _startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (!this.enabled || !this._isTabActive() || this.queue.length === 0) return;
      this._flush();
    }, this.heartbeatIntervalMs);
  }

  _registerUnloadHandlers() {
    const handler = () => this._onSessionEnd();
    // Use both for maximum reliability across desktop and mobile
    // beforeunload: better for desktop browsers
    // pagehide: better for mobile (iOS Safari) and modern browsers
    window.addEventListener('beforeunload', handler, { once: true });
    window.addEventListener('pagehide', handler, { once: true });
  }
}

// Create singleton instance
export const analytics = new AnalyticsTracker();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  analytics.init();
}
