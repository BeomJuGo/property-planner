import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Property, DistanceMatrix } from '@/lib/types';
import { pairKey } from '@/lib/utils';

const MODEL = process.env.OPENAI_MODEL;

export async function POST(req: NextRequest) {
  if (!MODEL) {
    return NextResponse.json(
      { error: 'OPENAI_MODEL 환경 변수가 설정되지 않았습니다. Vercel 프로젝트 설정에서 환경 변수를 추가하세요.' },
      { status: 500 }
    );
  }

  const { properties, distanceMatrix, surveyDays, departurePoint, destination, startTime, visitMinDefault, transportMode } = await req.json();
  const modeLabel = transportMode === 'walking' ? '도보' : transportMode === 'driving' ? '차량(택시/자차)' : '대중교통(지하철/버스)';

  const props: Property[] = properties;
  const matrix: DistanceMatrix = distanceMatrix ?? {};

  const propertyList = props
    .map((p, i) => `${i + 1}. ${p.name} (${p.group}) - ${p.roadAddress || p.address} - ${p.station} [${p.stationGrade}] 도보 ${p.stationWalkMin}분 - 체류 ${p.visitMin}분`)
    .join('\n');

  const matrixRows: string[] = [];
  for (let i = 0; i < props.length; i++) {
    for (let j = i + 1; j < props.length; j++) {
      const a = props[i], b = props[j];
      const key = pairKey(a.lat, a.lng, b.lat, b.lng);
      const d = matrix[key];
      if (d) {
        matrixRows.push(`${a.name} ↔ ${b.name}: 도보 ${d.walkingMinutes ?? '?'}분/${d.walkingMeters ?? '?'}m, 차량 ${d.drivingMinutes ?? '?'}분, 대중교통 ${d.transitMinutes ?? '?'}분`);
      }
    }
  }

  const matrixText = matrixRows.length > 0
    ? matrixRows.slice(0, 30).join('\n')
    : '(거리 정보 없음)';

  const systemPrompt = `당신은 한국 부동산 매물 답사 일정을 짜주는 전문가입니다.
주어진 매물 목록과 이동 시간 정보를 바탕으로 날짜별 최적화된 답사 일정을 한국어로 작성해주세요.

답사 계획 작성 규칙:
- 날짜별로 구분하여 작성
- 지리적 인접성을 고려하여 같은 날 방문할 매물 묶기
- 각 이동 구간의 예상 소요 시간 명시
- 이동 수단에 맞게 경로 설명 (지하철 노선명 또는 도로 경로)
- 시간표 형식으로 출발~도착 시간 표기
- 각 날의 총 소요 시간 요약 포함
- 숙박지가 있으면 그 근처 매물을 해당 날에 배정`;

  const userPrompt = `답사 조건:
- 총 답사 일수: ${surveyDays}일
- 주요 이동 수단: ${modeLabel}
- 출발지: ${departurePoint?.name ?? '미지정'}
- 목적지/귀환지: ${destination?.name ?? '미지정'}
- 시작 시각: ${startTime ?? '10:00'}
- 기본 체류 시간: ${visitMinDefault ?? 40}분

매물 목록 (${props.length}개):
${propertyList}

매물 간 이동 시간:
${matrixText}

위 정보를 바탕으로 ${surveyDays}일 동안의 답사 계획을 작성해주세요.`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
    max_completion_tokens: 4000,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
