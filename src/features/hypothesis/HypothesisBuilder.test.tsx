import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HypothesisBuilder } from './HypothesisBuilder'
import { usePreferences } from '../../stores/preferences'

function renderBuilder() {
  return render(
    <MemoryRouter>
      <HypothesisBuilder />
    </MemoryRouter>,
  )
}

describe('HypothesisBuilder', () => {
  it('blocks submission of an empty hypothesis', async () => {
    const user = userEvent.setup()
    renderBuilder()
    await user.click(screen.getByRole('button', { name: /生成平行世界|Generate world/ }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('fills the hypothesis from a quick example chip', async () => {
    const user = userEvent.setup()
    renderBuilder()
    const textarea = screen.getByLabelText(/假设内容|Hypothesis/) as HTMLTextAreaElement
    const chips = screen.getAllByRole('button').filter((button) => button.className.includes('chip'))
    expect(chips.length).toBeGreaterThan(0)
    await user.click(chips[0])
    expect(textarea.value.length).toBeGreaterThan(0)
  })

  it('shows the rule-engine mode when no AI service is configured', async () => {
    await act(async () => {
      usePreferences.setState({ ai: { ...usePreferences.getState().ai, mode: 'proxy', proxyUrl: '' } })
    })
    renderBuilder()
    expect(screen.getAllByText(/基础规则模式|Rule-based mode/).length).toBeGreaterThan(0)
  })

  it('switches to AI mode once a key is configured', async () => {
    await act(async () => {
      usePreferences.setState({
        ai: { ...usePreferences.getState().ai, mode: 'direct', apiKey: 'sk-test', model: 'gpt-4o-mini' },
      })
    })
    renderBuilder()
    expect(screen.getAllByText(/AI 推演|AI simulation/).length).toBeGreaterThan(0)
    // reset to the default so other tests are unaffected
    await act(async () => {
      usePreferences.setState({ ai: { ...usePreferences.getState().ai, mode: 'proxy', apiKey: '' } })
    })
    vi.restoreAllMocks()
  })
})
