import React from 'react';
import { CompetitionReport as CompetitionReportType } from '../types';

interface CompetitionReportProps {
  report: CompetitionReportType;
  productNameKo: string;
}

export const CompetitionReport: React.FC<CompetitionReportProps> = ({ report, productNameKo }) => {
  return (
    <div className="space-y-5">
      {/* 요약 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
          <span>📊</span> 한국 경쟁 현황 요약
        </h4>
        <p className="text-sm text-amber-700">{report.summary}</p>
      </div>

      {/* 기회 포인트 */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
          <span>💡</span> 진입 기회 포인트
        </h4>
        <p className="text-sm text-emerald-700">{report.opportunity}</p>
      </div>

      {/* 네이버쇼핑 경쟁 */}
      {report.naverShopping.length > 0 && (
        <CompetitorSection
          platform="네이버쇼핑"
          icon="🟢"
          color="green"
          competitors={report.naverShopping}
        />
      )}

      {/* 쿠팡 경쟁 */}
      {report.coupang.length > 0 && (
        <CompetitorSection
          platform="쿠팡"
          icon="🟡"
          color="yellow"
          competitors={report.coupang}
        />
      )}

      <p className="text-xs text-gray-400 text-center">
        ⚠️ 경쟁 현황은 AI 분석 기반 추정치입니다. 실제 데이터와 다를 수 있으므로 직접 확인을 권장합니다.
      </p>
    </div>
  );
};

interface CompetitorSectionProps {
  platform: string;
  icon: string;
  color: 'green' | 'yellow';
  competitors: { name: string; priceRange: string; reviewCount: string; weakness: string }[];
}

const CompetitorSection: React.FC<CompetitorSectionProps> = ({ platform, icon, color, competitors }) => {
  const borderColor = color === 'green' ? 'border-green-200' : 'border-yellow-200';
  const bgColor = color === 'green' ? 'bg-green-50' : 'bg-yellow-50';
  const titleColor = color === 'green' ? 'text-green-800' : 'text-yellow-800';

  return (
    <div>
      <h4 className={`font-bold mb-3 flex items-center gap-2 ${titleColor}`}>
        <span>{icon}</span> {platform} 주요 경쟁 제품
      </h4>
      <div className="space-y-3">
        {competitors.map((c, i) => (
          <div key={i} className={`${bgColor} border ${borderColor} rounded-xl p-4`}>
            <div className="flex items-start justify-between mb-2">
              <span className="font-semibold text-gray-800 text-sm">{c.name}</span>
              <span className="text-xs text-gray-500 font-medium">{c.priceRange}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
              <span>⭐ {c.reviewCount}</span>
            </div>
            <div className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
              <span className="font-medium">차별화 기회: </span>{c.weakness}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
