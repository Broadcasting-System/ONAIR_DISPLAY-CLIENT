/* eslint-disable @next/next/no-img-element */
interface StandbyScreenProps {
  isAudioPlaying?: boolean
  isFullscreen?: boolean
}

export const StandbyScreen = ({ isAudioPlaying = false, isFullscreen = false }: StandbyScreenProps) => {
  const contentAreaStyle = isFullscreen
    ? { top: 0, left: 0, right: 0, bottom: 0 }
    : { top: "140px", left: "58px", right: "58px", bottom: "40px" }

  return (
    <div className="relative w-full h-[100dvh] bg-[#101010] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{ zIndex: 0 }}>
        <img
          src="/onair_background.png"
          alt=""
          className="absolute w-full h-full object-cover"
          draggable={false}
        />
      </div>

      <div className="absolute flex items-center justify-center" style={contentAreaStyle}>
        <img
          src="/방송 종료.png"
          alt="방송 종료"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          draggable={false}
        />
      </div>

      {isAudioPlaying ? (
        <div
          className="absolute flex flex-col items-center gap-4"
          style={{ bottom: "48px", left: 0, right: 0 }}
        >
          <p
            style={{
              fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
              fontWeight: 700,
              fontSize: "20px",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            🔊 오디오 방송 송출 중...
          </p>
          <div className="flex items-end gap-2 h-16">
            {[85, 40, 95, 30, 75, 50, 90, 20, 80].map((height, i) => (
              <div
                key={i}
                className="w-3 rounded-t-sm bg-white"
                style={{
                  height: `${height}%`,
                  opacity: 0.7,
                  animation: `displayBounce ${0.5 + (i % 3) * 0.25}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes displayBounce {
                  0% { opacity: 0.2; transform: scaleY(0.3); }
                  100% { opacity: 0.8; transform: scaleY(1); }
                }
              `,
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
