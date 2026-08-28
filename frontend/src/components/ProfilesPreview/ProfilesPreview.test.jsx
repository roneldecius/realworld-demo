import { render } from "@testing-library/react";
import ProfilesPreview from "./ProfilesPreview";

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

describe("ProfilesPreview", () => {
  // AC-087: each entry shows an avatar, username, and bio snippet, and
  // links to that user's /profile/:username page.
  test("renders an entry per profile, linking to its profile page", () => {
    const { container, getByText } = render(
      <ProfilesPreview
        loading={false}
        profiles={[
          { bio: "Writes about dragons.", image: "jane.png", username: "jane" },
          { bio: "", image: "", username: "bob" },
        ]}
      />,
    );

    expect(getByText("jane")).toBeInTheDocument();
    expect(getByText("Writes about dragons.")).toBeInTheDocument();
    expect(
      container.querySelectorAll('a[href="/profile/jane"]').length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelectorAll('a[href="/profile/bob"]').length,
    ).toBeGreaterThan(0);
  });

  // REQ-033: an entry with no image set falls back to the default avatar
  // (handled by the shared Avatar component's `src || avatar` fallback).
  test("falls back to the default avatar when a profile has no image", () => {
    const { container } = render(
      <ProfilesPreview
        loading={false}
        profiles={[{ bio: "", image: "", username: "bob" }]}
      />,
    );

    const img = container.querySelector("img");
    expect(img.getAttribute("src")).not.toBe("");
  });

  // Bio snippets longer than 100 characters are truncated with an ellipsis.
  test("truncates a long bio to a snippet", () => {
    const longBio = "a".repeat(150);
    const { getByText } = render(
      <ProfilesPreview
        loading={false}
        profiles={[{ bio: longBio, image: "", username: "jane" }]}
      />,
    );

    expect(getByText(`${"a".repeat(100)}...`)).toBeInTheDocument();
  });

  test("shows a loading state when no profiles are loaded yet", () => {
    const { getByText } = render(
      <ProfilesPreview loading={true} profiles={[]} />,
    );

    expect(getByText("Loading directory...")).toBeInTheDocument();
  });

  test("shows an empty state when there are no profiles", () => {
    const { getByText } = render(
      <ProfilesPreview loading={false} profiles={[]} />,
    );

    expect(getByText("No profiles available.")).toBeInTheDocument();
  });
});
