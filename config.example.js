/* Supabase 접속 정보.
   실제 값이 담긴 config.js 는 저장소에 올리지 않습니다(.gitignore).
   Vercel 에서는 build.js 가 환경 변수를 읽어 config.js 를 만들어 줍니다. */
window.WEDDING_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'YOUR-ANON-KEY'
};
