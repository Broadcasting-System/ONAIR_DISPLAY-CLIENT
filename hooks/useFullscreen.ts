import { useState, useEffect, useCallback } from 'react'

export const useFullscreen = () => {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f') {
        toggleFullscreen()
      }
      if (event.key === 'Escape') {
        exitFullscreen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleFullscreen, exitFullscreen])

  return { isFullscreen, toggleFullscreen }
}
