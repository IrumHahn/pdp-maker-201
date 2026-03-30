import React from 'react';
import { SourcingCandidate } from '../types';
import { Button } from './Button';

interface ProductCardProps {
  candidate: SourcingCandidate;
  rank: number;
  onClick: () => void;
}

const TREND_BADGE = {
  RISING: { label: '↑ 상승 중', color: 'bg-emerald-100 text-emerald-700' },
  PEAK: { label: '🔥 피크', color: 'bg-orange-100 text-orange-700' },
  STABLE: { label: '→ 안정적', color: 'bg-blue-100 text-blue-700' },
  DECLINING: { label: '↓ 하락', color: 'bg-gray-100 text-gray-500' },
};

const COMPETITION_BADGE = {
  LOW: { label: '경쟁 낮음', color: 'bg-green-100 text-green-700' },
  MEDIUM: { label: '경쟁 보통', color: 'bg-yellow-100 text-yellow-700' },
  HIGH: { label: '경쟁 치열', color: 'bg-red-100 text-red-700' },
};

const ScoreBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-700">{value}</span>
    </div>
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export const ProductCard: React.FC<ProductCardProps> = ({ candidate, rank, onClick }) => {
  const { productNameKo, productName, category, targetPrice, sourcingPrice, marginRate, scores, trendSignal, competitionLevel, koreanSellingAngle } = candidate;

  const trend = TREND_BADGE[trendSignal];
  const competition = COMPETITION_BADGE[competitionLevel];

  const totalColor =
    scores.total >= 75 ? 'text-emerald-600' :
    scores.total >= 55 ? 'text-violet-600' : 'text-gray-500';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* 상단 헤더 */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm flex-shrink-0">
              {rank}
            </div>
            <span className="text-xs text-gray-400 font-medium">{category}</span>
          </div>
          {/* 총점 */}
          <div className="text-right">
            <div className={`text-2xl font-bold ${totalColor}`}>{scores.total}</div>
            <div className="text-xs text-gray-400">종합점수</div>
          </div>
        </div>

        <h3 className="text-lg font-bold text-indigo-900 mb-0.5">{productNameKo}</h3>
        <p className="text-xs text-gray-400 mb-3">{productName}</p>

        {/* 배지 */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${trend.color}`}>
            {trend.label}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${competition.color}`}>
            {competition.label}
          </span>
        </div>

        {/* 판매 전략 */}
        <p className="text-sm text-gray-600 italic border-l-2 border-violet-200 pl-3">
          "{koreanSellingAngle}"
        </p>
      </div>

      {/* 가격 정보 */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <div className="font-semibold text-gray-800">{targetPrice}</div>
            <div className="text-xs text-gray-400">판매가</div>
          </div>
          <div>
            <div className="font-semibold text-gray-800">{sourcingPrice}</div>
            <div className="text-xs text-gray-400">소싱가</div>
          </div>
          <div>
            <div className="font-semibold text-emerald-600">{marginRate}%</div>
            <div className="text-xs text-gray-400">예상 마진</div>
          </div>
        </div>
      </div>

      {/* 점수 바 */}
      <div className="px-5 py-4 space-y-2">
        <ScoreBar label="한국 마켓 적합도" value={scores.koreaFit} color="bg-violet-400" />
        <ScoreBar label="경쟁력" value={scores.competition} color="bg-emerald-400" />
        <ScoreBar label="수익성" value={scores.profitability} color="bg-amber-400" />
        <ScoreBar label="소싱 용이성" value={scores.sourcingEase} color="bg-blue-400" />
      </div>

      {/* 하단 버튼 */}
      <div className="px-5 pb-5">
        <Button variant="primary" size="sm" className="w-full" onClick={onClick}>
          상세 분석 보기 →
        </Button>
      </div>
    </div>
  );
};
