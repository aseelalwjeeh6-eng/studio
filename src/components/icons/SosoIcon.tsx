import { cn } from "@/lib/utils";

export function SosoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("w-8 h-8", className)}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
    >
      <path
        d="M50,95 C-20,60 20,10 50,40 C80,10 120,60 50,95 Z"
        stroke="currentColor"
        strokeWidth="5"
        fill="hsl(var(--primary))"
      />
      <text
        x="50"
        y="65"
        fontFamily="Alegreya, serif"
        fontSize="40"
        fill="hsl(var(--accent))"
        textAnchor="middle"
        fontWeight="bold"
      >
        S
      </text>
       <text
        x="30"
        y="65"
        fontFamily="Alegreya, serif"
        fontSize="40"
        fill="hsl(var(--accent))"
        textAnchor="middle"
        fontWeight="bold"
      >
        A
      </text>
    </svg>
  );
}
