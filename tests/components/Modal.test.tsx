// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "@/components/ui/Modal";

afterEach(() => cleanup());

describe("<Modal>", () => {
  it("no renderiza nada cuando open=false", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        <div>contenido</div>
      </Modal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza el contenido y el título cuando open=true", () => {
    render(
      <Modal open onClose={() => {}} title="Editar producto">
        <div>cuerpo</div>
      </Modal>,
    );
    expect(screen.getByText("Editar producto")).toBeTruthy();
    expect(screen.getByText("cuerpo")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("la tecla ESC dispara onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <div>cuerpo</div>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("click en el backdrop dispara onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <div>cuerpo</div>
      </Modal>,
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("click dentro del contenido NO dispara onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <button>dentro</button>
      </Modal>,
    );
    fireEvent.click(screen.getByText("dentro"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("dismissable=false ignora ESC y click en backdrop", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} dismissable={false}>
        <div>cuerpo</div>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
