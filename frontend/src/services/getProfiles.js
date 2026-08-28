import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getProfiles({ headers, limit = 3, page = 0 }) {
  try {
    const { data } = await axios({
      url: `api/profiles?limit=${limit}&&offset=${page}`,
      headers,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getProfiles;
