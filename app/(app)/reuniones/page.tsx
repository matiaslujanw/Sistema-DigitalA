import { MeetingsWorkspace } from "@/components/meetings-workspace";
import { getAppData } from "@/lib/data";

export default async function ReunionesPage() {
  const data = await getAppData();
  const meetings = data.events.filter((event) => event.type === "Reunion");
  const partnerNames = data.partnerProfiles.map((partner) => partner.name);

  return (
    <MeetingsWorkspace
      initialMeetings={meetings}
      partnerNames={partnerNames}
      projects={data.projects}
      source={data.source}
    />
  );
}
