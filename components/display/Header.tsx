interface HeaderProps {
  onFullscreen: () => void
}

const BUTTON_PATH =
  "M494 20C505.598 20 515 29.402 515 41V57C515 68.598 505.598 78 494 78H61.5075C58.5847 78 57.291 74.1124 59.5134 72.2141C63.9765 68.4019 68.2743 64.1064 72.2314 59.4141L73.1484 58.3125C83.3956 45.8326 89.1549 33.1575 90.059 23.0252C90.2072 21.3636 91.5445 20 93.2127 20H494ZM76.1479 20C77.7227 20 79.0424 21.2214 78.9496 22.7934C78.9097 23.4694 78.8406 24.1813 78.7393 24.9307C77.6367 33.0829 72.7839 43.6704 63.915 54.4717C55.7598 64.4037 46.1589 72.138 37.3287 76.961C36.7028 77.3028 35.9705 77.4042 35.2841 77.2105C26.4642 74.7213 20 66.6165 20 57V49.1729C20 48.6106 20.1568 48.0591 20.4598 47.5855C22.2631 44.7674 24.3477 41.8903 26.7217 38.999C32.9047 31.4688 39.9191 25.2011 46.7981 20.5077C47.2873 20.1739 47.8668 20 48.459 20H76.1479Z"

export const Header = ({ onFullscreen }: HeaderProps) => {
  return (
    <header
      className="absolute z-50 flex items-start justify-between"
      style={{
        top: "32px",
        left: "48px",
        right: "48px",
      }}
    >
      <div
        className="flex flex-col gap-1"
        style={{ textShadow: "0 0 100px rgba(255, 0, 4, 0.3)" }}
      >
        <h1
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 500,
            fontSize: "46px",
            lineHeight: 1,
            color: "#ffffff",
            letterSpacing: "0.02em",
          }}
        >
          ONAIR
        </h1>
        <p
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.05em",
          }}
        >
          BSSM BROADCAST REMOTE CONTROL
        </p>
      </div>

      <button
        onClick={onFullscreen}
        className="relative flex items-center justify-center transition-opacity hover:brightness-110 focus:outline-none"
        style={{ width: "495px", height: "58px" }}
      >
        <svg
          viewBox="0 0 535 98"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          style={{ filter: "drop-shadow(0 0 20px rgba(255,255,255,0.8))", overflow: "visible" }}
        >
          <path d={BUTTON_PATH} fill="#1C1C1C" />
        </svg>
        <span
          className="z-10 pl-6 text-white"
          style={{
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            fontWeight: 800,
            fontSize: "20px",
          }}
        >
          전체 화면 (F)
        </span>
      </button>
    </header>
  )
}
