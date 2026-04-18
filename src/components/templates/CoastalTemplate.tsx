import { ResumeData } from "@/types/resume";
import { SimpleTemplate } from "./SimpleTemplate";

export function CoastalTemplate({ data }: { data: ResumeData }) {
  return (
    <SimpleTemplate
      data={data}
      theme={{ bg: "#f4f8fa", ink: "#1f3a4a", accent: "#3b7a99", muted: "#6b8a99" }}
    />
  );
}
