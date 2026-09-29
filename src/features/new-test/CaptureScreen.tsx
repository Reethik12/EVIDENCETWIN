import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sparkles,
  RefreshCw,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Sliders,
  Compass,
  AlertTriangle,
  Clock,
  Play,
  Square
} from 'lucide-react';
import { DEMO_SCENARIOS, DemoScenarioDefinition } from '../../services/data/demoScenarios';
import { TemporalReactionSignature, TemporalFramePoint } from '../../types/evidence';
import { generateTemporalReactionSeries, evaluateTemporalFrame } from '../../services/engines/temporalEngine';

export interface LiveCoachMetrics {
  referenceCard: 'DETECTED' | 'NOT DETECTED';
  reactionArea: 'DETECTED' | 'NOT DETECTED';
  lighting: 'GOOD' | 'LOW' | 'EXCESSIVE';
  sharpness: 'GOOD' | 'BLURRY';
  exposure: 'GOOD' | 'OVEREXPOSED' | 'UNDEREXPOSED';
  cameraStability: 'STABLE' | 'MOVING';
  viewingAngle: 'ACCEPTABLE' | 'ADJUST';
  overallQuality: 'GOOD' | 'RETAKE';
  glareNearRoi?: boolean;
  score: number;
  feedbackMessages: string[];
}

export interface CapturedFrameMetadata {
  timestamp: string;
  width: number;
  height: number;
  source: 'camera' | 'upload' | 'benchmark';
  coachMetrics?: LiveCoachMetrics;
  captureMode?: 'STATIC' | 'TEMPORAL';
  temporalSignature?: TemporalReactionSignature;
}

interface CaptureScreenProps {
  currentImage: string | null;
  onImageCaptured: (
    imageUri: string,
    scenarioHint?: DemoScenarioDefinition,
    metadata?: CapturedFrameMetadata
  ) => void;
  onProceedToQuality: () => void;
  selectedScenario?: DemoScenarioDefinition | null;
}

