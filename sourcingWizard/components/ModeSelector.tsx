import React from 'react';
import { AppMode } from '../types';

interface ModeSelectorProps {
  selected: AppMode;
  onChange: (mode: AppMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ selected, onChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ModeCard
        mode="discovery"
        selected={selected === 'discovery'}
        onClick={() => onChange('discovery')}
        emoji="🌍"
        title="뭘 팔지 모르겠어요"
        subtitle="지금 전세계에서 잘 팔리는 상품을 찾아드려요"
        tags={['글로벌 인기 상품', '숨겨진 히든 제품', 'AI 자동 발굴']}
      />
      <ModeCard
        mode="targeted"
        selected={selected === 'targeted'}
        onClick={() => onChange('targeted')}
        emoji="🎯"
        title="관심 분야가 있어요"
        subtitle="특정 분야에서 판매 가능성 높은 상품을 찾아드려요"
        tags={['분야 특화 검색', '틈새 시장 발굴', '경쟁력 분석']}
      />
    </div>
  );
};

interface ModeCardProps {
  mode: AppMode;
  selected: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  subtitle: string;
  tags: string[];
}

const ModeCard: React.FC<ModeCardProps> = ({ selected, onClick, emoji, title, subtitle, tags }) => {
  return (
    <button
      onClick={onClick}
      className={`
        text-left p-6 rounded-2xl border-2 transition-all cursor-pointer
        ${selected
          ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-100'
          : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'
        }
      `}
    >
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className={`text-lg font-bold mb-1 ${selected ? 'text-violet-700' : 'text-gray-800'}`}>
        {title}
      </h3>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span
            key={tag}
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              selected ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
      {selected && (
        <div className="mt-4 flex items-center gap-1 text-violet-600 text-sm font-medium">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          선택됨
        </div>
      )}
    </button>
  );
};
