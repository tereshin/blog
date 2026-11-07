import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { AuthPhase } from '../model/useAuthPanel.ts'

type AuthStepTransitionProps = { step: AuthPhase; direction: 'forward' | 'back'; children: ReactNode }

/** Animate an inert DOM snapshot so the departing form cannot submit or steal focus. */
export function AuthStepTransition({ step, direction, children }: AuthStepTransitionProps) {
  const scene_ref = useRef<HTMLDivElement>(null)
  const snapshot_ref = useRef<{ step: AuthPhase; node: HTMLElement } | null>(null)
  const animations_ref = useRef(new Set<Animation>())
  useLayoutEffect(() => {
    const scene = scene_ref.current
    if (!scene) return
    const previous = snapshot_ref.current
    snapshot_ref.current = { step, node: scene.cloneNode(true) as HTMLElement }
    if (!previous || previous.step === step || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !scene.animate) return
    const outgoing = previous.node
    outgoing.classList.add('auth-scene--outgoing')
    outgoing.inert = true
    outgoing.setAttribute('aria-hidden', 'true')
    outgoing.querySelectorAll('[id]').forEach((node) => node.removeAttribute('id'))
    outgoing.querySelectorAll('input').forEach((input) => {
      const field = document.createElement('span')
      field.className = input.className
      field.style.cssText = 'display:flex;align-items:center'
      field.textContent = input.type === 'password' ? '•'.repeat(input.value.length) : (input.value || input.placeholder)
      input.replaceWith(field)
    })
    scene.parentElement?.append(outgoing)
    const offset = direction === 'forward' ? 100 : -100
    const options: KeyframeAnimationOptions = { duration: 250, easing: 'ease', fill: 'both' }
    const entering = scene.animate([{ opacity: 0, transform: `translateX(${offset}%)` }, { opacity: 1, transform: 'translateX(0)' }], options)
    const leaving = outgoing.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-offset}%)` }], options)
    for (const animation of [entering, leaving]) animations_ref.current.add(animation)
    void Promise.allSettled([entering.finished, leaving.finished]).then(() => {
      outgoing.remove()
      entering.cancel()
      leaving.cancel()
      animations_ref.current.delete(entering)
      animations_ref.current.delete(leaving)
    })
  }, [step, direction, children])
  useEffect(() => {
    const animations = animations_ref.current
    return () => { for (const animation of animations) animation.cancel() }
  }, [])
  return <div className="auth-transition"><div className="auth-scene" key={step} ref={scene_ref}>{children}</div></div>
}
