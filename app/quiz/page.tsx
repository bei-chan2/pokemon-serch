'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

const TYPE_JA: Record<string, string> = {
  normal: 'ノーマル', fire: 'ほのお', water: 'みず', electric: 'でんき',
  grass: 'くさ', ice: 'こおり', fighting: 'かくとう', poison: 'どく',
  ground: 'じめん', flying: 'ひこう', psychic: 'エスパー', bug: 'むし',
  rock: 'いわ', ghost: 'ゴースト', dragon: 'ドラゴン', dark: 'あく',
  steel: 'はがね', fairy: 'フェアリー',
};

const TYPE_COLOR: Record<string, string> = {
  normal: 'bg-gray-400 text-white', fire: 'bg-orange-500 text-white',
  water: 'bg-blue-500 text-white', electric: 'bg-yellow-400 text-gray-900',
  grass: 'bg-green-500 text-white', ice: 'bg-cyan-300 text-gray-900',
  fighting: 'bg-red-700 text-white', poison: 'bg-purple-500 text-white',
  ground: 'bg-yellow-700 text-white', flying: 'bg-indigo-300 text-gray-900',
  psychic: 'bg-pink-500 text-white', bug: 'bg-lime-500 text-gray-900',
  rock: 'bg-yellow-600 text-white', ghost: 'bg-purple-700 text-white',
  dragon: 'bg-indigo-600 text-white', dark: 'bg-gray-700 text-white',
  steel: 'bg-slate-400 text-gray-900', fairy: 'bg-pink-300 text-gray-900',
};

const STAT_JA: Record<string, string> = {
  hp: 'HP', attack: 'こうげき', defense: 'ぼうぎょ',
  'special-attack': 'とくこう', 'special-defense': 'とくぼう', speed: 'すばやさ',
};

const STAT_COLOR: Record<string, string> = {
  hp: 'bg-red-500', attack: 'bg-orange-500', defense: 'bg-yellow-500',
  'special-attack': 'bg-blue-500', 'special-defense': 'bg-green-500', speed: 'bg-pink-500',
};

interface Stat { name: string; value: number }

interface PokemonData {
  id: number;
  nameJa: string;
  genusJa: string;
  flavorText: string;
  types: { en: string; ja: string }[];
  height: number;
  weight: number;
  stats: Stat[];
  abilityNames: string[];
  moveNames: string[];
  imageUrl: string;
}

async function fetchPokemonData(id: number): Promise<PokemonData> {
  const [pokeRes, speciesRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ]);
  const poke = await pokeRes.json();
  const species = await speciesRes.json();

  const nameJa =
    species.names.find((n: { language: { name: string }; name: string }) => n.language.name === 'ja-Hrkt')?.name ||
    species.names.find((n: { language: { name: string }; name: string }) => n.language.name === 'ja')?.name ||
    poke.name;

  const genusJa =
    species.genera?.find((g: { language: { name: string }; genus: string }) => g.language.name === 'ja-Hrkt')?.genus ||
    species.genera?.find((g: { language: { name: string }; genus: string }) => g.language.name === 'ja')?.genus || '';

  const flavorText =
    species.flavor_text_entries
      ?.filter((f: { language: { name: string }; flavor_text: string }) => f.language.name === 'ja')
      .at(-1)?.flavor_text?.replace(/\f|\n/g, ' ') || '';

  const types = poke.types.map((t: { type: { name: string } }) => ({
    en: t.type.name,
    ja: TYPE_JA[t.type.name] || t.type.name,
  }));

  const stats: Stat[] = poke.stats.map((s: { stat: { name: string }; base_stat: number }) => ({
    name: s.stat.name,
    value: s.base_stat,
  }));

  const abilityNames: string[] = poke.abilities.map(
    (a: { ability: { name: string } }) => a.ability.name
  );

  const shuffled = [...poke.moves].sort(() => Math.random() - 0.5);
  const moveNames = shuffled.slice(0, 3).map((m: { move: { name: string } }) => m.move.name);

  return {
    id, nameJa, genusJa, flavorText, types,
    height: poke.height, weight: poke.weight,
    stats, abilityNames, moveNames,
    imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
  };
}

async function getJaName(name: string, endpoint: string): Promise<string> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/${endpoint}/${name}`);
    const data = await res.json();
    return (
      data.names.find((n: { language: { name: string }; name: string }) => n.language.name === 'ja-Hrkt')?.name ||
      data.names.find((n: { language: { name: string }; name: string }) => n.language.name === 'ja')?.name ||
      name
    );
  } catch { return name; }
}

function getRandomIds(exclude: number, count: number, max = 1025): number[] {
  const ids = new Set<number>();
  while (ids.size < count) {
    const id = Math.floor(Math.random() * max) + 1;
    if (id !== exclude) ids.add(id);
  }
  return [...ids];
}

function StatBar({ stat }: { stat: Stat }) {
  const pct = Math.min((stat.value / 255) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-xs w-16 shrink-0">{STAT_JA[stat.name] ?? stat.name}</span>
      <span className="text-white text-xs w-7 text-right shrink-0">{stat.value}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div
          className={`${STAT_COLOR[stat.name] ?? 'bg-gray-400'} h-2 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Detail panel for one Pokemon (with lazy ja name loading)
