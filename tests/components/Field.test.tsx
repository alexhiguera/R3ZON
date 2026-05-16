// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Field } from "@/components/ui/Field";

afterEach(() => cleanup());

describe("<Field>", () => {
  it("renderiza el label y el control hijo", () => {
    render(
      <Field label="Razón social">
        <input data-testid="ctl" />
      </Field>,
    );
    expect(screen.getByText("Razón social")).toBeTruthy();
    expect(screen.getByTestId("ctl")).toBeTruthy();
  });

  it("asocia label↔control mediante htmlFor + id autogenerado", () => {
    const { container } = render(
      <Field label="CIF">
        <input data-testid="ctl-cif" />
      </Field>,
    );
    const label = container.querySelector("label");
    const input = screen.getByTestId("ctl-cif");
    expect(label).toBeTruthy();
    expect(input.id).toBeTruthy();
    expect(label?.getAttribute("for")).toBe(input.id);
  });

  it("propaga aria-invalid y aria-describedby al control cuando hay error", () => {
    render(
      <Field label="Email" error="Email inválido">
        <input data-testid="ctl-email" />
      </Field>,
    );
    const input = screen.getByTestId("ctl-email") as HTMLInputElement;
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toBe("Email inválido");
  });

  it("muestra el hint cuando se pasa", () => {
    render(
      <Field label="Email" hint="Sólo si quieres recibir notificaciones">
        <input />
      </Field>,
    );
    expect(screen.getByText(/sólo si quieres recibir/i)).toBeTruthy();
  });

  it("muestra el error en lugar del hint y aplica clase de danger", () => {
    render(
      <Field label="Email" hint="hint" error="Email inválido">
        <input />
      </Field>,
    );
    const errorNode = screen.getByText("Email inválido");
    expect(errorNode).toBeTruthy();
    expect(errorNode.className).toMatch(/text-danger/);
    expect(screen.queryByText("hint")).toBeNull();
  });
});
