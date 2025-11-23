import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlayer } from './PlayerContext';
import { X, Heart, SkipBack, SkipForward } from 'lucide-react';

type Seg = { t: number; text: string };
type Row = { start: number; end: number; text: string; segments: Seg[] };

const fmt = (sec: number) => {
  const s = Math.floor(sec), m = Math.floor(s / 60), r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

/* LRC с inline-токенами <mm:ss.xx> */
function parseLRC(text: string): Row[] {
  const rows: Row[] = [];
  const lineRe = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;
  const tokRe = /<(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?>/g;

  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(lineRe);
    if (!m) continue;
    const mm = +m[1], ss = +m[2], ms = m[3] ? +m[3] : 0;
    const start = mm * 60 + ss + (m[3] ? ms / (m[3].length === 3 ? 1000 : 100) : 0);
    let rest = m[4].trim();

    const segs: Seg[] = [];
    let pos = 0, tcur = start;
    tokRe.lastIndex = 0;
    let tm: RegExpExecArray | null;
    while ((tm = tokRe.exec(rest))) {
      if (tm.index > pos) segs.push({ t: tcur, text: rest.slice(pos, tm.index) });
      const mm2 = +tm[1], ss2 = +tm[2], ms2 = tm[3] ? +tm[3] : 0;
      tcur = mm2 * 60 + ss2 + (tm[3] ? ms2 / (tm[3].length === 3 ? 1000 : 100) : 0);
      pos = tokRe.lastIndex;
    }
    if (pos < rest.length) segs.push({ t: tcur, text: rest.slice(pos) });

    const plain = rest.replace(tokRe, '').trim();
    if (!plain) continue;
    rows.push({ start, end: start + 1e6, text: plain, segments: segs });
  }
  rows.sort((a, b) => a.start - b.start);
  for (let i = 0; i < rows.length - 1; i++) rows[i].end = rows[i + 1].start;
  return rows;
}

const ub = (a: number[], x: number) => {
  let l = 0, r = a.length;
  while (l < r) {
    const m = (l + r) >> 1;
    (a[m] <= x) ? l = m + 1 : r = m;
  }
  return l;
};

export function FullscreenPlayer() {
  const {
    currentTrack,
    isPlaying,
    isFullscreen,
    togglePlay,
    toggleFullscreen,
    dominantColor,
    currentTime,
    duration,
    seek,
    nextTrack,
    previousTrack,
    toggleLike,
    isLiked,
    openArtistView,
    closePlaylist,
  } = usePlayer();

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const curRef = useRef<HTMLDivElement | null>(null);
  const n1Ref = useRef<HTMLDivElement | null>(null);
  const n2Ref = useRef<HTMLDivElement | null>(null);
  const n3Ref = useRef<HTMLDivElement | null>(null);

  const [rows, setRows] = useState<Row[]>([]);
  const [times, setTimes] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(false);

  const [showControls, setShowControls] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);

  const browsingUntil = useRef<number>(0);

  const rowsR = useRef<Row[]>([]);
  useEffect(() => { rowsR.current = rows; }, [rows]);
  const timesR = useRef<number[]>([]);
  useEffect(() => { timesR.current = times; }, [times]);
  const idxR = useRef(0);
  useEffect(() => { idxR.current = idx; }, [idx]);

  /* флаг анимации, чтобы не наслаивать */
  const animating = useRef(false);

  // ===== посимвольная подсветка =====
  const charEls = useRef<HTMLSpanElement[]>([]);
  const segMap = useRef<{ startChar: number; len: number; tStart: number; tEnd: number }[]>([]);
  const totalChars = useRef(0);
  const prevK = useRef(-1);
  const lastPartial = useRef<HTMLSpanElement | null>(null);

  const renderText = (el: HTMLElement, text: string) => { el.textContent = text; };

  function setCurrentHeightVar() {
    const vp = viewportRef.current;
    const h = curRef.current?.getBoundingClientRect().height ?? 48;
    vp?.style.setProperty('--curH', `${h}px`);
  }

  function inflateCurrent(row: Row) {
    const el = curRef.current;
    if (!el || !row) return;
    
    el.innerHTML = '';
    charEls.current = [];
    for (const ch of row.text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      el.appendChild(s);
      charEls.current.push(s);
    }
    totalChars.current = charEls.current.length;
    prevK.current = -1;
    if (lastPartial.current) {
      lastPartial.current.classList.remove('partial');
      lastPartial.current = null;
    }

    segMap.current = [];
    if (row.segments?.length) {
      let pos = 0;
      for (let j = 0; j < row.segments.length; j++) {
        const sg = row.segments[j];
        const nextT = j < row.segments.length - 1 ? row.segments[j + 1].t : row.end;
        let at = row.text.indexOf(sg.text, pos);
        if (at < 0) at = pos;
        segMap.current.push({ startChar: at, len: sg.text.length, tStart: sg.t, tEnd: nextT });
        pos = at + sg.text.length;
      }
    } else segMap.current.push({ startChar: 0, len: totalChars.current, tStart: row.start, tEnd: row.end });

    requestAnimationFrame(setCurrentHeightVar);
  }

  function setActiveChars(x: number) {
    if (!totalChars.current || !charEls.current.length) return; // Проверка на наличие элементов
    let k = Math.floor(x), f = x - k;
    if (k < 0) { k = 0; f = 0; }
    if (k >= totalChars.current) { k = totalChars.current - 1; f = 1; }
    if (prevK.current < k) {
      for (let i = prevK.current + 1; i <= k; i++) charEls.current[i]?.classList.add('active');
    } else if (prevK.current > k) {
      for (let i = k + 1; i <= prevK.current; i++) charEls.current[i]?.classList.remove('active');
    }
    prevK.current = k;
    if (lastPartial.current && lastPartial.current !== charEls.current[k]) lastPartial.current.classList.remove('partial');
    const edge = charEls.current[k];
    if (!edge) return; // Проверка на существование конкретного элемента
    edge.classList.add('partial');
    edge.style.setProperty('--p', (f * 100).toFixed(3));
    lastPartial.current = edge;
  }

  function progressChars(time: number) {
    const r = rowsR.current[idxR.current];
    if (!r || !charEls.current.length) return;
    if (time <= r.start) { setActiveChars(0); return; }
    if (time >= r.end) { setActiveChars(totalChars.current); return; }
    let done = 0;
    for (const s of segMap.current) {
      if (time >= s.tEnd) { done += s.len; continue; }
      if (time <= s.tStart) break;
      const frac = Math.max(0, Math.min(1, (time - s.tStart) / Math.max(0.001, s.tEnd - s.tStart)));
      done += s.len * frac;
      break;
    }
    setActiveChars(done);
  }

  function fillTrio(i: number) {
    const r = rowsR.current;
    if (!curRef.current || !n1Ref.current || !n2Ref.current || !n3Ref.current) return;
    if (!r[i]) return;
    
    inflateCurrent(r[i]);
    renderText(n1Ref.current, r[i + 1]?.text ?? '');
    renderText(n2Ref.current, r[i + 2]?.text ?? '');
    renderText(n3Ref.current, r[i + 3]?.text ?? '');

    n1Ref.current.dataset.idx = String(i + 1);
    n2Ref.current.dataset.idx = String(i + 2);
    n3Ref.current.dataset.idx = String(i + 3);
  }

  // ===== плавный слайд вверх; без дёрга =====
  function slideToNext(newIndex: number) {
    if (animating.current) return;
    if (!railRef.current || !curRef.current) return;
    
    animating.current = true;

    const rail = railRef.current;
    rail.getAnimations().forEach(a => a.cancel());

    // старая строка — мягкое исчезновение
    curRef.current.classList.add('leaving');

    const gap = parseFloat(getComputedStyle(rail).gap || '0');
    const curH = Math.round((curRef.current.getBoundingClientRect().height) + gap);

    const anim = rail.animate(
      [{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(0,-${curH}px,0)` }],
      { duration: 340, easing: 'cubic-bezier(.22,.8,.24,1)', fill: 'forwards', composite: 'replace' }
    );

    anim.onfinish = () => {
      // @ts-ignore
      if (typeof (anim as any).commitStyles === 'function') (anim as any).commitStyles();
      anim.cancel();

      // синхронно обновим индекс (до подсветки)
      idxR.current = newIndex;
      setIdx(newIndex);

      // заполняем DOM новой тройкой
      fillTrio(newIndex);
      setCurrentHeightVar();

      // мгновенно инициируем подсветку по текущему времени
      const nowTime = currentTime;
      progressChars(nowTime + 0.001);

      rail.style.transform = 'translate3d(0,0,0)';
      curRef.current?.classList.remove('leaving');
      curRef.current?.classList.add('bump');
      window.setTimeout(() => curRef.current?.classList.remove('bump'), 420);

      animating.current = false;
    };
  }

  function jumpTo(index: number) {
    const r = rowsR.current;
    if (!r.length) return;
    const i = Math.max(0, Math.min(index, r.length - 1));
    const tTarget = r[i].start + 0.01;
    seek(tTarget);
    if (Math.abs(i - idxR.current) >= 1) {
      idxR.current = i;
      slideToNext(i);
    }
  }

  // ===== клики + просмотр колёсиком/свайпом =====
  useEffect(() => {
    if (!isFullscreen) return;
    
    const n1 = n1Ref.current;
    const n2 = n2Ref.current;
    const n3 = n3Ref.current;
    const viewport = viewportRef.current;
    
    if (!n1 || !n2 || !n3 || !viewport) return;
    
    const onRowClick = (e: MouseEvent) => {
      const el = e.currentTarget as HTMLElement;
      const i = Number(el.dataset.idx);
      if (Number.isFinite(i)) {
        browsingUntil.current = 0;
        jumpTo(i);
      }
    };
    
    const browse = (dir: number) => {
      const r = rowsR.current;
      if (!r.length) return;
      const next = Math.max(0, Math.min(idxR.current + dir, r.length - 1));
      if (next !== idxR.current) {
        browsingUntil.current = Date.now() + 3000;
        idxR.current = next;
        slideToNext(next);
      }
    };
    
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      browse(e.deltaY > 0 ? +1 : -1);
    };
    
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = startY - (e.changedTouches[0]?.clientY ?? startY);
      if (Math.abs(dy) > 24) browse(dy > 0 ? +1 : -1);
    };
    
    n1.addEventListener('click', onRowClick);
    n2.addEventListener('click', onRowClick);
    n3.addEventListener('click', onRowClick);

    viewport.addEventListener('wheel', onWheel as unknown as EventListener, { passive: false });
    viewport.addEventListener('touchstart', onTouchStart as unknown as EventListener, { passive: false });
    viewport.addEventListener('touchmove', onTouchMove as unknown as EventListener, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd as unknown as EventListener, { passive: false });

    return () => {
      n1.removeEventListener('click', onRowClick);
      n2.removeEventListener('click', onRowClick);
      n3.removeEventListener('click', onRowClick);
      viewport.removeEventListener('wheel', onWheel as unknown as EventListener);
      viewport.removeEventListener('touchstart', onTouchStart as unknown as EventListener);
      viewport.removeEventListener('touchmove', onTouchMove as unknown as EventListener);
      viewport.removeEventListener('touchend', onTouchEnd as unknown as EventListener);
    };
  }, [isFullscreen]);

  // ===== HUD (показывать play при движении курсора) =====
  useEffect(() => {
    const root = document.querySelector('.lyrics-controls');
    if (!root) return;
    const show = () => {
      setShowControls(true);
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setShowControls(false), 1800);
    };
    root.addEventListener('mousemove', show);
    root.addEventListener('touchstart', show as any, { passive: true });
    return () => {
      root.removeEventListener('mousemove', show);
      root.removeEventListener('touchstart', show as any);
      window.clearTimeout(idleTimer.current);
    };
  }, [isFullscreen]);

  // ===== Обновление текущей строки и подсветки =====
  useEffect(() => {
    const now = Date.now();
    const ts = timesR.current;
    if (ts.length && isFullscreen) {
      if (now >= browsingUntil.current && !animating.current) {
        let i = ub(ts, currentTime + 0.01) - 1;
        if (i < 0) i = 0;
        if (i !== idxR.current) {
          idxR.current = i;
          slideToNext(i);
        }
      }
      progressChars(currentTime);
    }
  }, [currentTime, isFullscreen]);

  // ===== фон параллакс =====
  useEffect(() => {
    if (!isFullscreen) return;
    const dur = Math.max(1, duration), ph = (currentTime / dur) * 2 * Math.PI;
    const ox = Math.sin(ph) * 1.4, oy = Math.cos(ph * 0.7) * 1.1, zoom = 1.18 + Math.sin(ph * 0.45) * 0.028;
    const root = document.documentElement.style;
    root.setProperty('--lyrics-bg-ox', `${ox}vw`);
    root.setProperty('--lyrics-bg-oy', `${oy}vh`);
    root.setProperty('--lyrics-bg-zoom', zoom.toFixed(3));
  }, [currentTime, duration, isFullscreen]);

  // ===== init лирики =====
  useEffect(() => {
    if (!currentTrack || !isFullscreen) return;
    
    (async () => {

    // Установка обложки и метаданных
    const coverUrl = currentTrack.image;
    const coverImg = document.getElementById('lyrics-cover') as HTMLImageElement;
    if (coverImg) coverImg.src = coverUrl;
    document.documentElement.style.setProperty('--lyrics-bg-url', `url(${coverUrl})`);
    const titleEl = document.getElementById('lyrics-title') as HTMLElement;
    const artistEl = document.getElementById('lyrics-artist') as HTMLElement;
    if (titleEl) titleEl.textContent = currentTrack.title;
    if (artistEl) artistEl.textContent = currentTrack.artist;

    // accent из обложки
    const img = new Image();
    img.onload = () => {
      try {
        const s = 48, c = document.createElement('canvas');
        c.width = s;
        c.height = s;
        const ctx = c.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, s, s);
        const d = ctx.getImageData(0, 0, s, s).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
          n++;
        }
        document.documentElement.style.setProperty('--lyrics-accent', `rgb(${(r / n) | 0}, ${(g / n) | 0}, ${(b / n) | 0})`);
      } catch { }
    };
    img.src = coverUrl;

    // Загрузка текстов песен из трека или генерация заглушки
    const loadLyrics = async () => {
      if (currentTrack.lyrics && typeof currentTrack.lyrics === 'string') {
        // Если текст песни - строка LRC
        return parseLRC(currentTrack.lyrics);
      } else if (currentTrack.lyricsUrl) {
        // Если есть URL текста песни
        try {
          const response = await fetch(currentTrack.lyricsUrl);
          const lrcText = await response.text();
          return parseLRC(lrcText);
        } catch (error) {
          console.error('Error loading lyrics:', error);
        }
      }
      
      // Заглушка если нет текстов
      return [
        { start: 0, end: 1e6, text: '♪ Музыка играет ♪', segments: [] },
        { start: 5, end: 1e6, text: '', segments: [] },
        { start: 10, end: 1e6, text: 'Текст песни появится здесь', segments: [] },
        { start: 15, end: 1e6, text: '', segments: [] },
        { start: 20, end: 1e6, text: '♪ ♪ ♪', segments: [] }
      ];
    };

    const parsed = await loadLyrics();
    setRows(parsed);
    rowsR.current = parsed;
    const ts = parsed.map(r => r.start);
    setTimes(ts);
    timesR.current = ts;
    if (parsed.length) {
      setIdx(0);
      idxR.current = 0;
      fillTrio(0);
      // Даём время DOM элементам создаться перед вызовом progressChars
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const nowTime = currentTime || 0;
          progressChars(nowTime + 0.001);
        });
      });
    }
    })();
  }, [currentTrack, isFullscreen]);

  // ===== обновление прогресс-бара =====
  useEffect(() => {
    const el = document.getElementById('lyrics-seek') as HTMLInputElement | null;
    if (!el || !duration) return;
    el.style.setProperty('--fill', `${(currentTime / duration) * 100}%`);
  }, [currentTime, duration]);

  const onSeek = (v: number) => {
    seek(v);
  };

  if (!currentTrack) return null;

  return (
    <AnimatePresence>
      {isFullscreen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="lyrics-wrap"
        >
          {/* Close button */}
          <button
            onClick={toggleFullscreen}
            className="fixed top-6 right-6 z-[10000] w-11 h-11 rounded-full glass flex items-center justify-center hover:scale-110 hover:bg-white/10 fast-transition gpu-accelerated"
            aria-label="Close"
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <X className="w-5 h-5" style={{ color: '#fff', opacity: 0.9 }} />
          </button>

          <div className="lyrics-card">
            <div className="lyrics-top">
              <div className="lyrics-cover-col">
                <img
                  id="lyrics-cover"
                  className="lyrics-cover"
                  src={currentTrack.image}
                  alt="cover"
                />

                <div className={`lyrics-controls ${showControls ? 'show-controls' : ''}`}>
                  <span className="lyrics-time lyrics-t1">{fmt(currentTime)}</span>

                  <div className="lyrics-range">
                    <input
                      id="lyrics-seek"
                      type="range"
                      min={0}
                      max={duration || 1}
                      step={0.001}
                      value={currentTime || 0}
                      onChange={(e) => onSeek(parseFloat(e.target.value))}
                      onMouseDown={() => setDrag(true)}
                      onMouseUp={() => setDrag(false)}
                      onTouchStart={() => setDrag(true)}
                      onTouchEnd={() => setDrag(false)}
                    />
                  </div>

                  <span className="lyrics-time lyrics-t2">{fmt(duration)}</span>

                  <div className="lyrics-hud">
                    <div className="lyrics-meta">
                      <div className="lyrics-title" id="lyrics-title">
                        {currentTrack.title}
                      </div>
                      <button
                        onClick={() => {
                          if (currentTrack?.artist) {
                            openArtistView(currentTrack.artist);
                            closePlaylist();
                            toggleFullscreen();
                          }
                        }}
                        className="lyrics-artist hover:underline cursor-pointer text-left"
                        id="lyrics-artist"
                      >
                        {currentTrack.artist}
                      </button>
                    </div>
                    <div className="lyrics-playFAB">
                      {/* Предыдущий трек */}
                      <button
                        onClick={previousTrack}
                        className="lyrics-controlBtn"
                        aria-label="Previous"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>
                      
                      {/* Play/Pause */}
                      <button
                        id="lyrics-play"
                        className="lyrics-playBtn"
                        onClick={togglePlay}
                        aria-label="Play/Pause"
                      >
                        {isPlaying ? '⏸' : '▶'}
                      </button>
                      
                      {/* Следующий трек */}
                      <button
                        onClick={nextTrack}
                        className="lyrics-controlBtn"
                        aria-label="Next"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                      
                      {/* Кнопка лайка */}
                      <button
                        onClick={() => currentTrack && toggleLike(currentTrack.title)}
                        className="lyrics-controlBtn lyrics-likeBtn"
                        aria-label="Like"
                      >
                        <Heart 
                          className="w-6 h-6" 
                          fill={currentTrack && isLiked(currentTrack.title) ? '#1ED760' : 'none'}
                          stroke={currentTrack && isLiked(currentTrack.title) ? '#1ED760' : 'currentColor'}
                          style={{
                            transition: 'all 0.2s ease',
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lyrics-right-col">
                <div ref={viewportRef} className="lyrics-viewport">
                  <div ref={railRef} className="lyrics-rail">
                    <div className="lyrics-pad lyrics-top" aria-hidden="true"></div>
                    <div ref={curRef} className="lyrics-row lyrics-cur" id="lyrics-cur"></div>
                    <div ref={n1Ref} className="lyrics-row lyrics-n1" id="lyrics-n1" />
                    <div ref={n2Ref} className="lyrics-row lyrics-n2" id="lyrics-n2" />
                    <div ref={n3Ref} className="lyrics-row lyrics-n3" id="lyrics-n3" />
                    <div className="lyrics-pad lyrics-bottom" aria-hidden="true"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
