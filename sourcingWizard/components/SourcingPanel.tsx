import React from 'react';
import { SourcingLink } from '../types';
import { Button } from './Button';

interface SourcingPanelProps {
  sourcingLinks: SourcingLink[];
  onContact: (supplier: SourcingLink) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  Alibaba: 'bg-orange-100 text-orange-700',
  AliExpress: 'bg-red-100 text-red-700',
  DHgate: 'bg-blue-100 text-blue-700',
  'Made-in-China': 'bg-green-100 text-green-700',
};

const getPlatformColor = (platform: string) =>
  PLATFORM_COLORS[platform] || 'bg-gray-100 text-gray-700';

export const SourcingPanel: React.FC<SourcingPanelProps> = ({ sourcingLinks, onContact }) => {
  if (sourcingLinks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-2xl mb-2">🏭</p>
        <p className="text-sm">소싱처 정보가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sourcingLinks.map((link, i) => (
        <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPlatformColor(link.platform)}`}>
                  {link.platform}
                </span>
              </div>
              <h4 className="font-bold text-gray-800 text-sm">{link.supplier}</h4>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-violet-700">{link.estimatedPrice}</div>
              <div className="text-xs text-gray-400">예상 단가</div>
            </div>
          </div>

          {/* 세부 정보 */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
            <InfoItem label="최소 주문 수량" value={link.moq} icon="📦" />
            <InfoItem label="배송 정보" value={link.shippingNote} icon="🚢" />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" size="sm" className="w-full">
                🔗 소싱처 보기
              </Button>
            </a>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => onContact(link)}
            >
              ✉️ 연락하기
            </Button>
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 text-center">
        ⚠️ 소싱처 정보는 AI가 생성한 참고 자료입니다. 실제 공급업체 확인 후 거래를 진행하세요.
      </p>
    </div>
  );
};

const InfoItem: React.FC<{ label: string; value: string; icon: string }> = ({ label, value, icon }) => (
  <div className="bg-gray-50 rounded-xl p-3">
    <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
      <span>{icon}</span> {label}
    </div>
    <div className="text-xs font-semibold text-gray-700">{value}</div>
  </div>
);
