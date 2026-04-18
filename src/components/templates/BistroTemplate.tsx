import { ResumeData } from "@/types/resume";
import { SimpleTemplate } from "./SimpleTemplate";

export function BistroTemplate({ data }: { data: ResumeData }) {
  return (
    <SimpleTemplate
      data={data}
      theme={{ bg: "#fbf6ec", ink: "#2a2218", accent: "#a07b3c", muted: "#7a6a52" }}
    />
  );
}
