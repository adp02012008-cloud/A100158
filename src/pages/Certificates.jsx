// src/pages/Certificates.jsx
import TeamCollectionPage from "../components/TeamCollectionPage";
import { TEAM_SECTION_CONFIGS } from "../config/teamSections";

export default function Certificates({ search }) {
  return <TeamCollectionPage config={TEAM_SECTION_CONFIGS.certificates} search={search} />;
}
