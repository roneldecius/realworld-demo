import { Link } from "react-router-dom";
import Avatar from "../Avatar";

const BIO_SNIPPET_LENGTH = 100;

function truncate(text, length) {
  if (!text) return "";

  return text.length > length ? `${text.slice(0, length)}...` : text;
}

// Deliberately does not pass profile data as Link `state` (unlike
// ArticleMeta's author link): the directory listing only carries
// username/bio/image (REQ-051), so supplying it as state would leave the
// destination profile page's followersCount/following undefined instead of
// triggering a proper fetch (REQ-043's navigation-state shortcut assumes the
// full profile shape is present).
function ProfilesPreview({ loading, profiles }) {
  return profiles?.length > 0 ? (
    profiles.map(({ bio, image, username }) => (
      <div className="article-preview" key={username}>
        <div className="article-meta">
          <Link to={`/profile/${username}`}>
            <Avatar alt={username} src={image} />
          </Link>
          <div className="info">
            <Link className="author" to={`/profile/${username}`}>
              {username}
            </Link>
          </div>
        </div>
        <Link className="preview-link" to={`/profile/${username}`}>
          <p>{truncate(bio, BIO_SNIPPET_LENGTH)}</p>
        </Link>
      </div>
    ))
  ) : loading ? (
    <div className="article-preview">Loading directory...</div>
  ) : (
    <div className="article-preview">No profiles available.</div>
  );
}

export default ProfilesPreview;
