/* global Audio */

import { bus, EVT } from '../event-bus.js';
import {
  computeBandProfile,
  computeChromaDeviation,
  computeMFCC,
  computeRMS,
  computeSawLikelihood,
  computeSpectralCentroid,
  computeSpectralFlatness,
  computeSpectralFlux,
  computeSpectralRolloff,
  computeSpectralShape,
  computeStereoFeatures,
  createMelFilterbank,
  normalizeByteSpectrum,
  rmsToDecibels,
} from '../audio/metrics/reusable.js';
import {
  computeAudioCues,
  computeTemporalMetrics,
  createEmptyMetrics,
  createTangleState,
  ensureSpectrumBuffer,
} from '../audio/metrics/tangle.js';
import {
  createVisualizer,
  listVisualizers,
} from '../visuals/base-visualizer.js';
import { installCustomVisualApi } from '../visuals/custom-visual-api.js';

const INTRO_AUDIO_URL = '/music/intro.mp3';
const SAMPLE_SIZE = 96;
const SAMPLE_INTERVAL_MS = 180;
const WARMUP_MS = 3600;
const AUDIO_READY_TIMEOUT_MS = 10000;
const MAX_LOG_LINES = 24;
const BLOCKED_CONSOLE_LEVELS = new Set(['error', 'warn']);
const PIXEL_DIFF_THRESHOLD = 24;

const state = {
  visual: null,
  sampleTimer: null,
  frameProbeHandle: null,
  frameCount: 0,
  logs: [],
  pageErrorMessages: [],
  consoleMessages: [],
  blockedApis: [],
  networkAttempts: [],
  renderSamples: [],
  audioRuntime: null,
};

const refs = {
  root: document.querySelector('[data-review-runner-page]'),
  stage: document.querySelector('[data-review-runner-stage]'),
  canvas: document.getElementById('review-runner-canvas'),
  status: document.querySelector('[data-role="runner-status"]'),
  meta: document.querySelector('[data-role="runner-meta"]'),
  title: document.querySelector('[data-role="runner-visual-title"]'),
  log: document.querySelector('[data-role="runner-log"]'),
};

function setStatus(message) {
  if (refs.status) refs.status.textContent = message;
}

function setMeta(message) {
  if (refs.meta) refs.meta.textContent = message;
}

function setTitle(message) {
  if (refs.title) refs.title.textContent = message;
}

function pushLog(message) {
  const line = typeof message === 'string' ? message.trim() : '';
  if (!line) return;
  state.logs.push(line);
  if (state.logs.length > MAX_LOG_LINES) {
    state.logs.splice(0, state.logs.length - MAX_LOG_LINES);
  }
  if (refs.log) {
    refs.log.textContent = state.logs.join('\n');
  }
}

function appendRuntimeEntry(collection, payload) {
  if (!Array.isArray(collection)) return;
  collection.push(payload);
  if (collection.length > 50) {
    collection.splice(0, collection.length - 50);
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function resetCanvas() {
  const canvas = refs.canvas;
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Review runner canvas is unavailable.');
  }
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function getRenderCanvas() {
  const canvas = state.visual?.getCanvas?.() ?? refs.canvas;
  return canvas instanceof HTMLCanvasElement ? canvas : refs.canvas;
}

function collectCanvasSample(canvas) {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = SAMPLE_SIZE;
  sampleCanvas.height = SAMPLE_SIZE;
  const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
  if (!sampleCtx) {
    return {
      coverageRatio: 0,
      variance: 0,
      meanLuma: 0,
      pixelCount: 0,
      pixelBytes: null,
      imageDataUrl: '',
    };
  }

  sampleCtx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  sampleCtx.drawImage(canvas, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const imageData = sampleCtx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const pixels = imageData.data;
  let activePixels = 0;
  let lumaTotal = 0;
  let lumaSquaredTotal = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];
    const luma = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);
    lumaTotal += luma;
    lumaSquaredTotal += luma * luma;
    if (alpha > 10 && luma > 18) {
      activePixels += 1;
    }
  }

  const pixelCount = pixels.length / 4;
  const meanLuma = pixelCount ? lumaTotal / pixelCount : 0;
  const variance = pixelCount
    ? Math.max(0, (lumaSquaredTotal / pixelCount) - (meanLuma * meanLuma))
    : 0;

  return {
    coverageRatio: pixelCount ? activePixels / pixelCount : 0,
    variance: Number(variance.toFixed(3)),
    meanLuma: Number(meanLuma.toFixed(3)),
    pixelCount,
    pixelBytes: new Uint8ClampedArray(pixels),
    imageDataUrl: sampleCanvas.toDataURL('image/png'),
  };
}

