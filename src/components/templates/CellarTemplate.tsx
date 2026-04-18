import { ResumeData } from "@/types/resume";
import { SimpleTemplate } from "./SimpleTemplate";

export function CellarTemplate({ data }: { data: ResumeData }) {
  return (
    <SimpleTemplate
      data={data}
      theme={{ bg: "#f6efe6", ink: "#241016", accent: "#a0743a", muted: "#6b5142" }}
    />
  );
}
