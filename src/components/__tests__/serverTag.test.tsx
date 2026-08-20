import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ServerTag, { serverTagBase, serverTagClasses } from "@/components/ServerTag";
import VersionBadge from "@/components/VersionBadge";

describe("ServerTag", () => {
  it("aplikuje zdieľanú základňu (font, veľkosť, rádius)", () => {
    const { container } = render(<ServerTag>Java</ServerTag>);
    const el = container.querySelector("[data-server-tag]")!;
    for (const cls of serverTagBase.split(" ")) {
      expect(el.className).toContain(cls);
    }
    expect(el.className).toContain("text-xs");
  });

  it("varianty menia len farby, nie typografiu", () => {
    const neutral = serverTagClasses("neutral");
    const accent = serverTagClasses("accent");
    expect(neutral).toContain("font-body");
    expect(accent).toContain("font-body");
    const typography = (cls: string) =>
      cls.split(" ").filter((c) => /^(px-|py-|sm:px-|sm:py-|text-xs|sm:text-sm|font-|rounded-|leading-|inline-flex|items-center|gap-)/.test(c)).sort().join(" ");
    expect(typography(neutral)).toBe(typography(accent));
  });

  it("VersionBadge používa rovnakú základňu ako ostatné tagy", () => {
    const { container } = render(
      <MemoryRouter>
        <VersionBadge version="26.2" showTooltip={false} />
      </MemoryRouter>
    );
    const badge = container.querySelector("[data-version-badge]")!;
    for (const cls of serverTagBase.split(" ")) {
      expect(badge.className).toContain(cls);
    }
  });
});
