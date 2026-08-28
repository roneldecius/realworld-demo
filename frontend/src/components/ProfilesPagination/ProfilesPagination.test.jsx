import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "../../context/AuthContext";
import getProfiles from "../../services/getProfiles";
import ProfilesPagination from "./ProfilesPagination";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/getProfiles", () => ({
  default: vi.fn(),
}));

describe("ProfilesPagination", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ headers: {} });
    getProfiles.mockReset();
  });

  // AC-088: more entries than fit one page render pagination controls, and
  // navigating them fetches and applies the corresponding page.
  test("renders a control per page and loads the selected page", async () => {
    getProfiles.mockResolvedValue({ profiles: [], profilesCount: 4 });
    const updateProfiles = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <ProfilesPagination profilesCount={4} updateProfiles={updateProfiles} />,
    );

    // 4 profiles at 3 per page -> 2 pages.
    const pageLinks = container.querySelectorAll(".page-item .page-link");
    expect(pageLinks.length).toBeGreaterThanOrEqual(2);

    await user.click(container.querySelector('a[aria-label="Page 2"]'));

    expect(getProfiles).toHaveBeenCalledWith({ headers: {}, page: 1 });
  });

  // With zero results, `react-paginate`'s `renderOnZeroPageCount={null}`
  // suppresses the control entirely (mirrors ArticlesPagination's own
  // zero-page-count behavior).
  test("renders nothing when there are no profiles", () => {
    const { container } = render(
      <ProfilesPagination profilesCount={0} updateProfiles={vi.fn()} />,
    );

    expect(container.querySelector(".pagination")).toBeNull();
  });
});