function computeSampleDiff(left, right) {
  const leftPixels = left?.pixelBytes;
  const rightPixels = right?.pixelBytes;
  if (!(leftPixels instanceof Uint8ClampedArray) || !(rightPixels instanceof Uint8ClampedArray)) {
    return {
      changedRatio: 0,
      meanDelta: 0,
    };
  }

  const length = Math.min(leftPixels.length, rightPixels.length);
  if (length <= 0) {
    return {
      changedRatio: 0,
      meanDelta: 0,
    };
  }

  let changedPixels = 0;
  let deltaTotal = 0;
  for (let index = 0; index < length; index += 4) {
    const pixelDelta =
      Math.abs(leftPixels[index] - rightPixels[index]) +
      Math.abs(leftPixels[index + 1] - rightPixels[index + 1]) +
      Math.abs(leftPixels[index + 2] - rightPixels[index + 2]);
    deltaTotal += pixelDelta;
    if (pixelDelta >= PIXEL_DIFF_THRESHOLD) {
      changedPixels += 1;
    }
  }

  const pixelCount = Math.max(1, Math.floor(length / 4));
  return {
    changedRatio: Number((changedPixels / pixelCount).toFixed(4)),
    meanDelta: Number((deltaTotal / pixelCount).toFixed(3)),
  };
}

function scoreRenderSample(sample, diff) {
  return (
    (sample?.coverageRatio ?? 0) * 24
    + (sample?.variance ?? 0) * 0.08
    + (diff?.changedRatio ?? 0) * 120
    + (diff?.meanDelta ?? 0) * 0.12
  );
}

function pickBestRenderSample(baseline, samples) {
  const entries = Array.isArray(samples) ? samples : [];
  if (!entries.length) {
    return {
      sample: baseline,
      diff: computeSampleDiff(baseline, baseline),
    };
  }

  return entries.reduce((best, sample) => {
    const diff = computeSampleDiff(baseline, sample);
    const score = scoreRenderSample(sample, diff);
    if (!best || score > best.score) {
      return { sample, diff, score };
    }
    return best;
  }, null);
}

function waitForMediaEvent(element, events, timeoutMs = AUDIO_READY_TIMEOUT_MS) {
  if ((element?.readyState ?? 0) >= 2) {
    return Promise.resolve('readyState');
  }

  return new Promise((resolve, reject) => {
    const eventNames = Array.isArray(events) ? events : [events];
    let settled = false;
    let timeoutHandle = 0;
    const cleanups = [];

    const finish = (callback) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) {
        window.clearTimeout(timeoutHandle);
      }
      cleanups.forEach((cleanup) => cleanup());
      callback();
    };

    eventNames.forEach((eventName) => {
      const handler = () => {
        finish(() => resolve(eventName));
      };
      element.addEventListener(eventName, handler, { once: true });
      cleanups.push(() => element.removeEventListener(eventName, handler));
    });

    const errorHandler = () => {
      finish(() => reject(new Error('Intro audio failed to load.')));
    };
    element.addEventListener('error', errorHandler, { once: true });
    cleanups.push(() => element.removeEventListener('error', errorHandler));

    timeoutHandle = window.setTimeout(() => {
      finish(() => reject(new Error('Timed out waiting for intro audio to become ready.')));
    }, timeoutMs);
  });
}

