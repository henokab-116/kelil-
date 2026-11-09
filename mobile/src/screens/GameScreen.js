import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Btn, Muted, H } from '../components/UI';
import { useI18n } from '../i18n';
import { store } from '../storage';
import { colors } from '../theme';

// "Bajaj Dash": offline lane-dodging game. Scores never touch the server (no money, no rewards, nothing to cheat).
const LANES = 3;
const PLAYER_SIZE = 46;
const ITEM_SIZE = 40;

export default function GameScreen() {
  const { t } = useI18n();
  const [phase, setPhase] = useState('idle'); // idle | playing | over
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, setFrame] = useState(0);
  const [best, setBest] = useState(0);
  const bestRef = useRef(0);
  const [newBest, setNewBest] = useState(false);
  const g = useRef({ lane: 1, items: [], score: 0, coins: 0, dist: 0, speed: 200, spawnIn: 0.6, nextId: 1 });
  const raf = useRef(null);
  const last = useRef(0);

  useEffect(() => { store.get('tp_game_best').then((v) => { bestRef.current = Number(v) || 0; setBest(bestRef.current); }); }, []);
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const finish = useCallback((score) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setPhase('over');
    if (score > bestRef.current) {
      bestRef.current = score;
      setBest(score);
      setNewBest(true);
      store.set('tp_game_best', String(score));
    }
  }, []);

  const step = useCallback((now) => {
    const s = g.current;
    const dt = Math.min(0.05, (now - last.current) / 1000 || 0.016);
    last.current = now;
    const { h } = size;
    const playerY = h - PLAYER_SIZE - 24;

    s.dist += s.speed * dt;
    s.speed = Math.min(520, 200 + s.dist / 40);
    s.spawnIn -= dt;
    if (s.spawnIn <= 0) {
      const lane = Math.floor(Math.random() * LANES);
      const coin = Math.random() < 0.45;
      s.items.push({ id: s.nextId++, lane, y: -ITEM_SIZE, coin });
      s.spawnIn = Math.max(0.32, 0.85 - s.dist / 6000) * (0.7 + Math.random() * 0.6);
    }
    let hit = false;
    for (const it of s.items) {
      it.y += s.speed * dt;
      if (it.lane === s.lane && Math.abs(it.y - playerY) < (PLAYER_SIZE + ITEM_SIZE) / 2 - 6) {
        if (it.coin) { s.coins += 1; it.gone = true; } else hit = true;
      }
    }
    s.items = s.items.filter((it) => !it.gone && it.y < h + ITEM_SIZE);
    s.score = s.coins * 10 + Math.floor(s.dist / 100);
    setFrame((f) => (f + 1) % 1000000);
    if (hit) return finish(s.score);
    raf.current = requestAnimationFrame(step);
  }, [size, finish]);

  const start = () => {
    if (!size.h) return;
    g.current = { lane: 1, items: [], score: 0, coins: 0, dist: 0, speed: 200, spawnIn: 0.6, nextId: 1 };
    setNewBest(false);
    setPhase('playing');
    last.current = 0;
    raf.current = requestAnimationFrame((now) => { last.current = now; raf.current = requestAnimationFrame(step); });
  };

  const move = (d) => { if (phase === 'playing') g.current.lane = Math.max(0, Math.min(LANES - 1, g.current.lane + d)); };
  const laneW = size.w / LANES;
  const s = g.current;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <H style={{ marginBottom: 0 }}>🛺 {t('gameTitle')}</H>
        <Text style={{ fontWeight: '800', color: colors.text }}>{t('gameScore')}: {s.score}   {t('gameBest')}: {best}</Text>
      </View>
      <View
        style={{ flex: 1, marginTop: 10, borderRadius: 14, overflow: 'hidden', backgroundColor: '#3a3f4b' }}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {size.w > 0 && [1, 2].map((i) => (
          <View key={i} style={{ position: 'absolute', left: laneW * i - 1, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
        ))}
        {phase !== 'idle' && s.items.map((it) => (
          <Text key={it.id} style={{ position: 'absolute', left: laneW * it.lane + (laneW - ITEM_SIZE) / 2, top: it.y, fontSize: 30, width: ITEM_SIZE, textAlign: 'center' }}>
            {it.coin ? '🪙' : '🚧'}
          </Text>
        ))}
        {size.w > 0 && (
          <Text style={{ position: 'absolute', left: laneW * s.lane + (laneW - PLAYER_SIZE) / 2, top: size.h - PLAYER_SIZE - 24, fontSize: 36, width: PLAYER_SIZE, textAlign: 'center' }}>🛺</Text>
        )}
        {phase === 'playing' && (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
            <Pressable style={{ flex: 1 }} onPressIn={() => move(-1)} />
            <Pressable style={{ flex: 1 }} onPressIn={() => move(1)} />
          </View>
        )}
        {phase !== 'playing' && (
          <View style={{ ...StyleAbs, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            {phase === 'over' && <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>{t('gameOver')}</Text>}
            {phase === 'over' && <Text style={{ color: '#ffc107', fontSize: 18, fontWeight: '800', marginVertical: 6 }}>{t('gameScore')}: {s.score}</Text>}
            {phase === 'over' && newBest && <Text style={{ color: '#fff', marginBottom: 6 }}>🏆 {t('newBest')}</Text>}
            {phase === 'idle' && <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 14, fontSize: 15 }}>{t('gameIntro')}</Text>}
            <Btn title={phase === 'over' ? t('gameAgain') : t('gameStart')} onPress={start} style={{ minWidth: 180 }} />
          </View>
        )}
      </View>
      <Muted style={{ textAlign: 'center', marginTop: 8 }}>{t('gameNote')}</Muted>
    </View>
  );
}

const StyleAbs = { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 };
