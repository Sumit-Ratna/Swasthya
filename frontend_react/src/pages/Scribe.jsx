import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    Mic,
    MicOff,
    Sparkles,
    Copy,
    Check,
    RotateCcw,
    ArrowLeft,
    FileText,
    Stethoscope,
    AlertCircle,
    Pill
} from 'lucide-react';
import { API_URL } from '../config';

const SAMPLE_TRANSCRIPT = `Doctor: Good morning, Mr. Sharma. What brings you into the clinic today?
Patient: Good morning doctor. For the past three days, I've been having this persistent dry cough and mild fever around 100°F. My throat feels scratchy and painful when I swallow, and I feel exhausted.
Doctor: I see. Are you experiencing any chest tightness, shortness of breath, or wheezing?
Patient: No chest pain or breathing issues, just the throat irritation and coughing mostly at night.
Doctor: Let me check your vitals and examine your throat. Temperature is 99.8°F, pulse 78, oxygen saturation is 98%. Looking at your throat, there is mild pharyngeal congestion, but your chest is clear with normal vesicular breath sounds. This looks like acute viral pharyngitis.
Doctor: I'm prescribing Paracetamol 650mg for fever and body ache—take one tablet up to three times a day as needed. For the dry cough, take Levocetirizine 5mg at bedtime for 5 days, and use an Ambroxol-based cough syrup, 10ml three times daily after meals. Also, warm saline gargles twice a day.
Patient: Should I get any blood tests done?
Doctor: Let's do a routine Complete Blood Count (CBC) just to ensure there's no secondary bacterial infection.
Doctor: If your fever stays above 101°F or if you develop chest discomfort, come in immediately. Otherwise, please follow up with me in 5 days.
Patient: Thank you very much, doctor.`;

const Scribe = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(true);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const recognitionRef = useRef(null);

    useEffect(() => {
        if (user && user.role !== 'doctor') {
            navigate('/home');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const text = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        setTranscript((prev) => (prev ? `${prev.trim()} ${text.trim()}` : text.trim()));
                    } else {
                        currentTranscript += text;
                    }
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    setError('Microphone access was denied. Please allow microphone permissions in your browser.');
                }
                setIsRecording(false);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current = recognition;
        } else {
            setSpeechSupported(false);
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // Ignore on unmount
                }
            }
        };
    }, [user, navigate]);

    const toggleRecording = () => {
        if (!speechSupported) {
            setError('Speech Recognition is not supported by your current browser. You can type or paste the transcript directly.');
            return;
        }

        setError('');
        if (isRecording) {
            try {
                recognitionRef.current?.stop();
            } catch (err) {
                console.warn('Error stopping speech:', err);
            }
            setIsRecording(false);
        } else {
            try {
                recognitionRef.current?.start();
                setIsRecording(true);
            } catch (err) {
                console.error('Error starting speech:', err);
                setError('Could not start microphone recording. Please check browser permissions.');
                setIsRecording(false);
            }
        }
    };

    const handleScribe = async () => {
        if (!transcript.trim()) {
            setError('Please record or paste a consultation transcript first.');
            return;
        }

        setLoading(true);
        setError('');
        setNotes('');

        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.post(
                `${API_URL}/api/ai/scribe`,
                { transcript },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data?.notes) {
                setNotes(res.data.notes);
            } else {
                setError('No notes returned from AI Scribe.');
            }
        } catch (err) {
            console.error('Scribe error:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to generate consultation notes';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!notes) return;
        navigator.clipboard.writeText(notes);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLoadSample = () => {
        setTranscript(SAMPLE_TRANSCRIPT);
        setError('');
    };

    const handleClear = () => {
        if (isRecording && recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
            setIsRecording(false);
        }
        setTranscript('');
        setNotes('');
        setError('');
    };

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => navigate('/doctor/dashboard')}
                        style={{
                            background: 'white',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            AI Consultation Scribe <Sparkles size={22} color="var(--primary-color)" />
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Convert doctor-patient conversations into structured clinical notes in seconds
                        </p>
                    </div>
                </div>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    color: 'var(--primary-color)',
                    fontSize: '12px',
                    fontWeight: 600
                }}>
                    <Stethoscope size={14} /> Clinical AI
                </div>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        backgroundColor: '#fef2f2',
                        color: '#991b1b',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '20px',
                        border: '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px'
                    }}
                >
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </motion.div>
            )}

            {/* Input Section */}
            <div className="card" style={{ padding: '20px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} color="var(--primary-color)" />
                        <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>Consultation Audio & Transcript</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={handleLoadSample}
                            style={{
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            Load Sample
                        </button>
                        {(transcript || notes) && (
                            <button
                                type="button"
                                onClick={handleClear}
                                style={{
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <RotateCcw size={12} /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Voice Dictation Bar */}
                <div style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-color)',
                    border: isRecording ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '14px',
                    transition: 'all 0.2s'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={toggleRecording}
                            disabled={!speechSupported}
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                border: 'none',
                                background: isRecording ? '#ef4444' : (speechSupported ? 'var(--primary-color)' : '#9ca3af'),
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: speechSupported ? 'pointer' : 'not-allowed',
                                boxShadow: isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.2)' : '0 2px 6px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s'
                            }}
                            title={isRecording ? 'Stop Recording' : 'Start Speech Dictation'}
                        >
                            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: isRecording ? '#dc2626' : 'var(--text-primary)' }}>
                                {isRecording ? 'Listening live to consultation...' : (speechSupported ? 'Live Speech Dictation' : 'Speech-to-Text Not Supported')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {isRecording ? 'Click the mic button when finished' : (speechSupported ? 'Click mic to dictate, or type / paste text below' : 'Please paste or type transcript manually')}
                            </div>
                        </div>
                    </div>

                    {isRecording && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#dc2626',
                            background: '#fee2e2',
                            padding: '4px 10px',
                            borderRadius: '12px'
                        }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                            Recording
                        </span>
                    )}
                </div>

                {/* Textarea */}
                <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste or record consultation transcript here... (e.g. Doctor: How are you feeling? Patient: I've had a bad sore throat for 3 days...)"
                    rows={8}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {transcript.length} characters {transcript ? `(~${transcript.split(/\s+/).filter(Boolean).length} words)` : ''}
                    </span>

                    <button
                        type="button"
                        onClick={handleScribe}
                        disabled={loading || !transcript.trim()}
                        style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '12px 24px',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: (loading || !transcript.trim()) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !transcript.trim()) ? 0.6 : 1,
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                        }}
                    >
                        {loading ? (
                            <>
                                <span style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />
                                Generating Notes...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Generate Structured Note
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Generated Notes Output */}
            <AnimatePresence>
                {notes && (
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="card"
                        style={{ padding: '24px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Structured Consultation Note
                                </h3>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Generated by HealthNexus AI Scribe</span>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    style={{
                                        background: copied ? '#ecfdf5' : 'white',
                                        color: copied ? '#047857' : 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {copied ? <Check size={14} color="#047857" /> : <Copy size={14} />}
                                    {copied ? 'Copied!' : 'Copy Note'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/doctor/prescribe')}
                                    style={{
                                        background: 'var(--success-color)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Pill size={14} /> Prescribe Meds
                                </button>
                            </div>
                        </div>

                        {/* Note Body */}
                        <div style={{
                            backgroundColor: 'var(--bg-color)',
                            borderRadius: 'var(--radius-md)',
                            padding: '20px',
                            border: '1px solid var(--border-color)',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                            fontSize: '14px',
                            color: 'var(--text-primary)'
                        }}>
                            {notes}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Scribe;
