// AssistedTextarea — tailoring failure UX.
// A failed tailorContentFn call must surface a readable toast and leave the
// user's original text untouched (previously it reset state silently).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssistedTextarea } from '@/components/builder/AssistedTextarea';
import { toast } from 'sonner';
import { tailorContentFn } from '@/lib/ai/builder-assist';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/ai/builder-assist', () => ({
  checkWritingFn: vi.fn().mockResolvedValue([]),
  tailorContentFn: vi.fn(),
}));

const ORIGINAL_TEXT = 'Served 40 covers per shift at a fine-dining venue.';

function renderWithFailingTailor() {
  vi.mocked(tailorContentFn).mockRejectedValue(
    new Error('Groq API error 429: rate_limit_exceeded'),
  );
  const onChange = vi.fn();
  render(
    <AssistedTextarea
      value={ORIGINAL_TEXT}
      onChange={onChange}
      fieldType="experience description"
      jobTitle="Sommelier"
    />,
  );
  return { onChange };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AssistedTextarea — tailor call fails', () => {
  it('shows a readable error toast instead of failing silently', async () => {
    renderWithFailingTailor();

    await userEvent.click(screen.getByRole('button', { name: /tailor for sommelier/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "We couldn't generate a suggestion right now — please try again in a moment.",
      );
    });
    // The message must not leak internal API details
    const message = vi.mocked(toast.error).mock.calls[0][0] as string;
    expect(message).not.toMatch(/429|Groq|rate_limit/i);
  });

  it('preserves the original text and never calls onChange', async () => {
    const { onChange } = renderWithFailingTailor();

    await userEvent.click(screen.getByRole('button', { name: /tailor for sommelier/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue(ORIGINAL_TEXT);
  });

  it('returns to idle so the user can retry immediately', async () => {
    renderWithFailingTailor();

    const tailorButton = screen.getByRole('button', { name: /tailor for sommelier/i });
    await userEvent.click(tailorButton);

    // Button only renders in the idle state — its return proves the reset
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /tailor for sommelier/i })).toBeInTheDocument();
    });
  });
});
