import { FileText } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
        <FileText className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-serif text-xl text-stone-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
