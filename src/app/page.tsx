import { HomeDashboard } from "@/components/home/dashboard";
import { PageTransition } from "@/components/page-transition";

export default function HomePage() {
  return (
    <PageTransition>
      <HomeDashboard />
    </PageTransition>
  );
}
