import { LeetCodeProfile } from '@/lib/types';

interface Props extends Partial<LeetCodeProfile> {
  isSpeaking?: boolean;
}

export function ProfileCard({ username, realName, ranking, userAvatar, countryName, easySolved, mediumSolved, hardSolved, totalSolved, isSpeaking }: Props) {
  return (
    <div className="bg-card border border-border p-4 rounded-lg flex flex-col">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`relative rounded-full p-1 transition-colors ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-transparent'}`}>
          <img src={userAvatar || 'https://via.placeholder.com/150'} alt="avatar" className="w-12 h-12 rounded-full border-2 border-card z-10 relative" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="font-bold text-white truncate">{realName || username || 'Unknown'}</div>
          <div className="text-xs text-slate-400 truncate">@{username} {countryName && `• ${countryName}`}</div>
        </div>
        {ranking && <div className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">Rank: {ranking}</div>}
      </div>
      
      <div className="flex justify-between items-center text-xs px-2">
        <div className="text-center"><div className="text-green-500 font-bold">{easySolved || 0}</div><div>Easy</div></div>
        <div className="text-center"><div className="text-yellow-500 font-bold">{mediumSolved || 0}</div><div>Med</div></div>
        <div className="text-center"><div className="text-red-500 font-bold">{hardSolved || 0}</div><div>Hard</div></div>
      </div>
    </div>
  );
}
