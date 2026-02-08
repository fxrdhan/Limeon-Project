import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChatTestingButton } from './ChatTestingButton';

const capturedChatPanelProps = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}));

vi.mock('@/components/shared/chat-sidebar-panel', () => ({
  default: (props: Record<string, unknown>) => {
    capturedChatPanelProps.current = props;

    return (
      <div data-testid="chat-sidebar-panel">
        <button type="button" onClick={() => props.onClose?.()}>
          close-chat
        </button>
      </div>
    );
  },
}));

describe('ChatTestingButton', () => {
  it('does not render when disabled', () => {
    const { container } = render(<ChatTestingButton enabled={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens and closes chat panel while forwarding target user data', () => {
    render(
      <ChatTestingButton
        targetUser={{
          id: 'user-1',
          name: 'Tester',
          email: 'tester@example.com',
        }}
      />
    );

    const triggerButton = screen.getByTitle('Test Chat');
    fireEvent.click(triggerButton);

    expect(screen.getByTestId('chat-sidebar-panel')).toBeInTheDocument();
    expect(capturedChatPanelProps.current).toMatchObject({
      isOpen: true,
      targetUser: {
        id: 'user-1',
        name: 'Tester',
        email: 'tester@example.com',
      },
    });

    fireEvent.click(screen.getByText('close-chat'));
    expect(screen.queryByTestId('chat-sidebar-panel')).not.toBeInTheDocument();
  });
});
