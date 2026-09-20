'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import { ProblemPanel } from '@/components/ProblemPanel';
import { CodeEditor } from '@/components/CodeEditor';
import { ProfileCard } from '@/components/ProfileCard';
import { VoiceCallBar } from '@/components/VoiceCallBar';
import dynamic from 'next/dynamic';

export default function SessionPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [problem, setProblem] = useState<any>(null);
  const [myRole, setMyRole] = useState<'A' | 'B'>('A');
  const [myCode, setMyCode] = useState('// Write your code here\n');
  const [peerCode, setPeerCode] = useState('// Peer is typing...\n');
  
  const [myProfile, setMyProfile] = useState<any>(null);
  const [peerProfile, setPeerProfile] = useState<any>(null);
  
  // Voice Call States
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPeerSpeaking, setIsPeerSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Run Code States
  const [language, setLanguage] = useState('python');
  const [runResults, setRunResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Submit to LeetCode states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [showVerdict, setShowVerdict] = useState(false);

  const peerRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      loadSession();
    }
  }, [user]);

  const loadSession = async () => {
    try {
      const res = await api.get(`/session/${params.id}`);
      const s = res.data.data ?? res.data;
      setSession(s);
      
      // userA and userB are populated objects from the backend
      // Compare string versions since MongoDB _id can be ObjectId
      const userAId = (s.userA?._id ?? '').toString();
      const currentUserId = (user?.id ?? user?._id ?? '').toString();
      const isUserA = userAId === currentUserId;
      const role: 'A' | 'B' = isUserA ? 'A' : 'B';
      setMyRole(role);
      setMyCode(isUserA ? (s.codeA || '') : (s.codeB || ''));
      setPeerCode(isUserA ? (s.codeB || '') : (s.codeA || ''));

      // Use the real populated problem from the session
      if (s.problem) {
        setProblem(s.problem);
      }
      
      setupSocketAndWebRTC(role);
    } catch (e) {
      console.error(e);
      router.push('/dashboard');
    }
  };

  const setupSocketAndWebRTC = async (role: 'A' | 'B') => {
    const socket = getSocket();
    socket.connect();
    socket.emit('authenticate', { token: localStorage.getItem('token') });
    socket.emit('join-session', { sessionId: params.id });

    // Code Sync
    socket.on('code-updated', ({ code, userRole }) => {
      if (userRole !== role) {
        setPeerCode(code);
      }
    });

    socket.on('session-ended', () => {
      endLocalSession();
      router.push('/dashboard');
    });

    socket.on('peer-speaking', ({ isSpeaking: peerSpk }) => {
      setIsPeerSpeaking(peerSpk);
    });

    // WebRTC Setup
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setupAudioAnalysis(stream, socket);
      
      const SimplePeer = (await import('simple-peer')).default;
      
      setTimeout(() => {
        const peer = new SimplePeer({
          initiator: role === 'A',
          stream: stream,
          trickle: true
        });

        peerRef.current = peer;

        peer.on('signal', data => {
          if (data.type === 'offer') {
            socket.emit('webrtc-offer', { sessionId: params.id, offer: data });
          } else if (data.type === 'answer') {
            socket.emit('webrtc-answer', { sessionId: params.id, answer: data });
          } else {
            socket.emit('webrtc-ice-candidate', { sessionId: params.id, candidate: data });
          }
        });

        peer.on('connect', () => setConnectionStatus('connected'));
        peer.on('close', () => setConnectionStatus('disconnected'));
        peer.on('error', err => console.error('peer error', err));

        peer.on('stream', remoteStream => {
          if (audioRef.current) {
            audioRef.current.srcObject = remoteStream;
            audioRef.current.play().catch(console.error);
          }
        });

        socket.on('webrtc-offer', ({ offer }) => {
          if (role === 'B') peer.signal(offer);
        });
        
        socket.on('webrtc-answer', ({ answer }) => {
          if (role === 'A') peer.signal(answer);
        });
        
        socket.on('webrtc-ice-candidate', ({ candidate }) => {
          peer.signal(candidate);
        });

      }, 1000);

    } catch (err) {
      console.error("Mic access denied or error:", err);
      setConnectionStatus('disconnected');
    }
  };

  const setupAudioAnalysis = (stream: MediaStream, socket: any) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let lastSpeaking = false;

    const checkVolume = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const avg = sum / dataArray.length;
      const speaking = avg > 20;

      if (speaking !== lastSpeaking) {
        lastSpeaking = speaking;
        setIsSpeaking(speaking);
        socket.emit('speaking-state', { sessionId: params.id, isSpeaking: speaking });
      }

      requestAnimationFrame(checkVolume);
    };
    checkVolume();
  };

  const endLocalSession = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (peerRef.current) {
      peerRef.current.destroy();
    }
    disconnectSocket();
  };

  const handleEndSession = async () => {
    try {
      await api.post(`/session/${params.id}/end`);
      endLocalSession();
      router.push('/dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  const handleCodeChange = (newCode: string) => {
    setMyCode(newCode);
    
    const socket = getSocket();
    socket.emit('code-change', { sessionId: params.id, code: newCode, userRole: myRole });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.patch(`/session/${params.id}/code`, { code: newCode, userRole: myRole }).catch(console.error);
    }, 500);
  };

  const handleCopyCode = () => {
    handleCodeChange(peerCode);
  };

  const handleRunCode = async () => {
    if (!problem?._id || !myCode.trim()) return;
    setIsRunning(true);
    setShowResults(true);
    setRunResults(null);
    try {
      const res = await api.post(`/session/${params.id}/run-code`, {
        code: myCode,
        language,
        problemId: problem._id,
      });
      setRunResults(res.data.data);
    } catch (e: any) {
      setRunResults({ error: e.response?.data?.message || 'Execution failed' });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitToLeetCode = async () => {
    if (!problem?._id || !myCode.trim()) return;
    setIsSubmitting(true);
    setShowVerdict(true);
    setSubmitResult(null);
    try {
      const res = await api.post('/submit', {
        code: myCode,
        language,
        problemId: problem._id,
        sessionId: params.id,
      });
      setSubmitResult(res.data.data);
    } catch (e: any) {
      setSubmitResult({ error: e.response?.data?.message || 'Submission failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  useEffect(() => {
    return () => {
      endLocalSession();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!user || !session) return <div className="min-h-screen bg-background text-white flex items-center justify-center">Loading session...</div>;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <audio ref={audioRef} className="hidden" />
      
      <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
        <div className="font-bold text-white flex items-center space-x-4">
          <span className="text-accent">LeetCode Duo</span>
          <span className="text-slate-600">|</span>
          <span>{problem?.title || 'Loading Problem...'}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-1/3 xl:w-1/4 h-[40vh] lg:h-full shrink-0">
          <ProblemPanel problem={problem} />
        </div>

        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden p-4 gap-4 bg-[#0a0f18]">
          {/* LEFT: MY panel — comes first */}
          <div className="flex-1 flex flex-col min-w-0 space-y-4">
            <ProfileCard
              username={user?.leetcodeId}
              realName={user?.name}
              isSpeaking={isSpeaking}
            />
            <div className="flex-1 min-h-0">
              <CodeEditor value={myCode} onChange={handleCodeChange} />
            </div>
          </div>

          {/* RIGHT: Partner's panel — comes second */}
          <div className="flex-1 flex flex-col min-w-0 space-y-4">
            <ProfileCard
              username={myRole === 'A' ? session?.userB?.leetcodeId : session?.userA?.leetcodeId}
              realName={myRole === 'A' ? session?.userB?.name : session?.userA?.name}
              isSpeaking={isPeerSpeaking}
            />
            <div className="flex-1 min-h-0">
              <CodeEditor value={peerCode} readOnly onCopy={handleCopyCode} />
            </div>
          </div>
        </div>

      </div>

      {/* Run Code + Submit Toolbar */}
      <div className="shrink-0 bg-card border-t border-border px-4 py-2 flex items-center gap-3 flex-wrap">
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="bg-background border border-border text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-accent"
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
        </select>

        <button
          onClick={handleRunCode}
          disabled={isRunning || !problem?._id}
          className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded"
        >
          {isRunning ? <><span className="animate-spin inline-block">⟳</span> Running...</> : <>▶ Run Code</>}
        </button>

        <button
          onClick={handleSubmitToLeetCode}
          disabled={isSubmitting || !problem?._id}
          className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black text-sm font-bold rounded"
        >
          {isSubmitting ? <><span className="animate-spin inline-block">⟳</span> Submitting...</> : <>🚀 Submit to LeetCode</>}
        </button>

        {runResults?.summary && (
          <span className={`text-sm font-bold ${runResults.summary.allPassed ? 'text-green-400' : 'text-red-400'}`}>
            {runResults.summary.allPassed ? '✅' : '❌'} {runResults.summary.passed}/{runResults.summary.total} Passed
          </span>
        )}

        {submitResult?.status && (
          <span className={`text-sm font-bold ${submitResult.accepted ? 'text-green-400' : 'text-red-400'}`}>
            {submitResult.accepted ? '✅' : '❌'} {submitResult.status}
            {submitResult.runtimeDisplay && <span className="text-slate-300 font-normal ml-2">· {submitResult.runtimeDisplay}</span>}
            {submitResult.runtimePercentile && <span className="text-blue-400 font-normal ml-1">(beats {submitResult.runtimePercentile}%)</span>}
          </span>
        )}
      </div>

      {/* Test Results Panel */}
      {showResults && runResults && (
        <div className="shrink-0 max-h-48 overflow-y-auto bg-[#0d1117] border-t border-border px-4 py-3">
          {runResults.error ? (
            <p className="text-red-400 text-sm font-mono">{runResults.error}</p>
          ) : (
            <div className="space-y-2">
              {runResults.results?.map((r: any) => (
                <div key={r.testCase} className={`rounded p-2 text-xs font-mono border ${r.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <div className={`font-bold mb-1 ${r.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {r.passed ? '✅ PASS' : '❌ FAIL'} — Test Case {r.testCase}
                  </div>
                  <div className="text-slate-400">Input: <span className="text-slate-200">{r.input}</span></div>
                  <div className="text-slate-400">Expected: <span className="text-green-300">{r.expected}</span></div>
                  {!r.passed && <div className="text-slate-400">Got: <span className="text-red-300">{r.actual || '(no output)'}</span></div>}
                  {r.stderr && <div className="text-red-400 mt-1">Error: {r.stderr.substring(0, 200)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LeetCode Verdict Panel */}
      {showVerdict && submitResult && (
        <div className={`shrink-0 px-4 py-3 border-t text-sm font-mono ${submitResult.accepted ? 'bg-green-500/10 border-green-500/30' : submitResult.error ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
          {isSubmitting && <p className="text-yellow-400">⏳ Submitting to LeetCode... (may take 5-15 seconds)</p>}
          {!isSubmitting && submitResult.error && <p className="text-red-400">❌ {submitResult.error}</p>}
          {!isSubmitting && submitResult.status && (
            <div className="flex flex-wrap gap-4 items-center">
              <span className={`text-lg font-bold ${submitResult.accepted ? 'text-green-400' : 'text-red-400'}`}>
                {submitResult.accepted ? '✅ Accepted' : `❌ ${submitResult.status}`}
              </span>
              {submitResult.totalCorrect != null && (
                <span className="text-slate-300">{submitResult.totalCorrect}/{submitResult.totalTestcases} test cases</span>
              )}
              {submitResult.runtimeDisplay && (
                <span className="text-blue-300">⚡ {submitResult.runtimeDisplay} {submitResult.runtimePercentile && `· beats ${submitResult.runtimePercentile}%`}</span>
              )}
              {submitResult.memoryDisplay && (
                <span className="text-purple-300">🗃️ {submitResult.memoryDisplay} {submitResult.memoryPercentile && `· beats ${submitResult.memoryPercentile}%`}</span>
              )}
              {submitResult.lastTestcase && !submitResult.accepted && (
                <span className="text-orange-300 text-xs">Failed on: {submitResult.lastTestcase}</span>
              )}
              {submitResult.error && !submitResult.accepted && (
                <span className="text-red-300 text-xs">{submitResult.error?.substring(0, 150)}</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="shrink-0">
        <VoiceCallBar 
          isMuted={isMuted} 
          onToggleMute={toggleMute} 
          isSpeaking={isSpeaking} 
          isPeerSpeaking={isPeerSpeaking} 
          peerName="Partner"
          onEndSession={handleEndSession}
          connectionStatus={connectionStatus}
        />
      </div>
    </div>
  );
}
