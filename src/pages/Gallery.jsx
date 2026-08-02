// src/pages/Gallery.jsx
import TeamCollectionPage from "../components/TeamCollectionPage";
import { TEAM_SECTION_CONFIGS } from "../config/teamSections";

export default function Gallery({ search }) {
  return <TeamCollectionPage config={TEAM_SECTION_CONFIGS.gallery} search={search} />;
}