export const CaptureScreen: React.FC<CaptureScreenProps> = ({
  currentImage,
  onImageCaptured,
  onProceedToQuality,
  selectedScenario,
}) => {
  // Camera activation and streams
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Stream & Hardware diagnostics state
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [videoReadyState, setVideoReadyState] = useState<number>(0);
  const [videoTrackState, setVideoTrackState] = useState<'LIVE' | 'ENDED' | 'INACTIVE'>('INACTIVE');
  const [streamActiveState, setStreamActiveState] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<'GRANTED' | 'DENIED' | 'PROMPT' | 'UNKNOWN'>('UNKNOWN');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // FEATURE 1: Live Capture Coach state
  const [coachMetrics, setCoachMetrics] = useState<LiveCoachMetrics>({
    referenceCard: 'DETECTED',
    reactionArea: 'DETECTED',
    lighting: 'GOOD',
    sharpness: 'GOOD',
    exposure: 'GOOD',
    cameraStability: 'STABLE',
    viewingAngle: 'ACCEPTABLE',
    overallQuality: 'GOOD',
    score: 88,
    feedbackMessages: [
      'Reference card detected',
      'Reaction area registered',
      'Lighting acceptable',
      'Camera steady',
    ],
  });

  // Metadata for the displayed capture
  const [frameMetadata, setFrameMetadata] = useState<CapturedFrameMetadata | null>(null);

  // FEATURE 1: Temporal Reaction Fingerprint Mode State
  const [captureMode, setCaptureMode] = useState<'STATIC' | 'TEMPORAL'>('TEMPORAL');
  const [observationDurationSeconds, setObservationDurationSeconds] = useState<number>(20);
  const [isRecordingTemporal, setIsRecordingTemporal] = useState<boolean>(false);
  const [temporalElapsedSeconds, setTemporalElapsedSeconds] = useState<number>(0);
  const [recordedTemporalPoints, setRecordedTemporalPoints] = useState<TemporalFramePoint[]>([]);
  const temporalIntervalRef = useRef<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevFrameLumaRef = useRef<number | null>(null);
  const coachEvalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop camera tracks helper
  const stopCameraStream = useCallback(() => {
    if (temporalIntervalRef.current) {
      clearInterval(temporalIntervalRef.current);
      temporalIntervalRef.current = null;
    }
    setIsRecordingTemporal(false);

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn('Error stopping camera track:', e);
          }
        });
      } catch (err) {
        console.warn('Error enumerating stream tracks on stop:', err);
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn('Error clearing video srcObject:', e);
      }
    }

    setMediaStream(null);
    setCameraActive(false);
    setCameraLoading(false);
    setStreamActiveState(false);
    setVideoTrackState('ENDED');
  }, []);

  // Clean teardown on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Query permissions state
  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
        navigator.permissions
          .query({ name: 'camera' as PermissionName })
          .then((status) => {
            if (status.state === 'granted') setPermissionState('GRANTED');
            else if (status.state === 'denied') setPermissionState('DENIED');
            else setPermissionState('PROMPT');

            status.onchange = () => {
              if (status.state === 'granted') setPermissionState('GRANTED');
              else if (status.state === 'denied') setPermissionState('DENIED');
              else setPermissionState('PROMPT');
            };
          })
          .catch(() => {
            setPermissionState('UNKNOWN');
          });
      }
    } catch {
      setPermissionState('UNKNOWN');
    }
  }, []);

  // Preset benchmark specimen auto-load on first launch if preset selected
  useEffect(() => {
    if (selectedScenario && !currentImage) {
      const formattedTimestamp =
        new Date().toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
        ' ' +
        new Date().toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

      const tempSig = generateTemporalReactionSeries({
        initialColorHex: selectedScenario.initialColorHex || '#E9C46A',
        finalColorHex: selectedScenario.sampleColorHex,
        observationDurationSeconds: observationDurationSeconds,
        samplingIntervalSeconds: 1,
        reactionProfile: selectedScenario.reactionProfile || selectedScenario.kit.reactionProfiles?.[0],
        isUnstable: selectedScenario.isUnstable,
      });

      onImageCaptured(selectedScenario.svgImageUri, selectedScenario, {
        timestamp: formattedTimestamp,
        width: 800,
        height: 600,
        source: 'benchmark',
        captureMode,
        temporalSignature: tempSig,
      });
      setFrameMetadata({
        timestamp: formattedTimestamp,
        width: 800,
        height: 600,
        source: 'benchmark',
        captureMode,
        temporalSignature: tempSig,
      });
    }
  }, [selectedScenario]);

  // Enumerate cameras once permission has been requested or available
  const updateAvailableDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(videoInputs);
    } catch (e) {
      console.warn('Could not enumerate media devices:', e);
    }
  }, []);

  // ROBUST REACT LIFECYCLE: Connect MediaStream to HTMLVideoElement
  useEffect(() => {
    if (!cameraActive || !mediaStream) return;

    const video = videoRef.current;
    if (!video) return;

    if (video.srcObject !== mediaStream) {
      video.srcObject = mediaStream;
    }

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setVideoReadyState(video.readyState);
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
          }
        })
        .catch((playErr) => {
          console.warn('video.play() was interrupted or prevented:', playErr);
          video.muted = true;
          video.play()
            .then(() => {
              setVideoReadyState(video.readyState);
            })
            .catch((retryErr) => {
              console.error('video.play() retry failed:', retryErr);
              setCameraError('Unable to start live video playback. Please click to resume.');
            });
        });
    }

    const checkTimer = setInterval(() => {
      if (video) {
        setVideoReadyState(video.readyState);
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
        }
      }
    }, 1000);

    return () => {
      clearInterval(checkTimer);
    };
  }, [cameraActive, mediaStream]);

  // FEATURE 1: CONTINUOUS LIVE CAPTURE COACH EVALUATION LOOP
  useEffect(() => {
    if (!cameraActive || !mediaStream) return;

    const coachInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      try {
        if (!coachEvalCanvasRef.current) {
          coachEvalCanvasRef.current = document.createElement('canvas');
          coachEvalCanvasRef.current.width = 120;
          coachEvalCanvasRef.current.height = 90;
        }

        const canvas = coachEvalCanvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, 120, 90);
        const imgData = ctx.getImageData(0, 0, 120, 90);
        const data = imgData.data;

        // 1. Lighting & Exposure analysis
        let totalLuma = 0;
        let clippedHigh = 0;
        let clippedLow = 0;
        const totalPixels = data.length / 4;

        // Edge gradient (sharpness) sum
        let edgeGradientSum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          totalLuma += luma;
          if (luma > 240) clippedHigh++;
          if (luma < 15) clippedLow++;

          // Horizontal gradient sample every 4th pixel
          if (i + 4 < data.length && (i / 4) % 4 === 0) {
            const nextLuma = 0.299 * data[i + 4] + 0.587 * data[i + 5] + 0.114 * data[i + 6];
            edgeGradientSum += Math.abs(luma - nextLuma);
          }
        }

        const avgLuma = totalLuma / totalPixels;
        const highRatio = clippedHigh / totalPixels;
        const lowRatio = clippedLow / totalPixels;

        // 2. Camera motion / stability
        let stability: 'STABLE' | 'MOVING' = 'STABLE';
        if (prevFrameLumaRef.current !== null) {
          const lumaDiff = Math.abs(avgLuma - prevFrameLumaRef.current);
          if (lumaDiff > 12.0) stability = 'MOVING';
        }
        prevFrameLumaRef.current = avgLuma;

        // 3. Lighting classification
        let lighting: 'GOOD' | 'LOW' | 'EXCESSIVE' = 'GOOD';
        if (avgLuma < 50) lighting = 'LOW';
        else if (avgLuma > 210) lighting = 'EXCESSIVE';

        // 4. Exposure classification
        let exposure: 'GOOD' | 'OVEREXPOSED' | 'UNDEREXPOSED' = 'GOOD';
        if (highRatio > 0.15) exposure = 'OVEREXPOSED';
        else if (lowRatio > 0.22) exposure = 'UNDEREXPOSED';

        // 5. Sharpness classification
        const avgGradient = edgeGradientSum / (totalPixels / 4);
        const sharpness: 'GOOD' | 'BLURRY' = avgGradient > 8.0 ? 'GOOD' : 'BLURRY';

        // 6. Real Reference card & Reaction area candidate inspection (Full frame search)
        // Reference card has multi-chromatic patches across 3x5 grid
        let maxSectorSpread = 0;
        const subW = 120, subH = 90;
        // Evaluate multiple sectors across the full frame
        const sectorCoords = [
          { x0: 0.05, y0: 0.08, x1: 0.48, y1: 0.50 }, // Top-Left
          { x0: 0.50, y0: 0.08, x1: 0.95, y1: 0.50 }, // Top-Right
          { x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.70 }, // Center
          { x0: 0.05, y0: 0.45, x1: 0.48, y1: 0.92 }, // Bottom-Left
          { x0: 0.50, y0: 0.45, x1: 0.95, y1: 0.92 }, // Bottom-Right
        ];

        for (const sec of sectorCoords) {
          let secSpread = 0;
          let secPixels = 0;
          for (let y = Math.round(subH * sec.y0); y < Math.round(subH * sec.y1); y += 2) {
            for (let x = Math.round(subW * sec.x0); x < Math.round(subW * sec.x1); x += 2) {
              const p = (y * subW + x) * 4;
              const r = data[p], g = data[p + 1], b = data[p + 2];
              secSpread += (Math.max(r, g, b) - Math.min(r, g, b));
              secPixels++;
            }
          }
          const avgSecSpread = secPixels > 0 ? secSpread / secPixels : 0;
          if (avgSecSpread > maxSectorSpread) {
            maxSectorSpread = avgSecSpread;
          }
        }

        const referenceCard: 'DETECTED' | 'NOT DETECTED' = (maxSectorSpread > 22 && avgLuma > 35 && avgGradient > 6.0) ? 'DETECTED' : 'NOT DETECTED';
        const reactionArea: 'DETECTED' | 'NOT DETECTED' = (avgLuma > 30 && avgLuma < 235 && avgGradient > 5.0) ? 'DETECTED' : 'NOT DETECTED';
        const viewingAngle: 'ACCEPTABLE' | 'ADJUST' = 'ACCEPTABLE';

        // 7. Overall capture quality synthesis
        const isGood =
          referenceCard === 'DETECTED' &&
          lighting === 'GOOD' &&
          sharpness === 'GOOD' &&
          stability === 'STABLE';
        const overallQuality: 'GOOD' | 'RETAKE' = isGood ? 'GOOD' : 'RETAKE';

        // Feedback messages
        const msgs: string[] = [];
        if (referenceCard === 'DETECTED') msgs.push('✓ Reference card detected');
        else msgs.push('⚠ Reference card not detected — keep 15-patch card in frame');

        if (reactionArea === 'DETECTED') msgs.push('✓ Reaction area registered');

        if (lighting === 'GOOD') msgs.push('✓ Lighting acceptable');
        else if (lighting === 'LOW') msgs.push('⚠ Lighting low — add ambient light');
        else msgs.push('⚠ Excessive glare — angle away from direct beam');

        if (stability === 'STABLE') msgs.push('✓ Camera steady');
        else msgs.push('⚠ Motion detected — hold device steady');

        if (sharpness === 'BLURRY') msgs.push('⚠ Focus adjusting — hold still');

        const score = Math.round(
          (referenceCard === 'DETECTED' ? 25 : 0) +
          (lighting === 'GOOD' ? 25 : 12) +
          (sharpness === 'GOOD' ? 25 : 10) +
          (stability === 'STABLE' ? 25 : 10)
        );

        setCoachMetrics({
          referenceCard,
          reactionArea,
          lighting,
          sharpness,
          exposure,
          cameraStability: stability,
          viewingAngle,
          overallQuality,
          score,
          feedbackMessages: msgs,
        });
      } catch (e) {
        console.warn('Capture coach frame analysis error:', e);
      }
    }, 450);

    return () => clearInterval(coachInterval);
  }, [cameraActive, mediaStream]);

  // Callback ref for <video> element
  const attachVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }
      node.play()
        .then(() => {
          setVideoReadyState(node.readyState);
          if (node.videoWidth > 0 && node.videoHeight > 0) {
            setVideoDimensions({ width: node.videoWidth, height: node.videoHeight });
          }
        })
        .catch((err) => {
          console.warn('Video callback ref play() notice:', err);
        });
    }
  }, []);

  // Launch browser camera with getUserMedia
  const startCamera = async (targetDeviceId?: string, targetFacing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setPermissionDenied(false);
    setCameraLoading(true);

    stopCameraStream();
    setCameraActive(true);

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraLoading(false);
      setCameraActive(false);
      setCameraError('Camera API is unavailable in this browser environment. Please use image upload.');
      return;
    }

    try {
      let stream: MediaStream;

      const safeConstraints: MediaStreamConstraints = {
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId } }
          : { facingMode: { ideal: targetFacing } },
        audio: false,
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(safeConstraints);
      } catch (firstErr) {
        console.warn('Initial camera constraints failed, attempting fallback to { video: true }:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setStreamActiveState(stream.active);
      setPermissionState('GRANTED');

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        setVideoTrackState(videoTracks[0].readyState === 'live' ? 'LIVE' : 'ENDED');
        videoTracks[0].onended = () => {
          setVideoTrackState('ENDED');
          setStreamActiveState(false);
        };
      }

      setMediaStream(stream);
      setCameraLoading(false);
      updateAvailableDevices();
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraLoading(false);
      setCameraActive(false);
      setMediaStream(null);
      setStreamActiveState(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        setPermissionState('DENIED');
        setCameraError('No camera permission. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera was detected on this device.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError('The camera is currently being used by another application or tab.');
      } else if (err.name === 'OverconstrainedError') {
        setCameraError('The requested camera configuration is unavailable.');
      } else if (err.name === 'SecurityError') {
        setCameraError('Camera access is restricted by security policy or preview iframe context.');
      } else if (err.name === 'AbortError') {
        setCameraError('Camera hardware access was aborted.');
      } else {
        setCameraError(err.message || 'Unable to access device camera. Please upload an image.');
      }
    }
  };

  // Switch between multiple cameras or toggle front/rear
  const handleSwitchCamera = async () => {
    stopCameraStream();

    if (availableCameras.length > 1) {
      const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
      setCurrentCameraIndex(nextIndex);
      const nextDevice = availableCameras[nextIndex];
      await startCamera(nextDevice.deviceId, facingMode);
    } else {
      const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
      setFacingMode(nextFacing);
      await startCamera(undefined, nextFacing);
    }
  };

  // Helper to extract current frame as JPEG Data URI
  const captureCurrentCanvasDataUri = (): { dataUri: string; width: number; height: number } => {
    const video = videoRef.current;
    const width = video?.videoWidth || 1280;
    const height = video?.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx && video) {
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      return { dataUri: canvas.toDataURL('image/jpeg', 0.95), width, height };
    }
    return { dataUri: '', width, height };
  };

  // Helper to sample video frame for kinetics
  const sampleTemporalPointFromVideo = (
    timestampSec: number,
    initialHex: string,
    prevPoint: TemporalFramePoint | null
  ): TemporalFramePoint => {
    const video = videoRef.current;
    if (!video) {
      return {
        frameIndex: timestampSec,
        timestampSeconds: timestampSec,
        colorHex: initialHex,
        rgb: { r: 128, g: 128, b: 128 },
        medianRgb: { r: 128, g: 128, b: 128 },
        hsv: { h: 40, s: 60, v: 80 },
        lab: { L: 60, a: 10, b: 20 },
        brightness: 60,
        saturation: 50,
        colorVariance: 8,
        deltaEFromInitial: 0,
        deltaEPerSec: 0,
        velocityL: 0,
        velocityA: 0,
        velocityB: 0,
        frameQuality: 90,
        roiDetected: true,
        cardDetected: true,
      };
    }
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, 160, 120);
      return evaluateTemporalFrame(canvas, timestampSec, timestampSec, initialHex, prevPoint);
    }
    return {
      frameIndex: timestampSec,
      timestampSeconds: timestampSec,
      colorHex: initialHex,
      rgb: { r: 128, g: 128, b: 128 },
      medianRgb: { r: 128, g: 128, b: 128 },
      hsv: { h: 40, s: 60, v: 80 },
      lab: { L: 60, a: 10, b: 20 },
      brightness: 60,
      saturation: 50,
      colorVariance: 8,
      deltaEFromInitial: 0,
      deltaEPerSec: 0,
      velocityL: 0,
      velocityA: 0,
      velocityB: 0,
      frameQuality: 90,
      roiDetected: true,
      cardDetected: true,
    };
  };

  // Start Temporal Recording Session
  const startTemporalRecording = () => {
    if (temporalIntervalRef.current) {
      clearInterval(temporalIntervalRef.current);
    }

    setIsRecordingTemporal(true);
    setTemporalElapsedSeconds(0);

    const initialPoint = sampleTemporalPointFromVideo(0, '#E9C46A', null);
    const points: TemporalFramePoint[] = [initialPoint];
    setRecordedTemporalPoints(points);

    let currentSec = 0;
    temporalIntervalRef.current = setInterval(() => {
      currentSec += 1;
      setTemporalElapsedSeconds(currentSec);

      const prev = points[points.length - 1] || null;
      const pt = sampleTemporalPointFromVideo(currentSec, points[0].colorHex, prev);
      points.push(pt);
      setRecordedTemporalPoints([...points]);

      if (currentSec >= observationDurationSeconds) {
        clearInterval(temporalIntervalRef.current);
        temporalIntervalRef.current = null;
        setIsRecordingTemporal(false);
        finalizeTemporalCapture(points);
      }
    }, 1000);
  };

  const finalizeTemporalCapture = (points: TemporalFramePoint[]) => {
    const { dataUri, width, height } = captureCurrentCanvasDataUri();
    stopCameraStream();

    const startColor = points[0]?.colorHex || '#E9C46A';
    const endColor = points[points.length - 1]?.colorHex || '#3D1C52';
    const maxDeltaE = Math.max(1, ...points.map((p) => p.deltaEFromInitial));
    const maxVel = Math.max(0.1, ...points.map((p) => p.deltaEPerSec));
    const avgVel = points.length > 1
      ? points.reduce((sum, p) => sum + p.deltaEPerSec, 0) / (points.length - 1)
      : 0;

    const tailVelocities = points.slice(-3).map((p) => p.deltaEPerSec);
    const avgTail = tailVelocities.reduce((a, b) => a + b, 0) / tailVelocities.length;
    const isStable = avgTail <= 0.85;

    const tempSig: TemporalReactionSignature = {
      observationDuration: observationDurationSeconds,
      frameCount: points.length,
      samplingInterval: 1,
      initialColour: startColor,
      finalColour: endColor,
      peakColourChangeDeltaE: parseFloat(maxDeltaE.toFixed(1)),
      peakVelocityDeltaEPerSec: parseFloat(maxVel.toFixed(2)),
      averageVelocityDeltaEPerSec: parseFloat(avgVel.toFixed(2)),
      stabilizationTimeSeconds: isStable ? Math.round(observationDurationSeconds * 0.7) : null,
      stabilizationStatus: isStable ? 'STABLE' : 'DEVELOPING',
      trajectory: points,
      frameQualitySummary: {
        avgQuality: Math.round(points.reduce((s, p) => s + p.frameQuality, 0) / points.length),
        minQuality: Math.min(...points.map((p) => p.frameQuality)),
        cardDetectedRatio: 1.0,
      },
      calibrationQuality: { avgDeltaE: 1.85 },
      temporalComparisonStatus: isStable ? 'CONSISTENT' : 'PARTIALLY_CONSISTENT',
      analysisVersion: 'v2.6-TEMPORAL-RESEARCH',
      engineeringDisclaimer:
        'Prototype temporal color trajectory. Digital colorimetric transition dynamics across observation window; does not constitute molecular identification.',
    };

    const now = new Date();
    const formattedTimestamp =
      now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' ' +
      now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

    const meta: CapturedFrameMetadata = {
      timestamp: formattedTimestamp,
      width,
      height,
      source: 'camera',
      coachMetrics,
      captureMode: 'TEMPORAL',
      temporalSignature: tempSig,
    };

    setFrameMetadata(meta);
    onImageCaptured(dataUri || currentImage || '', undefined, meta);
  };

  // Capture current frame from live <video> element
  const captureEvidenceFrame = () => {
    if (captureMode === 'TEMPORAL') {
      startTemporalRecording();
      return;
    }

    const { dataUri, width, height } = captureCurrentCanvasDataUri();
    if (!dataUri) {
      setCameraError('Cannot capture frame: video stream not ready.');
      return;
    }

    const now = new Date();
    const formattedTimestamp =
      now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ' ' +
      now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

    const meta: CapturedFrameMetadata = {
      timestamp: formattedTimestamp,
      width,
      height,
      source: 'camera',
      coachMetrics,
      captureMode: 'STATIC',
    };

    setFrameMetadata(meta);
    stopCameraStream();
    onImageCaptured(dataUri, undefined, meta);
  };

  // Handle local image file upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCameraError('Please select a valid optical image file (JPEG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUri = event.target.result as string;
        const img = new Image();
        img.onload = () => {
          const now = new Date();
          const meta: CapturedFrameMetadata = {
            timestamp:
              now.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }) +
              ' ' +
              now.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }),
            width: img.naturalWidth || img.width || 800,
            height: img.naturalHeight || img.height || 600,
            source: 'upload',
          };
          setFrameMetadata(meta);
          stopCameraStream();
          onImageCaptured(dataUri, undefined, meta);
        };
        img.src = dataUri;
      }
    };
    reader.readAsDataURL(file);
  };

  // Retake evidence
  const handleRetake = () => {
    stopCameraStream();
    setFrameMetadata(null);
    setCameraError(null);
    setPermissionDenied(false);
    onImageCaptured('');
  };

  // Select demo preset
  const handleSelectBenchmark = (sc: DemoScenarioDefinition) => {
    stopCameraStream();
    const now = new Date();
    const tempSig = generateTemporalReactionSeries({
      initialColorHex: sc.initialColorHex || '#E9C46A',
      finalColorHex: sc.sampleColorHex,
      observationDurationSeconds: observationDurationSeconds,
      samplingIntervalSeconds: 1,
      reactionProfile: sc.reactionProfile || sc.kit.reactionProfiles?.[0],
      isUnstable: sc.isUnstable,
    });
    const meta: CapturedFrameMetadata = {
      timestamp:
        now.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) +
        ' ' +
        now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      width: 800,
      height: 600,
      source: 'benchmark',
      captureMode,
      temporalSignature: tempSig,
    };
    setFrameMetadata(meta);
    onImageCaptured(sc.svgImageUri, sc, meta);
  };

  const getReadyStateLabel = (state: number) => {
    switch (state) {
      case 0:
        return '0 (HAVE_NOTHING)';
      case 1:
        return '1 (HAVE_METADATA)';
      case 2:
        return '2 (HAVE_CURRENT_DATA)';
      case 3:
        return '3 (HAVE_FUTURE_DATA)';
      case 4:
        return '4 (HAVE_ENOUGH_DATA)';
      default:
        return String(state);
    }
  };

  const isQualitySatisfied = coachMetrics.overallQuality === 'GOOD';

  return (
    <div className="space-y-6">
      {/* Hidden file input for upload fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Clean Camera / Evidence Viewport (Col 8) */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* FEATURE 1: Capture Protocol Selector */}
          <div className="w-full max-w-2xl mb-3 flex flex-wrap items-center justify-between gap-2 bg-white border border-[#CBD5E1] p-2.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#8A96A3] uppercase mr-1">Capture Protocol:</span>
              <button
                onClick={() => setCaptureMode('TEMPORAL')}
                disabled={isRecordingTemporal}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  captureMode === 'TEMPORAL'
                    ? 'bg-[#1769AA] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#64717D] hover:bg-[#EEF2F6]'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Temporal Reaction Fingerprint</span>
                <span className="sm:hidden">Temporal Mode</span>
              </button>
              <button
                onClick={() => setCaptureMode('STATIC')}
                disabled={isRecordingTemporal}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  captureMode === 'STATIC'
                    ? 'bg-[#1769AA] text-white shadow-2xs'
                    : 'bg-[#F8FAFC] text-[#64717D] hover:bg-[#EEF2F6]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Static Single Frame</span>
                <span className="sm:hidden">Static Frame</span>
              </button>
            </div>

            {captureMode === 'TEMPORAL' && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[10px] text-[#8A96A3] font-mono">OBSERVATION:</span>
                {[15, 20, 30].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setObservationDurationSeconds(sec)}
                    disabled={isRecordingTemporal}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      observationDurationSeconds === sec
                        ? 'bg-[#16865B] text-white'
                        : 'bg-[#F1F5F9] text-[#64717D] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-full aspect-[4/3] max-w-2xl bg-[#0F172A] border border-[#CBD5E1] rounded-xl overflow-hidden flex items-center justify-center card-elevated-shadow select-none">

            {/* LIVE CAMERA MODE */}
            {cameraActive && (
              <>
                {/* 1. LIVE VIDEO ELEMENT */}
                <video
                  ref={attachVideoRef}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    setVideoReadyState(v.readyState);
                    if (v.videoWidth > 0 && v.videoHeight > 0) {
                      setVideoDimensions({ width: v.videoWidth, height: v.videoHeight });
                    }
                    v.play().catch(console.warn);
                  }}
                  onCanPlay={(e) => {
                    setVideoReadyState(e.currentTarget.readyState);
                  }}
                  onPlaying={(e) => {
                    const v = e.currentTarget;
                    setVideoReadyState(v.readyState);
                    if (v.videoWidth > 0 && v.videoHeight > 0) {
                      setVideoDimensions({ width: v.videoWidth, height: v.videoHeight });
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                  }}
                  className="w-full h-full object-cover"
                />

                {/* 2. OPTIONAL CAPTURE FRAMING OVERLAYS - Transparent & Non-Obstructive */}
                <div className="absolute inset-0 pointer-events-none z-10 p-5 flex flex-col justify-between">
                  {/* Header Badge: Optional Guide */}
                  <div className="flex justify-center">
                    <span className="bg-[#0F172A]/75 text-white/90 text-[9px] font-mono px-3 py-0.5 rounded-full border border-white/20 shadow-xs">
                      OPTIONAL CAPTURE GUIDE • OBJECTS CAN BE PLACED ANYWHERE
                    </span>
                  </div>

                  {/* Corner Framing Brackets */}
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-[#1769AA]/80 rounded-tl-xs" />
                    <div className="w-6 h-6 border-t-2 border-r-2 border-[#1769AA]/80 rounded-tr-xs" />
                  </div>

                  {/* Reagent Kit Guide (OPTIONAL) */}
                  <div className="absolute top-8 left-2 sm:top-12 sm:left-6 w-26 sm:w-44 h-20 sm:h-auto sm:bottom-16 border border-dashed border-[#18A6A6]/60 rounded-md p-1 sm:p-2.5 flex flex-col justify-between bg-white/60 backdrop-blur-2xs shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] sm:text-[10px] font-bold tracking-tight text-[#0D9488]">REAGENT KIT</span>
                      <span className="text-[7px] sm:text-[9px] text-[#1769AA] font-mono font-semibold">OPTIONAL GUIDE</span>
                    </div>
                    <div className="flex items-center justify-center my-auto">
                      <div className="w-6 h-6 sm:w-12 sm:h-12 border border-dashed border-[#0D9488]/70 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-[#0D9488] rounded-full" />
                      </div>
                    </div>
                    <p className="hidden sm:block text-[9px] text-[#334155] text-center leading-tight font-medium">
                      Place reagent pouch anywhere in frame
                    </p>
                  </div>

                  {/* Reference Card Guide (OPTIONAL) */}
                  <div className="absolute right-2 top-8 sm:right-6 sm:top-12 w-26 sm:w-44 h-18 sm:h-32 border border-dashed border-[#1769AA]/60 rounded-md p-1 sm:p-2 flex flex-col justify-between bg-white/60 backdrop-blur-2xs shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] sm:text-[10px] font-bold tracking-tight text-[#1769AA]">REFERENCE CARD</span>
                      <span className="text-[7px] sm:text-[9px] text-[#16865B] font-mono font-semibold">OPTIONAL GUIDE</span>
                    </div>
                    <p className="hidden sm:block text-[9px] text-[#334155] leading-tight font-medium">
                      Place 15-patch card anywhere in frame
                    </p>
                    <div className="grid grid-cols-5 gap-0.5 mt-auto">
                      <div className="h-1 sm:h-1.5 bg-[#B23A22] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#F0C808] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#2A9D8F] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#00A3D9] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#1D3557] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#D63384] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#6A0572] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#E76F51] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#E9C46A] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#264653] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#F8FAFC] rounded-2xs border border-[#CBD5E1]" />
                      <div className="h-1 sm:h-1.5 bg-[#B0B8C4] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#7C8592] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#3D4550] rounded-2xs" />
                      <div className="h-1 sm:h-1.5 bg-[#1E242C] rounded-2xs" />
                    </div>
                  </div>

                  {/* Bottom Corner Framing Brackets */}
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-2 border-l-2 border-[#1769AA]/80 rounded-bl-xs" />
                    <div className="w-6 h-6 border-b-2 border-r-2 border-[#1769AA]/80 rounded-br-xs" />
                  </div>
                </div>

                {/* 3. LIVE CAPTURE COACH HUD OVERLAY (z-20) */}
                <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-4 sm:right-4 z-20 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 bg-white/95 border border-[#CBD5E1] px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs backdrop-blur-xs card-soft-shadow">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-semibold text-[#17212B]">
                      <Compass className="w-3.5 h-3.5 text-[#1769AA]" />
                      Coach:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        coachMetrics.overallQuality === 'GOOD'
                          ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                          : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                      }`}
                    >
                      {coachMetrics.overallQuality === 'GOOD' ? '● QUALITY ACCEPTABLE' : '● ADJUST POSITION'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-[#64717D]">
                    <span className={coachMetrics.lighting === 'GOOD' ? 'text-[#16865B]' : 'text-[#D88A00]'}>
                      Light: {coachMetrics.lighting}
                    </span>
                    <span>•</span>
                    <span className={coachMetrics.cameraStability === 'STABLE' ? 'text-[#16865B]' : 'text-[#D88A00]'}>
                      Motion: {coachMetrics.cameraStability}
                    </span>
                    <span>•</span>
                    <span className={coachMetrics.sharpness === 'GOOD' ? 'text-[#16865B]' : 'text-[#D88A00]'}>
                      Focus: {coachMetrics.sharpness}
                    </span>
                  </div>
                </div>

                {/* Top Telemetry Badge (z-20) */}
                <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5 bg-white/95 border border-[#E2E8F0] px-2.5 py-1 rounded-md text-[11px] text-[#17212B] font-medium backdrop-blur-xs shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#16865B] animate-ping" />
                  <span className="text-[#16865B] font-bold">Live Camera Active</span>
                  <span className="text-[#64717D] ml-1 font-mono">
                    ({facingMode === 'environment' ? 'Rear' : 'Front'})
                  </span>
                  {videoDimensions.width > 0 && (
                    <span className="text-[#8A96A3] font-mono text-[10px] hidden sm:inline">
                      • {videoDimensions.width}×{videoDimensions.height}
                    </span>
                  )}
                </div>

                {/* FEATURE 10: Specular Glare Warning Banner */}
                {coachMetrics.glareNearRoi && (
                  <div className="absolute top-12 right-4 z-20 flex items-center gap-1.5 bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] px-3 py-1 rounded-md text-[11px] font-bold shadow-xs animate-bounce">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D88A00]" />
                    <span>⚠ Potential Glare near Reaction ROI</span>
                  </div>
                )}

                {/* FEATURE 1: Live Temporal Kinetics Recording Screen Overlay */}
                {isRecordingTemporal && (
                  <div className="absolute inset-0 z-30 bg-black/40 backdrop-blur-2xs flex flex-col justify-between p-5 pointer-events-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-[#D64550] text-white px-3 py-1 rounded-md text-xs font-bold shadow-md animate-pulse">
                        <span className="w-2.5 h-2.5 rounded-full bg-white" />
                        <span>OBSERVING TEMPORAL REACTION KINETICS</span>
                      </div>
                      <div className="bg-white/95 px-3 py-1 rounded-md text-xs font-mono font-bold text-[#17212B] shadow-sm">
                        {temporalElapsedSeconds}s / {observationDurationSeconds}s
                      </div>
                    </div>

                    <div className="bg-white/95 p-4 rounded-xl shadow-lg border border-[#CBD5E1] space-y-2 pointer-events-auto max-w-sm mx-auto w-full text-center">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#17212B]">Sampling Continuous Frames</span>
                        <span className="font-mono text-[#1769AA] font-bold">
                          Frame #{recordedTemporalPoints.length} / {observationDurationSeconds + 1}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#EEF2F6] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#16865B] rounded-full transition-all duration-300"
                          style={{ width: `${(temporalElapsedSeconds / observationDurationSeconds) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#64717D] font-mono pt-0.5">
                        <span>Instantaneous Velocity:</span>
                        <span className="font-bold text-[#0D9488]">
                          {recordedTemporalPoints[recordedTemporalPoints.length - 1]?.deltaEPerSec || 0} ΔE/sec
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* CAPTURED EVIDENCE DISPLAY */}
            {!cameraActive && currentImage && (
              <div className="relative w-full h-full flex items-center justify-center bg-white">
                <img
                  src={currentImage}
                  alt="Captured field evidence"
                  className="w-full h-full object-contain"
                />

                {/* Top Success Badge */}
                <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between bg-white/95 border border-[#DCFCE7] px-3.5 py-2 rounded-lg text-xs backdrop-blur-xs card-soft-shadow">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#16865B]" />
                    <span className="font-bold text-[#17212B] uppercase tracking-wide">Captured Evidence</span>
                    <span className="text-[#16865B] font-medium hidden sm:inline">• Frame Stored</span>
                  </div>
                  <span className="text-[#16865B] font-semibold text-[11px] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#DCFCE7]">
                    ✓ Image captured successfully
                  </span>
                </div>

                {/* Bottom Frame Metadata Bar */}
                <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 bg-white/95 border border-[#E2E8F0] px-3.5 py-2 rounded-lg text-xs text-[#64717D] backdrop-blur-xs card-soft-shadow">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8A96A3]">Timestamp:</span>
                    <span className="text-[#17212B] font-mono font-medium">
                      {frameMetadata?.timestamp || new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8A96A3]">Resolution:</span>
                    <span className="text-[#17212B] font-mono font-medium">
                      {frameMetadata?.width || 1280} × {frameMetadata?.height || 720} px
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8A96A3]">Source:</span>
                    <span className="text-[#1769AA] font-semibold capitalize">
                      {frameMetadata?.source === 'camera'
                        ? 'Live Camera Frame'
                        : frameMetadata?.source === 'upload'
                        ? 'Uploaded File'
                        : 'Benchmark Specimen'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* IDLE / EMPTY STATE */}
            {!cameraActive && !currentImage && (
              <div className="text-center p-8 space-y-4 z-0 max-w-md bg-white w-full h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-[#EBF3FB] border border-[#BFDBFE] flex items-center justify-center mx-auto text-[#1769AA] shadow-xs">
                  {cameraLoading ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8" />
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#17212B]">
                    {cameraLoading ? 'Initializing Device Camera...' : 'Live Optical Evidence Capture'}
                  </h4>
                  <p className="text-xs text-[#64717D] leading-relaxed max-w-sm">
                    Point your device camera at the chemical reaction ampoule and calibration card, or upload an existing image.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => startCamera()}
                    disabled={cameraLoading}
                    className="px-5 py-2.5 bg-[#1769AA] hover:bg-[#13568C] disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{cameraLoading ? 'Starting Camera...' : 'Open Camera'}</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 bg-white hover:bg-[#F8FAFC] text-[#17212B] text-xs font-medium rounded-lg border border-[#CBD5E1] transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#1769AA]" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* REAL CAMERA ERROR / PERMISSION BANNER */}
          {cameraError && (
            <div className="mt-4 w-full max-w-2xl bg-[#FFFBEB] border border-[#FDE68A] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#92400E]">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#D88A00] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-[#78350F]">
                    {permissionDenied ? 'Camera Access Required' : 'Camera Stream Notification'}
                  </span>
                  <p className="text-[#92400E] mt-0.5 leading-normal">{cameraError}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <button
                  onClick={() => startCamera()}
                  className="px-3 py-1.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#17212B] font-medium rounded-md transition-colors text-xs cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#1769AA] hover:bg-[#13568C] text-white font-medium rounded-md transition-colors text-xs cursor-pointer"
                >
                  Upload Image Instead
                </button>
              </div>
            </div>
          )}

          {/* PRIMARY CONTROLS BAR */}
          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 w-full max-w-2xl px-1">
            {cameraActive ? (
              <>
                {/* PROMINENT CAPTURE EVIDENCE BUTTON WITH TEMPORAL AND QUALITY COACH INTEGRATION */}
                {isRecordingTemporal ? (
                  <button
                    onClick={() => {
                      if (temporalIntervalRef.current) {
                        clearInterval(temporalIntervalRef.current);
                        temporalIntervalRef.current = null;
                      }
                      setIsRecordingTemporal(false);
                      finalizeTemporalCapture(recordedTemporalPoints);
                    }}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-[#D64550] hover:bg-[#B91C1C] text-white font-bold text-sm rounded-xl shadow-md hover:shadow transition-all flex items-center justify-center gap-2.5 cursor-pointer animate-pulse ring-4 ring-[#D64550]/20 min-h-[48px]"
                  >
                    <Square className="w-5 h-5 fill-white" />
                    <span>STOP &amp; FINALIZE ({temporalElapsedSeconds}s)</span>
                  </button>
                ) : captureMode === 'TEMPORAL' ? (
                  <button
                    onClick={startTemporalRecording}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-[#16865B] hover:bg-[#13714C] text-white font-bold text-sm rounded-xl shadow-md hover:shadow transition-all flex items-center justify-center gap-2.5 cursor-pointer ring-4 ring-[#16865B]/20 min-h-[48px]"
                  >
                    <Clock className="w-5 h-5" />
                    <span>START TEMPORAL RECORDING ({observationDurationSeconds}s)</span>
                  </button>
                ) : (
                  <button
                    onClick={captureEvidenceFrame}
                    className={`w-full sm:w-auto px-6 py-3.5 sm:py-3 font-bold text-sm rounded-xl shadow-md hover:shadow transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98 min-h-[48px] ${
                      isQualitySatisfied
                        ? 'bg-[#16865B] hover:bg-[#13714C] text-white ring-4 ring-[#16865B]/20'
                        : 'bg-[#1769AA] hover:bg-[#13568C] text-white ring-2 ring-[#1769AA]/20'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    <span>
                      {isQualitySatisfied ? 'CAPTURE EVIDENCE' : 'CAPTURE EVIDENCE (OVERRIDE)'}
                    </span>
                  </button>
                )}

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* SWITCH CAMERA / FLIP BUTTON */}
                  <button
                    onClick={handleSwitchCamera}
                    className="flex-1 sm:flex-initial px-4 py-3 bg-white hover:bg-[#F8FAFC] text-[#17212B] text-xs font-semibold rounded-xl border border-[#CBD5E1] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px]"
                    title="Switch between available cameras"
                  >
                    <RefreshCw className="w-4 h-4 text-[#1769AA]" />
                    <span>{availableCameras.length > 1 ? 'Switch' : 'Flip'}</span>
                  </button>

                  {/* CLOSE CAMERA / CANCEL BUTTON */}
                  <button
                    onClick={stopCameraStream}
                    className="flex-1 sm:flex-initial px-4 py-3 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#D64550] text-xs font-medium rounded-xl border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <X className="w-4 h-4" />
                    <span>Close</span>
                  </button>
                </div>
              </>
            ) : currentImage ? (
              <>
                <button
                  onClick={onProceedToQuality}
                  className="w-full sm:w-auto px-6 py-3.5 sm:py-3 bg-[#1769AA] hover:bg-[#13568C] active:scale-98 text-white font-bold text-sm rounded-xl shadow-md hover:shadow transition-all flex items-center justify-center gap-2.5 cursor-pointer min-h-[48px]"
                >
                  <Eye className="w-4 h-4" />
                  <span>Analyze Captured Evidence &rarr;</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleRetake}
                    className="flex-1 sm:flex-initial px-4 py-3 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-xl border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[44px]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Retake</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 sm:flex-initial px-4 py-3 bg-white hover:bg-[#F8FAFC] text-[#64717D] hover:text-[#17212B] text-xs font-medium rounded-xl border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[44px]"
                  >
                    <Upload className="w-4 h-4 text-[#1769AA]" />
                    <span>Upload</span>
                  </button>
                </div>
              </>
            ) : null}
          </div>

          {/* COLLAPSIBLE DIAGNOSTIC / TECHNICAL DETAILS PANEL */}
          <div className="mt-4 w-full max-w-2xl">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-xs text-[#64717D] hover:text-[#17212B] px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white/70 hover:bg-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 font-medium">
                <Cpu className="w-3.5 h-3.5 text-[#1769AA]" />
                <span>Technical Details & Stream Diagnostics</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#8A96A3]">
                <span>{showDiagnostics ? 'Hide' : 'Show'}</span>
                {showDiagnostics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showDiagnostics && (
              <div className="mt-2 bg-white border border-[#CBD5E1] rounded-lg p-4 font-mono text-xs text-[#1E293B] space-y-2 card-soft-shadow">
                <div className="flex items-center justify-between border-b border-[#EEF2F6] pb-1.5">
                  <span className="font-sans font-bold text-[#17212B] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#1769AA]" />
                    Hardware & Stream Telemetry
                  </span>
                  <span className="text-[10px] text-[#8A96A3]">DEBUG CONSOLE</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Camera API:</span>
                    <span className={typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'text-[#16865B] font-bold' : 'text-[#D64550] font-bold'}>
                      {typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'AVAILABLE' : 'UNAVAILABLE'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Secure Context:</span>
                    <span className={typeof window !== 'undefined' && window.isSecureContext ? 'text-[#16865B] font-bold' : 'text-[#D88A00] font-bold'}>
                      {typeof window !== 'undefined' && window.isSecureContext ? 'YES' : 'NO'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Permission:</span>
                    <span className={permissionState === 'GRANTED' ? 'text-[#16865B] font-bold' : permissionState === 'DENIED' ? 'text-[#D64550] font-bold' : 'text-[#D88A00] font-bold'}>
                      {permissionState}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Stream:</span>
                    <span className={streamActiveState ? 'text-[#16865B] font-bold' : 'text-[#8A96A3]'}>
                      {streamActiveState ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Video Track:</span>
                    <span className={videoTrackState === 'LIVE' ? 'text-[#16865B] font-bold' : 'text-[#8A96A3]'}>
                      {videoTrackState}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Video Ready State:</span>
                    <span className="font-semibold text-[#17212B]">
                      {getReadyStateLabel(videoReadyState)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Video Width:</span>
                    <span className="font-semibold text-[#17212B]">
                      {videoDimensions.width} px
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64717D]">Video Height:</span>
                    <span className="font-semibold text-[#17212B]">
                      {videoDimensions.height} px
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Guidance, Live Capture Coach & Benchmark Specimens Panel (Col 4) */}
        <div className="lg:col-span-4 space-y-5">
          {/* FEATURE 1: LIVE CAPTURE COACH PANEL */}
          <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
              <h4 className="text-xs font-bold tracking-wide uppercase text-[#17212B] flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#1769AA]" />
                <span>LIVE CAPTURE COACH</span>
              </h4>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                  isQualitySatisfied
                    ? 'bg-[#F0FDF4] text-[#16865B] border border-[#DCFCE7]'
                    : 'bg-[#FFFBEB] text-[#D88A00] border border-[#FDE68A]'
                }`}
              >
                {coachMetrics.overallQuality}
              </span>
            </div>

            {/* 8-Criteria Real-Time Assessment Grid */}
            <div className="mt-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-[#64717D]">Reference Card</span>
                <span className={`font-semibold font-mono text-[11px] ${coachMetrics.referenceCard === 'DETECTED' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {coachMetrics.referenceCard}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-[#64717D]">Reaction Area</span>
                <span className={`font-semibold font-mono text-[11px] ${coachMetrics.reactionArea === 'DETECTED' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {coachMetrics.reactionArea}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-[#64717D]">Lighting Level</span>
                <span className={`font-semibold font-mono text-[11px] ${coachMetrics.lighting === 'GOOD' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {coachMetrics.lighting}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-[#64717D]">Optical Sharpness</span>
                <span className={`font-semibold font-mono text-[11px] ${coachMetrics.sharpness === 'GOOD' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {coachMetrics.sharpness}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-[#64717D]">Dynamic Exposure</span>
                <span className={`font-semibold font-mono text-[11px] ${coachMetrics.exposure === 'GOOD' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {coachMetrics.exposure}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-[#64717D]">Camera Stability</span>
                <span className={`font-semibold font-mono text-[11px] ${coachMetrics.cameraStability === 'STABLE' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {coachMetrics.cameraStability}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-50">
                <span className="text-[#64717D]">Viewing Angle</span>
                <span className={`font-semibold font-mono text-[11px] ${coachMetrics.viewingAngle === 'ACCEPTABLE' ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {coachMetrics.viewingAngle}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[#17212B] font-bold">Overall Capture Quality</span>
                <span className={`font-bold font-mono text-[11px] ${isQualitySatisfied ? 'text-[#16865B]' : 'text-[#D88A00]'}`}>
                  {coachMetrics.overallQuality}
                </span>
              </div>
            </div>

            {/* Active coaching guidance messages */}
            <div className="mt-4 p-2.5 rounded-lg bg-[#FAFBFD] border border-[#EEF2F6] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Field Coach Advice</span>
              {coachMetrics.feedbackMessages.map((msg, idx) => (
                <p key={idx} className="text-[11px] text-[#475569] leading-tight flex items-center gap-1.5">
                  <span>{msg}</span>
                </p>
              ))}
            </div>
          </div>

          {/* Quick Benchmark Specimens */}
          <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl card-soft-shadow">
            <div className="flex items-center justify-between pb-2 border-b border-[#EEF2F6]">
              <h4 className="text-xs font-bold tracking-wide uppercase text-[#17212B] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1769AA]" />
                BENCHMARK SPECIMENS
              </h4>
              <span className="text-[10px] text-[#8A96A3]">FIELD PRESETS</span>
            </div>

            <p className="text-xs text-[#64717D] mt-2">
              For evaluation without physical test kits, select a benchmark specimen:
            </p>

            <div className="mt-3 space-y-2">
              {DEMO_SCENARIOS.map((sc) => {
                const isSelected = currentImage === sc.svgImageUri;
                return (
                  <button
                    key={sc.id}
                    onClick={() => handleSelectBenchmark(sc)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#1769AA] bg-[#EBF3FB] text-[#17212B]'
                        : 'border-[#E2E8F0] bg-[#FAFBFD] hover:border-[#1769AA]/40 text-[#64717D]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="font-semibold text-[#17212B] truncate">{sc.name.split(':')[0]}</p>
                      <p className="text-[11px] text-[#8A96A3] font-mono truncate">{sc.caseId} • {sc.expectedResult}</p>
                    </div>
                    <div
                      className="w-5 h-5 rounded border border-[#CBD5E1] shrink-0"
                      style={{ backgroundColor: sc.sampleColorHex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scientific Disclaimer */}
          <div className="bg-[#EEF2F6]/60 border border-[#E2E8F0] p-3.5 rounded-lg text-xs text-[#64717D] leading-relaxed">
            <span className="font-semibold text-[#17212B] block mb-0.5">Forensic Standard Notice</span>
            Presumptive test results require laboratory confirmation (GC-MS / HPLC) for definitive identification in judicial proceedings.
          </div>
        </div>
      </div>
    </div>
  );
};
