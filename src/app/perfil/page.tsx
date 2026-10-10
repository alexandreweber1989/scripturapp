import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Perfil" };

export default function ProfilePage() {
  return (
    <PageTransition>
      <ProfileView />
    </PageTransition>
  );
}
