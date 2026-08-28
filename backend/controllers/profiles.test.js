const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const User = { findOne: vi.fn(), findAndCountAll: vi.fn() };
mockRequire(require.resolve("../models"), { User });

const { allProfiles, getProfile, followToggler } = require("./profiles");

// Minimal stand-in for Sequelize's real ordering/pagination, scoped to just
// the query shape allProfiles actually constructs, mirroring articles.test.js's
// fakeArticleList so list behavior can be asserted on the returned response
// body rather than on what arguments were passed to a mock.
function fakeUserList(seedRows) {
  return ({ limit, offset } = {}) => {
    const rows = [...seedRows].sort((a, b) => a.username.localeCompare(b.username));
    const count = rows.length;
    return Promise.resolve({ rows: rows.slice(offset, offset + limit), count });
  };
}

function makeProfile({ hasFollower = false, followersCount = 0 } = {}) {
  return makeInstance(
    { id: 1, username: "author" },
    {
      hasFollower: vi.fn().mockResolvedValue(hasFollower),
      countFollowers: vi.fn().mockResolvedValue(followersCount),
      addFollower: vi.fn().mockResolvedValue(),
      removeFollower: vi.fn().mockResolvedValue(),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  User.findOne.mockReset();
  User.findAndCountAll.mockReset();
});

describe("allProfiles", () => {
  function makeSeedUsers() {
    return [
      makeInstance({ id: 1, username: "carol", bio: "c", image: "c.png" }),
      makeInstance({ id: 2, username: "alice", bio: "a", image: "a.png" }),
      makeInstance({ id: 3, username: "bob", bio: "b", image: "b.png" }),
    ];
  }

  // AC-084: reachable without an Authorization header (no loggedUser).
  test("no loggedUser -> succeeds, does not require authentication", async () => {
    User.findAndCountAll.mockImplementation(fakeUserList(makeSeedUsers()));
    const res = makeRes();
    const next = vi.fn();

    await allProfiles({ loggedUser: undefined, query: {} }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  // AC-085: with no explicit limit/offset, results are capped at 3 per page,
  // ordered by username ascending, while the total count reflects every row.
  test("default pagination -> 3 per page, alphabetical order, true total count", async () => {
    const seed = [...makeSeedUsers(), makeInstance({ id: 4, username: "dave" })];
    User.findAndCountAll.mockImplementation(fakeUserList(seed));
    const res = makeRes();

    await allProfiles({ loggedUser: undefined, query: {} }, res, vi.fn());

    const { profiles, profilesCount } = res.json.mock.calls[0][0];
    expect(profilesCount).toBe(4);
    expect(profiles).toHaveLength(3);
    expect(profiles.map((p) => p.username)).toEqual(["alice", "bob", "carol"]);
  });

  // AC-085: a custom limit/offset returns the corresponding page (offset is
  // a page index, mirroring REQ-013's `offset * limit` article convention:
  // limit=2/offset=1 here is the *second* page of 2, i.e. rows 2-3).
  test("custom limit/offset -> corresponding page", async () => {
    const seed = [...makeSeedUsers(), makeInstance({ id: 4, username: "dave" })];
    User.findAndCountAll.mockImplementation(fakeUserList(seed));
    const res = makeRes();

    await allProfiles({ loggedUser: undefined, query: { limit: 2, offset: 1 } }, res, vi.fn());

    const { profiles, profilesCount } = res.json.mock.calls[0][0];
    expect(profilesCount).toBe(4);
    expect(profiles.map((p) => p.username)).toEqual(["carol", "dave"]);
  });

  // AC-086: returned entries never carry email or password.
  test("excludes email from the query attributes", async () => {
    User.findAndCountAll.mockImplementation(fakeUserList(makeSeedUsers()));

    await allProfiles({ loggedUser: undefined, query: {} }, makeRes(), vi.fn());

    const [options] = User.findAndCountAll.mock.calls[0];
    expect(options.attributes).toEqual({ exclude: ["email"] });
  });
});

describe("getProfile", () => {
  test("nonexistent username -> NotFoundError", async () => {
    User.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await getProfile({ loggedUser: undefined, params: { username: "ghost" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-006 / AC-054: an anonymous viewer sees following: false, but the
  // follower count still reflects the true total.
  test("no loggedUser -> following forced false, followersCount is the true total", async () => {
    const profile = makeProfile({ hasFollower: true, followersCount: 5 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser: undefined, params: { username: "author" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ profile });
    expect(profile.dataValues.following).toBe(false);
    expect(profile.dataValues.followersCount).toBe(5);
  });

  // AC-082: a profile's social link fields are returned as-is - getProfile
  // only excludes `email`, so any set link passes straight through.
  test("returns social link fields set on the profile", async () => {
    const profile = makeInstance(
      {
        id: 1,
        username: "author",
        websiteUrl: "https://author.example",
        githubUrl: "author-gh",
        twitterUrl: "author-tw",
      },
      {
        hasFollower: vi.fn().mockResolvedValue(false),
        countFollowers: vi.fn().mockResolvedValue(0),
      },
    );
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser: undefined, params: { username: "author" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ profile });
    expect(profile.dataValues.websiteUrl).toBe("https://author.example");
    expect(profile.dataValues.githubUrl).toBe("author-gh");
    expect(profile.dataValues.twitterUrl).toBe("author-tw");
  });
});

describe("followToggler", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await followToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-053: following/unfollowing a nonexistent username is rejected.
  test("nonexistent username -> NotFoundError", async () => {
    User.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await followToggler({ loggedUser, params: { username: "ghost" }, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-051: following an account not already followed.
  test("POST on a not-yet-followed account -> addFollower called, following true", async () => {
    const profile = makeProfile({ hasFollower: true, followersCount: 3 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await followToggler({ loggedUser, params: { username: "author" }, method: "POST" }, res, vi.fn());

    expect(profile.addFollower).toHaveBeenCalledWith(loggedUser);
    expect(profile.dataValues.following).toBe(true);
    expect(profile.dataValues.followersCount).toBe(3);
  });

  // AC-052: unfollowing a currently-followed account.
  test("DELETE on a followed account -> removeFollower called, following false", async () => {
    const profile = makeProfile({ hasFollower: false, followersCount: 2 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await followToggler({ loggedUser, params: { username: "author" }, method: "DELETE" }, res, vi.fn());

    expect(profile.removeFollower).toHaveBeenCalledWith(loggedUser);
    expect(profile.dataValues.following).toBe(false);
    expect(profile.dataValues.followersCount).toBe(2);
  });
});
