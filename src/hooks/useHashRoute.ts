import { useEffect, useState } from 'react'

export type Route = 'wall' | 'admin'

function read(): Route {
  return window.location.hash.replace(/^#\/?/, '').startsWith('admin') ? 'admin' : 'wall'
}

/** 라우터 라이브러리 없이 #/admin 한 곳만 분기한다. */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(read)

  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = (next: Route) => {
    window.location.hash = next === 'admin' ? '#/admin' : '#/'
  }

  return [route, navigate]
}
