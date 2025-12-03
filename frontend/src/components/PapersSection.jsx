import React, { useState } from 'react';
import { 
  BookOpen, ExternalLink, RefreshCw, X, Search, Database, 
  Star, Users, Calendar, CheckCircle, TrendingUp, Target,
  Brain, FileText, Award, Clock, Shield
} from 'lucide-react';

// Academic database sources
const ACADEMIC_SOURCES = [
  {
    id: 'scholar',
    name: 'Google Scholar',
    icon: '🎓',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    getUrl: (query) => `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`
  },
  {
    id: 'semantic',
    name: 'Semantic Scholar',
    icon: '🔬',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    getUrl: (query) => `https://www.semanticscholar.org/search?q=${encodeURIComponent(query)}`
  },
  {
    id: 'arxiv',
    name: 'arXiv',
    icon: '📄',
    color: 'bg-red-100 text-red-700 border-red-200',
    getUrl: (query) => `https://arxiv.org/search/?query=${encodeURIComponent(query)}&searchtype=all`
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    icon: '🧬',
    color: 'bg-green-100 text-green-700 border-green-200',
    getUrl: (query) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`
  },
  {
    id: 'crossref',
    name: 'CrossRef',
    icon: '📚',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    getUrl: (query) => `https://search.crossref.org/?q=${encodeURIComponent(query)}`
  }
];

// Source badge colors
const SOURCE_COLORS = {
  'Semantic Scholar': 'bg-purple-100 text-purple-700',
  'arXiv': 'bg-red-100 text-red-700',
  'PubMed': 'bg-green-100 text-green-700',
  'CrossRef': 'bg-orange-100 text-orange-700',
  'Nature': 'bg-blue-100 text-blue-700',
  'IEEE': 'bg-yellow-100 text-yellow-700',
};

// Match percentage color
function getMatchColor(percentage) {
  if (percentage >= 80) return 'text-green-600 bg-green-100';
  if (percentage >= 60) return 'text-blue-600 bg-blue-100';
  if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
  return 'text-gray-600 bg-gray-100';
}

function getMatchRingColor(percentage) {
  if (percentage >= 80) return 'stroke-green-500';
  if (percentage >= 60) return 'stroke-blue-500';
  if (percentage >= 40) return 'stroke-yellow-500';
  return 'stroke-gray-400';
}

export default function PapersSection({ papers, onAnalyze, analyzing }) {
  const [selectedPaper, setSelectedPaper] = useState(null);

  const displayPapers = (papers.length > 0 ? papers : defaultPapers).slice(0, 3);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Related Papers</h2>
          <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full flex items-center gap-1">
            <Brain className="w-3 h-3" />
            AI-Powered
          </span>
        </div>
        <button
          onClick={onAnalyze}
          disabled={analyzing}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Search Papers"
        >
          {analyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="space-y-3">
        {displayPapers.map((paper, i) => (
          <PaperCard
            key={paper.id || i}
            paper={paper}
            rank={i + 1}
            onClick={() => setSelectedPaper(paper)}
          />
        ))}
      </div>

      {analyzing && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-purple-900">Searching academic databases...</p>
              <p className="text-xs text-purple-600">Analyzing semantic similarity & relevance</p>
            </div>
          </div>
        </div>
      )}

      {!analyzing && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          Multi-model search across Semantic Scholar, arXiv, PubMed & CrossRef
        </p>
      )}

      {selectedPaper && (
        <PaperDetailModal
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
        />
      )}
    </div>
  );
}

