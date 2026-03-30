import React, { useState, useCallback } from 'react';
import {
  AppMode,
  AppStep,
  AgentState,
  AgentStatus,
  SourcingRunResult,
  SourcingCandidate,
  SourcingLink,
} from './types';
import { runSourcingPipeline, loadCachedResult } from './agents/orchestratorAgent';
import { validateApiKey } from './services/geminiService';
import { ModeSelector } from './components/ModeSelector';
import { AgentProgress } from './components/AgentProgress';
import { ProductCard } from './components/ProductCard';
import { CompetitionReport } from './components/CompetitionReport';
import { SourcingPanel } from './components/SourcingPanel';
import { NegotiationModal } from './components/NegotiationModal';
import { Button } from './components/Button';

const STORAGE_KEY_APIKEY = 'sourcing-wizard-api-key';

const INITIAL_AGENT_STATE: AgentState = {
  search: 'idle',
  trend: 'idle',
  evaluation: 'idle',
  sourcing: 'idle',
};

// ─── Detail View ───────────────────────────────────────────────────────────────

interface DetailViewProps {
  product: SourcingCandidate;
  onBack: () => void;
  onContact: (supplier: SourcingLink) => void;
}

const TREND_LABEL: Record<string, string> = {
  RISING: '↑ 상승 중',
  PEAK: '🔥 피크',
  STABLE: '→ 안정적',
  DECLINING: '↓ 하락',
};

