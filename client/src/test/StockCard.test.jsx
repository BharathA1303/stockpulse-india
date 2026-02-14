import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StockCard from '../components/StockCard';

const mockData = {
  symbol: 'RELIANCE.NS',
  shortName: 'Reliance Industries',
  longName: 'Reliance Industries Limited',
  price: 2456.75,
  change: 34.5,
  changePercent: 1.42,
  previousClose: 2422.25,
  open: 2430.0,
  dayHigh: 2470.0,
  dayLow: 2420.0,
  volume: 12500000,
  marketCap: 1664000000000,
  fiftyTwoWeekHigh: 2850.0,
  fiftyTwoWeekLow: 2100.0,
  exchange: 'NSI',
  marketState: 'REGULAR',
  currency: 'INR',
};

describe('StockCard', () => {
  it('renders stock name and symbol', () => {
    render(
      <StockCard
        data={mockData}
        loading={false}
        error={null}
        onAddToWatchlist={() => {}}
        isInWatchlist={false}
      />
    );
    expect(screen.getByText('Reliance Industries')).toBeInTheDocument();
    expect(screen.getByText('RELIANCE.NS')).toBeInTheDocument();
  });

  it('renders price in INR format', () => {
    render(
      <StockCard
        data={mockData}
        loading={false}
        error={null}
        onAddToWatchlist={() => {}}
        isInWatchlist={false}
      />
    );
    // The formatted price should contain ₹ and the number
    const priceEl = screen.getByText(/₹.*2.*456/);
    expect(priceEl).toBeInTheDocument();
  });

  it('shows green class for positive change', () => {
    render(
      <StockCard
        data={mockData}
        loading={false}
        error={null}
        onAddToWatchlist={() => {}}
        isInWatchlist={false}
      />
    );
    const changeEl = screen.getByText(/\+34\.50/);
    expect(changeEl).toBeInTheDocument();
    expect(changeEl.className).toContain('up');
  });

  it('shows red class for negative change', () => {
    const bearishData = { ...mockData, change: -20, changePercent: -0.82 };
    render(
      <StockCard
        data={bearishData}
        loading={false}
        error={null}
        onAddToWatchlist={() => {}}
        isInWatchlist={false}
      />
    );
    const changeEl = screen.getByText(/-20\.00/);
    expect(changeEl).toBeInTheDocument();
    expect(changeEl.className).toContain('down');
  });

  it('renders skeleton loader when loading', () => {
    const { container } = render(
      <StockCard
        data={null}
        loading={true}
        error={null}
        onAddToWatchlist={() => {}}
        isInWatchlist={false}
      />
    );
    expect(container.querySelector('.skeleton')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const onRetry = vi.fn();
    render(
      <StockCard
        data={null}
        loading={false}
        error="Failed to fetch"
        onRetry={onRetry}
        onAddToWatchlist={() => {}}
        isInWatchlist={false}
      />
    );
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows filled star when stock is in watchlist', () => {
    render(
      <StockCard
        data={mockData}
        loading={false}
        error={null}
        onAddToWatchlist={() => {}}
        isInWatchlist={true}
      />
    );
    expect(screen.getByLabelText('Remove from watchlist')).toBeInTheDocument();
  });

  it('renders nothing when no data and not loading/error', () => {
    const { container } = render(
      <StockCard
        data={null}
        loading={false}
        error={null}
        onAddToWatchlist={() => {}}
        isInWatchlist={false}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});