function buildBaseMetricsFromAnalysis({
  audioContext,
  metricsState,
  normalizedSpectrum,
  timeDomainData,
  stereoSnapshot,
  melFilterbank,
} = {}) {
  const sampleRate = audioContext.sampleRate;
  const profile = computeBandProfile(normalizedSpectrum, sampleRate);
  const {
    minIndex,
    energy,
    overallEnergy,
    bandCountActive,
    ...bands
  } = profile;

  const lowEnergy =
    (bands.subBassEnergy ?? 0) +
    (bands.bassEnergy ?? 0) +
    (bands.lowMidEnergy ?? 0) +
    (bands.midEnergy ?? 0);
  const highEnergy =
    (bands.upperMidEnergy ?? 0) +
    (bands.presenceEnergy ?? 0) +
    (bands.trebleEnergy ?? 0) +
    (bands.brillianceEnergy ?? 0) +
    (bands.ultrasonicEnergy ?? 0);
  const energySum = lowEnergy + highEnergy;
  const highLowTwistRatio =
    energySum > 1e-6
      ? Math.max(0, Math.min(1, 1 - Math.abs(highEnergy - lowEnergy) / energySum))
      : 0;

  const centroid = computeSpectralCentroid(normalizedSpectrum, sampleRate, minIndex);
  const spectralRolloff85 = computeSpectralRolloff(normalizedSpectrum, sampleRate, 0.85, minIndex);
  const spectralRolloff95 = computeSpectralRolloff(normalizedSpectrum, sampleRate, 0.95, minIndex);
  const flatness = computeSpectralFlatness(normalizedSpectrum, minIndex);
  const spectralFlux = computeSpectralFlux(normalizedSpectrum, metricsState.prevSpectrum, minIndex);
  const sawLikelihood = computeSawLikelihood(normalizedSpectrum, sampleRate, minIndex);
  const { skewness, kurtosis } = computeSpectralShape(normalizedSpectrum, sampleRate, minIndex);
  const mfcc = melFilterbank ? computeMFCC(normalizedSpectrum, melFilterbank, 13) : null;
  const spectralSkewness = Math.max(-1, Math.min(1, Math.tanh((skewness ?? 0) * 0.5)));
  const spectralKurtosis = Math.max(0, Math.min(1, Math.tanh(Math.max(0, (kurtosis ?? 0) - 1) * 0.25)));
  const chromaDeviation = computeChromaDeviation(normalizedSpectrum, sampleRate, minIndex);
  const rmsTime = computeRMS(timeDomainData);
  const stereo = stereoSnapshot ?? {
    rmsLeft: rmsTime,
    rmsRight: rmsTime,
    balance: 0,
    spread: 0,
    midSideRatio: 0,
    interchannelCorrelation: 0,
  };

  return {
    ...bands,
    time: audioContext.currentTime,
    energy,
    overallEnergy,
    bandCountActive,
    centroid,
    spectralRolloff85,
    spectralRolloff95,
    flatness,
    spectralFlux,
    sawLikelihood,
    spectralKurtosis,
    spectralSkewness,
    chromaDeviation,
    rmsTime,
    rmsLeft: Math.min(1, Math.max(0, stereo.rmsLeft ?? rmsTime)),
    rmsRight: Math.min(1, Math.max(0, stereo.rmsRight ?? rmsTime)),
    stereoBalance: Math.max(-1, Math.min(1, stereo.balance ?? 0)),
    stereoSpread: Math.min(1, Math.max(0, stereo.spread ?? 0)),
    midSideRatio: Math.max(0, Math.min(8, stereo.midSideRatio ?? 0)),
    interchannelCorrelation: Math.max(-1, Math.min(1, stereo.interchannelCorrelation ?? 0)),
    loudnessShortDb: rmsToDecibels(rmsTime, -72),
    highLowTwistRatio,
    mfcc,
  };
}

