import { ResumeData } from "@/types/resume";
import { SimpleTemplate } from "./SimpleTemplate";

export function NoirTemplate({ data }: { data: ResumeData }) {
  return (
    <SimpleTemplate
      data={data}
      theme={{ bg: "#0a0a0a", ink: "#ece6d6", accent: "#bfa46f", muted: "#8a8472" }}
    />
  );
}
