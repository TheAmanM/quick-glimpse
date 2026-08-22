"use client"

import { useEffect, useRef, useState } from "react"
import { Camera, Expand, Square, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PermissionState =
  "checking" | "granted" | "prompt" | "denied" | "unsupported"

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
  const [isClosingFocusMode, setIsClosingFocusMode] = useState(false)

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
        const result = await navigator.permissions.query({
          name: "camera" as PermissionName,
        })
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
      const activeDeviceId = nextStream
        .getVideoTracks()[0]
        ?.getSettings().deviceId
      const nextDeviceId =
        deviceId || activeDeviceId || cameras[0]?.deviceId || ""
      setSelectedDeviceId(nextDeviceId)
    } catch (cameraError) {
      const message =
        cameraError instanceof DOMException &&
        cameraError.name === "NotAllowedError"
          ? "Camera access was blocked. Allow access in your browser settings and try again."
          : "We couldn't start a camera. Check that one is connected and available."
      setError(message)
      setPermission(
        cameraError instanceof DOMException &&
          cameraError.name === "NotAllowedError"
          ? "denied"
          : "prompt"
      )
    } finally {
      setIsStarting(false)
    }
  }

  function stopCamera() {
    stopCurrentStream()
    setStream(null)
    setIsFocusMode(false)
    setIsClosingFocusMode(false)
  }

  function openFocusMode() {
    setIsClosingFocusMode(false)
    setIsFocusMode(true)
  }

  function closeFocusMode() {
    setIsClosingFocusMode(true)
  }

  const isReady = stream !== null
  const showWelcome = permission !== "granted" && !isReady
  const cameraOptions = devices.map((device, index) => ({
    label: device.label || `Camera ${index + 1}`,
    value: device.deviceId,
  }))

  return (
    <main className="min-h-svh bg-background px-5 py-5 text-foreground sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-6xl flex-col sm:min-h-[calc(100svh-4rem)]">
        {showWelcome ? (
          <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-14 text-center">
            <h1 className="max-w-lg text-4xl font-medium tracking-[-0.055em] sm:text-5xl">
              Check your camera, without the meeting.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
              Choose a connected camera and see exactly what it captures. Your
              video stays on this device.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => startCamera()}
                disabled={isStarting || permission === "unsupported"}
                className="h-10 px-4"
              >
                <Camera className="size-4" />
                {isStarting ? "Starting camera..." : "Start camera"}
              </Button>
              {permission === "unsupported" && (
                <p className="text-sm text-destructive">
                  Camera access is not supported by this browser.
                </p>
              )}
            </div>
            {error && (
              <p className="mt-4 max-w-md text-sm leading-6 text-destructive">
                {error}
              </p>
            )}
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center py-8 sm:py-12">
            {!isReady ? (
              <div className="mx-auto w-full max-w-md text-center">
                <h1 className="text-3xl font-medium tracking-[-0.04em]">
                  Start a local preview.
                </h1>
                <Button
                  onClick={() => startCamera()}
                  disabled={isStarting}
                  className="mt-6 h-10 px-4"
                >
                  <Camera className="size-4" />
                  {isStarting ? "Starting camera..." : "Start camera"}
                </Button>
                {error && (
                  <p className="mt-4 text-sm leading-6 text-destructive">
                    {error}
                  </p>
                )}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-5xl">
                <div className="overflow-hidden rounded-2xl border bg-[#101010] shadow-[0_18px_50px_-26px_rgba(0,0,0,0.45)]">
                  <div className="relative aspect-video overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="size-full object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 bottom-3 size-9 rounded-xl bg-[#181818] text-white hover:bg-[#242424] hover:text-white"
                      onClick={openFocusMode}
                      aria-label="Open focused camera view"
                    >
                      <Expand className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex justify-center gap-2">
                  <Select
                    items={cameraOptions}
                    value={selectedDeviceId}
                    onValueChange={(deviceId) => {
                      if (deviceId) void startCamera(deviceId)
                    }}
                  >
                    <SelectTrigger className="w-80 max-w-[calc(100%-3.25rem)] min-w-0 rounded-xl border-0 bg-[#181818] px-4 text-white/85 hover:bg-[#242424] focus-visible:border-white/30 focus-visible:ring-white/15 data-[size=default]:h-11">
                      <Camera className="size-4 shrink-0 text-white" />
                      <SelectValue
                        className="ml-1"
                        placeholder="Choose a camera"
                      />
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      className="rounded-xl bg-[#181818] text-white ring-white/10"
                    >
                      <SelectGroup>
                        {cameraOptions.map((camera) => (
                          <SelectItem
                            key={camera.value}
                            value={camera.value}
                            className="focus:bg-white/10 focus:text-white"
                          >
                            {camera.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 rounded-xl bg-[#181818] text-white/70 hover:bg-[#242424] hover:text-white"
                    onClick={stopCamera}
                    aria-label="Stop camera"
                    title="Stop camera"
                  >
                    <Square className="size-4 fill-current" />
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {isFocusMode && stream && (
        <div
          className="focus-mode fixed inset-0 z-50 bg-black p-3 sm:p-5"
          data-closing={isClosingFocusMode || undefined}
          role="dialog"
          aria-modal="true"
          aria-label="Focused camera preview"
          onAnimationEnd={(event) => {
            if (isClosingFocusMode && event.currentTarget === event.target) {
              setIsFocusMode(false)
              setIsClosingFocusMode(false)
            }
          }}
        >
          <div className="relative size-full overflow-hidden rounded-xl bg-[#101010]">
            <video
              ref={focusVideoRef}
              autoPlay
              muted
              playsInline
              className="size-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 border border-white/10" />
            <div className="absolute inset-x-3 bottom-3 flex justify-center gap-2 sm:inset-x-5 sm:bottom-5">
              <Select
                items={cameraOptions}
                value={selectedDeviceId}
                onValueChange={(deviceId) => {
                  if (deviceId) void startCamera(deviceId)
                }}
              >
                <SelectTrigger className="w-80 max-w-[calc(100%-3.25rem)] min-w-0 rounded-xl border-0 bg-[#181818] px-4 text-white/85 hover:bg-[#242424] focus-visible:border-white/30 focus-visible:ring-white/15 data-[size=default]:h-11">
                  <Camera className="size-4 shrink-0 text-white" />
                  <SelectValue className="ml-1" placeholder="Choose a camera" />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className="rounded-xl bg-[#181818] text-white ring-white/10"
                >
                  <SelectGroup>
                    {cameraOptions.map((camera) => (
                      <SelectItem
                        key={camera.value}
                        value={camera.value}
                        className="focus:bg-white/10 focus:text-white"
                      >
                        {camera.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-xl bg-[#181818] text-white/70 hover:bg-[#242424] hover:text-white"
                onClick={closeFocusMode}
                aria-label="Close focused camera view"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