function createSyntheticMetricsRuntime() {
  let animationFrame = 0;
  const metricsState = createTangleState();
  const trackDuration = 24;

  const emitFrame = () => {
    const now = performance.now() * 0.001;
    const phase = now * Math.PI * 2;
    const energy =
      0.22 +
      Math.max(0, Math.sin(phase * 0.75)) * 0.28 +
      Math.max(0, Math.sin(phase * 1.5 + 0.9)) * 0.18;

    const baseMetrics = {
      ...createEmptyMetrics(),
      time: now,
      mediaTime: now % trackDuration,
      mediaDuration: trackDuration,
      mediaPaused: false,
      energy,
      overallEnergy: energy,
      subBassEnergy: energy * 0.74,
      bassEnergy: energy * 0.66,
      lowMidEnergy: energy * 0.48,
      midEnergy: energy * 0.38,
      upperMidEnergy: energy * 0.3,
      presenceEnergy: energy * 0.24,
      trebleEnergy: energy * 0.18,
      brillianceEnergy: energy * 0.11,
      centroid: 2400 + Math.abs(Math.sin(now * 0.33)) * 4200,
      spectralRolloff85: 3200 + Math.abs(Math.sin(now * 0.41)) * 5200,
      spectralRolloff95: 4800 + Math.abs(Math.sin(now * 0.51)) * 7200,
      flatness: 0.18 + Math.abs(Math.sin(now * 0.6)) * 0.14,
      spectralFlux: Math.abs(Math.sin(now * 3.2)) * 0.22,
      rmsTime: energy,
      rmsLeft: energy * 0.96,
      rmsRight: energy * 1.04,
      stereoBalance: Math.sin(now * 0.27) * 0.18,
      stereoSpread: 0.22 + Math.abs(Math.sin(now * 0.19)) * 0.16,
      midSideRatio: 0.3 + Math.abs(Math.sin(now * 0.22)) * 0.5,
      interchannelCorrelation: 0.2 + Math.sin(now * 0.18) * 0.3,
      loudnessShortDb: -42 + energy * 18,
      highLowTwistRatio: 0.42 + Math.sin(now * 0.25) * 0.16,
      chromaDeviation: 0.12 + Math.abs(Math.sin(now * 0.5)) * 0.08,
    };

    const metrics = computeTemporalMetrics(metricsState, baseMetrics);
    metrics.mediaTime = baseMetrics.mediaTime;
    metrics.mediaDuration = baseMetrics.mediaDuration;
    metrics.mediaPaused = false;
    const cues = computeAudioCues(metricsState, metrics);
    bus.emit(EVT.AUDIO_METRICS, { metrics, cues });
    animationFrame = window.requestAnimationFrame(emitFrame);
  };

  return {
    async start() {
      emitFrame();
      return {
        mode: 'synthetic-fallback',
        sourceUrl: null,
        sourceLabel: 'Synthetic fallback',
      };
    },
    async stop() {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    },
  };
}

