// EmailJS 연동 서비스 (Phase 3용 - 현재는 mailto 방식 사용)
// EmailJS를 사용하려면 https://www.emailjs.com/ 에서 계정 생성 후
// .env.local에 EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY 설정 필요

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  fromName: string;
}

/**
 * EmailJS를 통한 이메일 발송
 * EmailJS SDK가 CDN으로 로드되어 있어야 함
 * @see index.html에 <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script> 추가 필요
 */
export async function sendEmailViaEmailJS(payload: EmailPayload): Promise<void> {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error(
      'EmailJS 설정이 없습니다. .env.local에 EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY를 설정해주세요.'
    );
  }

  // emailjs-browser SDK 사용 (전역 window.emailjs 가정)
  const emailjs = (window as any).emailjs;
  if (!emailjs) {
    throw new Error('EmailJS SDK가 로드되지 않았습니다. index.html에 EmailJS CDN 스크립트를 추가해주세요.');
  }

  await emailjs.send(
    serviceId,
    templateId,
    {
      to_email: payload.to,
      subject: payload.subject,
      message: payload.body,
      from_name: payload.fromName,
    },
    { publicKey }
  );
}

/**
 * mailto: 링크를 통한 기본 메일 앱 열기 (백업 방법)
 */
export function openMailtoLink(to: string, subject: string, body: string): void {
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url);
}
