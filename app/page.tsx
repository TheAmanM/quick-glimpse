"use client"

import { useEffect, useRef, useState } from "react"
import {
  Camera,
  ChevronDown,
  Expand,
  Minus,
  Plus,
  RotateCcw,
  ScanLine,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type PermissionState = "checking" | "granted" | "prompt" | "denied" | "unsupported"

export default function Page() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const focusVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [permission, setPermission] = useState<PermissionState>("checking")
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState("")
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState("")
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    async function checkCameraPermission() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermission("unsupported")
        return
      }

      if (!navigator.permissions?.query) {
        setPermission("prompt")
        return
      }

      try {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName })
        setPermission(result.state)
      } catch {
        setPermission("prompt")
      }
    }

    void checkCameraPermission()
  }, [])

  useEffect(() => {
    const attachStream = (video: HTMLVideoElement | null) => {
      if (!video || !stream) return
      video.srcObject = stream
      void video.play().catch(() => undefined)
    }

    attachStream(videoRef.current)
    attachStream(focusVideoRef.current)
  }, [stream, isFocusMode])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function listCameras() {
    const allDevices = await navigator.mediaDevices.enumerateDevices()
    const cameras = allDevices.filter((device) => device.kind === "videoinput")
    setDevices(cameras)

    return cameras
  }

  function stopCurrentStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function startCamera(deviceId?: string) {
    if (!navigator.mediaDevices?.getUserMedia) return

    setIsStarting(true)
    setError("")

    try {
      stopCurrentStream()
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: "user" },
      })
      streamRef.current = nextStream
      setStream(nextStream)
      setPermission("granted")

      const cameras = await listCameras()
      const activeDeviceId = nextStream.getVideoTracks()[0]?.getSettings().deviceId
      const nextDeviceId = deviceId || activeDeviceId || cameras[0]?.deviceId || ""
      setSelectedDeviceId(nextDeviceId)
    } catch (cameraError) {
      const message =
        cameraError instanceof DOMException && cameraError.name === "NotAllowedError"
          ? "Camera access was blocked. Allow access in your browser settings and try again."
          : "We couldn't start a camera. Check that one is connected and available."
      setError(message)
      setPermission(cameraError instanceof DOMException && cameraError.name === "NotAllowedError" ? "denied" : "prompt")
    } finally {
      setIsStarting(false)
    }
  }

  function stopCamera() {
    stopCurrentStream()
    setStream(null)
    setIsFocusMode(false)
    setZoom(1)
  }

  const isReady = stream !== null
  const showWelcome = permission !== "granted" && !isReady

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#f7f7f5] px-5 py-5 text-[#151515] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_0,transparent_calc(50%-0.5px),rgba(21,21,21,0.045)_50%,transparent_calc(50%+0.5px)),linear-gradient(to_bottom,transparent_0,transparent_8.5rem,rgba(21,21,21,0.045)_8.55rem,transparent_8.6rem)]" />

      <div className="relative mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-6xl flex-col sm:min-h-[calc(100svh-4rem)]">
        <header className="flex items-center justify-between border-b border-black/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-[#151515] text-white">
              <Camera className="size-4" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[-0.02em]">Camera check</p>
              <p className="text-xs text-black/50">Local device preview</p>
            </div>
          </div>
          <span className="hidden text-xs text-black/45 sm:block">Nothing is recorded</span>
        </header>

        {showWelcome ? (
          <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-14">
            <span className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-black/10 bg-white shadow-sm">
              <ScanLine className="size-5" strokeWidth={1.5} />
            </span>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-black/45">Quick preview</p>
            <h1 className="max-w-lg text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Check your camera, without the meeting.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-black/55">
              Choose a connected camera and see exactly what it captures. Your video stays on this device.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button onClick={() => startCamera()} disabled={isStarting || permission === "unsupported"} className="h-10 px-4">
                <Camera className="size-4" />
                {isStarting ? "Starting camera..." : "Start camera"}
              </Button>
              {permission === "unsupported" && <p className="text-sm text-destructive">Camera access is not supported by this browser.</p>}
            </div>
            {error && <p className="mt-4 max-w-md text-sm leading-6 text-destructive">{error}</p>}
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center py-8 sm:py-12">
            {!isReady ? (
              <div className="mx-auto w-full max-w-md text-center">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45">Ready when you are</p>
                <h1 className="mt-3 text-3xl font-medium tracking-[-0.04em]">Start a local preview.</h1>
                <Button onClick={() => startCamera()} disabled={isStarting} className="mt-6 h-10 px-4">
                  <Camera className="size-4" />
                  {isStarting ? "Starting camera..." : "Start camera"}
                </Button>
                {error && <p className="mt-4 text-sm leading-6 text-destructive">{error}</p>}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-5xl">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-black/45">Preview</p>
                    <h1 className="mt-1 text-2xl font-medium tracking-[-0.04em]">Looking good.</h1>
                  </div>
                  <span className="flex items-center gap-2 text-xs text-black/50"><span className="size-2 rounded-full bg-emerald-500" />Live</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#101010] shadow-[0_18px_50px_-26px_rgba(0,0,0,0.45)]">
                  <div className="relative aspect-video overflow-hidden">
                    <video ref={videoRef} autoPlay muted playsInline className="size-full object-cover" />
                    <div className="pointer-events-none absolute inset-0 border-[10px] border-black/10 sm:border-[14px]" />
                    <div className="absolute right-3 top-3 flex items-center gap-2 rounded-md bg-black/50 px-2.5 py-1.5 text-xs text-white/85 backdrop-blur-sm">
                      <span className="size-1.5 rounded-full bg-red-400" /> LIVE
                    </div>
                    <Button variant="secondary" size="icon" className="absolute bottom-3 right-3 size-9 bg-white text-black hover:bg-white/90" onClick={() => setIsFocusMode(true)} aria-label="Open focused camera view">
                      <Expand className="size-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-white/10 bg-[#181818] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <label className="group flex min-w-0 flex-1 items-center gap-3 rounded-md bg-white/8 px-3 py-2 text-sm text-white/85">
                      <Camera className="size-4 shrink-0 text-white/50" />
                      <select value={selectedDeviceId} onChange={(event) => startCamera(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent text-sm outline-none">
                        {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
                      </select>
                      <ChevronDown className="size-4 shrink-0 text-white/50" />
                    </label>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <p className="text-xs text-white/45">{devices.length} {devices.length === 1 ? "camera" : "cameras"} found</p>
                      <Button variant="ghost" className="h-8 px-2.5 text-xs text-white/70 hover:bg-white/10 hover:text-white" onClick={stopCamera}>Stop camera</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <footer className="flex items-center justify-between border-t border-black/10 pt-5 text-xs text-black/40">
          <span>Camera Check</span>
          <span>Private by default</span>
        </footer>
      </div>

      {isFocusMode && stream && (
        <div className="focus-mode fixed inset-0 z-50 bg-black p-3 sm:p-5" role="dialog" aria-modal="true" aria-label="Focused camera preview">
          <div className="relative size-full overflow-hidden rounded-xl bg-[#101010]">
            <video ref={focusVideoRef} autoPlay muted playsInline className="size-full object-cover transition-transform duration-500 ease-out" style={{ transform: `scale(${zoom})` }} />
            <div className="pointer-events-none absolute inset-0 border border-white/10" />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-md bg-black/45 px-2.5 py-1.5 text-xs text-white/80 backdrop-blur-sm"><span className="size-1.5 rounded-full bg-red-400" /> LIVE</div>
            <Button variant="secondary" size="icon" className="absolute right-4 top-4 size-9 bg-white text-black hover:bg-white/90" onClick={() => setIsFocusMode(false)} aria-label="Close focused camera view"><X className="size-4" /></Button>
            <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 sm:inset-x-5 sm:bottom-5">
              <div className="flex items-center gap-1 rounded-lg bg-black/55 p-1 backdrop-blur-md">
                <Button variant="ghost" size="icon" className="size-9 text-white hover:bg-white/15 hover:text-white" onClick={() => setZoom((current) => Math.max(1, Number((current - 0.1).toFixed(1))))} disabled={zoom <= 1} aria-label="Zoom out"><Minus className="size-4" /></Button>
                <span className="w-11 text-center text-xs tabular-nums text-white/80">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="size-9 text-white hover:bg-white/15 hover:text-white" onClick={() => setZoom((current) => Math.min(1.6, Number((current + 0.1).toFixed(1))))} disabled={zoom >= 1.6} aria-label="Zoom in"><Plus className="size-4" /></Button>
              </div>
              <label className="flex max-w-[15rem] items-center gap-2 rounded-lg bg-black/55 px-3 py-2 text-sm text-white/85 backdrop-blur-md sm:max-w-sm">
                <Camera className="size-4 shrink-0 text-white/55" />
                <select value={selectedDeviceId} onChange={(event) => startCamera(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent outline-none">
                  {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
                </select>
                <ChevronDown className="size-4 shrink-0 text-white/55" />
              </label>
              {zoom > 1 && <Button variant="ghost" size="icon" className="absolute bottom-1 left-36 size-8 text-white/70 hover:bg-white/15 hover:text-white sm:left-40" onClick={() => setZoom(1)} aria-label="Reset zoom"><RotateCcw className="size-3.5" /></Button>}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
