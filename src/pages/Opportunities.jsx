// src/pages/Opportunities.jsx
import TeamCollectionPage from "../components/TeamCollectionPage";
import { TEAM_SECTION_CONFIGS } from "../config/teamSections";

export default function Opportunities({ search }) {
  return <TeamCollectionPage config={TEAM_SECTION_CONFIGS.opportunities} search={search} />;
}
