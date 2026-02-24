/* eslint-disable @next/next/no-img-element */
interface StandbyScreenProps {
  isAudioPlaying?: boolean
  isFullscreen?: boolean
}

export const StandbyScreen = ({ isAudioPlaying = false, isFullscreen = false }: StandbyScreenProps) => {
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

      <div
        className="absolute bg-white overflow-hidden rounded-sm"
        style={
          isFullscreen
            ? { top: 0, left: 0, right: 0, bottom: 0 }
            : { top: "140px", left: "58px", right: "58px", bottom: "40px" }
        }
      >
        <div className="flex flex-col items-center justify-center w-full h-full">
          <p
            style={{
              fontFamily: "'Pretendard Variable', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
              fontWeight: 800,
              fontSize: "64px",
              color: "#000000",
              lineHeight: 1.1,
            }}
          >
            방송 화면
          </p>

          {isAudioPlaying ? (
            <div className="mt-14 flex flex-col items-center gap-6">
              <p
                style={{
                  fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
                  fontWeight: 700,
                  fontSize: "20px",
                  color: "#111111",
                }}
              >
                🔊 오디오 방송 송출 중...
              </p>
              <div className="flex items-end gap-2 h-16">
                {[85, 40, 95, 30, 75, 50, 90, 20, 80].map((height, i) => (
                  <div
                    key={i}
                    className="w-3 rounded-t-sm bg-neutral-800"
                    style={{
                      height: `${height}%`,
                      animation: `displayBounce ${0.5 + (i % 3) * 0.25}s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    @keyframes displayBounce {
                      0% { opacity: 0.3; transform: scaleY(0.3); }
                      100% { opacity: 1; transform: scaleY(1); }
                    }
                  `,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
