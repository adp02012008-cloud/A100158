// src/pages/Hackathons.jsx
import TeamCollectionPage from "../components/TeamCollectionPage";
import { TEAM_SECTION_CONFIGS } from "../config/teamSections";

export default function Hackathons({ search }) {
  return <TeamCollectionPage config={TEAM_SECTION_CONFIGS.hackathons} search={search} />;
}
