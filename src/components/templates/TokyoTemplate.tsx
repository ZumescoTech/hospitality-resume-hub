import { ResumeData } from "@/types/resume";
import { SimpleTemplate } from "./SimpleTemplate";

export function TokyoTemplate({ data }: { data: ResumeData }) {
  return (
    <SimpleTemplate
      data={data}
      theme={{
        bg: "#ffffff",
        ink: "#111111",
        accent: "#111111",
        muted: "#7a7a7a",
        font: "ui-monospace, SFMono-Regular, Menlo, monospace",
      }}
    />
  );
}
