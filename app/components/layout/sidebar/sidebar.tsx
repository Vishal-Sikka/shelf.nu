import { useEffect, useRef, useState } from "react";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { useAtom } from "jotai";
import { BarCodeIcon, ShelfTypography } from "~/components/icons/library";

import type { loader } from "~/routes/_layout+/_layout";
import { tw } from "~/utils";

import { toggleMobileNavAtom } from "./atoms";
import SidebarBottom from "./bottom";
import MenuButton from "./menu-button";
import MenuItems from "./menu-items";
import Overlay from "./overlay";
import { useMediaStream } from "~/components/scan-qr/media_stream_provider";
import QRCodeScanner from "~/components/scan-qr/QRCodeScanner";

export default function Sidebar() {
  const { user, minimizedSidebar } = useLoaderData<typeof loader>();
  const [isMobileNavOpen, toggleMobileNav] = useAtom(toggleMobileNavAtom);
  const mainNavigationRef = useRef<HTMLElement>(null);

  const [showScanner, setShowScanner] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedSuccessfully, setScannedSuccessfully] = useState(false);

  const { startMediaStream, stopMediaStream } = useMediaStream();

  const isValidQRCode = (data: string) => {
    const regex = /^(https?:\/\/)([^/:]+)(:\d+)?\/qr\/[a-zA-Z0-9]+$/;
    return regex.test(data);
  };

  const handleQRScan = (data: string | null) => {
    if (data) {
      if (isValidQRCode(data)) {
        setScannedSuccessfully(true);

        setShowScanner(false);
        setErrorMessage(null);
        window.location.href = data;
      } else {
        setErrorMessage("Not a valid QR code.");
      }
    }
  };

  useEffect(() => {
    if (showScanner) {
      // Start the media stream when `showScanner` is true
      startMediaStream({});
    } else {
      // Stop the media stream when `showScanner` is false
      stopMediaStream();
    }
  }, [showScanner, startMediaStream, stopMediaStream]);

  const handleScannerClose = () => {
    stopMediaStream();
    setShowScanner(false);
    setErrorMessage(null);
    window.location.reload(); // Clear error messages when closing the scanner
  };

  /** We use optimistic UI for folding of the sidebar
   * As we are making a request to the server to store the cookie,
   * we need to use this approach, otherwise the sidebar will close/open
   * only once the response is received from the server
   */
  const sidebarFetcher = useFetcher();
  let optimisticMinimizedSidebar = minimizedSidebar;
  if (sidebarFetcher.formData) {
    optimisticMinimizedSidebar =
      sidebarFetcher.formData.get("minimizeSidebar") === "open";
  }
  return (
    <>
      {/* this component is named sidebar as of now but also serves as a mobile navigation header in mobile device */}
      <header
        id="header"
        className="flex items-center justify-between border-b bg-white p-4 md:hidden"
      >
        <Link to="." title="Home" className="block h-[32px]">
          <img
            src="/images/logo-full-color(x2).png"
            alt="logo"
            className="h-full"
          />
        </Link>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowScanner(true)}
            title="Scan QR Code"
            className="relative flex items-center justify-center px-2 transition"
          >
            <BarCodeIcon className="h-6 w-6 text-gray-500" />
          </button>
          <MenuButton />
        </div>
      </header>
      {showScanner && (
        <div className="relative">
          <QRCodeScanner
            onScan={(data) => handleQRScan(data)}
            onClose={() => setShowScanner(false)}
          />
          {/* Add a close button on top right corner of the scanner */}
          <button
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white"
            onClick={handleScannerClose}
            title="Close Scanner"
          >
            &times; {/* This is an "X" character */}
          </button>
        </div>
      )}

      {scannedSuccessfully && (
        <div className="my-4 flex items-center justify-center rounded border border-green-300 bg-green-100 p-4 text-green-700">
          Assets scanned successfully...
        </div>
      )}

      {errorMessage && (
        <div className="my-4 flex items-center justify-between rounded border border-red-300 bg-red-100 p-4 text-red-700">
          {errorMessage}
          <button
            className="text-red-700 hover:text-red-500"
            onClick={() => setErrorMessage(null)}
          >
            Close
          </button>
        </div>
      )}
      <Overlay />
      <aside
        id="main-navigation"
        ref={mainNavigationRef}
        className={tw(
          `main-navigation fixed top-0 z-30 flex h-screen max-h-screen flex-col border-r border-gray-200 bg-white p-4 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),_0px_8px_8px_-4px_rgba(16,24,40,0.03)] transition-all duration-300 ease-linear md:sticky md:left-0 md:px-4 md:py-8 md:shadow-none md:duration-200`,
          optimisticMinimizedSidebar
            ? "collapsed-navigation md:w-[82px] md:overflow-hidden"
            : "md:left-0 md:w-[312px]",
          isMobileNavOpen ? "left-0 w-[312px] overflow-hidden " : "left-[-100%]"
        )}
      >
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="navigation-header flex items-center justify-between">
            <Link
              to="."
              title="Home"
              className="logo flex items-center"
              onClick={toggleMobileNav}
            >
              <img
                src="/images/shelf-symbol.png"
                alt="Shelf Logo"
                className="mx-1.5 inline h-[32px]"
              />
              <span className="logo-text transition duration-200 ease-linear">
                <ShelfTypography />
              </span>
            </Link>
            {/* <button
              className={tw(
                " hide-show-sidebar bg-gray-100 px-3 py-[10px] transition-all duration-200 ease-linear hover:bg-gray-200 md:block",
                maintainUncollapsedSidebar
                  ? "rotate-180"
                  : " fixed left-[93px] md:hidden"
              )}
              onClick={manageUncollapsedSidebar}
            >
              <i className="icon text-gray-500">
                <ChevronRight />
              </i>
            </button> */}
          </div>
          <div className="flex-1">
            <MenuItems fetcher={sidebarFetcher} />
          </div>
        </div>

        <div className="mt-auto">
          <SidebarBottom
            user={{
              ...user,
            }}
          />
        </div>
      </aside>
    </>
  );
}
