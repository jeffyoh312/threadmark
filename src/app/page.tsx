import Workspace from "@/components/workspace";
import { publicSettings } from "@/lib/server/release";
export default function Home() {
  return <Workspace settings={publicSettings()} />;
}
