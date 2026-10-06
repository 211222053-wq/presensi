"use client";

import { Camera, ScanFace, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type KnownPerson = {
  id: string;
  name: string;
  role: "STUDENT" | "TEACHER" | "STAFF" | "PARENT";
  phone?: string;
};

const DEMO_PEOPLE: KnownPerson[] = [
  { id: "u-student-1", name: "Alya Putri", role: "STUDENT", phone: "6281234567800" },
  { id: "u-teacher-1", name: "Budi Santoso", role: "TEACHER" },
  { id: "u-staff-1", name: "Chandra Wijaya", role: "STAFF" },
];

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceApiRef = useRef<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [detectedBox, setDetectedBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState(DEMO_PEOPLE[0].id);
  const [scanMessage, setScanMessage] = useState<string>("Initializing scanner...");
  const [isPosting, setIsPosting] = useState(false);
  const [postResult, setPostResult] = useState<string>("");

  const selectedUser = useMemo(() => DEMO_PEOPLE.find((person) => person.id === selectedUserId), [selectedUserId]);

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        setCameraError("Webcam access denied or unavailable.");
        setScanMessage("Unable to access webcam.");
      }
    };

    setupCamera();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadModels = async () => {
      try {
        const faceApi = await import("face-api.js");
        faceApiRef.current = faceApi;
        // Model files should be served from /public/models (see public/models/README.md).
        await Promise.all([
          faceApi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceApi.nets.faceLandmark68Net.loadFromUri("/models"),
        ]);
        if (mounted) {
          setModelStatus("ready");
          setScanMessage("Scanner online. Looking for face...");
        }
      } catch {
        if (mounted) {
          setModelStatus("fallback");
          setScanMessage("Face models unavailable. Manual assisted mode enabled.");
        }
      }
    };

    loadModels();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (modelStatus !== "ready") return;

    const interval = setInterval(async () => {
      if (!videoRef.current || !faceApiRef.current) return;

      try {
        const detection = await faceApiRef.current
          .detectSingleFace(videoRef.current, new faceApiRef.current.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (!detection || !videoRef.current) {
          setDetectedBox(null);
          setScanMessage("No face detected. Stay in frame.");
          return;
        }

        const { width: renderWidth, height: renderHeight } = videoRef.current.getBoundingClientRect();
        const widthRatio = renderWidth / videoRef.current.videoWidth;
        const heightRatio = renderHeight / videoRef.current.videoHeight;
        const box = detection.detection.box;

        setDetectedBox({
          left: box.x * widthRatio,
          top: box.y * heightRatio,
          width: box.width * widthRatio,
          height: box.height * heightRatio,
        });
        setScanMessage(`Face detected. Candidate: ${selectedUser?.name ?? "Unknown"}`);
      } catch {
        setScanMessage("Detector processing paused. You can still submit manually.");
      }
    }, 1400);

    return () => clearInterval(interval);
  }, [modelStatus, selectedUser?.name]);

  const submitAttendance = async () => {
    if (!selectedUser) return;

    setIsPosting(true);
    setPostResult("");

    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          status: "PRESENT",
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save attendance");
      }

      setPostResult(`Attendance saved for ${json.record.user.name} (${json.record.status}).`);
    } catch (error) {
      setPostResult(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cyan-200">Smart Facial Recognition Scanner</h1>
        <p className="text-sm text-slate-300">CCTV-style attendance check-in with safe fallback for first deployment.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-900/80">
          <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline />

          <div className="pointer-events-none absolute inset-0 border-2 border-cyan-400/40">
            <div className="absolute left-1/2 top-0 h-1 w-1/2 -translate-x-1/2 bg-cyan-400/60 scanner-line" />
            <div className="absolute left-3 top-3 flex items-center gap-2 text-xs text-red-300">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500">
                <span className="absolute inset-0 rounded-full bg-red-500 pulse-dot" />
              </span>
              REC
            </div>
            {detectedBox ? (
              <div
                className="absolute border-2 border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.6)]"
                style={{ left: detectedBox.left, top: detectedBox.top, width: detectedBox.width, height: detectedBox.height }}
              />
            ) : null}
          </div>

          <div className="absolute bottom-3 left-3 right-3 rounded bg-black/50 p-3 text-xs text-cyan-100">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <ScanFace size={14} /> {scanMessage}
              </span>
              <span className="uppercase text-cyan-300">{selectedUser?.role ?? "UNKNOWN"}</span>
            </div>
            <div className="mt-1 font-semibold">Matched: {selectedUser?.name ?? "Not selected"}</div>
          </div>
        </div>

        <aside className="space-y-4 rounded-xl border border-cyan-500/20 bg-slate-900/70 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
            <Camera size={16} /> Scanner Controls
          </h2>

          {cameraError ? (
            <div className="rounded border border-amber-400/40 bg-amber-950/40 p-2 text-xs text-amber-200">{cameraError}</div>
          ) : null}

          <div className="rounded border border-slate-700 p-3">
            <label className="mb-1 block text-xs text-slate-300">Recognized Person</label>
            <select
              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-2 text-sm"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
            >
              {DEMO_PEOPLE.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} ({person.role})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded border border-slate-700 p-3 text-xs text-slate-300">
            Model status: <span className="font-semibold text-cyan-200">{modelStatus}</span>
            {modelStatus === "fallback" ? (
              <p className="mt-2 flex items-start gap-2 text-amber-200">
                <ShieldAlert className="mt-0.5" size={14} />
                Put face-api model files in <code>/public/models</code> to enable full recognition.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={submitAttendance}
            disabled={isPosting || !selectedUser}
            className="w-full rounded border border-emerald-500/60 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPosting ? "Submitting..." : "Submit Attendance"}
          </button>

          {postResult ? <p className="text-xs text-cyan-100">{postResult}</p> : null}
        </aside>
      </div>
    </section>
  );
}
