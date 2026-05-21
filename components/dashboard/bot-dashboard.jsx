"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const initialState = {
  connectionStatus: "disconnected",
  qrStatus: "idle",
  qrCodeDataUrl: null,
  lastError: null,
  lastReceivedMessage: null,
  lastReply: null,
  totalMessagesHandled: 0,
  sessionStatus: "not-started",
};

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function statusTone(status) {
  switch (status) {
    case "connected":
    case "running":
      return "bg-emerald-400/15 text-emerald-200 ring-emerald-400/30";
    case "connecting":
    case "reconnecting":
    case "qr-ready":
      return "bg-sky-400/15 text-sky-200 ring-sky-400/30";
    case "logged-out":
    case "error":
      return "bg-rose-400/15 text-rose-200 ring-rose-400/30";
    default:
      return "bg-slate-400/15 text-slate-200 ring-slate-400/30";
  }
}

async function fetchStatus() {
  const response = await fetch("/api/bot/status", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Status request failed");
  }

  return response.json();
}

async function startBot() {
  const response = await fetch("/api/bot/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to start bot");
  }

  return response.json();
}

async function resetBot() {
  const response = await fetch("/api/bot/reset", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to reset bot session");
  }

  return response.json();
}

export default function BotDashboard() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const payload = await fetchStatus();
        if (!mounted) {
          return;
        }

        setState({
          ...initialState,
          ...payload.data,
        });
        setError(null);
      } catch (refreshError) {
        if (mounted) {
          setError(refreshError.message || "Failed to load status");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    refresh();
    const intervalId = setInterval(refresh, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      setBooting(true);

      try {
        await startBot();
        if (mounted) {
          const payload = await fetchStatus();
          setState({
            ...initialState,
            ...payload.data,
          });
        }
      } catch (startError) {
        if (mounted) {
          setError(startError.message || "Failed to start bot");
        }
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, []);

  const qrVisible = Boolean(state.qrCodeDataUrl);

  const latestMessagePreview = useMemo(() => {
    if (!state.lastReceivedMessage?.text) {
      return "Waiting for the first WhatsApp message...";
    }

    return state.lastReceivedMessage.text;
  }, [state.lastReceivedMessage]);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(96,165,250,0.18),transparent_28%),linear-gradient(180deg,#08111f_0%,#050b15_100%)]" />

      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">
                WhatsApp AI Auto Reply System
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Rantu is live on your Next.js dashboard.
                </h1>
                <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  QR scan korle bot WhatsApp e incoming message dekhe Gemini diye
                  human-like reply dibe. Bangla আর English mix kore natural vibe e
                  respond korar jonno build kora.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <StatusPill label="Connection" value={state.connectionStatus} />
                <StatusPill label="QR" value={state.qrStatus} />
                <StatusPill label="Session" value={state.sessionStatus} />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="Total handled" value={state.totalMessagesHandled} />
                <MetricCard
                  label="Last received"
                  value={formatTimestamp(state.lastReceivedMessage?.timestamp)}
                />
                <MetricCard
                  label="Last reply"
                  value={formatTimestamp(state.lastReply?.timestamp)}
                />
              </div>
            </div>

            <div className="w-full max-w-sm rounded-[1.75rem] border border-white/10 bg-slate-950/50 p-5 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-200">QR status</p>
                  <p className="text-xs text-slate-400">{state.qrStatus}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusTone(state.connectionStatus)}`}>
                  {state.connectionStatus}
                </span>
              </div>

              <div className="mt-5 flex min-h-[18rem] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-4">
                {qrVisible ? (
                  <Image
                    src={state.qrCodeDataUrl}
                    alt="WhatsApp QR code"
                    width={320}
                    height={320}
                    unoptimized
                    className="h-auto w-full max-w-[15rem] rounded-2xl bg-white p-3 shadow-2xl"
                  />
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-20 w-20 rounded-full border border-cyan-400/30 bg-cyan-400/10" />
                    <p className="text-sm text-slate-200">QR will appear here</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Keep the bot running and wait for WhatsApp session to generate.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={async () => {
                  setBooting(true);
                  setError(null);

                  try {
                    await startBot();
                    const payload = await fetchStatus();
                    setState({
                      ...initialState,
                      ...payload.data,
                    });
                  } catch (buttonError) {
                    setError(buttonError.message || "Could not restart bot");
                  } finally {
                    setBooting(false);
                  }
                }}
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={booting}
              >
                {booting ? "Starting bot..." : "Refresh WhatsApp session"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setResetting(true);
                  setError(null);

                  try {
                    await resetBot();
                    const payload = await fetchStatus();
                    setState({
                      ...initialState,
                      ...payload.data,
                    });
                  } catch (resetError) {
                    setError(resetError.message || "Could not reset session");
                  } finally {
                    setResetting(false);
                  }
                }}
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={resetting}
              >
                {resetting ? "Resetting session..." : "Reset WhatsApp session"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Last received message</h2>
                <p className="mt-1 text-sm text-slate-400">Latest incoming text from WhatsApp.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {loading ? "Loading..." : "Live polling every 5s"}
              </span>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
              <p className="text-sm leading-7 text-slate-200">{latestMessagePreview}</p>
              {state.lastReceivedMessage?.senderName ? (
                <p className="mt-4 text-xs uppercase tracking-[0.22em] text-cyan-200/80">
                  From {state.lastReceivedMessage.senderName}
                </p>
              ) : null}
            </div>

            {state.lastReply?.text ? (
              <div className="mt-5 rounded-[1.5rem] border border-emerald-400/10 bg-emerald-400/5 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-200/80">
                  Last AI reply
                </p>
                <p className="mt-3 text-sm leading-7 text-emerald-50">
                  {state.lastReply.text}
                </p>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">Connection notes</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li>• Incoming messages are ignored if they are WhatsApp status broadcasts.</li>
                <li>• Duplicate replies are blocked by a unique MongoDB message record.</li>
                <li>• Each reply waits 2 to 5 seconds and sends typing presence first.</li>
                <li>• Conversation memory is saved in MongoDB for smarter replies later.</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <h2 className="text-xl font-semibold text-white">System status</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <InfoRow label="Session" value={state.sessionStatus} />
                <InfoRow label="QR ready" value={state.qrStatus} />
                <InfoRow label="Advice" value={state.sessionStatus === "needs-reset" ? "Reset session and scan again" : "Ready"} />
                <InfoRow label="Last error" value={state.lastError || "No errors"} />
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function StatusPill({ label, value }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusTone(value)}`}>
        {value}
      </span>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-100">{value}</span>
    </div>
  );
}