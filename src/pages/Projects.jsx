// src/pages/Projects.jsx
import TeamCollectionPage from "../components/TeamCollectionPage";
import { TEAM_SECTION_CONFIGS } from "../config/teamSections";

export default function Projects({ search }) {
  return <TeamCollectionPage config={TEAM_SECTION_CONFIGS.projects} search={search} />;
}
