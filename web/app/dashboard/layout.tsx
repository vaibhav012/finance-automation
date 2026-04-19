export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f4f7f6] font-sans text-neutral-900">
      {children}
    </div>
  );
}
