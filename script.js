/* ===========================================================
   모바일 청첩장 — 외부 라이브러리 없이 동작하는 스크립트
   1) 스크롤 등장 효과
   2) 달력 + 디데이
   3) 갤러리 확대 보기
   4) 계좌번호 아코디언 / 복사 / 카카오뱅크 송금
   =========================================================== */
(function () {
  'use strict';

  /* -----------------------------------------------------------
     0. 알림(토스트)
     ----------------------------------------------------------- */
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-show');
    }, 1900);
  }

  /* -----------------------------------------------------------
     1. 스크롤 등장 효과
     ----------------------------------------------------------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function showAll() {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
    revealEls = [];
  }

  if (!('IntersectionObserver' in window)) {
    // 지원하지 않는 브라우저에서는 그냥 다 보여준다.
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealEls.forEach(function (el) { io.observe(el); });

    function show(el) {
      el.classList.add('is-in');
      io.unobserve(el);
      var at = revealEls.indexOf(el);
      if (at !== -1) revealEls.splice(at, 1);
    }

    /* 한 번에 크게 튀는 스크롤(앵커 이동, 빠른 플릭, 새로고침 후 위치 복원)에서는
       IntersectionObserver가 지나쳐 간 요소를 알려주지 않아 계속 숨은 채로 남는다.
       그래서 스크롤이 멈출 때마다 이미 화면을 지나친 요소를 직접 확인해 보여준다. */
    var sweeping = false;
    function sweep() {
      sweeping = false;
      if (!revealEls.length) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        return;
      }
      var bottom = window.innerHeight * 0.92;
      revealEls.slice().forEach(function (el) {
        if (el.getBoundingClientRect().top < bottom) show(el);
      });
    }
    function onScroll() {
      if (sweeping) return;
      sweeping = true;
      requestAnimationFrame(sweep);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', onScroll);
  }

  /* -----------------------------------------------------------
     2. 달력 + 디데이
     예식일은 #calendar 의 data-wedding 속성에서 읽는다.
     ----------------------------------------------------------- */
  var calendarEl = document.getElementById('calendar');
  var ddayEl = document.getElementById('dday');

  if (calendarEl) {
    var weddingAt = new Date(calendarEl.dataset.wedding);
    // 한국 시간 기준 날짜 부분만 뽑아 달력을 그린다.
    var parts = calendarEl.dataset.wedding.slice(0, 10).split('-');
    var year = Number(parts[0]);
    var month = Number(parts[1]);   // 1~12
    var date = Number(parts[2]);

    renderCalendar(calendarEl, year, month, date);

    if (ddayEl) {
      ddayEl.innerHTML = ddayText(weddingAt);
    }
  }

  function renderCalendar(root, year, month, weddingDate) {
    var DOW = ['일', '월', '화', '수', '목', '금', '토'];
    var firstDow = new Date(year, month - 1, 1).getDay();
    var lastDate = new Date(year, month, 0).getDate();

    var html = '';
    html += '<p class="calendar__month">' + year + '. ' +
            (month < 10 ? '0' + month : month) + '</p>';
    html += '<div class="calendar__grid">';

    DOW.forEach(function (d, i) {
      html += '<div class="calendar__dow' +
              (i === 0 ? ' calendar__dow--sun' : '') + '">' + d + '</div>';
    });

    for (var i = 0; i < firstDow; i++) {
      html += '<div class="calendar__day calendar__day--empty">0</div>';
    }

    for (var day = 1; day <= lastDate; day++) {
      var dow = (firstDow + day - 1) % 7;
      var cls = 'calendar__day';
      if (dow === 0) cls += ' calendar__day--sun';
      if (day === weddingDate) cls += ' calendar__day--wedding';
      html += '<div class="' + cls + '"><span>' + day + '</span></div>';
    }

    html += '</div>';
    root.innerHTML = html;
  }

  function ddayText(target) {
    var MS_DAY = 24 * 60 * 60 * 1000;
    // 날짜 단위로만 비교하기 위해 두 시각을 자정으로 맞춘다.
    var t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.round((t - today) / MS_DAY);

    if (diff > 0) {
      return '두 사람의 결혼식까지 <b>' + diff + '일</b> 남았습니다.';
    }
    if (diff === 0) {
      return '<b>오늘</b>은 두 사람이 결혼하는 날입니다.';
    }
    return '결혼식이 <b>' + Math.abs(diff) + '일</b> 지났습니다.';
  }

  /* -----------------------------------------------------------
     3. 갤러리 확대 보기
     ----------------------------------------------------------- */
  var gallery = document.getElementById('gallery');
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxCount = document.getElementById('lightboxCount');

  if (gallery && lightbox) {
    var items = Array.prototype.map.call(
      gallery.querySelectorAll('.gallery__item img'),
      function (img) { return { src: img.getAttribute('src'), alt: img.alt }; }
    );
    var current = 0;
    var scrollY = 0;

    gallery.addEventListener('click', function (e) {
      var btn = e.target.closest('.gallery__item');
      if (!btn) return;
      open(Number(btn.dataset.index));
    });

    lightbox.querySelector('.lightbox__close').addEventListener('click', close);
    lightbox.querySelector('.lightbox__nav--prev').addEventListener('click', function () { move(-1); });
    lightbox.querySelector('.lightbox__nav--next').addEventListener('click', function () { move(1); });

    // 사진 바깥(배경)을 누르면 닫기
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });

    document.addEventListener('keydown', function (e) {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') move(-1);
      if (e.key === 'ArrowRight') move(1);
    });

    // 좌우 스와이프
    var touchX = null;
    lightbox.addEventListener('touchstart', function (e) {
      touchX = e.changedTouches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 45) move(dx < 0 ? 1 : -1);
      touchX = null;
    }, { passive: true });

    function open(index) {
      current = index;
      render();
      lightbox.hidden = false;
      // 배경 스크롤 잠금 (iOS 포함)
      scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = -scrollY + 'px';
      document.body.style.width = '100%';
      requestAnimationFrame(function () { lightbox.classList.add('is-open'); });
    }

    function close() {
      lightbox.classList.remove('is-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
      setTimeout(function () { lightbox.hidden = true; }, 250);
    }

    function move(step) {
      current = (current + step + items.length) % items.length;
      render();
    }

    function render() {
      lightboxImg.src = items[current].src;
      lightboxImg.alt = items[current].alt;
      lightboxCount.textContent = (current + 1) + ' / ' + items.length;
    }
  }

  /* -----------------------------------------------------------
     4-1. 계좌 아코디언
     ----------------------------------------------------------- */
  Array.prototype.forEach.call(
    document.querySelectorAll('.accordion__head'),
    function (head) {
      var panel = head.nextElementSibling;

      head.addEventListener('click', function () {
        var opened = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', String(!opened));
        panel.style.maxHeight = opened ? '0px' : panel.scrollHeight + 'px';
      });

      // 화면 회전 등으로 높이가 바뀌면 다시 계산
      window.addEventListener('resize', function () {
        if (head.getAttribute('aria-expanded') === 'true') {
          panel.style.maxHeight = panel.scrollHeight + 'px';
        }
      });
    }
  );

  /* -----------------------------------------------------------
     4-2. 계좌번호 복사
     ----------------------------------------------------------- */
  // http로 열었거나 클립보드 권한이 막혔을 때 쓰는 옛 방식
  function copyLegacy(text) {
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('copy failed'));
    });
  }

  function copyText(text) {
    // 최신 API가 있어도 포커스나 권한 때문에 거절될 수 있으므로
    // 실패하면 반드시 옛 방식으로 한 번 더 시도한다.
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return copyLegacy(text);
      });
    }
    return copyLegacy(text);
  }

  Array.prototype.forEach.call(
    document.querySelectorAll('[data-copy]'),
    function (btn) {
      btn.addEventListener('click', function () {
        var num = btn.dataset.copy;
        copyText(num).then(function () {
          toast('계좌번호를 복사했습니다');
        }).catch(function () {
          toast(num);   // 복사가 막힌 환경에서는 번호를 그대로 보여준다
        });
      });
    }
  );

  /* -----------------------------------------------------------
     4-3. 카카오뱅크 송금 바로가기

     카카오뱅크는 "받는 계좌를 채운 채로 송금 화면을 여는" 공개 딥링크를
     제공하지 않습니다. 그래서 실제로 동작하는 방식은 이렇습니다.
       ① 계좌번호를 먼저 복사해두고
       ② kakaobank:// 로 앱 실행을 시도한 뒤
       ③ 앱이 없어서 화면이 그대로면 스토어로 보낸다
     앱에서는 붙여넣기만 하면 되므로 손이 한 번밖에 안 갑니다.
     ----------------------------------------------------------- */
  var KAKAOBANK_SCHEME = 'kakaobank://';
  var KAKAOBANK_IOS = 'https://apps.apple.com/kr/app/id1258016944';
  var KAKAOBANK_AOS = 'https://play.google.com/store/apps/details?id=com.kakaobank.channel';

  Array.prototype.forEach.call(
    document.querySelectorAll('[data-kakaobank]'),
    function (btn) {
      btn.addEventListener('click', function () {
        var num = btn.dataset.account;

        copyText(num)
          .then(function () { toast('계좌번호를 복사했어요. 앱에서 붙여넣기 하세요'); })
          .catch(function () { toast('카카오뱅크를 여는 중입니다'); })
          .then(function () { launchKakaoBank(); });
      });
    }
  );

  function launchKakaoBank() {
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    var store = isIOS ? KAKAOBANK_IOS : KAKAOBANK_AOS;
    var left = false;

    function onHide() { left = true; }
    document.addEventListener('visibilitychange', onHide, { once: true });
    window.addEventListener('pagehide', onHide, { once: true });

    // 보이지 않는 iframe/location 전환으로 앱 실행을 시도
    window.location.href = KAKAOBANK_SCHEME;

    setTimeout(function () {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      // 앱이 열렸다면 이미 화면을 떠났으므로 아래는 실행되지 않는다
      if (!left && !document.hidden) {
        window.location.href = store;
      }
    }, 1400);
  }

  /* -----------------------------------------------------------
     5. 참석 회신 · 방명록 (Supabase REST API)

     라이브러리 없이 fetch 로 직접 부른다.
     접속 정보는 config.js 가 넣어 주고, 없으면 두 기능만 조용히 끈다.
     ----------------------------------------------------------- */
  var CFG = window.WEDDING_CONFIG || {};
  var API = (CFG.supabaseUrl || '').replace(/\/+$/, '');
  var ANON = CFG.supabaseAnonKey || '';
  var CONNECTED = /^https:\/\/.+\.supabase\.co$/.test(API) && ANON.length > 20;

  function headers(extra) {
    var h = {
      'apikey': ANON,
      'Authorization': 'Bearer ' + ANON,
      'Content-Type': 'application/json'
    };
    for (var k in extra) if (extra.hasOwnProperty(k)) h[k] = extra[k];
    return h;
  }

  // 표에 한 줄 넣기. 성공하면 resolve, 중복이면 'duplicate' 로 reject.
  function insertRow(table, row) {
    return fetch(API + '/rest/v1/' + table, {
      method: 'POST',
      // return=minimal 이라야 읽기 권한이 없는 표에도 넣을 수 있다
      headers: headers({ 'Prefer': 'return=minimal' }),
      body: JSON.stringify(row)
    }).then(function (res) {
      if (res.ok) return;
      return res.json().catch(function () { return {}; }).then(function (err) {
        // 23505 = unique 제약 위반 = 이미 보낸 사람
        throw new Error(err.code === '23505' ? 'duplicate' : (err.message || '전송에 실패했습니다'));
      });
    });
  }

  function setMsg(el, text, isError) {
    el.textContent = text;
    el.classList.toggle('form__msg--error', !!isError);
  }

  /* ---- 참석 회신 ---- */
  var rsvpForm = document.getElementById('rsvpForm');
  var rsvpMsg = document.getElementById('rsvpMsg');

  if (rsvpForm) {
    if (!CONNECTED) {
      disableForm(rsvpForm, rsvpMsg);
    } else {
      rsvpForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = rsvpForm.querySelector('button[type="submit"]');
        var name = rsvpForm.name.value.trim();
        var headcount = parseInt(rsvpForm.headcount.value, 10);

        if (!name) { setMsg(rsvpMsg, '이름을 적어주세요.', true); return; }
        if (!(headcount >= 1 && headcount <= 20)) {
          setMsg(rsvpMsg, '참석 인원은 1명에서 20명 사이로 적어주세요.', true); return;
        }

        btn.disabled = true;
        setMsg(rsvpMsg, '보내는 중입니다…', false);

        insertRow('rsvp', {
          name: name,
          headcount: headcount,
          meal: rsvpForm.meal.value === 'yes'
        }).then(function () {
          rsvpForm.reset();
          setMsg(rsvpMsg, '회신해 주셔서 감사합니다. 잘 전달되었습니다.', false);
        }).catch(function (err) {
          btn.disabled = false;
          setMsg(rsvpMsg, err.message === 'duplicate'
            ? '이미 회신하신 이름입니다. 고쳐야 한다면 신랑·신부에게 알려주세요.'
            : '보내지 못했습니다. 잠시 후 다시 시도해 주세요.', true);
        });
      });
    }
  }

  /* ---- 방명록 ---- */
  var gbForm = document.getElementById('guestbookForm');
  var gbMsg = document.getElementById('guestbookMsg');
  var gbList = document.getElementById('guestbookList');

  if (gbForm && gbList) {
    if (!CONNECTED) {
      disableForm(gbForm, gbMsg);
      gbList.innerHTML = '';
      gbList.appendChild(emptyRow('아직 준비 중입니다.'));
    } else {
      loadGuestbook();

      gbForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = gbForm.querySelector('button[type="submit"]');
        var name = gbForm.name.value.trim();
        var message = gbForm.message.value.trim();

        if (!name) { setMsg(gbMsg, '이름을 적어주세요.', true); return; }
        if (!message) { setMsg(gbMsg, '메시지를 적어주세요.', true); return; }

        btn.disabled = true;
        setMsg(gbMsg, '남기는 중입니다…', false);

        insertRow('guestbook', { name: name, message: message })
          .then(function () {
            gbForm.reset();
            setMsg(gbMsg, '따뜻한 말씀 감사합니다.', false);
            btn.disabled = false;
            return loadGuestbook();
          })
          .catch(function (err) {
            btn.disabled = false;
            setMsg(gbMsg, err.message === 'duplicate'
              ? '이미 방명록을 남기셨습니다. 한 분당 한 번만 남길 수 있어요.'
              : '남기지 못했습니다. 잠시 후 다시 시도해 주세요.', true);
          });
      });
    }
  }

  function loadGuestbook() {
    return fetch(API + '/rest/v1/guestbook' +
                 '?select=name,message,created_at&order=created_at.desc&limit=20',
                 { headers: headers() })
      .then(function (res) {
        if (!res.ok) throw new Error('load failed');
        return res.json();
      })
      .then(function (rows) { renderGuestbook(rows); })
      .catch(function () {
        gbList.innerHTML = '';
        gbList.appendChild(emptyRow('방명록을 불러오지 못했습니다.'));
      });
  }

  function renderGuestbook(rows) {
    gbList.innerHTML = '';

    if (!rows.length) {
      gbList.appendChild(emptyRow('첫 번째 방명록을 남겨주세요.'));
      return;
    }

    rows.forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'entry';

      var head = document.createElement('div');
      head.className = 'entry__head';

      var name = document.createElement('span');
      name.className = 'entry__name';
      // 방문자가 쓴 글이므로 textContent 로만 넣는다 (HTML 로 해석되지 않게)
      name.textContent = row.name;

      var date = document.createElement('span');
      date.className = 'entry__date';
      date.textContent = formatDate(row.created_at);

      head.appendChild(name);
      head.appendChild(date);

      var msg = document.createElement('p');
      msg.className = 'entry__msg';
      msg.textContent = row.message;

      li.appendChild(head);
      li.appendChild(msg);
      gbList.appendChild(li);
    });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }

  function emptyRow(text) {
    var li = document.createElement('li');
    li.className = 'entries__empty';
    li.textContent = text;
    return li;
  }

  // 접속 정보가 없을 때는 폼을 잠가 둔다 (오류 대신 조용히)
  function disableForm(form, msgEl) {
    Array.prototype.forEach.call(form.elements, function (el) { el.disabled = true; });
    setMsg(msgEl, '아직 준비 중입니다.', false);
  }

})();