function createIntroAudioRuntime(audioUrl = INTRO_AUDIO_URL) {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (typeof AudioContextCtor !== 'function') {
    throw new Error('AudioContext is unavailable in this browser runtime.');
  }

  const audioContext = new AudioContextCtor({ latencyHint: 'interactive' });
  const element = new Audio(audioUrl);
  element.crossOrigin = 'anonymous';
  element.preload = 'auto';
  element.loop = true;
  element.playsInline = true;

  const sourceNode = audioContext.createMediaElementSource(element);
  const analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;
  analyserNode.smoothingTimeConstant = 0.6;

  const splitter = audioContext.createChannelSplitter(2);
  const leftAnalyser = audioContext.createAnalyser();
  const rightAnalyser = audioContext.createAnalyser();
  leftAnalyser.fftSize = 1024;
  rightAnalyser.fftSize = 1024;
  leftAnalyser.smoothingTimeConstant = 0.6;
  rightAnalyser.smoothingTimeConstant = 0.6;

  const outputGain = audioContext.createGain();
  outputGain.gain.value = 1;

  sourceNode.connect(analyserNode);
  sourceNode.connect(splitter);
  sourceNode.connect(outputGain);
  outputGain.connect(audioContext.destination);
  splitter.connect(leftAnalyser, 0);
  splitter.connect(rightAnalyser, 1);

  const frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
  const normalizedSpectrum = new Float32Array(analyserNode.frequencyBinCount);
  const timeDomainData = new Float32Array(analyserNode.fftSize);
  const leftTimeDomain = new Float32Array(leftAnalyser.fftSize);
  const rightTimeDomain = new Float32Array(rightAnalyser.fftSize);
  const melFilterbank = createMelFilterbank(audioContext.sampleRate, analyserNode.fftSize, 40);
  const metricsState = createTangleState(analyserNode.frequencyBinCount);
  ensureSpectrumBuffer(metricsState, analyserNode.frequencyBinCount);

  let animationFrame = 0;

  const emitFrame = () => {
    analyserNode.getByteFrequencyData(frequencyData);
    analyserNode.getFloatTimeDomainData(timeDomainData);
    normalizeByteSpectrum(frequencyData, normalizedSpectrum);
    leftAnalyser.getFloatTimeDomainData(leftTimeDomain);
    rightAnalyser.getFloatTimeDomainData(rightTimeDomain);

    const stereoSnapshot = computeStereoFeatures(leftTimeDomain, rightTimeDomain);
    const baseMetrics = buildBaseMetricsFromAnalysis({
      audioContext,
      metricsState,
      normalizedSpectrum,
      timeDomainData,
      stereoSnapshot,
      melFilterbank,
    });
    const metrics = computeTemporalMetrics(metricsState, baseMetrics);
    metrics.mediaTime = Number.isFinite(element.currentTime) ? element.currentTime : null;
    metrics.mediaDuration = Number.isFinite(element.duration) ? element.duration : null;
    metrics.mediaPaused = Boolean(element.paused);
    const cues = computeAudioCues(metricsState, metrics);
    bus.emit(EVT.AUDIO_METRICS, { metrics, cues });
    animationFrame = window.requestAnimationFrame(emitFrame);
  };

  return {
    async start() {
      element.load();
      await waitForMediaEvent(element, ['loadeddata', 'canplaythrough']);
      await audioContext.resume();
      await element.play();
      await wait(300);
      emitFrame();
      return {
        mode: 'intro-track',
        sourceUrl: audioUrl,
        sourceLabel: 'Intro MP3',
      };
    },
    async stop() {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      try {
        element.pause();
      } catch {
        // Best effort cleanup only.
      }
      try {
        element.removeAttribute('src');
        element.load();
      } catch {
        // Best effort cleanup only.
      }
      try {
        sourceNode.disconnect();
        analyserNode.disconnect();
        splitter.disconnect();
        leftAnalyser.disconnect();
        rightAnalyser.disconnect();
        outputGain.disconnect();
      } catch {
        // Best effort cleanup only.
      }
      try {
        await audioContext.close();
      } catch {
        // Best effort cleanup only.
      }
    },
  };
}

async function startReviewAudioRuntime() {
  const introRuntime = createIntroAudioRuntime(INTRO_AUDIO_URL);
  try {
    const summary = await introRuntime.start();
    pushLog('Using intro.mp3 as the review audio source.');
    return { runtime: introRuntime, summary };
  } catch (error) {
    await introRuntime.stop().catch(() => {});
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown audio error');
    pushLog(`Intro audio unavailable. Falling back to synthetic metrics. ${message}`);
    const fallbackRuntime = createSyntheticMetricsRuntime();
    const summary = await fallbackRuntime.start();
    return { runtime: fallbackRuntime, summary };
  }
}

function markBlockedApi(name, detail = '') {
  const entry = detail ? `${name}: ${detail}` : name;
  appendRuntimeEntry(state.blockedApis, entry);
}

function markNetworkAttempt(entry) {
  appendRuntimeEntry(state.networkAttempts, entry);
}

function createBlockedFunction(name) {
  return function blockedRuntimeApi(...args) {
    const detail = args[0] == null ? '' : String(args[0]);
    markBlockedApi(name, detail);
    throw new Error(`Blocked runtime API: ${name}`);
  };
}

