import { ResumeData } from "@/types/resume";
import { SimpleTemplate } from "./SimpleTemplate";

export function ProvenceTemplate({ data }: { data: ResumeData }) {
  return (
    <SimpleTemplate
      data={data}
      theme={{ bg: "#f3efe4", ink: "#3a4232", accent: "#5b6b4f", muted: "#8a8676" }}
    />
  );
}
