// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

  it("envuelve el control en un <label>, lo que asocia label↔control sin htmlFor", () => {
    const { container } = render(
      <Field label="CIF">
        <input data-testid="ctl-cif" />
      </Field>,
    );
    const label = container.querySelector("label");
    expect(label).toBeTruthy();
    expect(label?.contains(screen.getByTestId("ctl-cif"))).toBe(true);
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
