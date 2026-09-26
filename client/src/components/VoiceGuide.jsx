import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Compass,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const PAGE_GUIDES = {
  dashboard: 'You are on the StockSense Dashboard. Review current stock levels, demo milestones, and inventory KPIs.',
  receipts: 'You are on Receipts. Record inbound shipments into warehouse locations and validate drafts to update stock.',
  operations: 'You are on Operations. Perform internal transfers, customer deliveries, and physical inventory adjustments.',
  products: 'You are on the Products catalog. View registered catalog items, units of measure, and real-time stock balances.',
  moves: 'You are on Move History. Review the immutable audit log generated whenever stock operations are validated.',
  settings: 'You are on System Settings. Inspect the backend connection and confirmed API contract routes.',
  profile: 'You are on the User Profile page.',
};

// Forbidden mutation keywords that must NEVER be triggered by voice
const FORBIDDEN_KEYWORDS = [
  'create',
  'validate',
  'edit',
  'delete',
  'transfer stock',
  'deliver stock',
  'adjust stock',
  'remove',
  'update stock',
  'add stock',
];

export default function VoiceGuide({ activeNav, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [synthesisSupported, setSynthesisSupported] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isWarning, setIsWarning] = useState(false);

  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check Speech Recognition support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Listening for navigation command...');
        setIsWarning(false);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        setLastTranscript(transcript);
        processVoiceCommand(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setStatusMessage('Microphone access denied. Use button navigation.');
          setIsWarning(true);
        } else if (event.error === 'no-speech') {
          setStatusMessage('No speech detected. Try again or use buttons.');
        } else {
          setStatusMessage(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
      setStatusMessage('Speech recognition not supported in this browser. Button alternatives available.');
    }

    // Check Speech Synthesis support
    if ('speechSynthesis' in window) {
      setSynthesisSupported(true);
    }
  }, []);

  // Speak guidance text safely
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Safe command processor - strictly NAVIGATION and GUIDANCE only
  const processVoiceCommand = (command) => {
    // 1. Safety check: Reject any mutative commands immediately
    const hasForbiddenWord = FORBIDDEN_KEYWORDS.some((kw) =>
      command.includes(kw)
    );
    if (hasForbiddenWord) {
      const warningText =
        'Voice commands are restricted to navigation and guidance only. Inventory mutations are disabled via voice for safety.';
      setStatusMessage(warningText);
      setIsWarning(true);
      speakText('Action commands cannot be performed via voice. Voice is only for navigation.');
      return;
    }

    // 2. Navigation commands
    if (command.includes('dashboard')) {
      onNavigate('dashboard');
      setStatusMessage('Navigating to Dashboard');
      speakText('Opening Dashboard');
      setIsWarning(false);
    } else if (command.includes('receipt')) {
      onNavigate('receipts');
      setStatusMessage('Navigating to Receipts');
      speakText('Opening Receipts');
      setIsWarning(false);
    } else if (command.includes('transfer') || command.includes('operation')) {
      onNavigate('operations');
      setStatusMessage('Navigating to Operations');
      speakText('Opening Operations');
      setIsWarning(false);
    } else if (command.includes('product')) {
      onNavigate('products');
      setStatusMessage('Navigating to Products');
      speakText('Opening Products');
      setIsWarning(false);
    } else if (command.includes('history') || command.includes('move')) {
      onNavigate('moves');
      setStatusMessage('Navigating to Move History');
      speakText('Opening Move History');
      setIsWarning(false);
    } else if (command.includes('help') || command.includes('guide')) {
      const helpText =
        'Say Dashboard, Receipts, Operations, Products, or Move History to navigate.';
      setStatusMessage(helpText);
      speakText(helpText);
      setIsWarning(false);
    } else {
      setStatusMessage(`Unrecognized navigation command: "${command}". Try "Go to Dashboard" or "Go to Receipts".`);
      setIsWarning(true);
      speakText('Unrecognized command. You can say Dashboard, Receipts, Operations, Products, or Move History.');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  const readCurrentPageGuide = () => {
    const text = PAGE_GUIDES[activeNav] || 'Welcome to StockSense.';
    setStatusMessage(text);
    speakText(text);
  };

  return (
    <div
      role="region"
      aria-label="StockSense Voice Guide"
      className="relative z-20"
    >
      {/* Compact Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
          isOpen
            ? 'bg-teal-600 text-white'
            : isListening
            ? 'bg-rose-600 text-white animate-pulse'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        aria-expanded={isOpen}
      >
        <Compass className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Voice Guide</span>
        {isListening ? (
          <Mic className="h-3 w-3 text-white animate-bounce" />
        ) : (
          <Volume2 className="h-3 w-3 text-teal-600 dark:text-teal-400" />
        )}
        {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Expandable Voice Guide Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xl text-slate-800 dark:text-slate-100 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Compact Voice Guide
              </span>
            </div>
            <span className="rounded bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
              Read-Only Navigation
            </span>
          </div>

          {/* Spoken overview button */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={readCurrentPageGuide}
              disabled={!synthesisSupported}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 px-3 py-2 text-xs font-semibold text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition disabled:opacity-50"
              title="Speak current page guidance"
            >
              <Volume2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              Hear Page Guidance
            </button>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Stop speaking"
              >
                <VolumeX className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                Stop
              </button>
            )}
          </div>

          {/* Voice Input Section */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/80 dark:border-slate-700/60 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Speech Recognition:
              </span>
              {speechSupported ? (
                <button
                  onClick={toggleListening}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm transition ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-teal-600 text-white hover:bg-teal-700'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-3 w-3" /> Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="h-3 w-3" /> Push to Speak
                    </>
                  )}
                </button>
              ) : (
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  Not available in browser
                </span>
              )}
            </div>

            {/* Status / Transcript feedback */}
            {statusMessage && (
              <div
                role="status"
                className={`mt-2 rounded-lg p-2 text-xs font-medium flex items-start gap-1.5 ${
                  isWarning
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                    : 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60'
                }`}
              >
                {isWarning && <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                <span>{statusMessage}</span>
              </div>
            )}
            {lastTranscript && (
              <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic truncate">
                Heard: "{lastTranscript}"
              </div>
            )}
          </div>

          {/* Visible Button Alternatives (Always available & accessible) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quick Navigation Buttons:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  onNavigate('dashboard');
                  speakText('Opening Dashboard');
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition ${
                  activeNav === 'dashboard'
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                1. Dashboard
              </button>
              <button
                onClick={() => {
                  onNavigate('receipts');
                  speakText('Opening Receipts');
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition ${
                  activeNav === 'receipts'
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                2. Receipts
              </button>
              <button
                onClick={() => {
                  onNavigate('operations');
                  speakText('Opening Operations');
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition ${
                  activeNav === 'operations'
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                3. Transfers / Operations
              </button>
              <button
                onClick={() => {
                  onNavigate('products');
                  speakText('Opening Products');
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition ${
                  activeNav === 'products'
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                4. Products
              </button>
              <button
                onClick={() => {
                  onNavigate('moves');
                  speakText('Opening Move History');
                }}
                className={`col-span-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition ${
                  activeNav === 'moves'
                    ? 'bg-teal-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                5. Move History
              </button>
            </div>
          </div>

          {/* Safety Notice Footer */}
          <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-2 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <HelpCircle className="h-3 w-3 shrink-0" />
            <span>Voice navigation is read-only. Inventory operations require manual UI validation.</span>
          </div>
        </div>
      )}
    </div>
  );
}