function installRuntimeGuards() {
  const scope = window;
  const navigatorObject = scope.navigator ?? null;

  scope.fetch = createBlockedFunction('fetch');

  scope.XMLHttpRequest = class BlockedXmlHttpRequest {
    constructor() {
      markNetworkAttempt({ api: 'XMLHttpRequest' });
      throw new Error('Blocked runtime API: XMLHttpRequest');
    }
  };

  scope.WebSocket = class BlockedWebSocket {
    constructor(url) {
      markNetworkAttempt({ api: 'WebSocket', url: String(url ?? '') });
      throw new Error('Blocked runtime API: WebSocket');
    }
  };

  scope.EventSource = class BlockedEventSource {
    constructor(url) {
      markNetworkAttempt({ api: 'EventSource', url: String(url ?? '') });
      throw new Error('Blocked runtime API: EventSource');
    }
  };

  scope.Worker = class BlockedWorker {
    constructor(url) {
      markBlockedApi('Worker', String(url ?? ''));
      throw new Error('Blocked runtime API: Worker');
    }
  };

  scope.SharedWorker = class BlockedSharedWorker {
    constructor(url) {
      markBlockedApi('SharedWorker', String(url ?? ''));
      throw new Error('Blocked runtime API: SharedWorker');
    }
  };

  scope.BroadcastChannel = class BlockedBroadcastChannel {
    constructor(name) {
      markBlockedApi('BroadcastChannel', String(name ?? ''));
      throw new Error('Blocked runtime API: BroadcastChannel');
    }
  };

  scope.open = createBlockedFunction('window.open');
  scope.postMessage = createBlockedFunction('postMessage');

  if (navigatorObject && typeof navigatorObject.sendBeacon === 'function') {
    navigatorObject.sendBeacon = (...args) => {
      markNetworkAttempt({
        api: 'sendBeacon',
        url: args[0] == null ? '' : String(args[0]),
      });
      return false;
    };
  }

  const blockedStorage = {
    getItem(key) {
      markBlockedApi('storage.getItem', String(key ?? ''));
      throw new Error('Blocked runtime API: storage.getItem');
    },
    setItem(key) {
      markBlockedApi('storage.setItem', String(key ?? ''));
      throw new Error('Blocked runtime API: storage.setItem');
    },
    removeItem(key) {
      markBlockedApi('storage.removeItem', String(key ?? ''));
      throw new Error('Blocked runtime API: storage.removeItem');
    },
    clear() {
      markBlockedApi('storage.clear');
      throw new Error('Blocked runtime API: storage.clear');
    },
  };

  try {
    Object.defineProperty(scope, 'localStorage', {
      configurable: true,
      get() {
        markBlockedApi('localStorage');
        return blockedStorage;
      },
    });
  } catch {
    // Best effort only.
  }

  try {
    Object.defineProperty(scope, 'sessionStorage', {
      configurable: true,
      get() {
        markBlockedApi('sessionStorage');
        return blockedStorage;
      },
    });
  } catch {
    // Best effort only.
  }

  try {
    Object.defineProperty(scope, 'indexedDB', {
      configurable: true,
      get() {
        markBlockedApi('indexedDB');
        throw new Error('Blocked runtime API: indexedDB');
      },
    });
  } catch {
    // Best effort only.
  }

  try {
    Object.defineProperty(scope, 'caches', {
      configurable: true,
      get() {
        markBlockedApi('caches');
        throw new Error('Blocked runtime API: caches');
      },
    });
  } catch {
    // Best effort only.
  }
}

function installConsoleCapture() {
  ['log', 'info', 'warn', 'error'].forEach((level) => {
    // eslint-disable-next-line no-console
    console[level] = (...args) => {
      const message = args.map((arg) => {
        if (typeof arg === 'string') return arg;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }).join(' ');
      appendRuntimeEntry(state.consoleMessages, { level, message });
      if (BLOCKED_CONSOLE_LEVELS.has(level)) {
        pushLog(`${level.toUpperCase()}: ${message}`);
      }
    };
  });
}

