import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MaintenanceGate } from './MaintenanceGate.tsx'

const state = vi.hoisted(() => ({
  settings: {
    data: { maintenance_enabled: true },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  },
  viewer: { is_admin: false, is_loading: false },
  open: vi.fn(),
}))
vi.mock('@/entities/settings', () => ({ useSettings: () => state.settings }))
vi.mock('@/entities/session', () => ({ useViewer: () => state.viewer }))
vi.mock('@/features/login', () => ({
  useLoginDialogStore: (selector: (store: { open: () => void }) => unknown) =>
    selector({ open: state.open }),
}))

beforeEach(() => {
  state.settings.data.maintenance_enabled = true
  state.settings.isPending = false
  state.settings.isError = false
  state.viewer.is_admin = false
  state.viewer.is_loading = false
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('maintenance access', () => {
  it('unmounts the application and keeps administrator sign-in available', () => {
    const mounted = vi.fn()
    function Content() {
      useEffect(mounted, [])
      return <p>{'Private site content'}</p>
    }
    const view = render(
      <MaintenanceGate>
        <Content />
      </MaintenanceGate>,
    )
    expect(screen.queryByText('Private site content')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Технические работы' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Вход для администратора' }))
    expect(state.open).toHaveBeenCalledOnce()
    view.unmount()
    // A blocked child is never mounted, so it cannot start queries or subscriptions.
    expect(mounted).not.toHaveBeenCalled()
  })

  it('preserves administrator access and restores member access when maintenance ends', () => {
    const view = render(
      <MaintenanceGate>
        <p>{'Site content'}</p>
      </MaintenanceGate>,
    )
    state.viewer.is_admin = true
    view.rerender(
      <MaintenanceGate>
        <p>{'Site content'}</p>
      </MaintenanceGate>,
    )
    expect(screen.getByText('Site content')).toBeInTheDocument()
    state.viewer.is_admin = false
    view.rerender(
      <MaintenanceGate>
        <p>{'Site content'}</p>
      </MaintenanceGate>,
    )
    expect(screen.queryByText('Site content')).not.toBeInTheDocument()
    state.settings.data.maintenance_enabled = false
    view.rerender(
      <MaintenanceGate>
        <p>{'Site content'}</p>
      </MaintenanceGate>,
    )
    expect(screen.getByText('Site content')).toBeInTheDocument()
  })

  it('does not reveal cached content while settings or the viewer are loading, or settings fail', () => {
    state.settings.isPending = true
    const view = render(
      <MaintenanceGate>
        <p>{'Cached content'}</p>
      </MaintenanceGate>,
    )
    expect(screen.queryByText('Cached content')).not.toBeInTheDocument()
    state.settings.isPending = false
    state.settings.isError = true
    view.rerender(
      <MaintenanceGate>
        <p>{'Cached content'}</p>
      </MaintenanceGate>,
    )
    expect(screen.queryByText('Cached content')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Вход для администратора' }))
    expect(state.open).toHaveBeenCalledOnce()
  })
})
