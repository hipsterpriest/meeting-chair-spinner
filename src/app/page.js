"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const SPIN_DURATION_MS = 4200;

export default function Home() {
  const [participants, setParticipants] = useState([
    "Alex",
    "Jordan",
    "Priya",
    "Mateo",
  ]);
  const [nameInput, setNameInput] = useState("");
  const [rotation, setRotation] = useState(0);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const audioContextRef = useRef(null);
  const spinningAudioRef = useRef(null);
  const spinTimeoutRef = useRef(null);

  const sliceAngle = participants.length > 0 ? 360 / participants.length : 360;

  const wheelGradient = useMemo(() => {
    if (participants.length === 0) {
      return "conic-gradient(#f1f5f9 0deg 360deg)";
    }

    const segments = participants.map((_, index) => {
      const start = index * sliceAngle;
      const end = (index + 1) * sliceAngle;
      const hue = Math.round((index / participants.length) * 360);
      return `hsl(${hue} 86% 57%) ${start}deg ${end}deg`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [participants, sliceAngle]);

  function startSpinSound() {
    try {
      const AudioContextConstructor =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextConstructor) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextConstructor();
      }

      const context = audioContextRef.current;
      if (context.state === "suspended") {
        context.resume();
      }

      const existing = spinningAudioRef.current;
      if (existing) {
        try {
          existing.masterGain.disconnect();
        } catch {}
        try {
          existing.carrier.stop();
          existing.shimmer.stop();
          existing.wobble.stop();
        } catch {}
      }

      const masterGain = context.createGain();
      masterGain.gain.value = 0.0001;
      masterGain.connect(context.destination);

      const carrier = context.createOscillator();
      carrier.type = "sawtooth";
      carrier.frequency.value = 36;

      const shimmer = context.createOscillator();
      shimmer.type = "triangle";
      shimmer.frequency.value = 74;

      const wobble = context.createOscillator();
      wobble.type = "sine";
      wobble.frequency.value = 7;

      const wobbleGain = context.createGain();
      wobbleGain.gain.value = 4;
      wobble.connect(wobbleGain);
      wobbleGain.connect(carrier.frequency);
      wobbleGain.connect(shimmer.frequency);

      carrier.connect(masterGain);
      shimmer.connect(masterGain);

      const now = context.currentTime;
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.055, now + 0.14);

      carrier.start(now);
      shimmer.start(now);
      wobble.start(now);

      spinningAudioRef.current = {
        context,
        carrier,
        shimmer,
        wobble,
        masterGain,
      };
    } catch {
      // Audio can fail on restricted devices; spinner still works without sound.
    }
  }

  function stopSpinSound(immediate = false) {
    const active = spinningAudioRef.current;
    if (!active) {
      return;
    }

    const { context, carrier, shimmer, wobble, masterGain } = active;
    const now = context.currentTime;
    const stopAt = immediate ? now : now + 0.18;

    try {
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(
        Math.max(masterGain.gain.value, 0.0001),
        now,
      );
      masterGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    } catch {}

    window.setTimeout(() => {
      try {
        carrier.stop();
        shimmer.stop();
        wobble.stop();
      } catch {}

      try {
        masterGain.disconnect();
      } catch {}
    }, immediate ? 0 : 220);

    spinningAudioRef.current = null;
  }

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current);
      }

      stopSpinSound(true);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  function addParticipant(event) {
    event.preventDefault();
    const cleaned = nameInput.trim();

    if (!cleaned || participants.includes(cleaned)) {
      return;
    }

    setParticipants((current) => [...current, cleaned]);
    setNameInput("");
  }

  function removeParticipant(name) {
    if (isSpinning) {
      return;
    }

    setParticipants((current) => current.filter((person) => person !== name));
    if (selectedParticipant === name) {
      setSelectedParticipant(null);
    }
  }

  function spinWheel() {
    if (participants.length === 0 || isSpinning) {
      return;
    }

    const winnerIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[winnerIndex];
    const centerAngle = (winnerIndex + 0.5) * sliceAngle;
    const currentNormalized = ((rotation % 360) + 360) % 360;
    const desiredNormalized = (360 - centerAngle) % 360;
    const adjustment = (desiredNormalized - currentNormalized + 360) % 360;
    const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;

    setIsSpinning(true);
    setSelectedParticipant(null);
    setRotation((current) => current + extraSpins + adjustment);
    startSpinSound();

    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
    }

    spinTimeoutRef.current = window.setTimeout(() => {
      stopSpinSound();
      setSelectedParticipant(winner);
      setIsSpinning(false);
      spinTimeoutRef.current = null;
    }, SPIN_DURATION_MS);
  }

  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-8 sm:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.65),_transparent_55%),linear-gradient(120deg,_#fef3c7,_#dbeafe_35%,_#fde2e4_70%,_#dcfce7)]" />
      <div className="relative z-10 grid w-full max-w-7xl gap-8 rounded-3xl border border-white/60 bg-white/60 p-4 shadow-2xl backdrop-blur-xl sm:p-8 lg:grid-cols-[1fr_420px] lg:gap-10">
        <section className="flex flex-col items-center justify-center gap-6 rounded-2xl bg-slate-950/95 p-4 text-white sm:p-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
              Meeting Chair Spinner
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Who leads this meeting?
            </h1>
          </div>

          <div className="relative w-full max-w-[640px]">
            <div className="absolute left-1/2 top-0 z-20 h-0 w-0 -translate-x-1/2 border-l-[18px] border-r-[18px] border-t-[34px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]" />

            <div
              className="relative aspect-square w-full rounded-full border-[10px] border-white/90 shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
              style={{
                background: wheelGradient,
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning
                  ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.9, 0.2, 1)`
                  : "none",
              }}
            >
              <div className="absolute inset-0 rounded-full">
                {participants.map((name, index) => {
                  const angle = (index + 0.5) * sliceAngle;
                  return (
                    <div
                      key={name}
                      className="absolute left-1/2 top-1/2 flex h-1/2 w-0 -translate-x-1/2 origin-top items-start justify-center pt-[28%]"
                      style={{ transform: `rotate(${angle - 180}deg)` }}
                    >
                      <span
                        className="max-w-[120px] rounded-full bg-black/35 px-3 py-1 text-center text-xs font-semibold uppercase tracking-wide text-white shadow-lg sm:text-sm"
                        style={{ transform: `rotate(${180 - angle}deg)` }}
                      >
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute left-1/2 top-1/2 z-20 h-22 w-22 -translate-x-1/2 -translate-y-1/2 rounded-full border-8 border-slate-950 bg-white shadow-xl sm:h-24 sm:w-24" />
            </div>
          </div>

          <button
            type="button"
            onClick={spinWheel}
            disabled={isSpinning || participants.length === 0}
            className="rounded-full bg-amber-300 px-10 py-4 text-base font-black uppercase tracking-[0.2em] text-slate-950 shadow-[0_12px_30px_rgba(253,230,138,0.55)] transition hover:scale-[1.03] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSpinning ? "Spinning..." : "Spin"}
          </button>

          <div className="min-h-20 rounded-2xl border border-white/25 bg-white/10 px-6 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
              Selected Participant
            </p>
            <p className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
              {selectedParticipant ?? (isSpinning ? "Choosing..." : "Ready")}
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white/90 p-5 shadow-inner ring-1 ring-black/5 sm:p-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Participants
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Add names, spin the wheel, and randomly pick your meeting chair.
          </p>

          <form onSubmit={addParticipant} className="mt-5 flex gap-2">
            <input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Type a participant name"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
              maxLength={28}
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-slate-700"
            >
              Add
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {participants.length > 0 ? (
              participants.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeParticipant(name)}
                    disabled={isSpinning}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                    aria-label={`Remove ${name}`}
                  >
                    x
                  </button>
                </span>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
                No participants yet. Add someone to get started.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Total Entered
            </p>
            <p className="mt-1 text-3xl font-black text-slate-900">
              {participants.length}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
