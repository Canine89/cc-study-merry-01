/* Vercel 빌드 때 환경 변수를 읽어 config.js 를 만든다.
   덕분에 접속 정보를 저장소에 두지 않아도 된다.
   필요한 환경 변수: SUPABASE_URL, SUPABASE_ANON_KEY */
const fs = require('fs');

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.warn('[build] SUPABASE_URL / SUPABASE_ANON_KEY 가 없습니다. ' +
               '참석 회신과 방명록은 꺼진 상태로 배포됩니다.');
}

fs.writeFileSync(
  'config.js',
  '/* 빌드 때 자동 생성된 파일입니다. 직접 고치지 마세요. */\n' +
  'window.WEDDING_CONFIG = ' + JSON.stringify({
    supabaseUrl: url,
    supabaseAnonKey: key
  }, null, 2) + ';\n'
);

console.log('[build] config.js 생성 완료' + (url ? ' (' + url + ')' : ' (빈 값)'));
