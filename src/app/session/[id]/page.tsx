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
  const [myCode, setMyCode] = useState('// Write your code here\\n');
  const [peerCode, setPeerCode] = useState('// Peer is typing...\\n');
  
  const [myProfile, setMyProfile] = useState<any>(null);
  const [peerProfile, setPeerProfile] = useState<any>(null);
  
  // Voice Call States
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPeerSpeaking, setIsPeerSpeaking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
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