const DetailView: React.FC<DetailViewProps> = ({ product, onBack, onContact }) => {
  const [tab, setTab] = useState<'overview' | 'competition' | 'sourcing'>('overview');

  return (
    <div className="max-w-3xl mx-auto">
      {/* 뒤로 */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-violet-600 hover:text-violet-800 text-sm font-medium mb-6 transition-colors"
      >
        ← 목록으로 돌아가기
      </button>

      {/* 헤더 카드 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full font-medium">
              {product.category}
            </span>
            <h1 className="text-2xl font-bold text-indigo-900 mt-2">{product.productNameKo}</h1>
            <p className="text-sm text-gray-400">{product.productName}</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-violet-600">{product.scores.total}</div>
            <div className="text-xs text-gray-400">종합점수</div>
          </div>
        </div>

        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <MetricCard label="판매가" value={product.targetPrice} icon="💰" />
          <MetricCard label="소싱가" value={product.sourcingPrice} icon="🏭" />
          <MetricCard label="마진율" value={`${product.marginRate}%`} icon="📈" highlight />
          <MetricCard label="트렌드" value={TREND_LABEL[product.trendSignal]} icon="📊" />
        </div>

        {/* 판매 전략 */}
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-violet-700 mb-1">🎯 한국 판매 전략</p>
          <p className="text-sm text-gray-700">{product.koreanSellingAngle}</p>
        </div>

        {/* 인기 근거 */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-amber-700 mb-1">🌍 글로벌 인기 근거</p>
          <p className="text-sm text-gray-700">{product.hotEvidence}</p>
        </div>

        {/* 트렌드 근거 */}
        {product.trendEvidence && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-blue-700 mb-1">📈 트렌드 분석</p>
            <p className="text-sm text-gray-700">{product.trendEvidence}</p>
          </div>
        )}

        {/* 한국 마켓 적합도 */}
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-green-700 mb-1">🇰🇷 한국 마켓 적합도</p>
          <p className="text-sm text-gray-700">{product.koreaMarketFit}</p>
        </div>

        {/* 리스크 */}
        {product.risks.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-700 mb-2">⚠️ 리스크</p>
            <ul className="space-y-1">
              {product.risks.map((r, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {[
          { key: 'overview', label: '📊 점수 분석' },
          { key: 'competition', label: '🏆 경쟁 현황' },
          { key: 'sourcing', label: '🏭 소싱처' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white shadow text-violet-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'overview' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-5">상세 평가 점수</h3>
          <div className="space-y-5">
            <ScoreDetail label="한국 마켓 적합도" value={product.scores.koreaFit} color="bg-violet-500"
              desc="한국 소비자 취향, 규제, 배송 용이성 종합" />
            <ScoreDetail label="경쟁력 (낮은 경쟁 = 높은 점수)" value={product.scores.competition} color="bg-emerald-500"
              desc="쿠팡/네이버 경쟁 강도 역산 (높을수록 블루오션)" />
            <ScoreDetail label="수익성" value={product.scores.profitability} color="bg-amber-500"
              desc="마진율, 반품 리스크, 재구매율 종합" />
            <ScoreDetail label="소싱 용이성" value={product.scores.sourcingEase} color="bg-blue-500"
              desc="Alibaba 공급업체 다양성, MOQ 현실성, 배송 복잡도" />
          </div>
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800">종합 점수</span>
              <span className="text-3xl font-bold text-violet-600">{product.scores.total}점</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              가중치: 한국적합도 30% + 경쟁력 25% + 수익성 25% + 소싱용이성 20%
            </div>
          </div>
        </div>
      )}

      {tab === 'competition' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <CompetitionReport
            report={product.competitionReport}
            productNameKo={product.productNameKo}
          />
        </div>
      )}

      {tab === 'sourcing' && (
        <SourcingPanel sourcingLinks={product.sourcingLinks} onContact={onContact} />
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; icon: string; highlight?: boolean }> = ({
  label, value, icon, highlight
}) => (
  <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50'}`}>
    <div className="text-xl mb-1">{icon}</div>
    <div className={`font-bold text-sm ${highlight ? 'text-emerald-700' : 'text-gray-800'}`}>{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
);

const ScoreDetail: React.FC<{ label: string; value: number; color: string; desc: string }> = ({
  label, value, color, desc
}) => (
  <div>
    <div className="flex justify-between items-end mb-1.5">
      <div>
        <div className="font-semibold text-gray-800 text-sm">{label}</div>
        <div className="text-xs text-gray-400">{desc}</div>
      </div>
      <span className="font-bold text-lg text-gray-700 ml-4">{value}</span>
    </div>
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState<AppStep>('INPUT');
  const [mode, setMode] = useState<AppMode>('discovery');
  const [interest, setInterest] = useState('');
  const [agentState, setAgentState] = useState<AgentState>(INITIAL_AGENT_STATE);
  const [result, setResult] = useState<SourcingRunResult | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SourcingCandidate | null>(null);
  const [negotiationTarget, setNegotiationTarget] = useState<{
    product: SourcingCandidate;
    supplier: SourcingLink;
  } | null>(null);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_APIKEY) || process.env.GEMINI_API_KEY || '');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [apiKeyValidating, setApiKeyValidating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApiKeySave = async () => {
    if (!apiKeyInput.trim()) return;
    setApiKeyValidating(true);
    setApiKeyError(null);
    try {
      await validateApiKey(apiKeyInput.trim());
      localStorage.setItem(STORAGE_KEY_APIKEY, apiKeyInput.trim());
      setApiKey(apiKeyInput.trim());
      setShowApiKeyForm(false);
      setApiKeyInput('');
    } catch {
      setApiKeyError('API 키가 유효하지 않습니다. 다시 확인해주세요.');
    } finally {
      setApiKeyValidating(false);
    }
  };

  const updateAgentStatus = useCallback((agent: keyof AgentState, status: AgentStatus) => {
    setAgentState(prev => ({ ...prev, [agent]: status }));
  }, []);

  const handleRun = async () => {
    if (!apiKey) {
      setShowApiKeyForm(true);
      return;
    }
    if (mode === 'targeted' && !interest.trim()) {
      setError('관심 분야를 입력해주세요.');
      return;
    }
    setError(null);
    setAgentState(INITIAL_AGENT_STATE);
    setStep('RUNNING');

    try {
      const runResult = await runSourcingPipeline(
        apiKey,
        mode,
        mode === 'targeted' ? interest : undefined,
        updateAgentStatus
      );
      setResult(runResult);
      setStep('RESULTS');
    } catch (e) {
      setError((e as Error).message);
      setStep('INPUT');
    }
  };

  const handleSelectProduct = (product: SourcingCandidate) => {
    setSelectedProduct(product);
    setStep('DETAIL');
  };

  const handleContact = (supplier: SourcingLink) => {
    if (!selectedProduct) return;
    setNegotiationTarget({ product: selectedProduct, supplier });
    setStep('NEGOTIATION');
  };

  // 캐시된 결과 로드
  const handleLoadCache = () => {
    const cached = loadCachedResult();
    if (cached) {
      setResult(cached);
      setStep('RESULTS');
    }
  };

  const cachedResult = loadCachedResult();

  return (
    <div className="min-h-screen bg-violet-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-violet-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => { setStep('INPUT'); setSelectedProduct(null); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-2xl">🔮</span>
            <div>
              <div className="font-bold text-indigo-900 text-sm leading-tight">한이룸의 소싱 마법사</div>
              <div className="text-xs text-violet-400">v1.0</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {apiKey ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">
                  ✓ API 연결됨
                </span>
                <button
                  onClick={() => setShowApiKeyForm(true)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  변경
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowApiKeyForm(true)}>
                🔑 API 키 설정
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* API 키 모달 */}
      {showApiKeyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-indigo-900 mb-2">🔑 Gemini API 키 설정</h2>
            <p className="text-sm text-gray-500 mb-4">
              Google AI Studio에서 발급받은 API 키를 입력하세요.{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                className="text-violet-600 underline">발급받기 →</a>
            </p>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 mb-3"
              placeholder="AIza..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApiKeySave()}
              autoFocus
            />
            {apiKeyError && <p className="text-red-600 text-sm mb-3">{apiKeyError}</p>}
            <div className="flex gap-3">
              <Button variant="outline" size="md" className="flex-1" onClick={() => setShowApiKeyForm(false)}>
                취소
              </Button>
              <Button variant="primary" size="md" className="flex-1" isLoading={apiKeyValidating} onClick={handleApiKeySave}>
                저장하기
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="max-w-5xl mx-auto px-4 py-8">

        {/* ── INPUT 단계 ──────────────────────────────────── */}
        {step === 'INPUT' && (
          <div className="max-w-2xl mx-auto">
            {/* 히어로 */}
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">🔮</div>
              <h1 className="text-3xl font-bold text-indigo-900 mb-3">소싱 마법사</h1>
              <p className="text-gray-500 text-lg">
                팔 상품을 찾아드립니다.<br />
                AI가 발굴하고, 평가하고, 소싱처까지 찾아줍니다.
              </p>
            </div>

            {/* 모드 선택 */}
            <div className="mb-6">
              <ModeSelector selected={mode} onChange={setMode} />
            </div>

            {/* 관심 분야 입력 (targeted 모드) */}
            {mode === 'targeted' && (
              <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  🎯 어떤 분야에 관심이 있으신가요?
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="예: 홈카페, 캠핑, 반려동물, 운동, 뷰티, 인테리어..."
                  value={interest}
                  onChange={e => setInterest(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRun()}
                  autoFocus
                />
                {/* 추천 키워드 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {['홈카페', '캠핑', '반려동물', '운동/헬스', '뷰티', '인테리어', '주방용품', '취미/DIY'].map(kw => (
                    <button
                      key={kw}
                      onClick={() => setInterest(kw)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                        interest === kw
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-700'
                      }`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* 실행 버튼 */}
            <Button variant="primary" size="lg" className="w-full text-base" onClick={handleRun}>
              🔮 소싱 마법사 시작하기
            </Button>

            {/* 캐시 결과 불러오기 */}
            {cachedResult && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleLoadCache}
                  className="text-sm text-violet-600 hover:text-violet-800 underline"
                >
                  이전 분석 결과 불러오기 ({new Date(cachedResult.generatedAt).toLocaleDateString('ko-KR')})
                </button>
              </div>
            )}

            {/* 기능 소개 */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { emoji: '🔍', title: '상품 발굴', desc: '글로벌 트렌드 기반 소싱 후보 추천' },
                { emoji: '⚡', title: '경쟁력 평가', desc: '한국 마켓 적합도 및 경쟁 분석' },
                { emoji: '🏭', title: '소싱처 탐색', desc: 'Alibaba 등 해외 소싱처 검색' },
                { emoji: '✉️', title: '협상 자동화', desc: '최적 조건 협상 이메일 작성' },
              ].map(f => (
                <div key={f.title} className="bg-white rounded-xl p-4 text-center border border-gray-100">
                  <div className="text-2xl mb-2">{f.emoji}</div>
                  <div className="text-sm font-bold text-gray-800 mb-1">{f.title}</div>
                  <div className="text-xs text-gray-400">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RUNNING 단계 ─────────────────────────────────── */}
        {step === 'RUNNING' && (
          <AgentProgress agentState={agentState} mode={mode} interest={interest} />
        )}

        {/* ── RESULTS 단계 ─────────────────────────────────── */}
        {step === 'RESULTS' && result && (
          <div>
            {/* 결과 헤더 */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-indigo-900">
                  {result.mode === 'targeted' && result.interest
                    ? `"${result.interest}" 소싱 후보 ${result.candidates.length}개`
                    : `글로벌 소싱 후보 ${result.candidates.length}개`}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  {new Date(result.generatedAt).toLocaleString('ko-KR')} 분석 완료 • 종합점수 순 정렬
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep('INPUT')}>
                다시 검색
              </Button>
            </div>

            {/* 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {result.candidates.map((c, i) => (
                <ProductCard
                  key={c.id}
                  candidate={c}
                  rank={i + 1}
                  onClick={() => handleSelectProduct(c)}
                />
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center mt-8">
              ⚠️ AI 분석 기반 결과입니다. 실제 투자 결정 전 시장 검증을 권장합니다.
            </p>
          </div>
        )}

        {/* ── DETAIL 단계 ──────────────────────────────────── */}
        {step === 'DETAIL' && selectedProduct && (
          <DetailView
            product={selectedProduct}
            onBack={() => setStep('RESULTS')}
            onContact={handleContact}
          />
        )}
      </main>

      {/* 협상 모달 */}
      {step === 'NEGOTIATION' && negotiationTarget && (
        <NegotiationModal
          product={negotiationTarget.product}
          supplier={negotiationTarget.supplier}
          apiKey={apiKey}
          onClose={() => setStep('DETAIL')}
        />
      )}
    </div>
  );
}