function PokemonDetail({
  pokemon,
  jaCache,
  onJaLoaded,
}: {
  pokemon: PokemonData;
  jaCache: Map<number, { abilities: string[]; moves: string[] }>;
  onJaLoaded: (id: number, abilities: string[], moves: string[]) => void;
}) {
  const cached = jaCache.get(pokemon.id);
  const jaAbilities = cached?.abilities ?? [];
  const jaMoves = cached?.moves ?? [];

  useEffect(() => {
    if (jaCache.has(pokemon.id)) return;
    Promise.all([
      Promise.all(pokemon.abilityNames.map((n) => getJaName(n, 'ability'))),
      Promise.all(pokemon.moveNames.map((n) => getJaName(n, 'move'))),
    ]).then(([abilities, moves]) => onJaLoaded(pokemon.id, abilities, moves));
  }, [pokemon.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalStats = pokemon.stats.reduce((a, s) => a + s.value, 0);

  return (
    <div className="space-y-4">
      {/* Image + Name */}
      <div className="flex items-center gap-4">
        <Image
          src={pokemon.imageUrl}
          alt={pokemon.nameJa}
          width={80}
          height={80}
          className="object-contain shrink-0"
        />
        <div>
          <p className="text-xl font-bold">{pokemon.nameJa}</p>
          {pokemon.genusJa && <p className="text-gray-400 text-sm">{pokemon.genusJa}</p>}
          <div className="flex gap-1.5 mt-1">
            {pokemon.types.map((t) => (
              <span
                key={t.en}
                className={`${TYPE_COLOR[t.en] ?? 'bg-gray-500 text-white'} text-xs font-bold px-2.5 py-0.5 rounded-full`}
              >
                {t.ja}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Flavor text */}
      {pokemon.flavorText && (
        <p className="text-gray-300 text-sm leading-relaxed bg-gray-700/50 rounded-xl p-3">
          {pokemon.flavorText}
        </p>
      )}

      {/* Height / Weight */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-0.5">高さ</p>
          <p className="font-bold">{(pokemon.height / 10).toFixed(1)} m</p>
        </div>
        <div className="bg-gray-700/50 rounded-xl p-3 text-center">
          <p className="text-gray-400 text-xs mb-0.5">重さ</p>
          <p className="font-bold">{(pokemon.weight / 10).toFixed(1)} kg</p>
        </div>
      </div>

      {/* Base Stats */}
      <div>
        <p className="text-gray-400 text-sm mb-2">基本ステータス</p>
        <div className="space-y-1.5">
          {pokemon.stats.map((s) => <StatBar key={s.name} stat={s} />)}
        </div>
        <p className="text-gray-500 text-xs text-right mt-1">合計: {totalStats}</p>
      </div>

      {/* Abilities */}
      <div className="flex items-start gap-3">
        <span className="text-gray-400 text-sm w-16 shrink-0 pt-1">とくせい</span>
        <div className="flex flex-wrap gap-1.5">
          {(jaAbilities.length > 0 ? jaAbilities : pokemon.abilityNames).map((a, i) => (
            <span key={i} className="bg-indigo-700/60 border border-indigo-500/40 text-sm px-3 py-1 rounded-full">
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Moves */}
      <div className="flex items-start gap-3">
        <span className="text-gray-400 text-sm w-16 shrink-0 pt-1">おぼえるわざ</span>
        <div className="flex flex-wrap gap-1.5">
          {(jaMoves.length > 0 ? jaMoves : pokemon.moveNames).map((m, i) => (
            <span key={i} className="bg-gray-700 border border-gray-600 text-sm px-3 py-1 rounded-full">
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type GameState = 'loading' | 'playing' | 'answered';

export default function QuizPage() {
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [allPokemon, setAllPokemon] = useState<PokemonData[]>([]);
  const [correctId, setCorrectId] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  // ja name cache: pokemonId → { abilities, moves }
  const jaCache = useRef<Map<number, { abilities: string[]; moves: string[] }>>(new Map());
  const [, forceUpdate] = useState(0);

  const handleJaLoaded = useCallback((id: number, abilities: string[], moves: string[]) => {
    jaCache.current.set(id, { abilities, moves });
    forceUpdate((n) => n + 1);
  }, []);

  const loadQuestion = useCallback(async () => {
    setGameState('loading');
    setSelectedId(null);
    jaCache.current.clear();

    const cId = Math.floor(Math.random() * 1025) + 1;
    const wrongIds = getRandomIds(cId, 3);
    const allIds = [cId, ...wrongIds].sort(() => Math.random() - 0.5);

    const pokeList = await Promise.all(allIds.map(fetchPokemonData));

    setCorrectId(cId);
    setAllPokemon(pokeList);
    // default detail tab = correct Pokemon
    setActiveTab(pokeList.findIndex((p) => p.id === cId));
    setGameState('playing');
  }, []);

  useEffect(() => { loadQuestion(); }, [loadQuestion]);

  const handleAnswer = (choiceId: number) => {
    if (gameState !== 'playing') return;
    setSelectedId(choiceId);
    if (choiceId === correctId) setScore((s) => s + 1);
    setActiveTab(allPokemon.findIndex((p) => p.id === correctId));
    setGameState('answered');
  };

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-xl">読み込み中...</p>
        </div>
      </div>
    );
  }

  const isCorrect = selectedId === correctId;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 pb-10">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pt-2">
          <h1 className="text-2xl font-bold text-yellow-400">ポケモンクイズ</h1>
          <div className="bg-yellow-400 text-gray-900 px-4 py-1.5 rounded-full font-bold text-sm">
            スコア: {score}
          </div>
        </div>

        {/* Pokemon images row (playing: show question mark, answered: show all) */}
        {gameState === 'playing' && allPokemon.length > 0 && (
          <div className="flex justify-center mb-4">
            <div className="bg-gray-800 rounded-3xl p-4 w-52 h-52 flex items-center justify-center">
              {(() => {
                const url = allPokemon.find((p) => p.id === correctId)?.imageUrl;
                return url ? (
                  <Image
                    src={url}
                    alt="pokemon"
                    width={208}
                    height={208}
                    className="object-contain"
                    priority
                  />
                ) : null;
              })()}
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            <p className="text-center text-lg font-semibold mb-4">このポケモンはだれ？</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {allPokemon.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAnswer(p.id)}
                  className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200"
                >
                  {p.nameJa}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Result banner */}
        {gameState === 'answered' && (
          <>
            {isCorrect ? (
              <div className="bg-green-500/20 border border-green-500/40 rounded-2xl py-3 px-4 mb-4 text-center">
                <p className="text-green-400 text-xl font-bold">✓ せいかい！</p>
              </div>
            ) : (
              <div className="bg-red-500/20 border border-red-500/40 rounded-2xl py-3 px-4 mb-4 text-center">
                <p className="text-red-400 text-xl font-bold">✗ ざんねん！</p>
                <p className="text-gray-300 text-sm mt-0.5">
                  正解は{' '}
                  <span className="text-yellow-400 font-bold">
                    {allPokemon.find((p) => p.id === correctId)?.nameJa}
                  </span>{' '}
                  でした
                </p>
              </div>
            )}

            {/* Answer summary row */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {allPokemon.map((p) => {
                const isCorrectPoke = p.id === correctId;
                const isSelected = p.id === selectedId;
                let cls = 'bg-gray-700 border-gray-600';
                if (isCorrectPoke) cls = 'bg-green-600/30 border-green-500';
                else if (isSelected) cls = 'bg-red-600/30 border-red-500';
                return (
                  <div key={p.id} className={`border rounded-xl px-3 py-2 flex items-center gap-2 ${cls}`}>
                    <span className="text-lg">{isCorrectPoke ? '✓' : isSelected ? '✗' : '　'}</span>
                    <span className="text-sm font-semibold">{p.nameJa}</span>
                  </div>
                );
              })}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {allPokemon.map((p, i) => {
                const isCorrectPoke = p.id === correctId;
                const isSelected = p.id === selectedId;
                let tabCls = 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400';
                if (activeTab === i) {
                  if (isCorrectPoke) tabCls = 'border-green-400 text-green-300 bg-green-500/10';
                  else if (isSelected) tabCls = 'border-red-400 text-red-300 bg-red-500/10';
                  else tabCls = 'border-blue-400 text-blue-300 bg-blue-500/10';
                }
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveTab(i)}
                    className={`border-b-2 px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${tabCls}`}
                  >
                    {isCorrectPoke && '✓ '}{isSelected && !isCorrectPoke && '✗ '}{p.nameJa}
                  </button>
                );
              })}
            </div>

            {/* Detail panel */}
            {allPokemon[activeTab] && (
              <div className="bg-gray-800 rounded-2xl p-5 mb-4 border border-gray-700">
                <PokemonDetail
                  pokemon={allPokemon[activeTab]}
                  jaCache={jaCache.current}
                  onJaLoaded={handleJaLoaded}
                />
              </div>
            )}

            <button
              onClick={loadQuestion}
              className="w-full bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-gray-900 font-bold py-3.5 rounded-xl transition-all duration-200 text-lg"
            >
              次の問題へ →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