function executeCustomCode(rawCode = '') {
  const api = window.__vvavyCustomVisualAPI__;
  if (!api) {
    throw new Error('Custom visual API missing.');
  }
  const prelude = [
    'const api = globalThis.__vvavyCustomVisualAPI__;',
    'if (!api) throw new Error("Custom visual API missing.");',
    'const { registerVisualizer, registerFeatureVisualizer, BaseVisualizer, FeatureVisualizer, WebGLFeatureVisualizer, WebGLCaptureVideoVisualizer, VISUAL_TAGS } = api;',
  ].join('\n');
  const runner = new Function(`${prelude}\n${String(rawCode ?? '')}\n`);
  runner();
}

function detectRegisteredVisualId(beforeIds) {
  const after = listVisualizers();
  const created = after.find((entry) => !beforeIds.has(entry.id));
  return created?.id ?? null;
}

function startSampleLoop(canvas) {
  const sample = () => {
    const nextSample = {
      capturedAt: performance.now(),
      ...collectCanvasSample(canvas),
    };
    state.renderSamples.push(nextSample);
    if (state.renderSamples.length > 24) {
      state.renderSamples.splice(0, state.renderSamples.length - 24);
    }
    state.sampleTimer = window.setTimeout(sample, SAMPLE_INTERVAL_MS);
  };
  sample();
}

function stopSampleLoop() {
  if (state.sampleTimer) {
    window.clearTimeout(state.sampleTimer);
    state.sampleTimer = null;
  }
}

function startFrameProbe() {
  const tick = () => {
    state.frameCount += 1;
    state.frameProbeHandle = window.requestAnimationFrame(tick);
  };
  state.frameProbeHandle = window.requestAnimationFrame(tick);
}

function stopFrameProbe() {
  if (state.frameProbeHandle) {
    window.cancelAnimationFrame(state.frameProbeHandle);
    state.frameProbeHandle = null;
  }
}

function resetRuntimeState() {
  stopSampleLoop();
  stopFrameProbe();
  state.frameCount = 0;
  state.logs = [];
  state.pageErrorMessages = [];
  state.consoleMessages = [];
  state.blockedApis = [];
  state.networkAttempts = [];
  state.renderSamples = [];
  if (state.audioRuntime?.stop) {
    state.audioRuntime.stop().catch(() => {});
  }
  state.audioRuntime = null;
  if (state.visual?.destroy) {
    try {
      state.visual.destroy();
    } catch {
      // Best effort cleanup only.
    }
  }
  state.visual = null;
  resetCanvas();
  setTitle('Idle');
  setStatus('Waiting for the review runner to connect.');
  setMeta('This page is for local and remote review automation only.');
  pushLog('No review running.');
}

