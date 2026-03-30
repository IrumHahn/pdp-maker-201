import React from 'react';
import { AgentState, AgentStatus } from '../types';

interface AgentProgressProps {
  agentState: AgentState;
  mode: string;
  interest?: string;
}

const AGENT_INFO: { key: keyof AgentState; label: string; emoji: string; desc: string }[] = [
  { key: 'search', label: '상품 발굴', emoji: '🔍', desc: '글로벌 트렌드 기반 소싱 후보 발굴 중' },
  { key: 'trend', label: '트렌드 분석', emoji: '📈', desc: '시장 트렌드 시그널 분석 중' },
  { key: 'evaluation', label: '경쟁력 평가', emoji: '⚡', desc: '한국 마켓 적합도 & 경쟁 현황 분석 중' },
  { key: 'sourcing', label: '소싱처 탐색', emoji: '🏭', desc: 'Alibaba 등 해외 소싱처 검색 중' },
];

const StatusIcon: React.FC<{ status: AgentStatus }> = ({ status }) => {
  if (status === 'done') {
    return (
      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
        <svg className="animate-spin w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
      <div className="w-3 h-3 rounded-full bg-gray-300" />
    </div>
  );
};

export const AgentProgress: React.FC<AgentProgressProps> = ({ agentState, mode, interest }) => {
  const doneCount = Object.values(agentState).filter(s => s === 'done').length;
  const progress = (doneCount / 4) * 100;

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="text-5xl mb-4">🔮</div>
        <h2 className="text-2xl font-bold text-indigo-900 mb-2">소싱 마법사가 분석 중입니다</h2>
        <p className="text-gray-500 text-sm">
          {mode === 'targeted' && interest
            ? `"${interest}" 분야의 유망 소싱 상품을 탐색 중입니다`
            : '전세계 글로벌 인기 소싱 상품을 탐색 중입니다'}
        </p>
      </div>

      {/* 전체 진행률 바 */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>분석 진행률</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 에이전트 목록 */}
      <div className="space-y-3 text-left">
        {AGENT_INFO.map(({ key, label, emoji, desc }) => {
          const status = agentState[key];
          return (
            <div
              key={key}
              className={`
                flex items-center gap-4 p-4 rounded-xl transition-all
                ${status === 'running' ? 'bg-violet-50 border border-violet-200' : ''}
                ${status === 'done' ? 'bg-green-50 border border-green-100' : ''}
                ${status === 'error' ? 'bg-red-50 border border-red-100' : ''}
                ${status === 'idle' ? 'bg-gray-50 border border-gray-100' : ''}
              `}
            >
              <StatusIcon status={status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{emoji}</span>
                  <span className={`font-semibold text-sm ${
                    status === 'running' ? 'text-violet-700' :
                    status === 'done' ? 'text-green-700' :
                    status === 'error' ? 'text-red-700' : 'text-gray-400'
                  }`}>
                    {label}
                  </span>
                  {status === 'running' && (
                    <span className="text-xs text-violet-500 animate-pulse">실행 중...</span>
                  )}
                  {status === 'done' && (
                    <span className="text-xs text-green-500">완료</span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${
                  status === 'idle' ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-6">AI 분석에 약 30-60초 소요됩니다</p>
    </div>
  );
};
