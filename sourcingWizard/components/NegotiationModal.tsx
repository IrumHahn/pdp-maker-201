import React, { useState } from 'react';
import { SourcingCandidate, SourcingLink, NegotiationEmail } from '../types';
import { draftNegotiationEmail } from '../agents/negotiationAgent';
import { Button } from './Button';

interface NegotiationModalProps {
  product: SourcingCandidate;
  supplier: SourcingLink;
  apiKey: string;
  onClose: () => void;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  product,
  supplier,
  apiKey,
  onClose,
}) => {
  const [step, setStep] = useState<'form' | 'generating' | 'result'>('form');
  const [targetPrice, setTargetPrice] = useState('');
  const [quantity, setQuantity] = useState('500');
  const [requirements, setRequirements] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderCompany, setSenderCompany] = useState('');
  const [email, setEmail] = useState<NegotiationEmail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editableBody, setEditableBody] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!senderName.trim() || !targetPrice.trim()) {
      setError('이름과 목표 단가는 필수입니다.');
      return;
    }
    setError(null);
    setStep('generating');
    try {
      const result = await draftNegotiationEmail(apiKey, {
        product,
        supplier,
        targetPrice,
        quantity,
        requirements,
        senderName,
        senderCompany: senderCompany || senderName + ' Store',
      });
      setEmail(result);
      setEditableBody(result.body);
      setStep('result');
    } catch (e) {
      setError('이메일 생성 중 오류가 발생했습니다: ' + (e as Error).message);
      setStep('form');
    }
  };

  const handleCopy = () => {
    const text = `Subject: ${email?.subject}\n\n${editableBody}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleMailto = () => {
    if (!email) return;
    const subject = encodeURIComponent(email.subject);
    const body = encodeURIComponent(editableBody);
    const to = supplier.contactEmail || '';
    window.open(`mailto:${to}?subject=${subject}&body=${body}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-indigo-900">✉️ 협상 이메일 작성</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {supplier.supplier} ({supplier.platform})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6">
          {/* 공급업체 정보 요약 */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <div className="font-semibold text-violet-700">{product.productNameKo}</div>
                <div className="text-xs text-gray-400">제품</div>
              </div>
              <div>
                <div className="font-semibold text-violet-700">{supplier.estimatedPrice}</div>
                <div className="text-xs text-gray-400">현재 단가</div>
              </div>
              <div>
                <div className="font-semibold text-violet-700">{supplier.moq}</div>
                <div className="text-xs text-gray-400">MOQ</div>
              </div>
            </div>
          </div>

          {/* Step 1: 폼 */}
          {step === 'form' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="발신자 이름 *"
                  placeholder="홍길동"
                  value={senderName}
                  onChange={setSenderName}
                />
                <FormField
                  label="회사명"
                  placeholder="홍길동 스토어"
                  value={senderCompany}
                  onChange={setSenderCompany}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="목표 단가 *"
                  placeholder="예: $3.00 / pc"
                  value={targetPrice}
                  onChange={setTargetPrice}
                />
                <FormField
                  label="주문 예정 수량"
                  placeholder="예: 500개"
                  value={quantity}
                  onChange={setQuantity}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  추가 요구사항
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                  rows={3}
                  placeholder="OEM 패키징, 커스텀 로고, 특정 사양 등을 입력하세요 (선택사항)"
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <Button variant="primary" size="lg" className="w-full" onClick={handleGenerate}>
                🔮 최적 협상 이메일 생성하기
              </Button>
            </div>
          )}

          {/* Step 2: 생성 중 */}
          {step === 'generating' && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4 animate-pulse">✉️</div>
              <h3 className="font-bold text-indigo-900 text-lg mb-2">협상 이메일 작성 중...</h3>
              <p className="text-sm text-gray-500">최적의 협상 조건을 담은 이메일을 생성하고 있습니다</p>
            </div>
          )}

          {/* Step 3: 결과 */}
          {step === 'result' && email && (
            <div className="space-y-5">
              {/* 핵심 포인트 */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <h4 className="font-bold text-indigo-800 mb-3 text-sm">💡 협상 핵심 포인트</h4>
                <ul className="space-y-2">
                  {email.keyPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-indigo-700">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 이메일 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일 제목</label>
                <div className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 font-medium text-gray-800">
                  {email.subject}
                </div>
              </div>

              {/* 이메일 본문 (편집 가능) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">이메일 본문 (직접 편집 가능)</label>
                  <span className="text-xs text-gray-400">수정 후 복사하거나 메일로 발송하세요</span>
                </div>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none font-mono"
                  rows={14}
                  value={editableBody}
                  onChange={e => setEditableBody(e.target.value)}
                />
              </div>

              {/* 발송 버튼 */}
              <div className="flex gap-3">
                <Button variant="outline" size="md" className="flex-1" onClick={handleCopy}>
                  {copied ? '✅ 복사됨!' : '📋 이메일 복사'}
                </Button>
                <Button variant="primary" size="md" className="flex-1" onClick={handleMailto}>
                  📧 메일 앱으로 발송
                </Button>
              </div>

              <button
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setStep('form')}
              >
                ← 다시 작성하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FormField: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, placeholder, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <input
      type="text"
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);
