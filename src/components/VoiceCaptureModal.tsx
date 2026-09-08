import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  X, 
  Clock, 
  Play, 
  Pause, 
  Check, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { ParseVoiceResult, Task } from '../types';
import { supabaseGetAccessToken } from '../services/supabaseAuth';

interface VoiceCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (newTask: Partial<Task>) => void;
}

export const VoiceCaptureModal: React.FC<VoiceCaptureModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [customText, setCustomText] = useState('');
  const [activeTab, setActiveTab] = useState<'MIC' | 'PRESETS' | 'TEXT'>('MIC');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParseVoiceResult | null>(null);

  // Editable fields before confirming
  const [editableTitle, setEditableTitle] = useState('');
  const [editableScheduledTime, setEditableScheduledTime] = useState('');
  const [editableDelayMinutes, setEditableDelayMinutes] = useState(60);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const samplePresets = [
    {
      lang: 'Malayalam & English',
      label: 'Pitch Deck',
      text: 'Naale ucha kazhinju 2 manikku pitch deck ready aakkanam.',
      desc: 'Tomorrow at 2:00 PM with 90m follow-up buffer',
    },
    {
      lang: 'English',
      label: 'Investor Check',
      text: 'Remind me tomorrow at 2 PM to finish the pitch deck.',
      desc: 'Tomorrow at 2:00 PM',
    },
    {
      lang: 'Hindi & English',
      label: 'Client Proposal',
      text: 'Kal subah 10 baje team ke sath client proposal review karna hai.',
      desc: 'Tomorrow at 10:00 AM with 60m buffer',
    },
    {
      lang: 'English (Quick Test)',
      label: 'Immediate Follow-Up',
      text: 'Call Sarah regarding the investor term sheet in 5 minutes.',
      desc: 'Triggers in 5 minutes to test the verification loop',
    },
  ];

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioBlob(null);
      setAudioUrl(null);
      setParsedResult(null);
      setParseError(null);
      setCustomText('');
      setRecordingSeconds(0);
    }
  }, [isOpen]);

  // Audio timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    setParseError(null);
    setParsedResult(null);
    audioChunksRef.current = [];
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        drawWaveform();
      } catch (e) {
        console.warn('Waveform visualizer not supported', e);
      }

      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close().catch(() => {});
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setParseError('Microphone access was denied or is not supported in this browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        ctx.fillStyle = '#18181b';
        ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth - 1, Math.max(2, barHeight));
        x += barWidth + 1;
      }
    };

    render();
  };

  const togglePlayAudio = () => {
    if (!audioPlayerRef.current) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleProcess = async (presetText?: string) => {
    setIsProcessing(true);
    setParseError(null);

    try {
      const now = new Date();
      const payload: any = {
        currentTimestamp: now.toISOString(),
        currentDayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      };

      if (presetText) {
        payload.textPrompt = presetText;
      } else if (activeTab === 'MIC' && audioBlob) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(audioBlob);
        const base64 = await base64Promise;

        payload.audioBase64 = base64;
        payload.mimeType = audioBlob.type || 'audio/webm';
      } else if (customText.trim()) {
        payload.textPrompt = customText.trim();
      } else {
        throw new Error('Please record audio or select a note.');
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await supabaseGetAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/parse-voice', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned ${res.status}`);
      }

      const result: ParseVoiceResult = await res.json();
      setParsedResult(result);
      setEditableTitle(result.task_title);
      
      try {
        const d = new Date(result.scheduled_time);
        const pad = (n: number) => (n < 10 ? '0' + n : n);
        const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setEditableScheduledTime(localIso);
      } catch {
        setEditableScheduledTime(result.scheduled_time);
      }
      
      setEditableDelayMinutes(result.default_checkin_delay_minutes || 60);

    } catch (err: any) {
      console.error('Parse error:', err);
      setParseError(err?.message || 'Could not process audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTask = () => {
    if (!parsedResult || !editableTitle.trim()) return;

    let finalScheduledIso = parsedResult.scheduled_time;
    try {
      finalScheduledIso = new Date(editableScheduledTime).toISOString();
    } catch {
      // fallback
    }

    const newTask: Partial<Task> = {
      title: editableTitle.trim(),
      originalAudioSummary: parsedResult.original_audio_summary,
      detectedLanguage: parsedResult.detected_language || 'Multilingual',
      transcript: customText || (activeTab === 'MIC' ? 'Voice Recording' : parsedResult.original_audio_summary),
      scheduledKickoffTime: finalScheduledIso,
      status: 'PENDING',
      checkinDelayMinutes: editableDelayMinutes,
      extensionsCount: 0,
      createdAt: new Date().toISOString(),
    };

    onTaskCreated(newTask);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="voice-capture-modal"
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-zinc-200/80 overflow-hidden flex flex-col max-h-[92vh] pb-safe sm:pb-0 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-200"
      >
        {/* Mobile drag affordance */}
        <div className="w-10 h-1 rounded-full bg-zinc-200 mx-auto mt-2.5 mb-0.5 sm:hidden shrink-0" />

        {/* Clean Header */}
        <div className="px-6 py-3.5 sm:py-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
              New Voice Note
            </h2>
            <p className="text-xs text-zinc-400">
              Captures intent, time, and follow-up window
            </p>
          </div>
          <button
            id="close-voice-modal-btn"
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Segmented Control */}
          <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('MIC')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                activeTab === 'MIC' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Microphone
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PRESETS')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                activeTab === 'PRESETS' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Examples
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TEXT')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                activeTab === 'TEXT' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              Type Note
            </button>
          </div>

          {/* TAB 1: MIC */}
          {activeTab === 'MIC' && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <canvas
                ref={canvasRef}
                width={260}
                height={36}
                className={`transition-opacity ${isRecording ? 'opacity-100' : 'opacity-0 h-0'}`}
              />

              <button
                id="record-mic-toggle-btn"
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all active:scale-95 ${
                  isRecording 
                    ? 'bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-100' 
                    : 'bg-linear-to-tr from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-600/25 ring-4 ring-indigo-50'
                }`}
              >
                {isRecording ? (
                  <Square className="w-5 h-5 fill-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </button>

              <div className="text-xs">
                {isRecording ? (
                  <span className="font-medium text-rose-600 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                    Recording ({recordingSeconds}s) • Tap to stop
                  </span>
                ) : audioBlob ? (
                  <div className="space-y-2">
                    <span className="font-medium text-emerald-600 flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Recorded ({recordingSeconds}s)
                    </span>
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        type="button"
                        onClick={togglePlayAudio}
                        className="px-2 py-1 rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 text-xs font-medium flex items-center gap-1"
                      >
                        {isPlayingAudio ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{isPlayingAudio ? 'Pause' : 'Play'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-2 py-1 rounded text-zinc-500 hover:text-zinc-800 text-xs"
                      >
                        Retake
                      </button>
                    </div>
                    <audio
                      ref={audioPlayerRef}
                      src={audioUrl || ''}
                      onEnded={() => setIsPlayingAudio(false)}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <span className="text-zinc-500">
                    Tap to speak in English, Malayalam, Hindi, etc.
                  </span>
                )}
              </div>

              {audioBlob && !isRecording && (
                <button
                  id="process-recording-btn"
                  type="button"
                  onClick={() => handleProcess()}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:to-violet-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 active:scale-[0.99] cursor-pointer"
                >
                  Analyze & Schedule Task
                </button>
              )}
            </div>
          )}

          {/* TAB 2: PRESETS */}
          {activeTab === 'PRESETS' && (
            <div className="space-y-2">
              {samplePresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCustomText(preset.text);
                    handleProcess(preset.text);
                  }}
                  className="w-full p-3 rounded-xl border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 text-left transition-all group"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-zinc-700">{preset.label}</span>
                    <span className="text-zinc-400">{preset.lang}</span>
                  </div>
                  <p className="text-xs font-medium text-zinc-900 group-hover:text-indigo-600 transition-colors">
                    "{preset.text}"
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {preset.desc}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* TAB 3: TEXT */}
          {activeTab === 'TEXT' && (
            <div className="space-y-3">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g., Naale ucha kazhinju 2 manikku pitch deck ready aakkanam."
                rows={3}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
              />
              <button
                type="button"
                onClick={() => handleProcess()}
                disabled={isProcessing || !customText.trim()}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs sm:text-sm font-medium transition-colors"
              >
                Analyze & Schedule Task
              </button>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="py-6 text-center space-y-2">
              <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-zinc-600">Extracting intent and scheduled time...</p>
            </div>
          )}

          {/* Error Message */}
          {parseError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed Result Preview & Form */}
          {parsedResult && !isProcessing && (
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-4 animate-in fade-in duration-150">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Extracted Task
                </span>
                {parsedResult.detected_language && (
                  <span className="text-[11px] text-zinc-500">
                    {parsedResult.detected_language}
                  </span>
                )}
              </div>

              {parsedResult.original_audio_summary && (
                <p className="text-xs text-zinc-500 italic">
                  "{parsedResult.original_audio_summary}"
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    className="w-full text-base sm:text-sm font-medium px-3 py-2.5 sm:py-2 bg-white rounded-lg border border-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      Kickoff Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editableScheduledTime}
                      onChange={(e) => setEditableScheduledTime(e.target.value)}
                      className="w-full text-base sm:text-xs font-mono px-3 py-2.5 sm:py-2 bg-white rounded-lg border border-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      Follow-up Buffer
                    </label>
                    <div className="flex gap-1">
                      {[30, 60, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setEditableDelayMinutes(mins)}
                          className={`flex-1 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            editableDelayMinutes === mins
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                id="confirm-queue-task-btn"
                type="button"
                onClick={handleConfirmTask}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-linear-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.99] text-white text-sm font-semibold shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
              >
                Schedule Task
              </button>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
