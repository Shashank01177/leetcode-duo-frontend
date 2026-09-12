import { Mic, MicOff, PhoneOff, Radio } from 'lucide-react';

interface Props {
  isMuted: boolean;
  onToggleMute: () => void;
  isSpeaking: boolean;
  isPeerSpeaking: boolean;
  peerName: string;
  onEndSession: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

export function VoiceCallBar({ isMuted, onToggleMute, isSpeaking, isPeerSpeaking, peerName, onEndSession, connectionStatus }: Props) {
  return (
    <div className="bg-card border-t border-border p-4 flex items-center justify-between h-16">
      <div className="flex items-center space-x-3 w-1/4">
        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-sm font-medium text-slate-300 capitalize">{connectionStatus === 'connected' ? 'LIVE' : connectionStatus}</span>
      </div>
      
      <div className="flex-1 flex justify-center items-center h-full">
        {isPeerSpeaking && (
          <div className="flex items-center space-x-2 text-accent bg-accent/10 px-4 py-1.5 rounded-full">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Speaking: {peerName}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-end space-x-4 w-1/4">
        <button 
          onClick={onToggleMute}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          <span className="text-sm font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
        </button>
        <button 
          onClick={onEndSession}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">End Session</span>
        </button>
      </div>
    </div>
  );
}
