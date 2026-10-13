import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api'
import { uploadMedia } from '../api/upload-media.ts'
import { ImageUploadButton } from './ImageUploadButton.tsx'

const { showError } = vi.hoisted(() => ({ showError: vi.fn() }))
vi.mock('../api/upload-media.ts', () => ({ uploadMedia: vi.fn() }))
vi.mock('@/shared/i18n', () => ({ useT: () => ({ t: (key: string) => key }) }))
vi.mock('@/shared/ui', () => ({
  useToast: () => ({ error: showError }),
  Button: ({
    children,
    onPress,
    isDisabled,
    ...props
  }: import('react').PropsWithChildren<{
    onPress: () => void
    isDisabled: boolean
    isIconOnly?: boolean
  }>) => {
    const { isIconOnly: icon_only, ...rest } = props
    return (
      <button {...rest} data-icon-only={icon_only} disabled={isDisabled} onClick={onPress}>
        {children}
      </button>
    )
  },
}))
const uploaded = {
  id: 'media',
  url: 'http://localhost:9000/media/uploads/image',
  kind: 'image' as const,
  mime: 'image/png',
  byte_size: 1,
}
const file = new File(['image'], 'image.png', { type: 'image/png' })
function choose(container: HTMLElement) {
  const input = container.querySelector('input')
  if (!input) throw new Error('Missing upload input')
  fireEvent.change(input, { target: { files: [file] } })
}
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)
describe('image upload feedback', () => {
  it('reports a rejected save once through toast and permits retry of the same file', async () => {
    vi.mocked(uploadMedia).mockResolvedValue(uploaded)
    const onUploaded = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiError({ status: 422, code: 'validation_failed', message: 'Invalid media origin' }),
      )
      .mockResolvedValue(undefined)
    const { container } = render(<ImageUploadButton label="Cover" onUploaded={onUploaded} />)
    choose(container)
    await waitFor(() => expect(showError).toHaveBeenCalledWith('Invalid media origin'))
    expect(showError).toHaveBeenCalledTimes(1)
    expect(container.textContent).not.toContain('Invalid media origin')
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled())
    choose(container)
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(2))
    expect(showError).toHaveBeenCalledTimes(1)
  })
  it('reports upload failure once, skips saving and restores the trigger', async () => {
    vi.mocked(uploadMedia).mockRejectedValue(new Error('offline'))
    const onUploaded = vi.fn()
    const { container } = render(<ImageUploadButton label="Avatar" onUploaded={onUploaded} />)
    choose(container)
    await waitFor(() => expect(showError).toHaveBeenCalledWith('upload.failed'))
    expect(showError).toHaveBeenCalledTimes(1)
    expect(onUploaded).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toBeEnabled()
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })
  it('keeps upload controls disabled until the save finishes', async () => {
    vi.mocked(uploadMedia).mockResolvedValue(uploaded)
    let finish: (() => void) | undefined
    const onUploaded = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    const { container } = render(<ImageUploadButton label="Cover" onUploaded={onUploaded} />)
    choose(container)
    await waitFor(() => expect(onUploaded).toHaveBeenCalled())
    expect(screen.getByRole('button')).toBeDisabled()
    expect(container.querySelector('input')).toBeDisabled()
    finish?.()
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled())
  })
})
