import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimelineExplorer } from './TimelineExplorer'
import { generateRuleSimulation } from '../../engines/ruleEngine'

// Force the mobile branch of the explorer.
vi.mock('../../hooks/useMediaQuery', () => ({
  useIsMobile: () => true,
  useMediaQuery: () => true,
}))

function simulation() {
  return generateRuleSimulation(
    '如果比特币从未诞生？',
    {
      language: 'zh',
      year: 2008,
      depth: 'standard',
      style: 'realist',
      era: 'modern',
      scopes: ['global'],
    },
    { idPrefix: 'tl' },
  )
}

describe('TimelineExplorer (mobile)', () => {
  it('renders a vertical timeline grouped by branch', () => {
    const sim = simulation()
    render(
      <TimelineExplorer simulation={sim} activeBranchId={null} onSelectEvent={() => undefined} />,
    )
    // Every branch name should be present as a section heading.
    for (const branch of sim.branches) {
      expect(screen.getAllByText(branch.name).length).toBeGreaterThan(0)
    }
  })

  it('calls onSelectEvent when a node is tapped', async () => {
    const sim = simulation()
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TimelineExplorer simulation={sim} activeBranchId={null} onSelectEvent={onSelect} />)
    const firstEvent = sim.events[0]
    await user.click(screen.getAllByText(firstEvent.title)[0])
    expect(onSelect).toHaveBeenCalled()
  })

  it('filters events by domain', async () => {
    const sim = simulation()
    const user = userEvent.setup()
    render(<TimelineExplorer simulation={sim} activeBranchId={null} onSelectEvent={() => undefined} />)
    const economyButton = screen.getAllByRole('button', { name: '经济' })[0]
    await user.click(economyButton)
    const economyEvents = sim.events.filter((event) => event.category === 'economy')
    const other = sim.events.find((event) => event.category !== 'economy')
    if (other) {
      expect(screen.queryAllByText(other.title).length).toBe(0)
    }
    expect(economyEvents.length).toBeGreaterThan(0)
  })
})
