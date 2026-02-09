import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './index';

describe('card components', () => {
  it('renders card primitives with default and custom classes', () => {
    const { container } = render(
      <Card className="custom-card">
        <CardHeader>
          <span data-testid="header-default">header-default</span>
        </CardHeader>
        <CardHeader className="header-custom">
          <span data-testid="header-custom">header-custom</span>
        </CardHeader>
        <CardTitle>
          <span data-testid="title-default">title-default</span>
        </CardTitle>
        <CardTitle className="title-custom">
          <span data-testid="title-custom">title-custom</span>
        </CardTitle>
        <CardContent className="content-custom">
          <span data-testid="content">content</span>
        </CardContent>
        <CardFooter className="footer-custom">
          <span data-testid="footer">footer</span>
        </CardFooter>
      </Card>
    );

    expect(
      screen.getByTestId('header-default').parentElement?.className
    ).toContain('bg-slate-100!');
    expect(screen.getByTestId('header-custom').parentElement).toHaveClass(
      'header-custom'
    );
    expect(
      screen.getByTestId('title-default').parentElement?.className
    ).toContain('text-2xl');
    expect(screen.getByTestId('title-custom').parentElement).toHaveClass(
      'title-custom'
    );
    expect(screen.getByTestId('content').parentElement).toHaveClass(
      'content-custom'
    );
    expect(screen.getByTestId('footer').parentElement).toHaveClass(
      'footer-custom'
    );
    expect(container.firstElementChild).toHaveClass('custom-card');
  });
});
