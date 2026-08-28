import ContainerRow from "../components/ContainerRow";
import ProfilesPagination from "../components/ProfilesPagination";
import ProfilesPreview from "../components/ProfilesPreview";
import useProfiles from "../hooks/useProfiles";

function Directory() {
  const { profiles, profilesCount, loading, setProfilesData } =
    useProfiles();

  return (
    <div className="directory-page">
      <ContainerRow type="page">
        <div className="col-md-6 offset-md-3 col-xs-12">
          <h1 className="text-xs-center">User Directory</h1>

          {loading ? (
            <div className="article-preview">
              <em>Loading directory...</em>
            </div>
          ) : profiles.length > 0 ? (
            <>
              <ProfilesPreview loading={loading} profiles={profiles} />

              <ProfilesPagination
                profilesCount={profilesCount}
                updateProfiles={setProfilesData}
              />
            </>
          ) : (
            <div className="article-preview">No profiles available.</div>
          )}
        </div>
      </ContainerRow>
    </div>
  );
}

export default Directory;
