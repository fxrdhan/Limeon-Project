import { render } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { TbCopy } from 'react-icons/tb';
import { MessageActionPopover } from '../components/messages/MessageActionPopover';

describe('MessageActionPopover', () => {
  const actions = [
    {
      label: 'Salin',
      icon: <TbCopy className="h-4 w-4" />,
      onClick: () => {},
    },
  ];

  it('anchors a vertical menu to the right for outgoing bubbles', () => {
    const { container } = render(
      <div className="relative">
        <MessageActionPopover
          isOpen
          menuId="message-1"
          shouldAnimateMenuOpen={false}
          menuPlacement="up"
          menuOffsetX={0}
          sidePlacementClass="top-full mt-2 left-0 origin-top-left"
          sideArrowAnchorClass="top-1/2 -translate-y-1/2"
          verticalMenuAnchor="right"
          actions={actions}
        />
      </div>
    );

    const menuElement = container.querySelector(
      '[data-chat-menu-id="message-1"]'
    );
    const arrowElement = container.querySelector(
      '[data-chat-menu-arrow-position="right"]'
    );

    expect(menuElement?.className).toContain('right-0');
    expect(menuElement?.className).toContain('origin-top-right');
    expect(arrowElement?.className).toContain('right-3');
  });

  it('keeps a vertical menu anchored to the left for incoming bubbles', () => {
    const { container } = render(
      <div className="relative">
        <MessageActionPopover
          isOpen
          menuId="message-2"
          shouldAnimateMenuOpen={false}
          menuPlacement="down"
          menuOffsetX={0}
          sidePlacementClass="bottom-full mb-2 left-0 origin-bottom-left"
          sideArrowAnchorClass="top-1/2 -translate-y-1/2"
          verticalMenuAnchor="left"
          actions={actions}
        />
      </div>
    );

    const menuElement = container.querySelector(
      '[data-chat-menu-id="message-2"]'
    );
    const arrowElement = container.querySelector(
      '[data-chat-menu-arrow-position="left"]'
    );

    expect(menuElement?.className).toContain('left-0');
    expect(menuElement?.className).toContain('origin-bottom-left');
    expect(arrowElement?.className).toContain('left-3');
  });
});
