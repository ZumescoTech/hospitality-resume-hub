import { ResumeData } from "@/types/resume";
import { SimpleTemplate } from "./SimpleTemplate";

export function TerracottaTemplate({ data }: { data: ResumeData }) {
  return (
    <SimpleTemplate
      data={data}
      theme={{ bg: "#fbf2ea", ink: "#3a1f12", accent: "#c66838", muted: "#7c4f3a" }}
    />
  );
}
