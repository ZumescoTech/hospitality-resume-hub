import { ResumeData } from "@/types/resume";
import { SimpleTemplate } from "./SimpleTemplate";

export function ManhattanTemplate({ data }: { data: ResumeData }) {
  return (
    <SimpleTemplate
      data={data}
      theme={{ bg: "#0f1115", ink: "#ece6d6", accent: "#d4a24a", muted: "#9a937f" }}
    />
  );
}