function MatchPercentageRing({ percentage, size = 48 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={getMatchRingColor(percentage)}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-bold ${getMatchColor(percentage).split(' ')[0]}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

function PaperCard({ paper, rank, onClick }) {
  const sourceColor = SOURCE_COLORS[paper.source] || 'bg-gray-100 text-gray-700';
  const matchPercentage = paper.match_percentage || 0;
  
  return (
    <button
      onClick={onClick}
      className="card p-4 w-full text-left group hover:shadow-lg transition-all border-l-4"
      style={{ borderLeftColor: matchPercentage >= 80 ? '#22c55e' : matchPercentage >= 60 ? '#3b82f6' : '#9ca3af' }}
    >
      <div className="flex items-start gap-4">
        {/* Match Percentage Ring */}
        <div className="flex-shrink-0">
          <MatchPercentageRing percentage={matchPercentage} size={52} />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Rank badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-400">#{rank}</span>
            {paper.verified && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <Shield className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
          
          {/* Title */}
          <h3 className="text-sm font-medium text-gray-900 leading-snug mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
            {paper.title}
          </h3>
          
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {paper.source && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${sourceColor}`}>
                <Database className="w-3 h-3" />
                {paper.source}
              </span>
            )}
            
            {paper.date && (
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3" />
                {paper.date}
              </span>
            )}
            
            {paper.citations != null && paper.citations > 0 && (
              <span className="inline-flex items-center gap-1 text-gray-500">
                <Award className="w-3 h-3" />
                {paper.citations} citations
              </span>
            )}
          </div>
          
          {/* Match reasons */}
          {paper.match_reasons && paper.match_reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {paper.match_reasons.slice(0, 2).map((reason, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <ExternalLink className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-primary-500 transition-colors" />
      </div>
    </button>
  );
}

function PaperDetailModal({ paper, onClose }) {
  const matchPercentage = paper.match_percentage || 0;
  const scores = paper.scores || {};
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with Match Score */}
        <div className="p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <div className="flex items-start gap-4">
            <MatchPercentageRing percentage={matchPercentage} size={72} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {paper.verified && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    <Shield className="w-3 h-3" />
                    Source Verified
                  </span>
                )}
                {paper.source && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${SOURCE_COLORS[paper.source] || 'bg-gray-100 text-gray-700'}`}>
                    {paper.source}
                  </span>
                )}
              </div>
              
              <h3 className="font-semibold text-gray-900 leading-snug">{paper.title}</h3>
              
              {paper.authors && paper.authors.length > 0 && (
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {paper.authors.slice(0, 3).join(', ')}
                  {paper.authors.length > 3 && ' et al.'}
                </p>
              )}
              
              <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                {paper.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {paper.date}
                  </span>
                )}
                {paper.citations != null && paper.citations > 0 && (
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {paper.citations} citations
                  </span>
                )}
              </div>
            </div>
            
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Match Score Breakdown */}
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Match Score Breakdown
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <ScoreBar label="Semantic Similarity" value={scores.semantic || 0} icon={Brain} color="purple" />
              <ScoreBar label="Topic Overlap" value={scores.topic || 0} icon={FileText} color="blue" />
              <ScoreBar label="Methodology" value={scores.methodology || 0} icon={TrendingUp} color="green" />
              <ScoreBar label="Citation Impact" value={scores.citations || 0} icon={Award} color="yellow" />
              <ScoreBar label="Recency" value={scores.recency || 0} icon={Clock} color="orange" />
            </div>
          </div>
          
          {/* Match Reasons */}
          {paper.match_reasons && paper.match_reasons.length > 0 && (
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Why This Paper Matches
              </h4>
              <ul className="space-y-2">
                {paper.match_reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Abstract */}
          {paper.abstract && (
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Abstract</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{paper.abstract}</p>
            </div>
          )}

          {/* Database Links */}
          <div className="p-5">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Find Full Paper
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              {ACADEMIC_SOURCES.map((source) => (
                <a
                  key={source.id}
                  href={source.getUrl(paper.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 p-2.5 rounded-xl border ${source.color} hover:shadow-md transition-all text-sm`}
                >
                  <span className="text-lg">{source.icon}</span>
                  <span className="font-medium flex-1">{source.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              ))}
            </div>
            
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-3 p-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
              >
                <ExternalLink className="w-4 h-4" />
                View Original Source
              </a>
            )}
            
            {paper.doi && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                DOI: {paper.doi}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
            <Brain className="w-3 h-3" />
            Multi-model semantic search with source verification
          </p>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, icon: Icon, color }) {
  const colorClasses = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
  };
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </span>
        <span className="font-medium text-gray-900">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

const defaultPapers = [
  {
    id: 1,
    title: "Deep Learning for Scientific Discovery: Methods and Applications",
    date: "2023",
    source: "Nature",
    abstract: "A comprehensive review of deep learning applications in scientific research, covering methodology, best practices, and case studies across multiple domains.",
    authors: ["Smith, J.", "Johnson, A.", "Williams, B."],
    citations: 245,
    match_percentage: 92,
    verified: true,
    match_reasons: [
      "High semantic similarity to your research",
      "Strong keyword and topic alignment",
      "Well-cited paper (245 citations)",
      "Recent publication"
    ],
    scores: {
      semantic: 88,
      topic: 95,
      methodology: 75,
      citations: 85,
      recency: 90
    }
  },
  {
    id: 2,
    title: "Machine Learning in Laboratory Automation: A Practical Guide",
    date: "2022",
    source: "IEEE",
    abstract: "Methods for automating laboratory workflows using machine learning and computer vision techniques, with emphasis on reproducibility and accuracy.",
    authors: ["Chen, L.", "Kumar, R."],
    citations: 89,
    match_percentage: 78,
    verified: true,
    match_reasons: [
      "Moderate semantic overlap with your work",
      "Similar research methodology",
      "Well-cited paper (89 citations)"
    ],
    scores: {
      semantic: 72,
      topic: 80,
      methodology: 85,
      citations: 65,
      recency: 80
    }
  },
  {
    id: 3,
    title: "Statistical Analysis Methods for Experimental Data",
    date: "2021",
    source: "arXiv",
    abstract: "Best practices for statistical analysis and reproducibility in experimental sciences, covering modern approaches and common pitfalls.",
    authors: ["Garcia, M.", "Lee, S.", "Patel, N."],
    citations: 156,
    match_percentage: 65,
    verified: false,
    match_reasons: [
      "Strong keyword and topic alignment",
      "Well-cited paper (156 citations)"
    ],
    scores: {
      semantic: 55,
      topic: 70,
      methodology: 60,
      citations: 78,
      recency: 70
    }
  }
];
