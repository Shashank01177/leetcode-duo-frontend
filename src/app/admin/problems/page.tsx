'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Link from 'next/link';

const DATA_STRUCTURES = [
  'Arrays & Strings', 'Linked Lists', 'Stacks & Queues', 'Trees & Graphs',
  'Dynamic Programming', 'Hashing', 'Sorting & Searching',
  'Two Pointers / Sliding Window', 'Backtracking', 'Heap / Priority Queue',
];

const EMPTY_FORM = {
  title: '', difficulty: 'Easy', dataStructure: 'Arrays & Strings',
  description: '', examples: '', constraints: '',
};

export default function ProblemsAdmin() {
  const { user } = useAuth(true);
  const [problems, setProblems] = useState<any[]>([]);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [lcSlug, setLcSlug] = useState('');
  const [lcImporting, setLcImporting] = useState(false);

  const fetchProblems = async () => {
    try {
      const res = await api.get('/admin/problems');
      setProblems(res.data.data ?? res.data ?? []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (user) fetchProblems(); }, [user]);

  const handleSeed = async () => {
    setLoading(true);
    try {
      await api.post('/admin/seed-problems');
      await fetchProblems();
      setMessage('✅ Sample problems seeded successfully!');
    } catch (e: any) {
      setMessage('❌ ' + (e.response?.data?.message || 'Seed failed'));
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Import a problem from LeetCode by slug (e.g. "two-sum")
  const handleLeetCodeImport = async () => {
    if (!lcSlug.trim()) return;
    setLcImporting(true);
    setMessage('');
    try {
      const slug = lcSlug.trim().toLowerCase().replace(/\s+/g, '-');
      const query = {
        query: `query getQuestion($titleSlug: String!) {
          question(titleSlug: $titleSlug) {
            questionId
            title
            difficulty
            content
            exampleTestcases
            jsonExampleTestcases
            topicTags { name }
            hints
            codeSnippets { lang langSlug code }
          }
        }`,
        variables: { titleSlug: slug }
      };
      const resp = await fetch('https://leetcode.com/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
        body: JSON.stringify(query),
      });
      const data = await resp.json();
      const q = data?.data?.question;
      if (!q) throw new Error('Problem not found on LeetCode');

      // Strip HTML from content
      const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();

      // Parse test cases from HTML <pre> blocks
      const parseTestCasesFromHtml = (html: string): { input: string; expected: string }[] => {
        const cases: { input: string; expected: string }[] = [];
        const preMatches = html.match(/<pre>([\s\S]*?)<\/pre>/gi) || [];
        for (const pre of preMatches) {
          const text = stripHtml(pre);
          const inputMatch = text.match(/Input:\s*(.+?)(?=Output:|$)/s);
          const outputMatch = text.match(/Output:\s*(.+?)(?=Explanation:|Constraints:|$)/s);
          if (inputMatch && outputMatch) {
            cases.push({
              input: inputMatch[1].trim(),
              expected: outputMatch[1].trim(),
            });
          }
        }
        return cases;
      };

      // Map topic tags to our data structures
      const tagMap: Record<string, string> = {
        'Array': 'Arrays & Strings', 'String': 'Arrays & Strings',
        'Linked List': 'Linked Lists', 'Stack': 'Stacks & Queues',
        'Queue': 'Stacks & Queues', 'Tree': 'Trees & Graphs',
        'Graph': 'Trees & Graphs', 'Dynamic Programming': 'Dynamic Programming',
        'Hash Table': 'Hashing', 'Sorting': 'Sorting & Searching',
        'Binary Search': 'Sorting & Searching', 'Two Pointers': 'Two Pointers / Sliding Window',
        'Sliding Window': 'Two Pointers / Sliding Window', 'Backtracking': 'Backtracking',
        'Heap (Priority Queue)': 'Heap / Priority Queue',
      };
      const matchedTag = q.topicTags?.find((t: any) => tagMap[t.name]);
      const dataStructure = matchedTag ? tagMap[matchedTag.name] : 'Arrays & Strings';

      // Parse examples from HTML
      const testCases = parseTestCasesFromHtml(q.content || '');

      // Also build display examples
      const rawInputs = (q.exampleTestcases || '').split('\n').filter(Boolean);
      const examples = testCases.length > 0
        ? testCases.map(tc => ({ input: tc.input, output: tc.expected, explanation: '' }))
        : rawInputs.length >= 2
          ? [{ input: rawInputs[0], output: rawInputs[1], explanation: '' }]
          : [{ input: 'See LeetCode', output: 'See LeetCode', explanation: '' }];

      // Get starter code snippets
      const snippets = q.codeSnippets || [];
      const getSnippet = (lang: string) => snippets.find((s: any) => s.langSlug === lang)?.code || '';

      const payload = {
        title: q.title,
        difficulty: q.difficulty,
        description: stripHtml(q.content || '').substring(0, 3000),
        examples,
        testCases,
        constraints: q.hints?.length ? q.hints.map(stripHtml) : ['See LeetCode for constraints'],
        dataStructure,
        titleSlug: slug,
        leetcodeQuestionId: q.questionId || '',
        starterCode: {
          python: getSnippet('python3') || getSnippet('python'),
          javascript: getSnippet('javascript'),
          java: getSnippet('java'),
          cpp: getSnippet('cpp'),
        },
      };

      await api.post('/admin/problems', payload);
      await fetchProblems();
      setMessage(`✅ "${q.title}" imported with ${testCases.length} test case(s)!`);
      setLcSlug('');
    } catch (e: any) {
      setMessage('❌ Import failed: ' + (e.message || 'Check the problem slug'));
    } finally {
      setLcImporting(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convert newline-separated examples/constraints to arrays
      const payload = {
        ...formData,
        examples: formData.examples.split('\n').filter(Boolean).map(line => {
          const parts = line.split('|');
          return { input: parts[0]?.trim() || '', output: parts[1]?.trim() || '', explanation: parts[2]?.trim() || '' };
        }),
        constraints: formData.constraints.split('\n').filter(Boolean),
      };
      await api.post('/admin/problems', payload);
      await fetchProblems();
      setFormData({ ...EMPTY_FORM });
      setMessage('✅ Problem added!');
    } catch (e: any) {
      setMessage('❌ ' + (e.response?.data?.message || 'Add failed'));
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this problem?')) return;
    try {
      await api.delete(`/admin/problems/${id}`);
      await fetchProblems();
    } catch (e) { console.error(e); }
  };

  if (!user) return null;

  const inputCls = 'w-full bg-background border border-border rounded p-2 text-white text-sm focus:outline-none focus:border-accent';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-56 bg-card border-r border-border p-6 flex flex-col space-y-3 shrink-0">
        <h2 className="text-lg font-bold text-white mb-2">Admin Panel</h2>
        <Link href="/admin" className="text-slate-400 hover:text-white text-sm">Dashboard</Link>
        <Link href="/admin/problems" className="text-accent font-medium text-sm">Problems</Link>
        <div className="mt-auto pt-4 border-t border-border">
          <Link href="/dashboard" className="text-xs text-slate-500 hover:text-slate-300">← Exit Admin</Link>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Manage Problems</h1>
          <button
            onClick={handleSeed}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-sm font-medium"
          >
            {loading ? 'Working...' : 'Seed 10 Sample Problems'}
          </button>
        </div>

        {/* LeetCode Import */}
        <div className="bg-card border border-yellow-500/30 rounded-lg p-5 mb-6">
          <h2 className="text-lg font-bold text-yellow-400 mb-1 flex items-center gap-2">
            <span>🟡</span> Import from LeetCode
          </h2>
          <p className="text-slate-400 text-sm mb-3">
            Enter a LeetCode problem slug (from the URL) to import it directly. Example: <code className="text-yellow-300">two-sum</code>, <code className="text-yellow-300">longest-substring-without-repeating-characters</code>
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={lcSlug}
              onChange={e => setLcSlug(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLeetCodeImport()}
              placeholder="e.g. two-sum or valid-parentheses"
              className="flex-1 bg-background border border-border rounded p-2 text-white text-sm focus:outline-none focus:border-yellow-400"
            />
            <button
              onClick={handleLeetCodeImport}
              disabled={lcImporting || !lcSlug.trim()}
              className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-black font-bold rounded text-sm"
            >
              {lcImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded text-sm border ${message.startsWith('✅') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Problem List */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-bold text-white">Problems ({problems.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-slate-400 bg-slate-800/30">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Difficulty</th>
                    <th className="px-4 py-3">Data Structure</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {problems.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No problems yet. Seed some or add manually.</td></tr>
                  ) : problems.map(p => (
                    <tr key={p._id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 text-white font-medium">{p.title}</td>
                      <td className={`px-4 py-3 text-xs font-semibold ${p.difficulty === 'Easy' ? 'text-green-400' : p.difficulty === 'Medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {p.difficulty}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.dataStructure}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(p._id)} className="text-red-400 hover:text-red-300 text-xs border border-red-500/30 px-2 py-1 rounded">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Problem Form */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 h-fit">
            <h2 className="text-lg font-bold text-white mb-4">Add Problem</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <input type="text" placeholder="Title" required value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })} className={inputCls} />

              <div className="grid grid-cols-2 gap-3">
                <select value={formData.difficulty}
                  onChange={e => setFormData({ ...formData, difficulty: e.target.value })} className={inputCls}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
                <select value={formData.dataStructure}
                  onChange={e => setFormData({ ...formData, dataStructure: e.target.value })} className={inputCls}>
                  {DATA_STRUCTURES.map(ds => <option key={ds}>{ds}</option>)}
                </select>
              </div>

              <textarea placeholder="Description" required rows={4} value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })} className={inputCls} />

              <div>
                <textarea placeholder={"Examples (one per line: input | output | explanation)"} rows={3} value={formData.examples}
                  onChange={e => setFormData({ ...formData, examples: e.target.value })} className={inputCls} />
                <p className="text-[10px] text-slate-500 mt-1">Format: <code>input | output | explanation</code></p>
              </div>

              <div>
                <textarea placeholder={"Constraints (one per line)"} rows={3} value={formData.constraints}
                  onChange={e => setFormData({ ...formData, constraints: e.target.value })} className={inputCls} />
                <p className="text-[10px] text-slate-500 mt-1">One constraint per line</p>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-accent hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded text-sm transition-colors">
                Add Problem
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
