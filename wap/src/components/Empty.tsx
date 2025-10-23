import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Empty component
export function Empty({ message = "暂无数据" }: { message?: string }) {
  return (
    <div className={cn("flex flex-col h-full items-center justify-center text-gray-400")}>
      <i className="fa-solid fa-box-open text-4xl mb-4"></i>
      <p>{message}</p>
    </div>
  );
}