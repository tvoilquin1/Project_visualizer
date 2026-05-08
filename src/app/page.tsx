import { Header } from "@/components/header";
import { ProjectSidebar } from "@/components/sidebar/ProjectSidebar";
import { Timeline } from "@/components/scheduler/Timeline";

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground transition-colors">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <main className="flex-1 overflow-auto">
          <Timeline />
        </main>
      </div>
    </div>
  );
}
