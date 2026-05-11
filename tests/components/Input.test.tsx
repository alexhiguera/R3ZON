// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Input, Select, Textarea, INPUT_CLS } from "@/components/ui/Input";

afterEach(() => cleanup());

describe("<Input>", () => {
  it("aplica las clases base y altura por defecto", () => {
    render(<Input data-testid="i" />);
    const el = screen.getByTestId("i");
    expect(el.className).toContain("h-10");
    expect(el.className).toMatch(/border-indigo-400\/20/);
  });

  it("propaga props (placeholder, disabled, type)", () => {
    render(<Input placeholder="email" type="email" disabled data-testid="i" />);
    const el = screen.getByTestId("i") as HTMLInputElement;
    expect(el.placeholder).toBe("email");
    expect(el.type).toBe("email");
    expect(el.disabled).toBe(true);
  });

  it("dispara onChange y respeta el value controlado", () => {
    const onChange = vi.fn();
    render(<Input value="hola" onChange={onChange} data-testid="i" />);
    fireEvent.change(screen.getByTestId("i"), { target: { value: "adios" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("permite ampliar className sin perder las clases base", () => {
    render(<Input data-testid="i" className="pl-10" />);
    const el = screen.getByTestId("i");
    expect(el.className).toContain("pl-10");
    expect(el.className).toContain("h-10");
  });
});

describe("<Select>", () => {
  it("renderiza opciones y permite seleccionar", () => {
    const onChange = vi.fn();
    render(
      <Select data-testid="s" defaultValue="b" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    const el = screen.getByTestId("s") as HTMLSelectElement;
    expect(el.value).toBe("b");
    fireEvent.change(el, { target: { value: "a" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("<Textarea>", () => {
  it("usa rows=3 por defecto y la clase resize-none", () => {
    render(<Textarea data-testid="t" />);
    const el = screen.getByTestId("t") as HTMLTextAreaElement;
    expect(el.rows).toBe(3);
    expect(el.className).toContain("resize-none");
  });

  it("permite override del prop rows", () => {
    render(<Textarea data-testid="t" rows={6} />);
    expect((screen.getByTestId("t") as HTMLTextAreaElement).rows).toBe(6);
  });
});

describe("INPUT_CLS", () => {
  it("se exporta como string no vacío (point of truth visual)", () => {
    expect(typeof INPUT_CLS).toBe("string");
    expect(INPUT_CLS.length).toBeGreaterThan(20);
  });
});
