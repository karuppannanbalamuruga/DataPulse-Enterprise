
import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export default function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <section
      className={`mx-auto w-full max-w-[1600px] p-6 md:p-8 ${className}`}
    >
      {children}
    </section>
  );
}
