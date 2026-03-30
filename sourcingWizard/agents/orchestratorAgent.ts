import { discoverProducts } from './searchAgent';
import { analyzeTrends } from './trendAgent';
import { evaluateProducts } from './evaluationAgent';
import { findSourcingLinks } from './sourcingAgent';
import {
  AppMode,
  AgentState,
  AgentStatus,
  SourcingRunResult,
  SourcingCandidate,
  RawCandidate,
  TrendData,
  EvaluationData,
  SourcingData,
} from '../types';

const STORAGE_KEY = 'sourcing-wizard-last-result';

function mergeData(
  raw: RawCandidate[],
  trends: TrendData[],
  evaluations: EvaluationData[],
  sourcingData: SourcingData[]
): SourcingCandidate[] {
  return raw.map((r, idx) => {
    const trend = trends.find(t => t.productName === r.productName) || {
      trendSignal: 'STABLE' as const,
      trendEvidence: '트렌드 데이터 없음',
    };
    const evaluation = evaluations.find(e => e.productName === r.productName) || {
      scores: { koreaFit: 50, competition: 50, profitability: 50, sourcingEase: 50, total: 50 },
      competitionLevel: 'MEDIUM' as const,
      competitionReport: {
        naverShopping: [],
        coupang: [],
        summary: '데이터 없음',
        opportunity: '데이터 없음',
      },
    };
    const sourcing = sourcingData.find(s => s.productName === r.productName) || {
      sourcingLinks: [],
    };

    return {
      id: `product-${idx}-${Date.now()}`,
      productName: r.productName,
      productNameKo: r.productNameKo,
      category: r.category,
      targetPrice: r.targetPrice,
      sourcingPrice: r.sourcingPrice,
      marginRate: r.marginRate,
      koreaMarketFit: r.koreaMarketFit,
      koreanSellingAngle: r.koreanSellingAngle,
      hotEvidence: r.hotEvidence,
      risks: r.risks,
      scores: evaluation.scores,
      trendSignal: trend.trendSignal as SourcingCandidate['trendSignal'],
      trendEvidence: trend.trendEvidence,
      competitionLevel: evaluation.competitionLevel as SourcingCandidate['competitionLevel'],
      competitionReport: evaluation.competitionReport,
      sourcingLinks: sourcing.sourcingLinks,
    };
  });
}

type ProgressCallback = (agent: keyof AgentState, status: AgentStatus) => void;

export async function runSourcingPipeline(
  apiKey: string,
  mode: AppMode,
  interest: string | undefined,
  onProgress: ProgressCallback
): Promise<SourcingRunResult> {
  // Step 1: 검색 에이전트
  onProgress('search', 'running');
  let rawCandidates: RawCandidate[];
  try {
    rawCandidates = await discoverProducts(apiKey, mode, interest);
    onProgress('search', 'done');
  } catch (e) {
    onProgress('search', 'error');
    throw new Error('상품 발굴 중 오류가 발생했습니다: ' + (e as Error).message);
  }

  // Step 2: 트렌드 에이전트 + 평가 에이전트 병렬 실행
  onProgress('trend', 'running');
  onProgress('evaluation', 'running');

  let trendData: TrendData[];
  let evaluationData: EvaluationData[];

  try {
    [trendData, evaluationData] = await Promise.all([
      analyzeTrends(apiKey, rawCandidates),
      evaluateProducts(apiKey, rawCandidates),
    ]);
    onProgress('trend', 'done');
    onProgress('evaluation', 'done');
  } catch (e) {
    onProgress('trend', 'error');
    onProgress('evaluation', 'error');
    throw new Error('트렌드/평가 분석 중 오류가 발생했습니다: ' + (e as Error).message);
  }

  // Step 3: 소싱처 탐색
  onProgress('sourcing', 'running');
  let sourcingData: SourcingData[];
  try {
    sourcingData = await findSourcingLinks(apiKey, rawCandidates);
    onProgress('sourcing', 'done');
  } catch (e) {
    onProgress('sourcing', 'error');
    throw new Error('소싱처 탐색 중 오류가 발생했습니다: ' + (e as Error).message);
  }

  // Step 4: 데이터 병합 + 점수 기준 정렬
  const candidates = mergeData(rawCandidates, trendData, evaluationData, sourcingData);
  candidates.sort((a, b) => b.scores.total - a.scores.total);

  const result: SourcingRunResult = {
    mode,
    interest,
    candidates,
    generatedAt: new Date().toISOString(),
  };

  // 로컬스토리지 캐싱
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {
    // 스토리지 용량 초과 무시
  }

  return result;
}

export function loadCachedResult(): SourcingRunResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
