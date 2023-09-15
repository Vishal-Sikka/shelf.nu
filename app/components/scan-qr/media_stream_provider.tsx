import type {
  FC,
  HTMLAttributes,
  MutableRefObject,
  PropsWithChildren,
} from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import DetectRTC from "detectrtc";
import type { VoidOrPromiseFunction } from "./noop";
import { noop } from "./noop";
import { useBooleanState } from "./use_boolean_state";

type MediaStreamContextValue = {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  startMediaStream: (
    args: { videoTrackConstraints?: MediaTrackConstraints } | void
  ) => void | Promise<void>;
  stopMediaStream: VoidOrPromiseFunction;
  mediaDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  currentVideoDeviceId: string;
  isVideoPlayed: boolean;
  onChangeConstraints: MediaStreamTrack["applyConstraints"];
  videoTrackInfo:
    | {
        capabilities: MediaTrackCapabilities;
        constraints: MediaTrackConstraints;
        settings: MediaTrackSettings;
      }
    | undefined;
};

export const MediaStreamContext = createContext<MediaStreamContextValue>({
  canvasRef: { current: null },
  currentVideoDeviceId: "",
  isVideoPlayed: false,
  mediaDevices: [],
  onChangeConstraints: noop as MediaStreamTrack["applyConstraints"],
  startMediaStream: noop,
  stopMediaStream: noop,
  videoDevices: [],
  videoRef: { current: null },
  videoTrackInfo: undefined,
});

export const MediaStreamProvider: FC<PropsWithChildren> = ({ children }) => {
  const [mediaDevices, setMediaDevices] = useState<
    MediaStreamContextValue["mediaDevices"]
  >([]);
  const [videoDevices, setVideoDevices] = useState<
    MediaStreamContextValue["videoDevices"]
  >([]);
  const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState("");
  const [videoTrackInfo, setVideoTrackInfo] =
    useState<MediaStreamContextValue["videoTrackInfo"]>();
  const {
    isTruthy: isVideoPlayed,
    onTruthy: playVideoState,
    onFalsy: stopVideoState,
  } = useBooleanState({ isTruthy: false });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startMediaStream = useCallback<
    MediaStreamContextValue["startMediaStream"]
  >(
    async (args) => {
      try {
        const video = videoRef.current;
        if (!video) return;

        const mediaStream = await navigator.mediaDevices?.getUserMedia({
          audio: false,
          video: args?.videoTrackConstraints || true,
        });
        if (!mediaStream) return;

        DetectRTC.load(noop);

        video.muted = true;
        video.volume = 0;
        video.playsInline = true;
        video.setAttribute("playsinline", "playsinline");
        try {
          video.srcObject = mediaStream;
        } catch (e) {
          console.error("set srcObject", e);
        }
        await video.play().catch((error) => {
          console.error("video.play.error", error);
        });
        playVideoState();

        const newMediaDevices =
          await navigator.mediaDevices?.enumerateDevices();
        setMediaDevices(newMediaDevices);
        setVideoDevices(
          newMediaDevices.filter((device) => device.kind === "videoinput")
        );

        const videoTrack = mediaStream.getVideoTracks()[0];
        setCurrentVideoDeviceId(videoTrack?.getSettings().deviceId || "");

        setVideoTrackInfo({
          capabilities: videoTrack.getCapabilities(),
          constraints: videoTrack.getConstraints(),
          settings: videoTrack.getSettings(),
        });
      } catch (error: any) {
        console.error(error);
      }
    },
    [playVideoState, setCurrentVideoDeviceId]
  );

  const stopMediaStream = useCallback<
    MediaStreamContextValue["stopMediaStream"]
  >(() => {
    try {
      const video = videoRef.current;
      if (!video) return;

      const mediaStream = video.srcObject as MediaStream;
      mediaStream?.getTracks().forEach((track) => {
        track.stop();
      });
      video.srcObject = null;

      stopVideoState();

      setVideoTrackInfo(undefined);
      setCurrentVideoDeviceId("");
    } catch (error: any) {
      console.error(error);
    }
  }, [videoRef, stopVideoState]);

  const onChangeConstraints = useCallback<
    MediaStreamContextValue["onChangeConstraints"]
  >(
    async (constraints) => {
      const video = videoRef.current;
      if (!video) return;

      const mediaStream = video.srcObject as MediaStream;
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (!videoTrack) return;

      const advanced: MediaTrackConstraintSet[] = [];

      const deviceId = videoTrack.getSettings().deviceId;

      advanced.push({
        deviceId: constraints?.deviceId || deviceId,
      });

      if (constraints?.height) {
        advanced.push({
          height: constraints.height,
        });
      }

      if (constraints?.width) {
        advanced.push({
          width: constraints.width,
        });
      }

      if (constraints?.aspectRatio) {
        advanced.push({
          aspectRatio: constraints.aspectRatio,
        });
      }

      if (
        constraints?.deviceId ||
        constraints?.height ||
        constraints?.width ||
        constraints?.aspectRatio
      ) {
        stopMediaStream();
        startMediaStream({
          videoTrackConstraints: {
            ...constraints,
            advanced,
          },
        });
        return;
      }

      try {
        const mediaStream = video.srcObject as MediaStream;
        const videoTrack = mediaStream.getVideoTracks()[0];

        if (!videoTrack) return;

        await videoTrack?.applyConstraints(constraints);
        setCurrentVideoDeviceId(videoTrack?.getSettings().deviceId || "");

        setVideoTrackInfo({
          capabilities: videoTrack.getCapabilities(),
          constraints: videoTrack.getConstraints(),
          settings: videoTrack.getSettings(),
        });
      } catch (error: any) {
        console.error(error);
      }
    },
    [startMediaStream, stopMediaStream]
  );

  const value = useMemo(
    () => ({
      canvasRef,
      currentVideoDeviceId,
      isVideoPlayed,
      mediaDevices,
      onChangeConstraints,
      startMediaStream,
      stopMediaStream,
      videoDevices,
      videoRef,
      videoTrackInfo,
    }),
    [
      currentVideoDeviceId,
      isVideoPlayed,
      mediaDevices,
      onChangeConstraints,
      startMediaStream,
      stopMediaStream,
      videoDevices,
      videoTrackInfo,
    ]
  );

  return (
    <MediaStreamContext.Provider value={value}>
      {children}
    </MediaStreamContext.Provider>
  );
};

export const useMediaStream = () => useContext(MediaStreamContext);

export const useStopMediaStream = () => {
  const { stopMediaStream } = useMediaStream();

  useEffect(
    () => () => {
      stopMediaStream();
    },
    [stopMediaStream]
  );
};

type MediaStreamVideoProps = HTMLAttributes<HTMLVideoElement> & {
  mediaStream: MediaStream;
};

export const MediaStreamVideo: FC<MediaStreamVideoProps> = ({
  mediaStream,
  ...props
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (video?.played) {
      return;
    }

    if (video && mediaStream) {
      video.muted = true;
      video.volume = 0;
      video.setAttribute("playsinline", "playsinline");
      video.srcObject = mediaStream;
      video.play().then(() => {});
    }
  }, [mediaStream]);

  return <video ref={videoRef} {...props} />;
};
