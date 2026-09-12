export interface User {
  id: string;
  name: string;
  phone: string;
  leetcodeId: string;
  role: 'user' | 'admin';
}

export interface LeetCodeProfile {
  username: string;
  realName: string;
  ranking: number;
  userAvatar: string;
  countryName: string;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalSolved: number;
}

export interface Session {
  _id: string;
  userA: User & { leetcodeId: string };
  userB: User & { leetcodeId: string };
  problem?: Problem;
  codeA: string;
  codeB: string;
  status: 'active' | 'ended';
  startedAt: string;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  _id?: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  dataStructure: string;
  description: string;
  examples: ProblemExample[] | string;
  constraints: string[] | string;
}
