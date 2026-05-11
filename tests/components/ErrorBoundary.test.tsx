// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

function Boom({ msg = "kaboom" }: { msg?: string }): React.ReactElement {
  throw new Error(msg);
}

beforeAll(() => {
  // React imprime el error en consola al renderizar el child que lanza;
  // silenciamos para que el output del test sea limpio.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => cleanup());

describe("<ErrorBoundary>", () => {
  it("renderiza los hijos cuando no hay error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="ok">hola</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("ok").textContent).toBe("hola");
  });

  it("muestra fallback con el mensaje del error cuando un hijo lanza", () => {
    render(
      <ErrorBoundary>
        <Boom msg="kaboom específico" />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo salió mal")).toBeTruthy();
    expect(screen.getByText("kaboom específico")).toBeTruthy();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeTruthy();
  });

  it("usa el fallback custom cuando se pasa", () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom">mi fallback</div>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("custom").textContent).toBe("mi fallback");
    expect(screen.queryByText("Algo salió mal")).toBeNull();
  });

  it('el botón "Reintentar" llama a window.location.reload', () => {
    const reload = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload },
    });

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
