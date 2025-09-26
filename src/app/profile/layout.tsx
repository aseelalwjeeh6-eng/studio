import { MainHeader } from "@/components/shared/MainHeader";

export default function LoggedInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader />
      <div className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
