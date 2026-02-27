'use client'

interface EntryOverlayProps {
  onEnter: () => void
}

export const EntryOverlay = ({ onEnter }: EntryOverlayProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-4xl font-bold text-white tracking-widest font-orbitron">READY TO BROADCAST</h2>
          <p className="text-white/60 text-sm tracking-widest">PRESS THE BUTTON TO START VIEWING WITH AUDIO</p>
        </div>

        <button
          onClick={onEnter}
          className="group relative px-12 py-5 overflow-hidden rounded-full border border-white/20 transition-all hover:border-white/40 hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 text-xl font-bold text-white font-orbitron">방송 시청하기</span>
        </button>
      </div>
    </div>
  )
}