async function runReview(payload = {}) {
  resetRuntimeState();
  const startedAt = performance.now();
  const beforeIds = new Set(listVisualizers().map((entry) => entry.id));
  const canvas = resetCanvas();
  const errorListener = bus.on(EVT.ERROR, (error) => {
    const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
    appendRuntimeEntry(state.pageErrorMessages, message);
    pushLog(`ERROR: ${message}`);
  });

  try {
    setTitle(payload.name || payload.expectedId || 'Untitled visual');
    setStatus(`Running ${payload.expectedId || 'submitted visual'} in the sandbox.`);
    setMeta('Preparing audio analysis and runtime guards.');
    pushLog(`Review started for ${payload.expectedId || 'unknown visual'}.`);

    executeCustomCode(payload.code || '');
    const detectedId = detectRegisteredVisualId(beforeIds);
    const visualId = payload.expectedId || detectedId;
    if (!visualId) {
      throw new Error('No visual was registered by the submitted code.');
    }
    if (payload.expectedId && detectedId && payload.expectedId !== detectedId) {
      throw new Error(`Visual ID mismatch. Expected "${payload.expectedId}" but found "${detectedId}".`);
    }

    const { runtime: audioRuntime, summary: audioSummary } = await startReviewAudioRuntime();
    state.audioRuntime = audioRuntime;

    const visual = createVisualizer(visualId, {
      canvas,
      preview: false,
      contextAttributes: {
        preserveDrawingBuffer: true,
      },
      config: {
        autoClear: true,
      },
    });
    state.visual = visual;
    const renderCanvas = getRenderCanvas();
    const baseline = collectCanvasSample(renderCanvas);

    visual.start?.();
    startFrameProbe();
    startSampleLoop(renderCanvas);
    setMeta(`Audio source: ${audioSummary.sourceLabel}. Runtime guards are active. Network and storage APIs are blocked.`);
    await wait(WARMUP_MS);

    const latestSample = collectCanvasSample(renderCanvas);
    const samplePool = [...state.renderSamples, latestSample];
    const bestResult = pickBestRenderSample(baseline, samplePool);
    const finalSample = bestResult?.sample ?? latestSample;
    const diff = bestResult?.diff ?? computeSampleDiff(baseline, finalSample);
    const coverageRatio = finalSample.coverageRatio || 0;
    const variance = Math.max(finalSample.variance || 0, baseline.variance || 0);
    const renderDetected =
      diff.changedRatio >= 0.015 ||
      diff.meanDelta >= 8 ||
      coverageRatio >= 0.03 ||
      variance >= 42;
    const runtimeMs = Number((performance.now() - startedAt).toFixed(1));

    pushLog(
      `Render analysis complete. coverage=${coverageRatio.toFixed(3)} variance=${variance.toFixed(3)} changed=${diff.changedRatio.toFixed(4)} meanDelta=${diff.meanDelta.toFixed(3)}`
    );

    return {
      ok: renderDetected && state.pageErrorMessages.length === 0 && state.networkAttempts.length === 0,
      visualId,
      runtimeMs,
      frameCount: state.frameCount,
      audio: audioSummary,
      render: {
        detected: renderDetected,
        coverageRatio: Number(coverageRatio.toFixed(4)),
        variance: Number(variance.toFixed(3)),
        diffRatio: diff.changedRatio,
        meanDelta: diff.meanDelta,
        sampleCount: samplePool.length,
        canvasWidth: renderCanvas.width,
        canvasHeight: renderCanvas.height,
      },
      consoleMessages: state.consoleMessages.slice(),
      pageErrors: state.pageErrorMessages.slice(),
      blockedApis: state.blockedApis.slice(),
      networkAttempts: state.networkAttempts.slice(),
      artifacts: {
        snapshotDataUrl: finalSample.imageDataUrl,
        snapshotWidth: SAMPLE_SIZE,
        snapshotHeight: SAMPLE_SIZE,
      },
    };
  } finally {
    stopSampleLoop();
    stopFrameProbe();
    errorListener?.();
    if (state.audioRuntime?.stop) {
      await state.audioRuntime.stop().catch(() => {});
    }
    state.audioRuntime = null;
    if (state.visual?.destroy) {
      try {
        state.visual.destroy();
      } catch {
        // Best effort cleanup only.
      }
    }
    state.visual = null;
  }
}

window.addEventListener('error', (event) => {
  const message = event?.error instanceof Error
    ? event.error.message
    : String(event?.message ?? 'Unknown page error');
  appendRuntimeEntry(state.pageErrorMessages, message);
  pushLog(`PAGE ERROR: ${message}`);
});

installCustomVisualApi(window);
installRuntimeGuards();
installConsoleCapture();
resetCanvas();

window.__vvavyReviewHarness__ = Object.freeze({
  async run(payload) {
    const result = await runReview(payload);
    setStatus(result.ok ? 'Review completed successfully.' : 'Review completed with findings.');
    setMeta(`Runtime ${result.runtimeMs} ms, frames ${result.frameCount}, audio ${result.audio?.mode || 'unknown'}, render detected ${result.render.detected ? 'yes' : 'no'}.`);
    return result;
  },
  reset() {
    resetRuntimeState();
  },
});

setStatus('Waiting for the review runner to connect.');
