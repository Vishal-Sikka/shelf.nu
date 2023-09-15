import React, { useRef, useEffect, useContext } from "react";
import {
  BrowserMultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
} from "@zxing/library";
import { MediaStreamContext } from "./media_stream_provider";

interface QRScannerProps {
  onScan: (data: string | null) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { startMediaStream, stopMediaStream, videoDevices } =
    useContext(MediaStreamContext);

  useEffect(() => {
    // Start the media stream when the component mounts
    const initMediaStream = async () => {
      try {
        await startMediaStream();
      } catch (error) {
        console.error("Error starting media stream:", error);
      }
    };
    initMediaStream();

    // Stop the media stream when the component unmounts
    return () => {
      try {
        stopMediaStream();
      } catch (error) {
        console.error("Error stopping media stream:", error);
      }
    };
  }, [startMediaStream, stopMediaStream]);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    codeReader.hints = hints;

    if (videoRef.current) {
      codeReader.decodeFromVideoDevice(
        null,
        videoRef.current,
        (result, error) => {
          if (result) {
            const scannedData = result.getText();
            onScan(scannedData || null); // Ensure you pass a valid value
          } else if (error instanceof Error) {
            console.error("Error decoding from video device:", error.message);
          }
        }
      );
    }
  }, [videoDevices, onScan]);

  return (
    <div className="relative">
      <video ref={videoRef} width="100%" height="720px" autoPlay={true} />
      <button
        onClick={() => {
          onClose();
        }}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white"
        title="Close Scanner"
      >
        &times;
      </button>
    </div>
  );
};

export default QRScanner;
